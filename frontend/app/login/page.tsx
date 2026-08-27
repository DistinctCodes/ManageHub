import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-6 py-16">Loading...</div>}
    >
      <AuthForm mode="login" />
    </Suspense>
  );
}
