import { Test, TestingModule } from '@nestjs/testing';
import { SearchLogsService } from './search-logs.service';

describe('SearchLogsService', () => {
  let service: SearchLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchLogsService],
    }).compile();

    service = module.get<SearchLogsService>(SearchLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
