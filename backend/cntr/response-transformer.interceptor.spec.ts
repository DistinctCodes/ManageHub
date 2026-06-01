import { ResponseTransformerInterceptor } from './response-transformer.interceptor';
import { of } from 'rxjs';

describe('ResponseTransformerInterceptor', () => {
  it('wraps response in success envelope', (done) => {
    const interceptor = new ResponseTransformerInterceptor();
    const next = { handle: () => of({ id: 1 }) };
    interceptor.intercept({} as any, next as any).subscribe((result: any) => {
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1 });
      expect(typeof result.timestamp).toBe('string');
      done();
    });
  });
});