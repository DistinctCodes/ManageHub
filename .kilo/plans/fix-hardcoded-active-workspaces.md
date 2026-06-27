# Plan: Replace hardcoded activeWorkspaces with DB query

Goal: Replace `activeWorkspaces: 1` (hardcoded placeholder) in `DashboardService.getUserStats()` with a live database query.

## Changes

### 1. `backend/src/dashboard/dashboard.service.ts`

- Mark `getUserStats()` as `async` (it isn't already).
- Replace the hardcoded `activeWorkspaces: 1` with:
  ```ts
  activeWorkspaces: await this.adminAnalyticsProvider.getActiveWorkspacesCount()
  ```

## Rationale

- `DashboardService` already injects `AdminAnalyticsProvider` at line 16.
- `AdminAnalyticsProvider` already injects `Workspace` repository and already has a `getActiveWorkspacesCount()` method that queries `workspaces WHERE isActive = true`.
- `DashboardModule` already imports `Workspace` via `TypeOrmModule.forFeature`, so no module wiring changes are required.
