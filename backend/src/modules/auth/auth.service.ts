import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    // Validate
    if (!registerDto.email || !registerDto.password || !registerDto.full_name) {
      throw new BadRequestException('Missing required fields');
    }

    if (registerDto.password.length < 6) {
      throw new BadRequestException('Password phải có ít nhất 6 ký tự');
    }

    // Kiểm tra email đã tồn tại
    try {
      await this.usersService.findByEmail(registerDto.email);
      throw new ConflictException('Email đã được đăng ký');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // User không tìm thấy là expected
    }

    // Hash password với bcrypt cost 12
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.usersService.create({
      full_name: registerDto.full_name,
      email: registerDto.email,
      password_hash: hashedPassword,
      phone: registerDto.phone ?? null,
      role: 'customer',
      is_active: 1,
    });

    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    // Validate
    if (!email || !password) {
      throw new BadRequestException('Email và password là bắt buộc');
    }

    // Tìm user
    let user;
    try {
      user = await this.usersService.findByEmail(email);
    } catch (error) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Kiểm tra tài khoản active
    if (user.is_active === 0) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // So sánh password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '24h' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active === 1,
      },
    };
  }
}