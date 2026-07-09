import { create } from "zustand";
import type { User } from "../types";
import { supabase } from "../lib/supabase";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  updateUser: (user: User) => void;
  clearAuth: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },
  updateUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },
  clearAuth: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  initAuth: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      localStorage.removeItem("user");
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const raw = localStorage.getItem("user");
    if (raw) {
      set({ user: JSON.parse(raw), isAuthenticated: true, isLoading: false });
    } else {
      set({ isAuthenticated: true, isLoading: false });
    }
  },
}));
