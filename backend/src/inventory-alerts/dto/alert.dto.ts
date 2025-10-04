export class AlertDto {
  id: string;
  item: { id: string; name: string; sku: string; quantity: number; threshold: number };
  sku: string;
  itemName: string;
  currentQuantity: number;
  threshold: number;
  type: string;
  resolved: boolean;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
