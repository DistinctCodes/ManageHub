// uploads/dto/uploaded-file.dto.ts

export class UploadedFileDto {
  id: number;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}
