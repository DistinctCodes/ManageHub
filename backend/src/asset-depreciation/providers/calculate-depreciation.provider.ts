import { Injectable } from '@nestjs/common';
import { Asset, DepreciationMethod } from '../entities/asset.entity';

@Injectable()
export class CalculateDepreciationProvider {
  /**
   * Calculate the current depreciated value of an asset
   * @param asset The asset to calculate depreciation for
   * @returns The current depreciated value
   */
  calculateCurrentValue(asset: Asset): number {
    switch (asset.depreciationMethod) {
      case DepreciationMethod.STRAIGHT_LINE:
        return this.calculateStraightLineDepreciation(asset);
      case DepreciationMethod.DECLINING_BALANCE:
        return this.calculateDecliningBalanceDepreciation(asset);
      case DepreciationMethod.SUM_OF_YEARS_DIGITS:
        return this.calculateSumOfYearsDigitsDepreciation(asset);
      default:
        return this.calculateStraightLineDepreciation(asset);
    }
  }

  /**
   * Calculate depreciation using the straight-line method
   * Formula: (Purchase Price - Salvage Value) / Useful Life Years
   * @param asset The asset to calculate depreciation for
   * @returns The current depreciated value
   */
  private calculateStraightLineDepreciation(asset: Asset): number {
    const annualDepreciation = (asset.purchasePrice - asset.salvageValue) / asset.usefulLifeYears;
    
    // Calculate how many years have passed since purchase
    const currentDate = new Date();
    const purchaseDate = new Date(asset.purchaseDate);
    const yearsPassed = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Calculate total depreciation
    const totalDepreciation = annualDepreciation * yearsPassed;
    
    // Current value is purchase price minus total depreciation, but not below salvage value
    const currentValue = asset.purchasePrice - totalDepreciation;
    
    // Ensure value doesn't go below salvage value
    return Math.max(currentValue, asset.salvageValue);
  }

  /**
   * Calculate depreciation using the declining balance method
   * @param asset The asset to calculate depreciation for
   * @returns The current depreciated value
   */
  private calculateDecliningBalanceDepreciation(asset: Asset): number {
    // For declining balance, we use double the straight-line rate
    const straightLineRate = 1 / asset.usefulLifeYears;
    const decliningBalanceRate = straightLineRate * 2;
    
    // Calculate how many years have passed since purchase
    const currentDate = new Date();
    const purchaseDate = new Date(asset.purchaseDate);
    const yearsPassed = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Calculate current value using declining balance formula
    // Value = Purchase Price * (1 - rate)^years
    const currentValue = asset.purchasePrice * Math.pow((1 - decliningBalanceRate), yearsPassed);
    
    // Ensure value doesn't go below salvage value
    return Math.max(currentValue, asset.salvageValue);
  }

  /**
   * Calculate depreciation using the sum-of-years-digits method
   * @param asset The asset to calculate depreciation for
   * @returns The current depreciated value
   */
  private calculateSumOfYearsDigitsDepreciation(asset: Asset): number {
    // Sum of years digits = n(n+1)/2 where n is useful life
    const sumOfYears = (asset.usefulLifeYears * (asset.usefulLifeYears + 1)) / 2;
    
    // Calculate how many years have passed since purchase
    const currentDate = new Date();
    const purchaseDate = new Date(asset.purchaseDate);
    const yearsPassed = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Calculate remaining useful life
    const remainingLife = Math.max(0, asset.usefulLifeYears - yearsPassed);
    
    // Calculate depreciation fraction for current period
    const depreciationFraction = remainingLife / sumOfYears;
    
    // Calculate annual depreciation
    const annualDepreciation = (asset.purchasePrice - asset.salvageValue) * depreciationFraction;
    
    // Calculate total depreciation
    const totalDepreciation = annualDepreciation * yearsPassed;
    
    // Current value is purchase price minus total depreciation
    const currentValue = asset.purchasePrice - totalDepreciation;
    
    // Ensure value doesn't go below salvage value
    return Math.max(currentValue, asset.salvageValue);
  }
}