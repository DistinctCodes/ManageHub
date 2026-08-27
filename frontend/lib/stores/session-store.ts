"use client";

import { create } from "zustand";
import Cookies from "js-cookie";

const ACCESS_TOKEN_COOKIE = "accessToken";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
}

interface SessionState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: readStoredToken(),
  setAccessToken: (token) => {
    if (token) {
      Cookies.set(ACCESS_TOKEN_COOKIE, token, {
        sameSite: "lax",
        secure: window.location.protocol === "https:",
      });
    } else {
      Cookies.remove(ACCESS_TOKEN_COOKIE);
    }
    set({ accessToken: token });
  },
}));
