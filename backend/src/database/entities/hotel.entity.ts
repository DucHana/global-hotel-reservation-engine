import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hotels')
@Index(['city'])
@Index(['is_active'])
export class Hotel {
  @PrimaryGeneratedColumn('increment')
  hotel_id!: number;

  @Column({ type: 'nvarchar', length: 200 })
  name!: string;

  @Column({ type: 'nvarchar', length: 100 })
  city!: string;

  @Column({ type: 'nvarchar' })
  address!: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone!: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  email!: string;

  @Column({ type: 'bit', default: 1 })
  is_active!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}