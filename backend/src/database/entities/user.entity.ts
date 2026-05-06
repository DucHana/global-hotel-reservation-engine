import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Index(['email'])
@Index(['role'])
@Index(['is_active'])
export class User {
  @PrimaryGeneratedColumn('increment')
  user_id!: number;

  @Column({ type: 'nvarchar', length: 150 })
  full_name!: string;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'nvarchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'nvarchar', length: 50, default: 'customer' })
  role!: string;

  @Column({ type: 'bit', default: 1 })
  is_active!: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  reset_token!: string | null;

  @Column({ type: 'datetime', nullable: true })
  reset_expires!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}