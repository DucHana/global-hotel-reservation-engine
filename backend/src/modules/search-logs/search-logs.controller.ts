import { Controller } from '@nestjs/common';
import { SearchLogsService } from './search-logs.service';

@Controller('search-logs')
export class SearchLogsController {
  constructor(private readonly searchLogsService: SearchLogsService) {}
}
