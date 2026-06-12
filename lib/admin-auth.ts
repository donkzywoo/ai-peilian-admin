import { createServerClient } from "@supabase/ssr";

export async function checkAdminAuth(
  cookieStore: { getAll: () => { name: string; value: string }[] }
): Promise<boolean> {
  try {
    const allCookies = cookieStore.getAll();
    console.log("[admin-auth] Cookie 总数:", allCookies.length);
    const supabaseCookie = allCookies.find((c) => c.name.includes("sb-"));
    console.log("[admin-auth] Supabase Cookie:", supabaseCookie ? `${supabaseCookie.name} (${supabaseCookie.value.substring(0, 20)}...)` : "(无)");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return allCookies; },
          setAll() {},
        },
      }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.log("[admin-auth] getUser 错误:", error.message);
      return false;
    }

    const user = data.user;
    console.log("[admin-auth] 用户:", user ? user.email : "(无)");

    if (!user?.email) {
      console.log("[admin-auth] 无用户邮箱，返回 false");
      return false;
    }

    const rawAdmins = process.env.ADMIN_EMAILS || "";
    const admins = rawAdmins.split(",").map((e) => e.trim().toLowerCase());
    const lowered = user.email.toLowerCase();
    const hit = admins.includes(lowered);

    console.log("[admin-auth] ADMIN_EMAILS:", rawAdmins);
    console.log("[admin-auth] 邮箱小写:", lowered);
    console.log("[admin-auth] 命中:", hit);

    return hit;
  } catch (err) {
    console.log("[admin-auth] 异常:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
