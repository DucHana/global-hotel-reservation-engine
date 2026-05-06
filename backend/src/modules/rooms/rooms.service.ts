import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from '../../database/entities/room-type.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
  ) {}

  async findAll(hotelId?: number) {
    const query = this.roomTypesRepository.createQueryBuilder('rt');
    if (hotelId) {
      query.where('rt.hotel_id = :hotelId', { hotelId });
    }
    return await query.getMany();
  }

  async findById(roomTypeId: number) {
    const room = await this.roomTypesRepository.findOne({
      where: { room_type_id: roomTypeId },
    });
    if (!room) throw new NotFoundException('Loại phòng không tìm thấy');
    return room;
  }

  async create(data: {
    hotel_id: number;
    name: string;
    description?: string;
    capacity: number;
    base_price: number;
    current_price: number;
    total_rooms: number;
  }) {
    if (data.base_price <= 0 || data.current_price <= 0) {
      throw new BadRequestException('Giá phải lớn hơn 0');
    }

    const roomType = this.roomTypesRepository.create(data);
    return await this.roomTypesRepository.save(roomType);
  }

  async update(
    roomTypeId: number,
    data: {
      name?: string;
      description?: string;
      capacity?: number;
      base_price?: number;
      current_price?: number;
      total_rooms?: number;
    },
  ) {
    const roomType = await this.findById(roomTypeId);

    if (data.base_price !== undefined && data.base_price <= 0) {
      throw new BadRequestException('Giá cơ sở phải lớn hơn 0');
    }
    if (data.current_price !== undefined && data.current_price <= 0) {
      throw new BadRequestException('Giá hiện tại phải lớn hơn 0');
    }

    Object.assign(roomType, data);
    return await this.roomTypesRepository.save(roomType);
  }

  async delete(roomTypeId: number) {
    await this.findById(roomTypeId);
    await this.roomTypesRepository.delete(roomTypeId);
    return { message: 'Xóa loại phòng thành công' };
  }
}