import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HotelsService } from './hotels.service';

@Controller('api/hotels')
export class HotelsController {
  constructor(private hotelsService: HotelsService) {}

  @Get()
  async getAll() {
    const data = await this.hotelsService.findAll();
    return { data, total: data.length };
  }

  @Get(':id')
  async getById(@Param('id') hotelId: number) {
    return await this.hotelsService.findById(hotelId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async create(
    @Body()
    createHotelDto: {
      name: string;
      address: string;
      city: string;
      phone?: string;
      email?: string;
    },
  ) {
    const hotel = await this.hotelsService.create(createHotelDto);
    return { message: 'Tạo khách sạn thành công', data: hotel };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'manager')
  async update(@Param('id') hotelId: number, @Body() updateHotelDto: any) {
    const hotel = await this.hotelsService.update(hotelId, updateHotelDto);
    return { message: 'Cập nhật khách sạn thành công', data: hotel };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async delete(@Param('id') hotelId: number) {
    return await this.hotelsService.delete(hotelId);
  }
}