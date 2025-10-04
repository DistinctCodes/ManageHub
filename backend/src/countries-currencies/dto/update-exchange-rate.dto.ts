import { PartialType } from '@nestjs/swagger';
import { CreateExchangeRateDto } from './create-exchange-rate.dto';

export class UpdateExchangeRateDto extends PartialType(CreateExchangeRateDto) {}
