import { CreditsAdminController } from './credits-admin.controller';

describe('CreditsAdminController', () => {
  it('constructs with its current service dependencies', () => {
    const controller = new CreditsAdminController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(controller).toBeInstanceOf(CreditsAdminController);
  });
});
