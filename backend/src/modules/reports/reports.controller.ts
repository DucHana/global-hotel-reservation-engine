import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@Controller('api/reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'superadmin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('top-rooms-quarterly')
  async getTopRoomsQuarterly(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('hotelId') hotelId?: string,
  ) {
    return this.reportsService.getTopRoomsQuarterly({
      year: year ? Number(year) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      hotelId: hotelId ? Number(hotelId) : undefined,
    });
  }

  @Get('branch-performance')
  async getBranchPerformance(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    return this.reportsService.getBranchPerformance({
      year: year ? Number(year) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
    });
  }

  @Get('occupancy-overview')
  async getOccupancyOverview(@Query('hotelId') hotelId?: string) {
    return this.reportsService.getOccupancyOverview({
      hotelId: hotelId ? Number(hotelId) : undefined,
    });
  }
}
