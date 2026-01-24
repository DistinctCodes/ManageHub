import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuthStore, AuthUser, AuthTokens } from "@/store/auth-store";

type LoginBody = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type LoginResponse = {
  success: boolean;
  message?: string;
  data?: {
    user: AuthUser;
    tokens: AuthTokens;
  };
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState(false);

  const login = async (payload: LoginBody) => {
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as LoginResponse;

      if (!res.ok || !json.success || !json.data) {
        // ✅ show specific message if backend sends it
        throw new Error(json.message || "Invalid login credentials.");
      }

      const { user, tokens } = json.data;

      // ✅ store in Zustand
      setAuth({ user, tokens });

      // ✅ cookies for middleware
      // 7 days when rememberMe true, otherwise session cookie
      const cookieOptions = payload.rememberMe
        ? {
            expires: 7,
            secure: true,
            sameSite: "strict" as const,
          }
        : {
            secure: true,
            sameSite: "strict" as const,
          };

      Cookies.set("auth_token", tokens.accessToken, cookieOptions);
      Cookies.set("user_data", JSON.stringify(user), cookieOptions);

      toast.success("Login successful ✅");

      // ✅ preserve redirect
      const redirect = searchParams.get("redirect");

      // ✅ user state handling
      if (!user.verified) {
        router.push("/verification");
        return;
      }

      if (redirect) {
        router.push(redirect);
        return;
      }

      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      const msg = getErrorMessage(err);

      // ✅ map common auth messages cleanly
      if (msg.toLowerCase().includes("password")) {
        toast.error("Incorrect password. Please try again.");
      } else if (msg.toLowerCase().includes("email")) {
        toast.error("Email not found. Please check and try again.");
      } else if (msg.toLowerCase().includes("invalid")) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
}
