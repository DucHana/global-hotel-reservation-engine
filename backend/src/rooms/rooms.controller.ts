import { Controller, Post, Body, Get, Query, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() body: any) {
    return this.roomsService.createRoomType(body);
  }

  @Get('search')
  async search(@Query() query: any, @Req() req: any) {
    const userId = req.headers['x-user-id'] || undefined;
    const sessionId =
      req.headers['x-session-id'] || `temp-session-${Date.now()}`;

    return this.roomsService.searchRooms(query, userId, sessionId);
  }
}
