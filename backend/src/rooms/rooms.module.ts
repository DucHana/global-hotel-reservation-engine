import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomType, RoomTypeSchema } from './schemas/room-type.schema';
import {
  HotelCatalog,
  HotelCatalogSchema,
} from './schemas/hotel-catalog.schema';
import {
  CustomerSearchLog,
  CustomerSearchLogSchema,
} from '../search-logs/schemas/customer-search-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: HotelCatalog.name, schema: HotelCatalogSchema },
      { name: CustomerSearchLog.name, schema: CustomerSearchLogSchema },
    ]),
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
