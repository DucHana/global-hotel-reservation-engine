import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    registerDto: {
      full_name: string;
      email: string;
      password: string;
      phone?: string;
    },
  ) {
    // Validate input
    if (!registerDto.email || !registerDto.password || !registerDto.full_name) {
      throw new BadRequestException('Missing required fields');
    }

    if (registerDto.password.length < 6) {
      throw new BadRequestException('Password phải có ít nhất 6 ký tự');
    }

    return await this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body()
    loginDto: {
      email: string;
      password: string;
    },
  ) {
    // Validate input
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Email và password là bắt buộc');
    }

    return await this.authService.login(loginDto.email, loginDto.password);
  }
}