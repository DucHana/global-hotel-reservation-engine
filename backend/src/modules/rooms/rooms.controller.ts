import { Controller, Get, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('api/rooms')
export class RoomsController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async getAll(@Query('hotelId') hotelId?: string) {
    const params: any[] = [];
    let where = 'rt.is_active = 1';
    if (hotelId) {
      params.push(Number(hotelId));
      where += ` AND rt.hotel_id = @${params.length - 1}`;
    }

    const rows = await this.dataSource.query(`
      SELECT
        rt.room_type_id,
        rt.hotel_id,
        h.name AS hotel_name,
        rt.name,
        rt.capacity,
        rt.current_price AS base_price,
        rt.total_rooms,
        rt.description,
        rt.is_active,
        (
          rt.total_rooms - ISNULL((
            SELECT COUNT(DISTINCT b.booking_id)
            FROM bookings b
            WHERE b.room_type_id = rt.room_type_id
              AND b.status = 'confirmed'
              AND CAST(GETDATE() AS DATE) BETWEEN b.check_in_date AND b.check_out_date
          ), 0)
        ) AS available_rooms
      FROM room_types rt
      JOIN hotels h ON h.hotel_id = rt.hotel_id
      WHERE rt.is_active = 1
        ${hotelId ? 'AND rt.hotel_id = ' + Number(hotelId) : ''}
    `, params);

    const data = rows.map((r: any) => ({
      room_type_id: String(r.room_type_id),
      hotel_id: String(r.hotel_id),
      hotel_name: r.hotel_name,
      name: r.name,
      capacity: Number(r.capacity),
      base_price: Number(r.base_price),
      cap_price: Number(r.base_price) * 2,
      floor_price: Math.round(Number(r.base_price) * 0.5),
      total_rooms: Number(r.total_rooms),
      available_rooms: Math.max(0, Number(r.available_rooms)),
      description: r.description || '',
      amenities: ['WiFi', 'Smart TV', 'Air conditioning'],
      is_active: r.is_active === true || r.is_active === 1,
    }));

    return { data, total: data.length };
  }
}