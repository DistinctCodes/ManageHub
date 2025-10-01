"use client";
import { useAuthInit } from "@/lib/hooks/useAuthInit";
import { ReactNode } from "react";

interface AuthInitializerProviderProps {
  children: ReactNode;
}

export const AuthInitializerProvider = ({
  children,
}: AuthInitializerProviderProps) => {
  useAuthInit(); // triggers auth initialization on mount

  return <>{children}</>; // renders nothing extra
};
