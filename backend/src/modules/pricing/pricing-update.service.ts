import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from '../../database/entities/room-type.entity';
import { PriceHistory } from '../../database/entities/price-history.entity';

@Injectable()
export class PricingUpdateService {
  constructor(
    @InjectRepository(RoomType)
    private roomTypesRepository: Repository<RoomType>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async updatePrice(
    roomTypeId: number,
    newPrice: number,
    reason: string = '',
    userId: number,
  ) {
    // Find room type
    const roomType = await this.roomTypesRepository.findOne({
      where: { room_type_id: roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException('Loại phòng không tìm thấy');
    }

    const oldPrice = roomType.current_price;
    const changePct = ((newPrice - oldPrice) / oldPrice) * 100;
    const alertFlag = Math.abs(changePct) > 50 ? 1 : 0;

    // Update price in room_types (SQL trigger sẽ tự động ghi history)
    roomType.current_price = newPrice;
    await this.roomTypesRepository.save(roomType);

    // Ghi vào price_history (nếu trigger không tự động)
    const priceHistory = this.priceHistoryRepository.create({
      room_type_id: roomTypeId,
      old_price: oldPrice,
      new_price: newPrice,
      change_pct: parseFloat(changePct.toFixed(2)),
      changed_by: userId,
      alert_flag: alertFlag,
      note: reason,
    });
    await this.priceHistoryRepository.save(priceHistory);

    return {
      message: 'Cập nhật giá thành công',
      data: {
        room_type_id: roomTypeId,
        old_price: oldPrice,
        new_price: newPrice,
        change_pct: changePct.toFixed(2),
        alert_flag: alertFlag,
      },
    };
  }

  async getPriceHistory(roomTypeId?: number) {
    const query = this.priceHistoryRepository.createQueryBuilder('ph');

    if (roomTypeId) {
      query.where('ph.room_type_id = :roomTypeId', { roomTypeId });
    }

    return await query
      .orderBy('ph.changed_at', 'DESC')
      .limit(100)
      .getMany();
  }
}