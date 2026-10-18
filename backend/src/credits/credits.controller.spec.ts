import { CreditsController } from './credits.controller';

describe('CreditsController', () => {
  it('constructs with its current service dependencies', () => {
    const controller = new CreditsController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(controller).toBeInstanceOf(CreditsController);
  });
});
