import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PricingService {
  constructor(private dataSource: DataSource) {}

  async getSuggestedPrice(roomTypeId: number, occupancyRate: number) {
    const query = `
      DECLARE @suggested_price DECIMAL(15, 2);
      EXEC sp_calculate_suggested_price 
        @room_type_id = @roomTypeId,
        @occupancy_rate = @occupancyRate,
        @suggested_price = @suggested_price OUTPUT;
      SELECT @suggested_price as suggestedPrice;
    `;

    const result = await this.dataSource.query(query, [roomTypeId, occupancyRate]);
    return result[0];
  }

  async updatePrice(roomTypeId: number, newPrice: number, userId: number, notes?: string) {
    const query = `
      UPDATE room_types 
      SET current_price = @newPrice, updated_at = GETDATE()
      WHERE room_type_id = @roomTypeId;
      
      -- Trigger will automatically create price_history record
    `;

    return this.dataSource.query(query, [newPrice, roomTypeId]);
  }

  async getPriceHistory(roomTypeId: number, limit = 20) {
    return this.dataSource.query(
      `SELECT TOP @limit * FROM price_history 
       WHERE room_type_id = @roomTypeId
       ORDER BY changed_at DESC`,
      [limit, roomTypeId],
    );
  }

  async getPricingRules() {
    return this.dataSource.query(
      `SELECT * FROM pricing_rules WHERE is_active = 1 ORDER BY priority DESC`,
    );
  }
}