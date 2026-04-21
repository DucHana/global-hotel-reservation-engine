import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, ForeignKey } from 'typeorm';
import { RoomType } from './room-type.entity';
import { User } from './user.entity';
import { PricingRule } from './pricing-rule.entity';

@Entity('pricing_suggestions')
@Index(['status'])
@Index(['room_type_id'])
export class PricingSuggestion {
  @PrimaryGeneratedColumn('increment')
  suggestion_id!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => RoomType)
  room_type_id!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  current_price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  suggested_price!: number;

  @Column({ type: 'nvarchar' })
  reason!: string;

  @Column({ type: 'nvarchar', length: 100 })
  triggered_by!: string;

  @Column({ type: 'bigint', nullable: true })
  @ForeignKey(() => PricingRule)
  rule_id!: number;

  @Column({ type: 'nvarchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'bigint', nullable: true })
  @ForeignKey(() => User)
  approved_by!: number;

  @Column({ type: 'datetime', nullable: true })
  approved_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => RoomType)
  roomType!: RoomType;

  @ManyToOne(() => User)
  approvedByUser!: User;

  @ManyToOne(() => PricingRule)
  rule!: PricingRule;
}