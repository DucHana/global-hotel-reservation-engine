import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ForeignKey,
  JoinColumn,
} from 'typeorm';
import { Hotel } from './hotel.entity';

@Entity('room_types')
@Index(['hotel_id'])
@Index(['is_active'])
export class RoomType {
  @PrimaryGeneratedColumn('increment')
  room_type_id!: number;

  @Column({ type: 'bigint' })
  @ForeignKey(() => Hotel)
  hotel_id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ type: 'nvarchar', nullable: true })
  description?: string | null;

  @Column({ type: 'tinyint' })
  capacity!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  base_price!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  current_price!: number;

  @Column({ type: 'smallint' })
  total_rooms!: number;

  @Column({ type: 'bit', default: 1 })
  is_active!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Hotel, { eager: false })
  @JoinColumn({ name: 'hotel_id' })
  hotel?: Hotel;
}