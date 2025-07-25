export class CreateBusinessDto {
  name: string;
  description?: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  services: string[];
  contactPerson: string;
  contactPersonTitle?: string;
  category: string;
}
