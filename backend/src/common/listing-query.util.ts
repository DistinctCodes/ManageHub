import { BadRequestException } from '@nestjs/common';

/** #2107/#2108: shared page/pageSize parsing for admin listings. */
export function listingPage(page?: unknown, pageSize?: unknown) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { skip: (p - 1) * size, take: size, page: p, pageSize: size };
}

/** #2107/#2108: reject unknown enum filters with 400 instead of a 500 from the DB. */
export function parseEnumFilter<T extends string>(value: string | undefined, allowed: readonly T[], name: string): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value as T)) throw new BadRequestException(`Invalid ${name}: ${value}`);
  return value as T;
}
