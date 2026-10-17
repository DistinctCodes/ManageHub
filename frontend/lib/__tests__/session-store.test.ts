import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("js-cookie", () => ({ default: cookieMocks }));

import {
  ACCESS_TOKEN_COOKIE,
  SESSION_SIGNAL_KEY,
  useSessionStore,
} from "../session-store";

describe("session-store hydration (issue #1983)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ accessToken: null, hydrated: false });
  });

  it("starts un-hydrated with a null token even when a cookie exists", () => {
    cookieMocks.get.mockReturnValue("stale-cookie-token");

    const state = useSessionStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.hydrated).toBe(false);
    // The cookie is deliberately not read at store creation: the server
    // render and the first client render must agree.
    expect(cookieMocks.get).not.toHaveBeenCalled();
  });

  it("hydrate() reads the cookie and flips the hydrated flag", () => {
    cookieMocks.get.mockReturnValue("cookie-token");
    expect(useSessionStore.getState().accessToken).toBeNull();

    useSessionStore.getState().hydrate();

    const state = useSessionStore.getState();
    expect(state.accessToken).toBe("cookie-token");
    expect(state.hydrated).toBe(true);
  });

  it("setAccessToken(null) removes the cookie and emits the cross-tab signal", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});

    useSessionStore.getState().setAccessToken(null);

    expect(cookieMocks.remove).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(setItemSpy).toHaveBeenCalledWith(
      SESSION_SIGNAL_KEY,
      expect.any(String),
    );
    expect(useSessionStore.getState().accessToken).toBeNull();
    expect(useSessionStore.getState().hydrated).toBe(true);
  });

  it("setAccessToken(token) stores the cookie and emits the cross-tab signal", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});

    useSessionStore.getState().setAccessToken("fresh-token");

    expect(cookieMocks.set).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      "fresh-token",
      expect.objectContaining({ sameSite: "lax" }),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      SESSION_SIGNAL_KEY,
      expect.any(String),
    );
    expect(useSessionStore.getState().accessToken).toBe("fresh-token");
  });

  it("keeps working when localStorage is unavailable (private browsing)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    expect(() =>
      useSessionStore.getState().setAccessToken("token"),
    ).not.toThrow();
    expect(useSessionStore.getState().accessToken).toBe("token");
  });
});
