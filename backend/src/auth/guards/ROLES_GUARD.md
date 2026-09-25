# RolesGuard semantics

`RolesGuard` (used with `@Roles(...)`) checks the current user's roles
against the roles listed on the decorator.

**Behavior: any-of, not all-of.**

`@Roles('admin', 'finance')` means the request is allowed if the user has
**at least one** of `admin` or `finance` — not both.

Example:

```ts
@Roles('admin', 'finance')
@UseGuards(RolesGuard)
@Get('reports')
getReports() {}
```

A user with only the `finance` role can call `getReports()`; they do not
also need `admin`.

If a future use case needs "must have all of these roles", that is a
separate check and is not what `@Roles(...)` currently provides — add a
new guard/decorator rather than assuming this one supports it.
