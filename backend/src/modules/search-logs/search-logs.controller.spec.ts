import { Test, TestingModule } from '@nestjs/testing';
import { SearchLogsController } from './search-logs.controller';
import { SearchLogsService } from './search-logs.service';

describe('SearchLogsController', () => {
  let controller: SearchLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchLogsController],
      providers: [SearchLogsService],
    }).compile();

    controller = module.get<SearchLogsController>(SearchLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
