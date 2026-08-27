import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns a 503 when health is degraded', async () => {
    const appService = {
      getHealth: jest.fn().mockResolvedValue({
        status: 'degraded',
        dependencies: {
          postgres: { status: 'down', detail: 'db unreachable' },
          redis: { status: 'up' },
        },
      }),
    };
    const metrics = { renderPrometheus: jest.fn().mockReturnValue('') };
    const res = {
      status: jest.fn().mockReturnThis(),
    } as any;
    const controller = new AppController(appService as any, metrics as any);

    const result = await controller.getHealth(res);

    expect(result.status).toBe('degraded');
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
