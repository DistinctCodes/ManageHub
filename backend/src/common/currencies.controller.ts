import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrencyMetadata, supportedCurrencies } from './currency-code';

export class CurrencyDto implements CurrencyMetadata {
  @ApiProperty() code: string;
  @ApiProperty({ description: 'Decimal places in one major unit' }) exponent: number;
}

export class CurrenciesResponseDto {
  @ApiProperty({ type: [CurrencyDto] }) currencies: CurrencyDto[];
}

@ApiTags('currencies')
@Controller('currencies')
export class CurrenciesController {
  @Get()
  @ApiOperation({
    summary: 'List supported currencies with their minor-unit exponents',
    description:
      'Clients use exponent to convert integer minor-unit amounts returned ' +
      'by the API into display values, including non-ISO Stellar assets.',
  })
  @ApiResponse({ status: 200, type: CurrenciesResponseDto })
  getCurrencies(): CurrenciesResponseDto {
    return { currencies: supportedCurrencies() };
  }
}
