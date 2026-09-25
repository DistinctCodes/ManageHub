import 'reflect-metadata';
import { CreditsAdminController } from '../credits/credits-admin.controller';
import { PaymentsAdminController } from './payments-admin.controller';

type Handler = (...args: any[]) => unknown;
type SwaggerResponse = {
  description?: string;
  type?: unknown;
};

describe('admin Swagger metadata', () => {
  it('documents every admin handler with a response', () => {
    for (const Controller of [
      PaymentsAdminController,
      CreditsAdminController,
    ]) {
      const prototype = Controller.prototype as unknown as Record<
        string,
        Handler
      >;
      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor',
      );

      expect(methodNames.length).toBeGreaterThan(0);
      for (const methodName of methodNames) {
        const handler = prototype[methodName];
        expect(Reflect.getMetadata('swagger/apiOperation', handler)).toBeDefined();

        const responses = Reflect.getMetadata(
          'swagger/apiResponse',
          handler,
        ) as Record<string, SwaggerResponse> | undefined;
        expect(responses).toBeDefined();
        expect(Object.keys(responses ?? {}).length).toBeGreaterThan(0);
        expect(
          Object.values(responses ?? {}).some(
            (response) =>
              response.type !== undefined || Boolean(response.description),
          ),
        ).toBe(true);
      }
    }
  });
});
