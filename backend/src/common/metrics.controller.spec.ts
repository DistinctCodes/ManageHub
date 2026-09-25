import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';

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

  it('is gated by MetricsAuthGuard (issue #1781)', () => {
    const guards = new Reflector().get('__guards__', MetricsController) as
      | unknown[]
      | undefined;
    expect(guards).toBeDefined();
    expect(guards).toContainEqual(MetricsAuthGuard);
  });
});
