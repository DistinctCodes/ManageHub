// Offset pagination helper for payments-admin.controller.ts list
// endpoints, with a sane default page size to bound unbounded queries.
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  offset: number;
  limit: number;
}

export function parsePaginationParams(query: {
  page?: string | number;
  pageSize?: string | number;
}): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { offset: (page - 1) * pageSize, limit: pageSize };
}
