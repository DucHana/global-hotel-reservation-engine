import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // ✅ GET /api/users - Lấy tất cả users
  @Get()
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return {
      data: users,
      total: users.length,
    };
  }

  // ✅ GET /api/users/:id - Lấy user theo ID
  @Get(':id')
  async getUserById(@Param('id') userId: number) {
    return await this.usersService.findById(userId);
  }

  // ✅ POST /api/users - TẠO USER MỚI
  @Post()
  @HttpCode(201)
  async createUser(
    @Body() createUserDto: {
      full_name: string;
      email: string;
      password: string;
      phone?: string;
      role?: string;
    },
  ) {
    if (!createUserDto.full_name || !createUserDto.email || !createUserDto.password) {
      throw new BadRequestException('full_name, email, password là bắt buộc');
    }

    const newUser = await this.usersService.createUser(createUserDto);
    return {
      message: 'Tạo user thành công',
      data: newUser,
    };
  }

  // ✅ PUT /api/users/:id - CHỈNH SỬA USER
  @Put(':id')
  async updateUser(
    @Param('id') userId: number,
    @Body() updateUserDto: {
      full_name?: string;
      email?: string;
      phone?: string | null;
      role?: string;
      is_active?: number;
    },
  ) {
    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('Cần ít nhất một trường để cập nhật');
    }

    const updatedUser = await this.usersService.updateUser(userId, updateUserDto);
    return {
      message: 'Cập nhật user thành công',
      data: updatedUser,
    };
  }

  // ✅ DELETE /api/users/:id - XÓA USER
  @Delete(':id')
  @HttpCode(200)
  async deleteUser(@Param('id') userId: number) {
    return await this.usersService.deleteUser(userId);
  }
}