import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingRule } from '../../database/entities/pricing-rule.entity';

@Injectable()
export class PricingRulesService {
  constructor(
    @InjectRepository(PricingRule)
    private rulesRepository: Repository<PricingRule>,
  ) {}

  async findAll(hotelId?: number) {
    const query = this.rulesRepository.createQueryBuilder('pr');
    if (hotelId) {
      query.where('pr.hotel_id = :hotelId', { hotelId });
    }
    return await query.orderBy('pr.priority', 'ASC').getMany();
  }

  async findById(ruleId: number) {
    const rule = await this.rulesRepository.findOne({
      where: { rule_id: ruleId },
    });
    if (!rule) throw new NotFoundException('Quy tắc không tìm thấy');
    return rule;
  }

  async create(data: {
    hotel_id?: number;
    rule_name: string;
    rule_type: 'occupancy' | 'season' | 'event' | 'demand';
    threshold_min: number;
    threshold_max: number;
    adjustment_type: 'percent' | 'fixed';
    adjustment_value: number;
    max_price_cap?: number;
    min_price_floor?: number;
    valid_from?: Date;
    valid_to?: Date;
    priority?: number;
  }) {
    // Validate
    if (data.threshold_min > data.threshold_max) {
      throw new BadRequestException('threshold_min phải ≤ threshold_max');
    }
    if (data.adjustment_value < 0) {
      throw new BadRequestException('adjustment_value phải ≥ 0');
    }

    const rule = this.rulesRepository.create({
      ...data,
      priority: data.priority || 5,
      is_active: 1,
    });
    return await this.rulesRepository.save(rule);
  }

  async update(ruleId: number, data: Partial<PricingRule>) {
    const rule = await this.findById(ruleId);
    Object.assign(rule, data);
    return await this.rulesRepository.save(rule);
  }

  async delete(ruleId: number) {
    await this.findById(ruleId);
    await this.rulesRepository.delete(ruleId);
    return { message: 'Xóa quy tắc thành công' };
  }

  async toggleActive(ruleId: number) {
    const rule = await this.findById(ruleId);
    rule.is_active = rule.is_active ? 0 : 1;
    return await this.rulesRepository.save(rule);
  }
}