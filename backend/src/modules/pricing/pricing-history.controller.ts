import { Controller, Get, Param, Query } from '@nestjs/common';
import { PricingUpdateService } from './pricing-update.service';

@Controller('api/pricing')
export class PricingHistoryController {
  constructor(private pricingService: PricingUpdateService) {}

  // ✅ GET /api/pricing/history - Xem tất cả lịch sử
  @Get('history')
  async getAllHistory(@Query('roomTypeId') roomTypeId?: number) {
    const data = await this.pricingService.getPriceHistory(roomTypeId);
    return { 
      data, 
      total: data.length 
    };
  }

  // ✅ GET /api/pricing/history/:roomTypeId - Lịch sử 1 phòng
  @Get('history/:roomTypeId')
  async getHistoryByRoom(@Param('roomTypeId') roomTypeId: number) {
    const data = await this.pricingService.getPriceHistory(roomTypeId);
    return { 
      data, 
      total: data.length 
    };
  }
}