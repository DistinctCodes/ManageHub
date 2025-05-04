import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"
import { WorkspaceType } from "../entities/workspace.entity"

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsEnum(WorkspaceType)
  type: WorkspaceType

  @IsNumber()
  capacity: number

  @IsArray()
  @IsString({ each: true })
  amenities: string[]

  @IsString()
  @IsNotEmpty()
  location: string

  @IsOptional()
  isAvailable?: boolean = true
}
