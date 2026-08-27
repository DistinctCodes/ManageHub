import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-6 py-16">Loading...</div>}
    >
      <AuthForm mode="register" />
    </Suspense>
  );
}
