import { Test, TestingModule } from '@nestjs/testing';
import { CalculateDepreciationProvider } from '../providers/calculate-depreciation.provider';
import { Asset, DepreciationMethod } from '../entities/asset.entity';

describe('CalculateDepreciationProvider', () => {
  let provider: CalculateDepreciationProvider;
  let asset: Asset;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculateDepreciationProvider],
    }).compile();

    provider = module.get<CalculateDepreciationProvider>(CalculateDepreciationProvider);
    
    // Create a test asset
    asset = new Asset();
    asset.id = 'test-id';
    asset.name = 'Test Asset';
    asset.purchasePrice = 10000;
    asset.salvageValue = 1000;
    asset.usefulLifeYears = 5;
    asset.depreciationMethod = DepreciationMethod.STRAIGHT_LINE;
    asset.purchaseDate = new Date(new Date().setFullYear(new Date().getFullYear() - 2)); // 2 years old
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('calculateCurrentValue', () => {
    it('should calculate straight-line depreciation correctly', () => {
      asset.depreciationMethod = DepreciationMethod.STRAIGHT_LINE;
      const value = provider.calculateCurrentValue(asset);
      
      // For straight-line: (10000 - 1000) / 5 = 1800 per year
      // After 2 years: 10000 - (1800 * 2) = 6400
      expect(value).toBeCloseTo(6400, -2); // Allow for small variations due to date calculations
    });

    it('should calculate declining balance depreciation correctly', () => {
      asset.depreciationMethod = DepreciationMethod.DECLINING_BALANCE;
      const value = provider.calculateCurrentValue(asset);
      
      // For declining balance: double the straight-line rate (20% * 2 = 40%)
      // After 2 years: 10000 * (1 - 0.4)^2 = 10000 * 0.36 = 3600
      expect(value).toBeCloseTo(3600, -2); // Allow for small variations due to date calculations
    });

    it('should calculate sum-of-years-digits depreciation correctly', () => {
      asset.depreciationMethod = DepreciationMethod.SUM_OF_YEARS_DIGITS;
      const value = provider.calculateCurrentValue(asset);
      
      // Sum of years = 5+4+3+2+1 = 15
      // For 2 years passed, remaining life = 3 years
      // Fraction = 3/15 = 0.2
      // Annual depreciation = (10000 - 1000) * 0.2 = 1800
      // Total depreciation = 1800 * 2 = 3600
      // Value = 10000 - 3600 = 6400
      expect(value).toBeCloseTo(6400, -2); // Allow for small variations due to date calculations
    });

    it('should not let value go below salvage value', () => {
      // Create an old asset that should be worth less than salvage value
      const oldAsset = { ...asset };
      oldAsset.purchaseDate = new Date(new Date().setFullYear(new Date().getFullYear() - 10)); // 10 years old
      
      const value = provider.calculateCurrentValue(oldAsset);
      
      // Value should not go below salvage value (1000)
      expect(value).toBeGreaterThanOrEqual(1000);
    });
  });
});