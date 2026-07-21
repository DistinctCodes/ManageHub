import { User } from '../entities/user.entity';
import { MembershipStatus } from '../enums/membership-status.enum';

export function computeProfileCompleteness(user: User): number {
  let score = 0;

  if (user.firstname && user.lastname) score += 10;
  if (user.isVerified) score += 20;
  if (user.phone) score += 15;
  if (user.profilePicture) score += 15;
  if (user.username) score += 10;
  if (user.memberSince) score += 10;
  if (user.membershipStatus === MembershipStatus.ACTIVE) score += 20;

  return score;
}
