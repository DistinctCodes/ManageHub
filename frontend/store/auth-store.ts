// frontend/src/store/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  registrationEmail: string | null;
  setRegistrationEmail: (email: string | null) => void;
  clearRegistrationEmail: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      registrationEmail: null,
      setRegistrationEmail: (email) => set({ registrationEmail: email }),
      clearRegistrationEmail: () => set({ registrationEmail: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ registrationEmail: state.registrationEmail }),
    },
  ),
);
