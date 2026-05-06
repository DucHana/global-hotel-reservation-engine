// backend/src/modules/bookings/bookings.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('api/bookings')
export class BookingsController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async getAll(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    const conditions: string[] = [];
    // Whitelist status values to prevent injection
    const allowedStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (status && allowedStatuses.includes(status)) {
      conditions.push(`b.status = '${status}'`);
    }
    if (userId && !isNaN(Number(userId))) {
      conditions.push(`b.user_id = ${Number(userId)}`);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await this.dataSource.query(`
      SELECT TOP 50
        b.booking_id,
        b.user_id,
        u.full_name AS user_name,
        b.room_type_id,
        rt.name    AS room_type_name,
        h.name     AS hotel_name,
        b.check_in_date  AS check_in,
        b.check_out_date AS check_out,
        DATEDIFF(day, b.check_in_date, b.check_out_date) AS nights,
        2                AS guests,
        b.total_price,
        b.status,
        b.created_at
      FROM bookings b
      JOIN users u     ON u.user_id      = b.user_id
      JOIN room_types rt ON rt.room_type_id = b.room_type_id
      JOIN hotels h    ON h.hotel_id     = rt.hotel_id
      ${where}
      ORDER BY b.created_at DESC
    `);

    const data = rows.map((b: any) => ({
      booking_id: String(b.booking_id),
      user_id: String(b.user_id),
      user_name: b.user_name,
      room_type_id: String(b.room_type_id),
      room_type_name: b.room_type_name,
      hotel_name: b.hotel_name,
      check_in: b.check_in,
      check_out: b.check_out,
      nights: Number(b.nights),
      guests: Number(b.guests),
      total_price: Number(b.total_price),
      status: b.status,
      created_at: b.created_at,
    }));

    return { data, total: data.length };
  }
}