import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hotel } from '../../database/entities/hotel.entity';
import { RoomType } from '../../database/entities/room-type.entity';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Hotel)
    private hotelsRepository: Repository<Hotel>,
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
  ) {}

  async findAll() {
    const hotels = await this.hotelsRepository.query(`
      SELECT 
        h.hotel_id, h.name, h.city, h.address, h.phone, h.email, h.is_active,
        ISNULL(SUM(rt.total_rooms), 0) AS total_rooms,
        COUNT(DISTINCT rt.room_type_id) AS room_type_count
      FROM hotels h
      LEFT JOIN room_types rt ON rt.hotel_id = h.hotel_id AND rt.is_active = 1
      GROUP BY h.hotel_id, h.name, h.city, h.address, h.phone, h.email, h.is_active
      ORDER BY h.hotel_id
    `);

    for (const h of hotels) {
      // ✅ 7-day rolling occupancy: đếm số ĐÊMDÊM phòng đã bán trong 7 ngày / tổng công suất
      const totalRooms = parseInt(h.total_rooms) || 1;
      const capacity = totalRooms * 7;

      const result = await this.hotelsRepository.query(`
        SELECT ISNULL(SUM(
          DATEDIFF(day,
            CASE WHEN b.check_in_date < DATEADD(day,-6,CAST(GETDATE() AS DATE))
                 THEN DATEADD(day,-6,CAST(GETDATE() AS DATE))
                 ELSE b.check_in_date END,
            CASE WHEN b.check_out_date > CAST(GETDATE() AS DATE)
                 THEN CAST(GETDATE() AS DATE)
                 ELSE b.check_out_date END
          )
        ), 0) AS booked_nights
        FROM bookings b
        JOIN room_types rt ON b.room_type_id = rt.room_type_id
        WHERE rt.hotel_id = @0
          AND b.status IN ('confirmed','completed')
          AND b.check_in_date <= CAST(GETDATE() AS DATE)
          AND b.check_out_date >= DATEADD(day,-6,CAST(GETDATE() AS DATE))
      `, [h.hotel_id]);

      const bookedNights = parseInt(result[0]?.booked_nights || 0);
      h.occupancy_rate = parseFloat(((bookedNights / capacity) * 100).toFixed(1));
    }

    return hotels;
  }

  async findById(hotelId: number) {
    const hotel = await this.hotelsRepository.findOne({
      where: { hotel_id: hotelId },
    });
    if (!hotel) throw new NotFoundException('Khách sạn không tìm thấy');
    return hotel;
  }

  async create(data: { name: string; address: string; city: string; phone?: string; email?: string }) {
    const hotel = this.hotelsRepository.create({ ...data, is_active: 1 });
    return await this.hotelsRepository.save(hotel);
  }

  async update(hotelId: number, data: Partial<Hotel>) {
    await this.findById(hotelId);
    await this.hotelsRepository.update(hotelId, data);
    return await this.findById(hotelId);
  }

  async delete(hotelId: number) {
    await this.findById(hotelId);
    await this.hotelsRepository.delete(hotelId);
    return { message: 'Xóa khách sạn thành công' };
  }

  // ── ROOM TYPES ──
  async findAllRoomTypes(hotelId?: number) {
    let sql = `
      SELECT rt.*, h.name as hotel_name
      FROM room_types rt
      JOIN hotels h ON rt.hotel_id = h.hotel_id
      WHERE rt.is_active = 1
    `;
    const params: any[] = [];
    if (hotelId) {
      sql += ` AND rt.hotel_id = @0`;
      params.push(hotelId);
    }
    sql += ` ORDER BY h.name, rt.name`;
    return await this.roomTypesRepository.query(sql, params);
  }

  async createRoomType(data: {
    hotel_id: number;
    name: string;
    capacity: number;
    base_price: number;
    total_rooms: number;
    description?: string;
  }) {
    await this.findById(data.hotel_id);
    const roomType = this.roomTypesRepository.create({
      ...data,
      current_price: data.base_price,
      is_active: 1,
    });
    return await this.roomTypesRepository.save(roomType);
  }

  async updateRoomType(roomTypeId: number, data: Partial<RoomType>) {
    const rt = await this.roomTypesRepository.findOne({ where: { room_type_id: roomTypeId } });
    if (!rt) throw new NotFoundException('Loại phòng không tìm thấy');
    Object.assign(rt, data);
    return await this.roomTypesRepository.save(rt);
  }

  async deleteRoomType(roomTypeId: number) {
    const rt = await this.roomTypesRepository.findOne({ where: { room_type_id: roomTypeId } });
    if (!rt) throw new NotFoundException('Loại phòng không tìm thấy');
    rt.is_active = 0; // Soft delete
    await this.roomTypesRepository.save(rt);
    return { message: 'Xóa loại phòng thành công' };
  }
}