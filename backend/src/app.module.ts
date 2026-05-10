import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { SearchLogsModule } from './modules/search-logs/search-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SupportModule } from './modules/support/support.module';

// Entities
import { User } from './database/entities/user.entity';
import { Hotel } from './database/entities/hotel.entity';
import { RoomType } from './database/entities/room-type.entity';
import { Booking } from './database/entities/booking.entity';
import { PriceHistory } from './database/entities/price-history.entity';
import { PricingRule } from './database/entities/pricing-rule.entity';
import { PricingSuggestion } from './database/entities/pricing-suggestion.entity';

@Module({
  imports: [
    // MongoDB Configuration
    MongooseModule.forRoot('mongodb://localhost/hotel-reservation'),

    // Environment Configuration (Load biến môi trường TRƯỚC)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // SQL Database Configuration (Chạy BẤT ĐỒNG BỘ để lấy biến môi trường)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const instanceName = configService.get<string>('DB_INSTANCE_NAME');
        return {
          type: 'mssql',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: !instanceName ? parseInt(configService.get<string>('DB_PORT') || '1433', 10) : undefined,
          username: configService.get<string>('DB_USER') || 'hotel_manager',
          password: configService.get<string>('DB_PASSWORD') || 'YourPassword123',
          database: configService.get<string>('DB_NAME') || 'hotel_management',
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
          logging: true,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            instanceName: instanceName || undefined,
          },
        };
      },
    }),

    // Modules
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomsModule,
    BookingsModule,
    PricingModule,
    AnalyticsModule,
    SearchLogsModule,
    ReportsModule,
    SupportModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}