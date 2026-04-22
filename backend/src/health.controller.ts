import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get('health')
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'ok', db: 'disconnected', timestamp: new Date().toISOString() };
    }
  }
}