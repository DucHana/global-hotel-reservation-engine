import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, ForeignKey } from 'typeorm';
import { RoomType } from './room-type.entity';
import { User } from './user.entity';

@Entity('price_history')
@Index(['room_type_id'])
@Index(['alert_flag'])
@Index(['changed_at'])
export class PriceHistory {
  @PrimaryGeneratedColumn('increment')
  price_history_id!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => RoomType)
  room_type_id!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  old_price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  new_price!: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  change_pct!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => User)
  changed_by!: number;

  @Column({ type: 'bit', default: 0 })
  alert_flag!: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  note!: string;

  @CreateDateColumn()
  changed_at!: Date;

  @ManyToOne(() => RoomType)
  roomType!: RoomType;

  @ManyToOne(() => User)
  changedByUser!: User;
}