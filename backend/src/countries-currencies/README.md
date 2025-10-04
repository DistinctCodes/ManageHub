# Countries & Currencies Module

This module provides comprehensive management of countries, currencies, and exchange rates for global operations in ManageHub.

## Features

- **Countries Management**: Full CRUD operations for countries with ISO codes
- **Currencies Management**: Currency management with exchange rates to base currency
- **Exchange Rates**: Historical and current exchange rate tracking between currencies
- **Currency Conversion**: Real-time currency conversion functionality
- **Base Currency**: Support for a designated base currency (USD by default)

## Database Schema

### Countries Table
- `id`: UUID primary key
- `iso2Code`: ISO 3166-1 alpha-2 country code (e.g., 'US', 'CA')
- `iso3Code`: ISO 3166-1 alpha-3 country code (e.g., 'USA', 'CAN')
- `name`: Full country name
- `commonName`: Common name variant
- `numericCode`: ISO 3166-1 numeric code
- `callingCode`: Country calling code
- `capital`: Capital city
- `region`: Geographic region
- `subregion`: Geographic subregion
- `area`: Area in square kilometers
- `population`: Population count
- `isActive`: Active status
- `isDeleted`: Soft delete flag

### Currencies Table
- `id`: UUID primary key
- `code`: ISO 4217 currency code (e.g., 'USD', 'EUR')
- `name`: Full currency name
- `symbol`: Currency symbol
- `exchangeRate`: Exchange rate to base currency
- `isBaseCurrency`: Whether this is the base currency
- `isActive`: Active status
- `isDeleted`: Soft delete flag
- `decimalPlaces`: Number of decimal places for this currency
- `countryId`: Optional link to country

### Exchange Rates Table
- `id`: UUID primary key
- `fromCurrencyId`: Source currency ID
- `toCurrencyId`: Target currency ID
- `rate`: Exchange rate value
- `effectiveDate`: When this rate becomes effective
- `expiryDate`: Optional expiry date
- `source`: Source of the exchange rate (e.g., 'ECB', 'Federal Reserve')
- `isActive`: Active status
- `isDeleted`: Soft delete flag

## API Endpoints

### Countries
- `POST /countries-currencies/countries` - Create a new country
- `GET /countries-currencies/countries` - Get all countries
- `GET /countries-currencies/countries/:id` - Get country by ID
- `GET /countries-currencies/countries/code/:code` - Get country by ISO code
- `PATCH /countries-currencies/countries/:id` - Update country
- `DELETE /countries-currencies/countries/:id` - Delete country (soft delete)

### Currencies
- `POST /countries-currencies/currencies` - Create a new currency
- `GET /countries-currencies/currencies` - Get all currencies
- `GET /countries-currencies/currencies/:id` - Get currency by ID
- `GET /countries-currencies/currencies/code/:code` - Get currency by code
- `PATCH /countries-currencies/currencies/:id` - Update currency
- `DELETE /countries-currencies/currencies/:id` - Delete currency (soft delete)

### Exchange Rates
- `POST /countries-currencies/exchange-rates` - Create a new exchange rate
- `GET /countries-currencies/exchange-rates` - Get all exchange rates
- `GET /countries-currencies/exchange-rates/:id` - Get exchange rate by ID
- `GET /countries-currencies/exchange-rates/current?from=:fromId&to=:toId` - Get current exchange rate
- `PATCH /countries-currencies/exchange-rates/:id` - Update exchange rate
- `DELETE /countries-currencies/exchange-rates/:id` - Delete exchange rate (soft delete)

### Utility Endpoints
- `GET /countries-currencies/base-currency` - Get the base currency
- `GET /countries-currencies/convert?from=:fromId&to=:toId&amount=:amount` - Convert amount between currencies

## Usage Examples

### Creating a Country
```json
POST /countries-currencies/countries
{
  "iso2Code": "US",
  "iso3Code": "USA",
  "name": "United States of America",
  "commonName": "United States",
  "callingCode": "+1",
  "capital": "Washington, D.C.",
  "region": "Americas",
  "subregion": "North America",
  "area": 9833517.85,
  "population": 331002651
}
```

### Creating a Currency
```json
POST /countries-currencies/currencies
{
  "code": "USD",
  "name": "US Dollar",
  "symbol": "$",
  "exchangeRate": 1.0,
  "isBaseCurrency": true,
  "decimalPlaces": 2,
  "countryId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Creating an Exchange Rate
```json
POST /countries-currencies/exchange-rates
{
  "fromCurrencyId": "650e8400-e29b-41d4-a716-446655440001",
  "toCurrencyId": "650e8400-e29b-41d4-a716-446655440004",
  "rate": 0.85,
  "effectiveDate": "2024-01-01T00:00:00Z",
  "source": "ECB"
}
```

### Converting Currency
```
GET /countries-currencies/convert?from=650e8400-e29b-41d4-a716-446655440001&to=650e8400-e29b-41d4-a716-446655440004&amount=100
```

## Business Rules

1. **Country ISO Codes**: Must be unique across the system
2. **Currency Codes**: Must be unique and follow ISO 4217 standard
3. **Base Currency**: Only one currency can be set as base currency at a time
4. **Exchange Rates**: Cannot have duplicate rates for the same currency pair and effective date
5. **Effective Dates**: Cannot be set in the past
6. **Soft Deletes**: All entities support soft deletion

## Integration

This module can be integrated with:
- **Assets Module**: Link assets to default currencies
- **Companies Module**: Set company default currencies
- **Procurement Module**: Handle multi-currency purchases
- **Financial Reports**: Generate reports in different currencies

## Migration

The module includes a migration file that:
- Creates the necessary database tables
- Sets up indexes for optimal performance
- Creates foreign key relationships
- Inserts initial sample data for testing

Run the migration with:
```bash
npm run migration:run
```
