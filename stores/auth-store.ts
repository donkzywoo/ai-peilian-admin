import { create } from "zustand";
import { createBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function isAdminEmail(email: string): boolean {
  const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: string;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAdmin: false,
  error: "",

  login: async (email, password) => {
    set({ isLoading: true, error: "" });
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: "登录失败: " + error.message });
      return;
    }
    if (!data.user?.email || !isAdminEmail(data.user.email)) {
      await supabase.auth.signOut();
      set({ user: null, isLoading: false, isAdmin: false, error: "你不是管理员" });
      return;
    }
    set({ user: data.user, isLoading: false, isAdmin: true });
  },

  logout: async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    set({ user: null, isAdmin: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email && isAdminEmail(data.session.user.email)) {
      set({ user: data.session.user, isAdmin: true, isLoading: false });
    } else {
      if (data.session) await supabase.auth.signOut();
      set({ user: null, isAdmin: false, isLoading: false });
    }
  },
}));
