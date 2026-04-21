import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: {
    full_name: string;
    email: string;
    password_hash: string;
    phone?: string | null;
    role?: string;
    is_active?: number;
  }) {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.usersRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const user = this.usersRepository.create({
      full_name: userData.full_name,
      email: userData.email,
      password_hash: userData.password_hash,
      phone: userData.phone ?? null,
      role: userData.role || 'customer',
      is_active: userData.is_active !== undefined ? userData.is_active : 1,
    });

    const savedUser = await this.usersRepository.save(user);

    return this.excludePassword(savedUser);
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User không tìm thấy');
    }

    return user;
  }

  async findById(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tìm thấy');
    }

    return this.excludePassword(user);
  }

  async validatePassword(plainPassword: string, hash: string) {
    return await bcrypt.compare(plainPassword, hash);
  }

  async updatePassword(userId: number, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.usersRepository.update(
      { user_id: userId },
      {
        password_hash: passwordHash,
        reset_token: null,
        reset_expires: null,
      },
    );

    return { message: 'Mật khẩu cập nhật thành công' };
  }

  // Helper: exclude password từ response
  private excludePassword(user: User) {
    const { password_hash, reset_token, reset_expires, ...result } = user;
    return result;
  }
}