export interface ProfileResponse {
  id: string;
  firstname: string;
  lastname: string;
  username?: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  data: ProfileResponse;
}

export interface AvatarUploadResponse {
  success: boolean;
  message: string;
  data: {
    profilePicture: string;
  };
}