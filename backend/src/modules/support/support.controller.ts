// backend/src/modules/support/support.controller.ts — Thành viên 2
import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupportService } from './support.service';

@Controller('api/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ── USER: Gửi yêu cầu hỗ trợ ────────────────────────────────
  // POST /api/support
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createTicket(
    @Body()
    body: {
      user_id: string;
      user_name: string;
      user_email: string;
      subject: string;
      message: string;
      category?: string;
      priority?: string;
      booking_id?: string;
    },
  ) {
    return this.supportService.createTicket(body);
  }

  // ── USER: Xem ticket của mình ─────────────────────────────────
  // GET /api/support/my/:userId
  @Get('my/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getMyTickets(@Param('userId') userId: string) {
    return this.supportService.getMyTickets(userId);
  }

  // ── ADMIN: Danh sách tất cả tickets ──────────────────────────
  // GET /api/support?status=open&category=booking&page=1
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getAllTickets(
    @Query('status')   status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('page')     page?: string,
    @Query('limit')    limit?: string,
  ) {
    return this.supportService.getAllTickets({
      status, category, priority,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  // ── ADMIN: Thống kê tickets ───────────────────────────────────
  // GET /api/support/stats
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getStats() {
    return this.supportService.getTicketStats();
  }

  // ── ADMIN: Trả lời ticket ─────────────────────────────────────
  // POST /api/support/:id/reply
  @Post(':id/reply')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async replyTicket(
    @Param('id') id: string,
    @Body() body: { admin_id: string; admin_name: string; message: string },
  ) {
    return this.supportService.replyToTicket(
      id, body.admin_id, body.admin_name, body.message,
    );
  }

  // ── ADMIN: Đóng ticket ────────────────────────────────────────
  // PATCH /api/support/:id/resolve
  @Patch(':id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async resolveTicket(
    @Param('id') id: string,
    @Body() body: { admin_id: string },
  ) {
    return this.supportService.resolveTicket(id, body.admin_id);
  }
}
