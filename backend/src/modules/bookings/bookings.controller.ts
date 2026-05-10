// ═══════════════════════════════════════════════════════════════
// bookings.controller.ts — Thành viên 1
// REST endpoints for booking management (user + admin)
// ═══════════════════════════════════════════════════════════════
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, ParseIntPipe, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('api/bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── USER: Tạo đặt phòng ────────────────────────────────────
  // POST /api/bookings
  // Body: { user_id, room_type_id, check_in_date, check_out_date }
  // → Calls sp_create_booking (SERIALIZABLE + UPDLOCK/HOLDLOCK)
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.createBooking({
      ...dto,
      user_id: req.user.user_id,
    });
  }

  // ── USER: Xem lịch sử đặt phòng của mình ──────────────────
  // GET /api/bookings/my?userId=123
  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyBookings(@Req() req: any) {
    return this.bookingsService.getMyBookings(req.user.user_id);
  }

  // ── USER / ADMIN: Kiểm tra tình trạng phòng trống ─────────
  // GET /api/bookings/availability?roomTypeId=1&checkIn=2026-06-01&checkOut=2026-06-03
  @Get('availability')
  async checkAvailability(
    @Query('roomTypeId', ParseIntPipe) roomTypeId: number,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.bookingsService.checkAvailability(roomTypeId, checkIn, checkOut);
  }

  // ── ADMIN: Danh sách tất cả đặt phòng (paginated + filtered) ─
  // GET /api/bookings?status=pending&page=1&limit=20
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getAll(
    @Query('status')      status?: string,
    @Query('userId')      userId?: string,
    @Query('roomTypeId')  roomTypeId?: string,
    @Query('page')        page?: string,
    @Query('limit')       limit?: string,
  ) {
    return this.bookingsService.findAll({
      status,
      userId:     userId     ? Number(userId)     : undefined,
      roomTypeId: roomTypeId ? Number(roomTypeId) : undefined,
      page:       page       ? Number(page)       : 1,
      limit:      limit      ? Number(limit)      : 50,
    });
  }

  // ── ADMIN: Chi tiết một đặt phòng ─────────────────────────
  // GET /api/bookings/:id
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findById(id);
  }

  // ── ADMIN: Duyệt / hủy / hoàn thành đặt phòng ────────────
  // PATCH /api/bookings/:id/status
  // Body: { status: 'confirmed' | 'cancelled' | 'completed', admin_user_id: number }
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; admin_user_id: number },
  ) {
    return this.bookingsService.updateStatus(id, body.status, body.admin_user_id);
  }

  // ── USER: Hủy đặt phòng của mình ──────────────────────────
  // PATCH /api/bookings/:id/cancel
  // Body: { user_id: number }
  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.bookingsService.cancelBooking(id, req.user.user_id);
  }
}