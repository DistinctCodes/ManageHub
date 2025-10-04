import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Country } from './entities/country.entity';
import { Currency } from './entities/currency.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@Injectable()
export class CountriesCurrenciesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
  ) {}

  // ====== COUNTRIES ======

  async createCountry(createCountryDto: CreateCountryDto): Promise<Country> {
    // Check for duplicate ISO codes
    const existingCountry = await this.countryRepository.findOne({
      where: [
        { iso2Code: createCountryDto.iso2Code },
        { iso3Code: createCountryDto.iso3Code },
      ],
    });

    if (existingCountry) {
      throw new ConflictException('Country with this ISO code already exists');
    }

    const country = this.countryRepository.create(createCountryDto);
    return await this.countryRepository.save(country);
  }

  async findAllCountries(): Promise<Country[]> {
    return await this.countryRepository.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  async findCountryById(id: string): Promise<Country> {
    const country = await this.countryRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['currencies'],
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async findCountryByCode(iso2Code: string): Promise<Country> {
    const country = await this.countryRepository.findOne({
      where: { iso2Code, isDeleted: false },
      relations: ['currencies'],
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async updateCountry(id: string, updateCountryDto: UpdateCountryDto): Promise<Country> {
    const country = await this.findCountryById(id);

    // Check for duplicate ISO codes if they're being updated
    if (updateCountryDto.iso2Code || updateCountryDto.iso3Code) {
      const existingCountry = await this.countryRepository.findOne({
        where: [
          { iso2Code: updateCountryDto.iso2Code },
          { iso3Code: updateCountryDto.iso3Code },
        ],
      });

      if (existingCountry && existingCountry.id !== id) {
        throw new ConflictException('Country with this ISO code already exists');
      }
    }

    Object.assign(country, updateCountryDto);
    return await this.countryRepository.save(country);
  }

  async deleteCountry(id: string): Promise<void> {
    const country = await this.findCountryById(id);
    country.isDeleted = true;
    await this.countryRepository.save(country);
  }

  // ====== CURRENCIES ======

  async createCurrency(createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    // Check for duplicate currency code
    const existingCurrency = await this.currencyRepository.findOne({
      where: { code: createCurrencyDto.code },
    });

    if (existingCurrency) {
      throw new ConflictException('Currency with this code already exists');
    }

    // If this is being set as base currency, unset any existing base currency
    if (createCurrencyDto.isBaseCurrency) {
      await this.currencyRepository.update(
        { isBaseCurrency: true },
        { isBaseCurrency: false }
      );
    }

    // Validate country exists if countryId is provided
    if (createCurrencyDto.countryId) {
      await this.findCountryById(createCurrencyDto.countryId);
    }

    const currency = this.currencyRepository.create(createCurrencyDto);
    return await this.currencyRepository.save(currency);
  }

  async findAllCurrencies(): Promise<Currency[]> {
    return await this.currencyRepository.find({
      where: { isDeleted: false },
      relations: ['country'],
      order: { code: 'ASC' },
    });
  }

  async findCurrencyById(id: string): Promise<Currency> {
    const currency = await this.currencyRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['country', 'fromExchangeRates', 'toExchangeRates'],
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  async findCurrencyByCode(code: string): Promise<Currency> {
    const currency = await this.currencyRepository.findOne({
      where: { code, isDeleted: false },
      relations: ['country'],
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  async updateCurrency(id: string, updateCurrencyDto: UpdateCurrencyDto): Promise<Currency> {
    const currency = await this.findCurrencyById(id);

    // Check for duplicate currency code if it's being updated
    if (updateCurrencyDto.code) {
      const existingCurrency = await this.currencyRepository.findOne({
        where: { code: updateCurrencyDto.code },
      });

      if (existingCurrency && existingCurrency.id !== id) {
        throw new ConflictException('Currency with this code already exists');
      }
    }

    // If this is being set as base currency, unset any existing base currency
    if (updateCurrencyDto.isBaseCurrency) {
      await this.currencyRepository.update(
        { isBaseCurrency: true },
        { isBaseCurrency: false }
      );
    }

    // Validate country exists if countryId is being updated
    if (updateCurrencyDto.countryId) {
      await this.findCountryById(updateCurrencyDto.countryId);
    }

    Object.assign(currency, updateCurrencyDto);
    return await this.currencyRepository.save(currency);
  }

  async deleteCurrency(id: string): Promise<void> {
    const currency = await this.findCurrencyById(id);
    currency.isDeleted = true;
    await this.currencyRepository.save(currency);
  }

  // ====== EXCHANGE RATES ======

  async createExchangeRate(createExchangeRateDto: CreateExchangeRateDto): Promise<ExchangeRate> {
    // Validate that both currencies exist
    await this.findCurrencyById(createExchangeRateDto.fromCurrencyId);
    await this.findCurrencyById(createExchangeRateDto.toCurrencyId);

    // Check for duplicate exchange rate for the same currency pair and date
    const existingRate = await this.exchangeRateRepository.findOne({
      where: {
        fromCurrencyId: createExchangeRateDto.fromCurrencyId,
        toCurrencyId: createExchangeRateDto.toCurrencyId,
        effectiveDate: new Date(createExchangeRateDto.effectiveDate),
        isDeleted: false,
      },
    });

    if (existingRate) {
      throw new ConflictException('Exchange rate for this currency pair and date already exists');
    }

    // Validate effective date is not in the past
    const effectiveDate = new Date(createExchangeRateDto.effectiveDate);
    if (effectiveDate < new Date()) {
      throw new BadRequestException('Effective date cannot be in the past');
    }

    const exchangeRate = this.exchangeRateRepository.create({
      ...createExchangeRateDto,
      effectiveDate,
      expiryDate: createExchangeRateDto.expiryDate ? new Date(createExchangeRateDto.expiryDate) : undefined,
    });

    return await this.exchangeRateRepository.save(exchangeRate);
  }

  async findAllExchangeRates(): Promise<ExchangeRate[]> {
    return await this.exchangeRateRepository.find({
      where: { isDeleted: false },
      relations: ['fromCurrency', 'toCurrency'],
      order: { effectiveDate: 'DESC' },
    });
  }

  async findExchangeRateById(id: string): Promise<ExchangeRate> {
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['fromCurrency', 'toCurrency'],
    });

    if (!exchangeRate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return exchangeRate;
  }

  async findCurrentExchangeRate(fromCurrencyId: string, toCurrencyId: string): Promise<ExchangeRate> {
    const now = new Date();
    const exchangeRate = await this.exchangeRateRepository.findOne({
      where: {
        fromCurrencyId,
        toCurrencyId,
        effectiveDate: LessThanOrEqual(now),
        isDeleted: false,
        isActive: true,
      },
      relations: ['fromCurrency', 'toCurrency'],
      order: { effectiveDate: 'DESC' },
    });

    if (!exchangeRate) {
      throw new NotFoundException('Current exchange rate not found for this currency pair');
    }

    return exchangeRate;
  }

  async updateExchangeRate(id: string, updateExchangeRateDto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    const exchangeRate = await this.findExchangeRateById(id);

    // Validate currencies if they're being updated
    if (updateExchangeRateDto.fromCurrencyId) {
      await this.findCurrencyById(updateExchangeRateDto.fromCurrencyId);
    }
    if (updateExchangeRateDto.toCurrencyId) {
      await this.findCurrencyById(updateExchangeRateDto.toCurrencyId);
    }

    // Validate effective date if it's being updated
    if (updateExchangeRateDto.effectiveDate) {
      const effectiveDate = new Date(updateExchangeRateDto.effectiveDate);
      if (effectiveDate < new Date()) {
        throw new BadRequestException('Effective date cannot be in the past');
      }
      updateExchangeRateDto.effectiveDate = effectiveDate.toISOString();
    }

    if (updateExchangeRateDto.expiryDate) {
      updateExchangeRateDto.expiryDate = new Date(updateExchangeRateDto.expiryDate).toISOString();
    }

    Object.assign(exchangeRate, updateExchangeRateDto);
    return await this.exchangeRateRepository.save(exchangeRate);
  }

  async deleteExchangeRate(id: string): Promise<void> {
    const exchangeRate = await this.findExchangeRateById(id);
    exchangeRate.isDeleted = true;
    await this.exchangeRateRepository.save(exchangeRate);
  }

  // ====== UTILITY METHODS ======

  async getBaseCurrency(): Promise<Currency> {
    const baseCurrency = await this.currencyRepository.findOne({
      where: { isBaseCurrency: true, isDeleted: false },
    });

    if (!baseCurrency) {
      throw new NotFoundException('No base currency found');
    }

    return baseCurrency;
  }

  async convertAmount(fromCurrencyId: string, toCurrencyId: string, amount: number): Promise<number> {
    if (fromCurrencyId === toCurrencyId) {
      return amount;
    }

    const exchangeRate = await this.findCurrentExchangeRate(fromCurrencyId, toCurrencyId);
    return amount * exchangeRate.rate;
  }
}
