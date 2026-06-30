export interface PostAuthor {
  id: string;
  username?: string | null;
  firstname: string;
  lastname: string;
  profilePicture?: string | null;
}

export interface CommunityPost {
  id: string;
  authorUserId: string;
  author: PostAuthor;
  body: string;
  isPinned: boolean;
  isDeleted: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityFeedResponse {
  items: CommunityPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePostPayload {
  body: string;
}

export interface ToggleLikeResponse {
  message: string;
  data: {
    liked: boolean;
    likeCount: number;
  };
}

export interface TogglePinResponse {
  message: string;
  data: {
    isPinned: boolean;
  };
}
