import { NotFoundException } from '@nestjs/common';

/** #2096: ensure the wallet belongs to the caller before soft-deleting it. */
export function assertWalletDeletable(wallet: { userId: string } | null, userId: string): void {
  if (!wallet || wallet.userId !== userId) throw new NotFoundException('Wallet not found');
}

/** #2097: honour page/pageSize on GET /credits/statement and return a paged envelope. */
export function statementWindow(page?: unknown, pageSize?: unknown) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { skip: (p - 1) * size, take: size, page: p, pageSize: size };
}

export function toStatementPage<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
