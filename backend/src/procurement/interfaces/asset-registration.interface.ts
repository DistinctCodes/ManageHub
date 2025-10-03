export const ASSET_REGISTRATION_TOKEN = Symbol('ASSET_REGISTRATION_TOKEN');

export interface AssetRegistrationService {
  // Called when a procurement is approved to register an asset.
  // Returns the created asset ID or any identifier if applicable.
  registerAsset(input: {
    procurementRequestId: string;
    itemName: string;
    quantity: number;
    requestedById: string;
  }): Promise<string | void>;
}