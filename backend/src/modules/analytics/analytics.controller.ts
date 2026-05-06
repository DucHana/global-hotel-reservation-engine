import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { DashboardResponse, MonthlyRevenueData } from './analytics.types';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // ✅ GET /api/analytics/dashboard
  @Get('dashboard')
  async getDashboard(): Promise<DashboardResponse> {
    return await this.analyticsService.getDashboard();
  }

  // ✅ GET /api/analytics/revenue
  @Get('revenue')
  async getRevenue(): Promise<{ data: MonthlyRevenueData[] }> {
    const data = await this.analyticsService.getRevenue();
    return { data };
  }
}