import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { Hotel } from '../../database/entities/hotel.entity';
import { RoomType } from '../../database/entities/room-type.entity';
import { RoomCatalog, RoomCatalogSchema } from '../rooms/schemas/room-catalog.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hotel, RoomType]),
    MongooseModule.forFeature([
      { name: RoomCatalog.name, schema: RoomCatalogSchema },
    ]),
  ],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}