// backend/src/modules/rooms/rooms.module.ts (updated — Thành viên 2)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomType } from '../../database/entities/room-type.entity';
import { RoomCatalog, RoomCatalogSchema } from './schemas/room-catalog.schema';

@Module({
  imports: [
    // SQL Server: availability, pricing
    TypeOrmModule.forFeature([RoomType]),
    // MongoDB: catalog (amenities, images, descriptions)
    MongooseModule.forFeature([
      { name: RoomCatalog.name, schema: RoomCatalogSchema },
    ]),
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}