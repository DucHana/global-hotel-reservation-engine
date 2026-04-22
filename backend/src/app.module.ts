import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { RoomsModule } from './modules/rooms/rooms.module';

// Entities
import { User } from './database/entities/user.entity';
import { Hotel } from './database/entities/hotel.entity';
import { RoomType } from './database/entities/room-type.entity';
import { Booking } from './database/entities/booking.entity';
import { PriceHistory } from './database/entities/price-history.entity';
import { PricingRule } from './database/entities/pricing-rule.entity';
import { PricingSuggestion } from './database/entities/pricing-suggestion.entity';

// Health
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      username: process.env.DB_USER || 'hotel_manager',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'hotel_management',
      entities: [
        User,
        Hotel,
        RoomType,
        Booking,
        PriceHistory,
        PricingRule,
        PricingSuggestion,
      ],
      synchronize: false,
      logging: false,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    }),

    AuthModule,
    UsersModule,
    HotelsModule,
    RoomsModule,
    BookingsModule,
    PricingModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}