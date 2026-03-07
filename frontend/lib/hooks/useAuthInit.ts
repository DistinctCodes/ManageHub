"use client";

import { useEffect } from "react";
import { useAuthActions } from "../store/authStore";

export const useAuthInit = () => {
  const { initializeAuth } = useAuthActions();

  useEffect(() => {
    initializeAuth(); // loads token + user from storage into Zustand
  }, [initializeAuth]);
};
