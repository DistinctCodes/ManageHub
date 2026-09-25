# payments.gateway.ts reconnection contract

Documents the expected behavior when a websocket client drops mid-payment.

## Client contract

- On disconnect, the client should attempt to reconnect with exponential
  backoff (e.g. 1s, 2s, 4s, 8s, capped at 30s) plus jitter.
- On reconnect, the client re-subscribes using the same `sessionId` used
  before the drop, not a newly generated one, so the server can recognize
  it as a resumed session rather than a new one.

## Server-side handling

- If a new connection arrives with a `sessionId` that already has an
  active connection, the server should close the older connection rather
  than fanning out payment events to both (avoids duplicate client-side
  state from two live sockets for the same session).
- A `sessionId` with no active connection for longer than the reconnect
  window (30s) is treated as abandoned; any buffered events for it are
  dropped rather than retained indefinitely.

## Not yet implemented

Stale/duplicate-connection handling described above is not implemented in
`payments.gateway.ts` yet — this document captures the intended contract
as a reference for that follow-up work.
