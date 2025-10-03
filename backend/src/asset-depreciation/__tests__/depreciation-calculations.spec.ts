/**
 * Simple unit tests for asset depreciation calculations
 * These tests verify the mathematical correctness of our depreciation methods
 */

import { CalculateDepreciationProvider } from '../providers/calculate-depreciation.provider';
import { Asset, DepreciationMethod } from '../entities/asset.entity';

// Simple test framework
function describe(description: string, fn: () => void) {
  console.log(`\n${description}`);
  fn();
}

function it(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
  } catch (error) {
    console.log(`  ✗ ${description}`);
    console.log(`    Error: ${error.message}`);
  }
}

function expect(actual: any) {
  return {
    toBeCloseTo(expected: number, precision: number = 2) {
      const diff = Math.abs(actual - expected);
      const multiplier = Math.pow(10, precision);
      if (Math.round(diff * multiplier) / multiplier !== 0) {
        throw new Error(`Expected ${actual} to be close to ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    }
  };
}

describe('Asset Depreciation Calculations', () => {
  let provider: CalculateDepreciationProvider;
  let asset: Asset;

  // Setup before tests
  provider = new CalculateDepreciationProvider();
  
  // Create a test asset
  asset = new Asset();
  asset.id = 'test-id';
  asset.name = 'Test Asset';
  asset.purchasePrice = 10000;
  asset.salvageValue = 1000;
  asset.usefulLifeYears = 5;
  asset.depreciationMethod = DepreciationMethod.STRAIGHT_LINE;
  asset.purchaseDate = new Date(new Date().setFullYear(new Date().getFullYear() - 2)); // 2 years old

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should calculate straight-line depreciation correctly', () => {
    asset.depreciationMethod = DepreciationMethod.STRAIGHT_LINE;
    const value = provider.calculateCurrentValue(asset);
    
    // For straight-line: (10000 - 1000) / 5 = 1800 per year
    // After 2 years: 10000 - (1800 * 2) = 6400
    expect(value).toBeCloseTo(6400, 0);
  });

  it('should calculate declining balance depreciation correctly', () => {
    asset.depreciationMethod = DepreciationMethod.DECLINING_BALANCE;
    const value = provider.calculateCurrentValue(asset);
    
    // For declining balance: double the straight-line rate (20% * 2 = 40%)
    // After 2 years: 10000 * (1 - 0.4)^2 = 10000 * 0.36 = 3600
    expect(value).toBeCloseTo(3600, 0);
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