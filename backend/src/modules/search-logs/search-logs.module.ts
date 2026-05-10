// backend/src/modules/search-logs/search-logs.module.ts (updated — Thành viên 2)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchLogsService } from './search-logs.service';
import { SearchLogsController } from './search-logs.controller';
import {
  CustomerSearchLog,
  CustomerSearchLogSchema,
} from './schemas/customer-search-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSearchLog.name, schema: CustomerSearchLogSchema },
    ]),
  ],
  controllers: [SearchLogsController],
  providers: [SearchLogsService],
  exports: [SearchLogsService],
})
export class SearchLogsModule {}
