import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getTopRoomsQuarterly(params: { year?: number; quarter?: number; hotelId?: number }) {
    const conditions: string[] = [];
    const sqlParams: number[] = [];
    let idx = 0;

    if (params.year) {
      conditions.push(`q.yr = @${idx++}`);
      sqlParams.push(params.year);
    }
    if (params.quarter) {
      conditions.push(`q.qtr = @${idx++}`);
      sqlParams.push(params.quarter);
    }
    if (params.hotelId) {
      conditions.push(`q.hotel_id = @${idx++}`);
      sqlParams.push(params.hotelId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')} AND q.revenue_rank <= 3` : 'WHERE q.revenue_rank <= 3';
    const rows = await this.dataSource.query(
      `
      WITH q AS (
        SELECT
          h.hotel_id,
          h.name AS hotel_name,
          YEAR(b.check_in_date) AS yr,
          DATEPART(QUARTER, b.check_in_date) AS qtr,
          rt.room_type_id,
          rt.name AS room_name,
          SUM(b.total_price) AS total_revenue,
          COUNT(b.booking_id) AS booking_count,
          RANK() OVER (
            PARTITION BY h.hotel_id, YEAR(b.check_in_date), DATEPART(QUARTER, b.check_in_date)
            ORDER BY SUM(b.total_price) DESC
          ) AS revenue_rank
        FROM bookings b
        JOIN room_types rt ON rt.room_type_id = b.room_type_id
        JOIN hotels h ON h.hotel_id = rt.hotel_id
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY
          h.hotel_id, h.name, rt.room_type_id, rt.name,
          YEAR(b.check_in_date), DATEPART(QUARTER, b.check_in_date)
      )
      SELECT *
      FROM q
      ${where}
      ORDER BY q.yr DESC, q.qtr DESC, q.hotel_name ASC, q.revenue_rank ASC
      `,
      sqlParams,
    );

    return { data: rows, total: rows.length };
  }

  async getBranchPerformance(params: { year?: number; quarter?: number }) {
    const conditions: string[] = [];
    const sqlParams: number[] = [];
    let idx = 0;

    if (params.year) {
      conditions.push(`YEAR(b.check_in_date) = @${idx++}`);
      sqlParams.push(params.year);
    }
    if (params.quarter) {
      conditions.push(`DATEPART(QUARTER, b.check_in_date) = @${idx++}`);
      sqlParams.push(params.quarter);
    }

    const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
    const rows = await this.dataSource.query(
      `
      WITH perf AS (
        SELECT
          h.hotel_id,
          h.name AS hotel_name,
          h.city,
          SUM(b.total_price) AS hotel_revenue,
          COUNT(b.booking_id) AS booking_count
        FROM bookings b
        JOIN room_types rt ON rt.room_type_id = b.room_type_id
        JOIN hotels h ON h.hotel_id = rt.hotel_id
        WHERE b.status IN ('confirmed', 'completed')
        ${where}
        GROUP BY h.hotel_id, h.name, h.city
      )
      SELECT
        *,
        SUM(hotel_revenue) OVER () AS total_revenue,
        CAST(100.0 * hotel_revenue / NULLIF(SUM(hotel_revenue) OVER (), 0) AS DECIMAL(10, 2)) AS contribution_pct,
        DENSE_RANK() OVER (ORDER BY hotel_revenue DESC) AS revenue_rank
      FROM perf
      ORDER BY revenue_rank ASC, hotel_name ASC
      `,
      sqlParams,
    );

    return { data: rows, total: rows.length };
  }

  async getOccupancyOverview(params: { hotelId?: number }) {
    const conditions: string[] = [];
    const sqlParams: number[] = [];
    let idx = 0;

    if (params.hotelId) {
      conditions.push(`h.hotel_id = @${idx++}`);
      sqlParams.push(params.hotelId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.dataSource.query(
      `
      SELECT
        h.hotel_id,
        h.name AS hotel_name,
        rt.room_type_id,
        rt.name AS room_type_name,
        rt.total_rooms,
        COUNT(CASE WHEN b.status IN ('pending', 'confirmed') THEN 1 END) AS active_bookings,
        CAST(
          100.0 * COUNT(CASE WHEN b.status IN ('pending', 'confirmed') THEN 1 END)
          / NULLIF(rt.total_rooms, 0)
          AS DECIMAL(10, 2)
        ) AS occupancy_rate
      FROM room_types rt
      JOIN hotels h ON h.hotel_id = rt.hotel_id
      LEFT JOIN bookings b ON b.room_type_id = rt.room_type_id
      ${where}
      GROUP BY h.hotel_id, h.name, rt.room_type_id, rt.name, rt.total_rooms
      ORDER BY h.name ASC, occupancy_rate DESC
      `,
      sqlParams,
    );

    return { data: rows, total: rows.length };
  }
}
