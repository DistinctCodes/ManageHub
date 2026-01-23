import { Readable } from 'stream';

export interface IStorageService {
  upload(fileId: string, buffer: Buffer, mimeType: string): Promise<string>;
  getStream(fileId: string): Promise<Readable>;
  getMetadata(fileId: string): Promise<{ mimeType: string; originalName: string }>;
  delete(fileId: string): Promise<void>;
}
