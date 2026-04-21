"use client";

import LoginForm from "@/components/auth/LoginForm";
import { useLoginUser } from "@/lib/react-query/hooks/auth/useLoginUser";
export default function LoginPageRoute() {
  const { mutate: loginUser, isPending } = useLoginUser();

  const handleEmailLogin = (data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => {
    loginUser(data);
  };

  return (
    <LoginForm
      onEmailLogin={handleEmailLogin}
      isLoading={isPending}
    />
  );
}
