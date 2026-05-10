// ═══════════════════════════════════════════════════════════════
// search-logs.controller.ts — Thành viên 2
// REST endpoints: log search events + analytics aggregations
// ═══════════════════════════════════════════════════════════════
import {
  Controller, Post, Get, Body, Query, Param, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchLogsService } from './search-logs.service';

@Controller('api/search-logs')
export class SearchLogsController {
  constructor(private readonly searchLogsService: SearchLogsService) {}

  // ── USER: Log a search event (called automatically on search) ──
  // POST /api/search-logs
  @Post()
  async logSearch(
    @Body()
    body: {
      city: string;
      check_in: string;
      check_out: string;
      guests?: number;
      filters?: Record<string, unknown>;
      results_count?: number;
      user_id?: string;
      session_id: string;
      response_time_ms?: number;
    },
  ) {
    return this.searchLogsService.logSearch(body);
  }

  // ── USER: Mark conversion (user booked after searching) ────────
  // POST /api/search-logs/convert
  @Post('convert')
  async markConverted(
    @Body() body: { session_id: string; room_type_id: string },
  ) {
    return this.searchLogsService.markConverted(body.session_id, body.room_type_id);
  }

  // ── ADMIN: Get recent search logs ──────────────────────────────
  // GET /api/search-logs?limit=50
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getRecentLogs(@Query('limit') limit?: string) {
    return this.searchLogsService.getRecentLogs(limit ? Number(limit) : 50);
  }

  // ── ANALYTICS: Top cities by search volume ─────────────────────
  // GET /api/search-logs/analytics/top-cities?days=30&limit=10
  @Get('analytics/top-cities')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getTopCities(
    @Query('days')  days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchLogsService.getTopCities(
      days  ? Number(days)  : 30,
      limit ? Number(limit) : 10,
    );
  }

  // ── ANALYTICS: Popular amenities ───────────────────────────────
  // GET /api/search-logs/analytics/popular-amenities?days=30
  @Get('analytics/popular-amenities')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getPopularAmenities(@Query('days') days?: string) {
    return this.searchLogsService.getPopularAmenities(days ? Number(days) : 30);
  }

  // ── ANALYTICS: Daily search trend ──────────────────────────────
  // GET /api/search-logs/analytics/trend?days=14
  @Get('analytics/trend')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getSearchTrend(@Query('days') days?: string) {
    return this.searchLogsService.getSearchTrend(days ? Number(days) : 14);
  }

  // ── ANALYTICS: Price range preferences ─────────────────────────
  // GET /api/search-logs/analytics/price-preferences?days=30
  @Get('analytics/price-preferences')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin')
  async getPricePreferences(@Query('days') days?: string) {
    return this.searchLogsService.getPriceRangePreferences(days ? Number(days) : 30);
  }

  // ── USER: Get own search history ────────────────────────────
  // GET /api/search-logs/history/:userId
  @Get('history/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getUserHistory(
    @Param('userId') userId: string,
    @Query('limit')  limit?: string,
  ) {
    return this.searchLogsService.getUserHistory(userId, limit ? Number(limit) : 20);
  }
}
