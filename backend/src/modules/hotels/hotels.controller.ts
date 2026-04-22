// backend/src/modules/hotels/hotels.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('api/hotels')
export class HotelsController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async getAll() {
    const rows = await this.dataSource.query(`
      SELECT
        h.hotel_id,
        h.name,
        h.address,
        h.city,
        h.phone,
        h.email,
        h.is_active,
        ISNULL(SUM(rt.total_rooms), 0) AS total_rooms,
        ISNULL(ROUND(
          100.0
          * COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END)
          / NULLIF(SUM(rt.total_rooms), 0),
        1), 0) AS occupancy_rate
      FROM hotels h
      LEFT JOIN room_types rt
        ON rt.hotel_id = h.hotel_id AND rt.is_active = 1
      LEFT JOIN bookings b
        ON b.room_type_id = rt.room_type_id
        AND b.status = 'confirmed'
        AND CAST(GETDATE() AS DATE) BETWEEN b.check_in_date AND b.check_out_date
      WHERE h.is_active = 1
      GROUP BY h.hotel_id, h.name, h.address, h.city, h.phone, h.email, h.is_active
    `);

    const data = rows.map((h: any) => ({
      hotel_id: String(h.hotel_id),
      name: h.name,
      address: h.address,
      city: h.city,
      star_rating: 5,
      total_rooms: Number(h.total_rooms),
      occupancy_rate: Number(h.occupancy_rate),
      is_active: h.is_active === true || h.is_active === 1,
      phone: h.phone || '',
      email: h.email || '',
    }));

    return { data, total: data.length };
  }
}