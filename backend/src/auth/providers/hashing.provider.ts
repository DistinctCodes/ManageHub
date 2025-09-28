import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingProvider {
  abstract hash(data: string | Buffer): Promise<string>;

  abstract compare(data: string | Buffer, hashedData: string): Promise<boolean>;
}
