import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, ForeignKey } from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('pricing_rules')
@Index(['hotel_id'])
@Index(['is_active'])
export class PricingRule {
  @PrimaryGeneratedColumn('increment')
  rule_id!: number;

  @Column({ type: 'bigint', nullable: true })
  @ForeignKey(() => Hotel)
  hotel_id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  rule_name!: string;

  @Column({ type: 'nvarchar', length: 50 })
  rule_type!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  threshold_min!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  threshold_max!: number;

  @Column({ type: 'nvarchar', length: 50 })
  adjustment_type!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adjustment_value!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_price_cap!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  min_price_floor!: number;

  @Column({ type: 'date', nullable: true })
  valid_from!: Date;

  @Column({ type: 'date', nullable: true })
  valid_to!: Date;

  @Column({ type: 'tinyint', default: 5 })
  priority!: number;

  @Column({ type: 'bit', default: 1 })
  is_active!: number;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Hotel)
  hotel!: Hotel;
}