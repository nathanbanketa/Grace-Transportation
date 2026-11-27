import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function authClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key } = process.env;
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot update cookies. Refresh through the proxy.
        }
      },
    },
  });
}

export async function getAdmin() {
  const client = await authClient();
  const ids = (process.env.ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!client || !ids.length) return null;
  const { data } = await client.auth.getUser();
  if (!data.user || !ids.includes(data.user.id)) return null;
  const { data: driver } = await client.from("drivers").select("id, display_name").eq("id", data.user.id).maybeSingle();
  return driver as { id: string; display_name: string } | null;
}

export async function requireAdmin() {
  const driver = await getAdmin();
  if (!driver) redirect("/admin/login");
  return driver;
}
