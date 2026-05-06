import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không xác thực được người dùng');
    }

    if (!roles.includes(user.role)) {
      throw new ForbiddenException(
        `Chỉ ${roles.join(', ')} mới có quyền truy cập. User role: ${user.role}`,
      );
    }

    return true;
  }
}