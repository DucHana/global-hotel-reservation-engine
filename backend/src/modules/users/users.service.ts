import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // ✅ Lấy tất cả users
  async findAll() {
    const users = await this.usersRepository.find();
    return users.map(user => this.excludePassword(user));
  }

  // ✅ TẠO USER MỚI
  async createUser(userData: {
    full_name: string;
    email: string;
    password: string;
    phone?: string | null;
    role?: string;
  }) {
    // Kiểm tra email đã tồn tại
    const existingUser = await this.usersRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = this.usersRepository.create({
      full_name: userData.full_name,
      email: userData.email,
      password_hash: passwordHash,
      phone: userData.phone ?? null,
      role: userData.role || 'customer',
      is_active: 1,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.excludePassword(savedUser);
  }

  // ✅ CHỈNH SỬA USER
  async updateUser(
    userId: number,
    updateData: {
      full_name?: string;
      email?: string;
      phone?: string | null;
      role?: string;
      is_active?: number;
    },
  ) {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tìm thấy');
    }

    // Kiểm tra email nếu có thay đổi
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateData.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email này đã được sử dụng');
      }
    }

    // Cập nhật dữ liệu
    const updatedUser = this.usersRepository.merge(user, updateData);
    const savedUser = await this.usersRepository.save(updatedUser);

    return this.excludePassword(savedUser);
  }

  // ✅ XÓA USER (soft delete - chỉ set is_active = 0)
  async deleteUser(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tìm thấy');
    }

    await this.usersRepository.update(
      { user_id: userId },
      { is_active: 0 },
    );

    return { message: 'User đã bị xóa' };
  }

  async create(userData: {
    full_name: string;
    email: string;
    password_hash: string;
    phone?: string | null;
    role?: string;
    is_active?: number;
  }) {
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

  private excludePassword(user: User) {
    const { password_hash, reset_token, reset_expires, ...result } = user;
    return result;
  }
}