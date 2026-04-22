import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Booking } from '../../database/entities/booking.entity';
import { PriceHistory } from '../../database/entities/price-history.entity';
import { User } from '../../database/entities/user.entity';
import { RoomType } from '../../database/entities/room-type.entity';
import { Hotel } from '../../database/entities/hotel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, PriceHistory, User, RoomType, Hotel])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}