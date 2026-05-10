// ═══════════════════════════════════════════════════════════════
// rooms.controller.ts (extended) — Thành viên 2
// Search, filter, detail endpoints + catalog management
// ═══════════════════════════════════════════════════════════════
import {
  Controller, Get, Post, Put, Delete, Param, Body,
  Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoomsService } from './rooms.service';

@Controller('api/rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  // ── USER: Tìm kiếm phòng (search + filter) ─────────────────
  // GET /api/rooms/search?city=Hà Nội&checkIn=2026-06-01&checkOut=2026-06-03
  //   &guests=2&minPrice=1000000&maxPrice=5000000
  //   &amenities=WiFi,Pool&sortBy=price_asc&page=1&limit=10
  @Get('search')
  async searchRooms(
    @Query('hotelId')   hotelId?: string,
    @Query('city')      city?: string,
    @Query('checkIn')   checkIn?: string,
    @Query('checkOut')  checkOut?: string,
    @Query('guests')    guests?: string,
    @Query('minPrice')  minPrice?: string,
    @Query('maxPrice')  maxPrice?: string,
    @Query('amenities') amenities?: string,    // comma-separated
    @Query('sortBy')    sortBy?: string,
    @Query('page')      page?: string,
    @Query('limit')     limit?: string,
  ) {
    return this.roomsService.searchRooms({
      hotelId:   hotelId   ? Number(hotelId)   : undefined,
      city,
      checkIn,
      checkOut,
      guests:    guests    ? Number(guests)    : undefined,
      minPrice:  minPrice  ? Number(minPrice)  : undefined,
      maxPrice:  maxPrice  ? Number(maxPrice)  : undefined,
      amenities: amenities ? amenities.split(',').map(a => a.trim()) : undefined,
      sortBy:    sortBy as any,
      page:      page  ? Number(page)  : 1,
      limit:     limit ? Number(limit) : 20,
    });
  }

  // ── USER: Danh sách tất cả phòng ────────────────────────────
  // GET /api/rooms?hotelId=1
  @Get()
  async getAll(@Query('hotelId') hotelId?: number) {
    const data = await this.roomsService.findAll(hotelId);
    return { data, total: data.length };
  }

  // ── USER: Danh sách amenities để build bộ lọc ───────────────
  // GET /api/rooms/amenities
  @Get('amenities')
  async getAmenities() {
    return this.roomsService.getAmenities();
  }

  // ── USER: Chi tiết phòng (SQL + MongoDB merged) ─────────────
  // GET /api/rooms/:id
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) roomTypeId: number) {
    return await this.roomsService.findById(roomTypeId);
  }

  // ── ADMIN: Tạo loại phòng mới ───────────────────────────────
  // POST /api/rooms
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
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

  // ── ADMIN: Cập nhật thông tin phòng ─────────────────────────
  // PUT /api/rooms/:id
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async update(
    @Param('id', ParseIntPipe) roomTypeId: number,
    @Body() updateRoomDto: any,
  ) {
    const room = await this.roomsService.update(roomTypeId, updateRoomDto);
    return { message: 'Cập nhật loại phòng thành công', data: room };
  }

  // ── ADMIN: Đồng bộ catalog vào MongoDB ──────────────────────
  // PUT /api/rooms/:id/catalog
  // Body: { amenities, images, description, bed_type, size_sqm }
  @Put(':id/catalog')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateCatalog(
    @Param('id', ParseIntPipe) roomTypeId: number,
    @Body()
    body: {
      hotel_name?: string;
      amenities?: string[];
      images?: Array<{ url: string; alt: string; is_primary: boolean; order: number }>;
      description?: { vi?: string; en?: string };
      bed_type?: string;
      size_sqm?: number;
      floor?: number;
    },
  ) {
    return this.roomsService.upsertCatalog(roomTypeId, body);
  }

  // ── ADMIN: Xóa loại phòng ────────────────────────────────────
  // DELETE /api/rooms/:id
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async delete(@Param('id', ParseIntPipe) roomTypeId: number) {
    return await this.roomsService.delete(roomTypeId);
  }
}