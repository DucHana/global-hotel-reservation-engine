import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hotel } from '../../database/entities/hotel.entity';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Hotel)
    private hotelsRepository: Repository<Hotel>,
  ) {}

  async findAll() {
    return await this.hotelsRepository.find();
  }

  async findById(hotelId: number) {
    const hotel = await this.hotelsRepository.findOne({
      where: { hotel_id: hotelId },
    });
    if (!hotel) throw new NotFoundException('Khách sạn không tìm thấy');
    return hotel;
  }

  async create(data: {
    name: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
  }) {
    const hotel = this.hotelsRepository.create(data);
    return await this.hotelsRepository.save(hotel);
  }

  async update(hotelId: number, data: Partial<Hotel>) {
    const hotel = await this.findById(hotelId);
    Object.assign(hotel, data);
    return await this.hotelsRepository.save(hotel);
  }

  async delete(hotelId: number) {
    await this.findById(hotelId);
    await this.hotelsRepository.delete(hotelId);
    return { message: 'Xóa khách sạn thành công' };
  }
}