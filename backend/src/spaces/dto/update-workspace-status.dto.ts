import { IsBoolean, IsNotEmpty } from "class-validator"

export class UpdateWorkspaceStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isAvailable: boolean
}
