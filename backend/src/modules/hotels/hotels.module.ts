// backend/src/modules/hotels/hotels.module.ts
import { Module } from '@nestjs/common';
import { HotelsController } from './hotels.controller';

@Module({
  controllers: [HotelsController],
})
export class HotelsModule {}