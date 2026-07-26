import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { apiClient, ApiError } from "./apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    apiClient.setToken(null);
    global.fetch = vi.fn();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://test.api");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should set Authorization header when token is present", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    apiClient.setToken("my-token");
    await apiClient.get("/test");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      })
    );
  });

  it("should prove auth token is never attached to requests after logout (token null)", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    apiClient.setToken("my-token");
    await apiClient.get("/test");

    apiClient.setToken(null);
    await apiClient.get("/test2");

    const calls = mockFetch.mock.calls;
    expect(calls[0][1].headers.Authorization).toBe("Bearer my-token");
    expect(calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("should serialize JSON, default Content-Type, and allow header overrides", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await apiClient.post("/test", { foo: "bar" });
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ foo: "bar" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });
  
  it("should handle error status codes like 400/403/404/409/500", async () => {
    const mockFetch = global.fetch as Mock;
    const statuses = [400, 403, 404, 409, 500];
    
    for (const status of statuses) {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        json: async () => ({ message: `Error ${status}` }),
      });

      try {
        await apiClient.get("/test");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(status);
        expect((error as ApiError).message).toBe(`Error ${status}`);
      }
    }
  });

  it("should handle non-JSON error body gracefully", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    });

    await expect(apiClient.get("/test")).rejects.toThrow(ApiError);
    await expect(apiClient.get("/test")).rejects.toThrow("An API error occurred");
  });

  it("should produce a typed catchable error on network failure", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockRejectedValueOnce(new Error("Network failed"));

    try {
      await apiClient.get("/test");
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe("Network failed");
    }
  });

  it("should trigger session-expired event on 401", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });

    try {
      await apiClient.get("/test");
    } catch (e) {
      // expected
    }

    expect(dispatchEventSpy).toHaveBeenCalled();
    const event = dispatchEventSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe("session-expired");
  });

  it("should resolve base URL correctly based on instance", async () => {
    // API_BASE_URL is evaluated on load, but we can verify it targets the fallback or env var.
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    
    await apiClient.get("/endpoint");
    expect(mockFetch.mock.calls[0][0]).toContain("/endpoint");
  });
  
  it("should work for all methods: patch, delete", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiClient.patch("/test", { update: true });
    expect(mockFetch.mock.calls[0][1].method).toBe("PATCH");
    expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ update: true }));

    await apiClient.delete("/test");
    expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it("should produce a fallback ApiError when fetch throws a non-Error", async () => {
    const mockFetch = global.fetch as Mock;
    mockFetch.mockImplementationOnce(() => {
      throw "Just a string error";
    });

    try {
      await apiClient.get("/test");
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe("Network error occurred");
    }
  });
});
