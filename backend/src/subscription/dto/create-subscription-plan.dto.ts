import { IsNotEmpty, IsNumber, IsString, IsArray, IsBoolean, IsOptional, Min } from "class-validator"

export class CreateSubscriptionPlanDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number // in days

  @IsArray()
  @IsString({ each: true })
  features: string[]

  @IsOptional()
  @IsBoolean()
  isActive = true
}
