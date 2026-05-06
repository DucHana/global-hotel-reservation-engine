import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { PricingModule } from './pricing/pricing.module';
import { SearchLogsModule } from './search-logs/search-logs.module';
import { ReportsModule } from './reports/reports.module';
import { SupportModule } from './support/support.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/hotel-reservation'),
    UsersModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    PricingModule,
    SearchLogsModule,
    ReportsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
