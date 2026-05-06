import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoomsService } from './rooms.service';

@Controller('api/rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get()
  async getAll(@Query('hotelId') hotelId?: number) {
    const data = await this.roomsService.findAll(hotelId);
    return { data, total: data.length };
  }

  @Get(':id')
  async getById(@Param('id') roomTypeId: number) {
    return await this.roomsService.findById(roomTypeId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'manager')
  async create(
    @Body()
    createRoomDto: {
      hotel_id: number;
      name: string;
      description?: string;
      capacity: number;
      base_price: number;
      current_price: number;
      total_rooms: number;
    },
  ) {
    const room = await this.roomsService.create(createRoomDto);
    return { message: 'Tạo loại phòng thành công', data: room };
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'manager')
  async update(@Param('id') roomTypeId: number, @Body() updateRoomDto: any) {
    const room = await this.roomsService.update(roomTypeId, updateRoomDto);
    return { message: 'Cập nhật loại phòng thành công', data: room };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async delete(@Param('id') roomTypeId: number) {
    return await this.roomsService.delete(roomTypeId);
  }
}