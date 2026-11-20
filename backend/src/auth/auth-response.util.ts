/** #2081: drop the access token from JSON bodies; it is sent only as an HttpOnly cookie. */
export function withoutAccessToken<T extends { accessToken?: unknown }>(body: T): Omit<T, 'accessToken'> {
  const { accessToken: _omit, ...rest } = body;
  return rest;
}
