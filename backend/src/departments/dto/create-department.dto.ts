import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  companyId: number;

  @IsNumber()
  @IsOptional()
  branchId?: number;
}
