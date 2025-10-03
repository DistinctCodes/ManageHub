import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesCurrenciesService } from './countries-currencies.service';
import { CountriesCurrenciesController } from './countries-currencies.controller';
import { Country } from './entities/country.entity';
import { Currency } from './entities/currency.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Country, Currency, ExchangeRate])],
  controllers: [CountriesCurrenciesController],
  providers: [CountriesCurrenciesService],
  exports: [CountriesCurrenciesService],
})
export class CountriesCurrenciesModule {}
