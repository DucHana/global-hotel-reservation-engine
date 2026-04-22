import { Controller, Get, Post, Body, UseGuards, Req, Param, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PricingUpdateService } from './pricing-update.service';

@Controller('api/pricing')
export class PricingUpdateController {
  constructor(private pricingService: PricingUpdateService) {}

  // ✅ GET /api/pricing/history - Xem lịch sử cập nhật giá
  @Get('history')
  async getPriceHistory(@Query('roomTypeId') roomTypeId?: number) {
    const data = await this.pricingService.getPriceHistory(roomTypeId);
    return { 
      data, 
      total: data.length 
    };
  }

  // ✅ GET /api/pricing/history/:roomTypeId - Lịch sử giá của 1 phòng
  @Get('history/:roomTypeId')
  async getPriceHistoryByRoom(@Param('roomTypeId') roomTypeId: number) {
    const data = await this.pricingService.getPriceHistory(roomTypeId);
    return { 
      data, 
      total: data.length 
    };
  }

  // ✅ POST /api/pricing/update-price - Cập nhật giá
  @Post('update-price')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'manager')
  async updatePrice(
    @Body() updatePriceDto: {
      room_type_id: number;
      new_price: number;
      reason?: string;
    },
    @Req() req: any,
  ) {
    const userId = req.user.user_id;
    return await this.pricingService.updatePrice(
      updatePriceDto.room_type_id,
      updatePriceDto.new_price,
      updatePriceDto.reason,
      userId,
    );
  }
}