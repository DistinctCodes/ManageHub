import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

@Entity('workspace_reviews')
export class WorkspaceReview {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() workspaceId: string;
  @Column() userId: string;
  @Column({ unique: true }) bookingId: string;
  @Column({ type: 'int' }) rating: number; // 1–5
  @Column({ nullable: true }) comment: string;
  @CreateDateColumn() createdAt: Date;
}

// POST /sandbox/workspaces/:id/reviews
export async function createReview(
  repo: any, bookingRepo: any,
  workspaceId: string, userId: string, bookingId: string,
  rating: number, comment?: string,
) {
  const booking = await bookingRepo.findOne({ where: { id: bookingId, userId, workspaceId, status: 'completed' } });
  if (!booking) throw { status: 403, message: 'No completed booking for this workspace' };

  const existing = await repo.findOne({ where: { bookingId } });
  if (existing) throw { status: 409, message: 'Review already submitted for this booking' };

  if (rating < 1 || rating > 5) throw { status: 400, message: 'Rating must be between 1 and 5' };

  return repo.save(repo.create({ workspaceId, userId, bookingId, rating, comment }));
}

// GET /sandbox/workspaces/:id/reviews?page=1&limit=10
export async function getReviews(repo: any, workspaceId: string, page = 1, limit = 10) {
  const [data, total] = await repo.findAndCount({
    where: { workspaceId },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data, total, page, limit };
}

// GET /sandbox/workspaces/:id/rating
export async function getAverageRating(repo: any, workspaceId: string) {
  const { avg, count } = await repo
    .createQueryBuilder('r')
    .select('AVG(r.rating)', 'avg')
    .addSelect('COUNT(*)', 'count')
    .where('r.workspaceId = :workspaceId', { workspaceId })
    .getRawOne();
  return { averageRating: parseFloat(avg) || 0, totalReviews: parseInt(count) };
}
