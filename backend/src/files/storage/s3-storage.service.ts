import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { IStorageService } from './storage.interface';
import { Readable } from 'stream';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly bucket = process.env.AWS_BUCKET;
  private readonly client = new S3Client({ region: process.env.AWS_REGION });

  async upload(
    fileId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileId,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileId}`;
  }

  async getStream(fileId: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: fileId }),
    );
    return res.Body as Readable;
  }

  async getMetadata(
    fileId: string,
  ): Promise<{ mimeType: string; originalName: string }> {
    // Simplified: storing original name in metadata is optional
    return { mimeType: 'application/octet-stream', originalName: fileId };
  }

  async delete(fileId: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: fileId }),
    );
  }
}
