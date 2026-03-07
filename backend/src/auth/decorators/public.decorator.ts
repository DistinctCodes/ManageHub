import { SetMetadata } from '@nestjs/common';

export const PUBLIC = 'public';
export const Public = () => SetMetadata(PUBLIC, true);
