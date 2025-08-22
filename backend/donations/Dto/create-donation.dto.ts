import { IsNotEmpty, IsNumber, Min, IsString } from 'class-validator';

export class CreateDonationDto {
  @IsString()
  @IsNotEmpty()
  donorName: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  category: string;
}
