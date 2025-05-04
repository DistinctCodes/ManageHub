import { IsEnum, IsOptional, IsString } from "class-validator"
import { WorkspaceType } from "../entities/workspace.entity"

export class FilterWorkspaceDto {
  @IsOptional()
  @IsEnum(WorkspaceType)
  type?: WorkspaceType

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  isAvailable?: boolean
}
