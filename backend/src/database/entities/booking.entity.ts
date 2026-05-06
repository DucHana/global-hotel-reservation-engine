import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  ForeignKey,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { RoomType } from './room-type.entity';

@Entity('bookings')
@Index(['user_id'])
@Index(['room_type_id'])
@Index(['check_in_date', 'check_out_date'])
@Index(['status'])
export class Booking {
  @PrimaryGeneratedColumn('increment')
  booking_id!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => User)
  user_id!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => RoomType)
  room_type_id!: number;

  @Column({ type: 'date' })
  check_in_date!: Date;

  @Column({ type: 'date' })
  check_out_date!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_price!: number;

  @Column({ type: 'nvarchar', length: 50, default: 'pending' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => RoomType, { eager: false })
  @JoinColumn({ name: 'room_type_id' })
  roomType?: RoomType;
}