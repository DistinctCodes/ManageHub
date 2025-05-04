import { IsNotEmpty, IsString, IsUUID } from "class-validator"

export class SubscribeDto {
  @IsNotEmpty()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsUUID()
  planId: string
}
