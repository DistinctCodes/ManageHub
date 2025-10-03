import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CountriesCurrenciesService } from './countries-currencies.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@ApiTags('countries-currencies')
@ApiBearerAuth()
@Controller('countries-currencies')
export class CountriesCurrenciesController {
  constructor(private readonly countriesCurrenciesService: CountriesCurrenciesService) {}

  // ====== COUNTRIES ENDPOINTS ======

  @Post('countries')
  @ApiOperation({ summary: 'Create a new country' })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  @ApiResponse({ status: 409, description: 'Country with this ISO code already exists' })
  async createCountry(@Body() createCountryDto: CreateCountryDto) {
    const country = await this.countriesCurrenciesService.createCountry(createCountryDto);
    return {
      success: true,
      message: 'Country created successfully',
      data: country,
    };
  }

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  @ApiResponse({ status: 200, description: 'Countries retrieved successfully' })
  async findAllCountries() {
    const countries = await this.countriesCurrenciesService.findAllCountries();
    return {
      success: true,
      data: countries,
    };
  }

  @Get('countries/:id')
  @ApiOperation({ summary: 'Get a country by ID' })
  @ApiResponse({ status: 200, description: 'Country retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findCountryById(@Param('id', ParseUUIDPipe) id: string) {
    const country = await this.countriesCurrenciesService.findCountryById(id);
    return {
      success: true,
      data: country,
    };
  }

  @Get('countries/code/:code')
  @ApiOperation({ summary: 'Get a country by ISO code' })
  @ApiResponse({ status: 200, description: 'Country retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findCountryByCode(@Param('code') code: string) {
    const country = await this.countriesCurrenciesService.findCountryByCode(code);
    return {
      success: true,
      data: country,
    };
  }

  @Patch('countries/:id')
  @ApiOperation({ summary: 'Update a country' })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 409, description: 'Country with this ISO code already exists' })
  async updateCountry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCountryDto: UpdateCountryDto,
  ) {
    const country = await this.countriesCurrenciesService.updateCountry(id, updateCountryDto);
    return {
      success: true,
      message: 'Country updated successfully',
      data: country,
    };
  }

  @Delete('countries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a country (soft delete)' })
  @ApiResponse({ status: 204, description: 'Country deleted successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async deleteCountry(@Param('id', ParseUUIDPipe) id: string) {
    await this.countriesCurrenciesService.deleteCountry(id);
  }

  // ====== CURRENCIES ENDPOINTS ======

  @Post('currencies')
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  @ApiResponse({ status: 409, description: 'Currency with this code already exists' })
  async createCurrency(@Body() createCurrencyDto: CreateCurrencyDto) {
    const currency = await this.countriesCurrenciesService.createCurrency(createCurrencyDto);
    return {
      success: true,
      message: 'Currency created successfully',
      data: currency,
    };
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'Currencies retrieved successfully' })
  async findAllCurrencies() {
    const currencies = await this.countriesCurrenciesService.findAllCurrencies();
    return {
      success: true,
      data: currencies,
    };
  }

  @Get('currencies/:id')
  @ApiOperation({ summary: 'Get a currency by ID' })
  @ApiResponse({ status: 200, description: 'Currency retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async findCurrencyById(@Param('id', ParseUUIDPipe) id: string) {
    const currency = await this.countriesCurrenciesService.findCurrencyById(id);
    return {
      success: true,
      data: currency,
    };
  }

  @Get('currencies/code/:code')
  @ApiOperation({ summary: 'Get a currency by code' })
  @ApiResponse({ status: 200, description: 'Currency retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async findCurrencyByCode(@Param('code') code: string) {
    const currency = await this.countriesCurrenciesService.findCurrencyByCode(code);
    return {
      success: true,
      data: currency,
    };
  }

  @Patch('currencies/:id')
  @ApiOperation({ summary: 'Update a currency' })
  @ApiResponse({ status: 200, description: 'Currency updated successfully' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  @ApiResponse({ status: 409, description: 'Currency with this code already exists' })
  async updateCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    const currency = await this.countriesCurrenciesService.updateCurrency(id, updateCurrencyDto);
    return {
      success: true,
      message: 'Currency updated successfully',
      data: currency,
    };
  }

  @Delete('currencies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a currency (soft delete)' })
  @ApiResponse({ status: 204, description: 'Currency deleted successfully' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async deleteCurrency(@Param('id', ParseUUIDPipe) id: string) {
    await this.countriesCurrenciesService.deleteCurrency(id);
  }

  // ====== EXCHANGE RATES ENDPOINTS ======

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create a new exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created successfully' })
  @ApiResponse({ status: 409, description: 'Exchange rate for this currency pair and date already exists' })
  async createExchangeRate(@Body() createExchangeRateDto: CreateExchangeRateDto) {
    const exchangeRate = await this.countriesCurrenciesService.createExchangeRate(createExchangeRateDto);
    return {
      success: true,
      message: 'Exchange rate created successfully',
      data: exchangeRate,
    };
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get all exchange rates' })
  @ApiResponse({ status: 200, description: 'Exchange rates retrieved successfully' })
  async findAllExchangeRates() {
    const exchangeRates = await this.countriesCurrenciesService.findAllExchangeRates();
    return {
      success: true,
      data: exchangeRates,
    };
  }

  @Get('exchange-rates/:id')
  @ApiOperation({ summary: 'Get an exchange rate by ID' })
  @ApiResponse({ status: 200, description: 'Exchange rate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  async findExchangeRateById(@Param('id', ParseUUIDPipe) id: string) {
    const exchangeRate = await this.countriesCurrenciesService.findExchangeRateById(id);
    return {
      success: true,
      data: exchangeRate,
    };
  }

  @Get('exchange-rates/current')
  @ApiOperation({ summary: 'Get current exchange rate between two currencies' })
  @ApiQuery({ name: 'from', description: 'Source currency ID' })
  @ApiQuery({ name: 'to', description: 'Target currency ID' })
  @ApiResponse({ status: 200, description: 'Current exchange rate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Current exchange rate not found' })
  async findCurrentExchangeRate(
    @Query('from', ParseUUIDPipe) fromCurrencyId: string,
    @Query('to', ParseUUIDPipe) toCurrencyId: string,
  ) {
    const exchangeRate = await this.countriesCurrenciesService.findCurrentExchangeRate(fromCurrencyId, toCurrencyId);
    return {
      success: true,
      data: exchangeRate,
    };
  }

  @Patch('exchange-rates/:id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate updated successfully' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  async updateExchangeRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExchangeRateDto: UpdateExchangeRateDto,
  ) {
    const exchangeRate = await this.countriesCurrenciesService.updateExchangeRate(id, updateExchangeRateDto);
    return {
      success: true,
      message: 'Exchange rate updated successfully',
      data: exchangeRate,
    };
  }

  @Delete('exchange-rates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exchange rate (soft delete)' })
  @ApiResponse({ status: 204, description: 'Exchange rate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Exchange rate not found' })
  async deleteExchangeRate(@Param('id', ParseUUIDPipe) id: string) {
    await this.countriesCurrenciesService.deleteExchangeRate(id);
  }

  // ====== UTILITY ENDPOINTS ======

  @Get('base-currency')
  @ApiOperation({ summary: 'Get the base currency' })
  @ApiResponse({ status: 200, description: 'Base currency retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No base currency found' })
  async getBaseCurrency() {
    const baseCurrency = await this.countriesCurrenciesService.getBaseCurrency();
    return {
      success: true,
      data: baseCurrency,
    };
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiQuery({ name: 'from', description: 'Source currency ID' })
  @ApiQuery({ name: 'to', description: 'Target currency ID' })
  @ApiQuery({ name: 'amount', description: 'Amount to convert' })
  @ApiResponse({ status: 200, description: 'Amount converted successfully' })
  @ApiResponse({ status: 404, description: 'Current exchange rate not found' })
  async convertAmount(
    @Query('from', ParseUUIDPipe) fromCurrencyId: string,
    @Query('to', ParseUUIDPipe) toCurrencyId: string,
    @Query('amount') amount: number,
  ) {
    const convertedAmount = await this.countriesCurrenciesService.convertAmount(fromCurrencyId, toCurrencyId, amount);
    return {
      success: true,
      data: {
        originalAmount: amount,
        convertedAmount,
        fromCurrencyId,
        toCurrencyId,
      },
    };
  }
}
