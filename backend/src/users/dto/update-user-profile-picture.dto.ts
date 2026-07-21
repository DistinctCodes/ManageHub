import { IsNotEmpty } from 'class-validator';

export class UpdateUserProfilePictureDto {
  @IsNotEmpty()
  profilePicture: string;
}
