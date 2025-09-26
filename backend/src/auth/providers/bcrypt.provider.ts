import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { HashingProvider } from './hashing.provider';

@Injectable()
export class BcryptProvider extends HashingProvider {
  private readonly saltRounds: number;

  constructor() {
    super();
    this.saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
  }

  async hash(data: string | Buffer): Promise<string> {
    const plain = Buffer.isBuffer(data) ? data.toString('utf8') : data;
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(plain, salt);
  }

  async compare(data: string | Buffer, hashedData: string): Promise<boolean> {
    const plain = Buffer.isBuffer(data) ? data.toString('utf8') : data;
    return bcrypt.compare(plain, hashedData);
  }
}