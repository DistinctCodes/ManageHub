export interface Poll {
  id: string;
  question: string;
  yesCount: number;
  noCount: number;
  votes: Array<{ identifier: string; vote: 'yes' | 'no' }>;
  createdBy: string;
  createdAt: Date;
} 