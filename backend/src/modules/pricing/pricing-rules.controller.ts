import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PricingRulesService } from './pricing-rules.service';

@Controller('api/pricing')
export class PricingRulesController {
  constructor(private rulesService: PricingRulesService) {}

  // ✅ GET /api/pricing - Lấy tất cả pricing rules
  @Get()
  async getAll(@Query('hotelId') hotelId?: number) {
    const data = await this.rulesService.findAll(hotelId);
    return { data, total: data.length };
  }

  // ✅ GET /api/pricing/rules - Lấy tất cả pricing rules (alternative)
  @Get('rules')
  async getAllRules(@Query('hotelId') hotelId?: number) {
    const data = await this.rulesService.findAll(hotelId);
    return { data, total: data.length };
  }

  @Get('rules/:id')
  async getById(@Param('id') ruleId: number) {
    return await this.rulesService.findById(ruleId);
  }

  @Post('rules')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async create(@Body() createRuleDto: any) {
    const rule = await this.rulesService.create(createRuleDto);
    return { message: 'Tạo quy tắc giá thành công', data: rule };
  }

  @Put('rules/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async update(@Param('id') ruleId: number, @Body() updateRuleDto: any) {
    const rule = await this.rulesService.update(ruleId, updateRuleDto);
    return { message: 'Cập nhật quy tắc thành công', data: rule };
  }

  @Delete('rules/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async delete(@Param('id') ruleId: number) {
    return await this.rulesService.delete(ruleId);
  }

  @Patch('rules/:id/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async toggleActive(@Param('id') ruleId: number) {
    return await this.rulesService.toggleActive(ruleId);
  }
}