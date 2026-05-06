import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomType } from '../../database/entities/room-type.entity';
import { PriceHistory } from '../../database/entities/price-history.entity';
import { PricingRule } from '../../database/entities/pricing-rule.entity';

// Services
import { PricingRulesService } from './pricing-rules.service';
import { PricingUpdateService } from './pricing-update.service';

// Controllers
import { PricingRulesController } from './pricing-rules.controller';
import { PricingUpdateController } from './pricing-update.controller';
import { PricingHistoryController } from './pricing-history.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomType, PriceHistory, PricingRule]),
  ],
  controllers: [
    PricingRulesController,
    PricingUpdateController,
    PricingHistoryController, // ✅ Thêm
  ],
  providers: [PricingRulesService, PricingUpdateService],
  exports: [PricingRulesService, PricingUpdateService],
})
export class PricingModule {}