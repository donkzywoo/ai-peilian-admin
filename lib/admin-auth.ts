import { createServerClient } from "@supabase/ssr";

/**
 * Check if the request is from an authenticated admin.
 * Call this inside API route handlers (NOT middleware).
 */
export async function checkAdminAuth(
  cookieStore: { getAll: () => { name: string; value: string }[] }
): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return false;

    const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
    return admins.includes(user.email.toLowerCase());
  } catch {
    return false;
  }
}
