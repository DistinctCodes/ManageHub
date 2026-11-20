/** #2084: read the session token from handshake.auth, falling back to the HttpOnly cookie. */
export function extractSocketToken(
  handshake: { auth?: { token?: string }; headers?: { cookie?: string } },
  cookieName = 'access_token',
): string | undefined {
  if (handshake.auth?.token) return handshake.auth.token;
  const pair = (handshake.headers?.cookie ?? '')
    .split(';').map((c) => c.trim()).find((c) => c.startsWith(`${cookieName}=`));
  return pair ? decodeURIComponent(pair.slice(cookieName.length + 1)) : undefined;
}

/** #2085: clamp page/pageSize for GET /payments so results are always paginated. */
export function toPagination(page?: unknown, pageSize?: unknown, max = 100) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(max, Math.max(1, Number(pageSize) || 20));
  return { skip: (p - 1) * size, take: size, page: p, pageSize: size };
}
