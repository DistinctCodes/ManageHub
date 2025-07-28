import { PartialType } from '@nestjs/swagger';
import { CreateServiceVendorVisitDto } from './create-service-vendor-visit.dto';

export class UpdateServiceVendorVisitDto extends PartialType(CreateServiceVendorVisitDto) {}
