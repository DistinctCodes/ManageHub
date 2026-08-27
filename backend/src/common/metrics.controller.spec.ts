import { Test } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  const renderPrometheus = jest
    .fn()
    .mockReturnValue(
      '# TYPE managehub_manual_review_queue_depth gauge\n' +
        'managehub_manual_review_queue_depth 3\n',
    );

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: { renderPrometheus },
        },
      ],
    }).compile();

    controller = moduleRef.get(MetricsController);
    service = moduleRef.get(MetricsService);
  });

  afterEach(() => {
    renderPrometheus.mockClear();
  });

  it('serves the manual-review queue depth on the scrape endpoint', () => {
    const body = controller.scrape();
    expect(body).toContain('managehub_manual_review_queue_depth 3');
    expect(service.renderPrometheus).toHaveBeenCalled();
  });
});
