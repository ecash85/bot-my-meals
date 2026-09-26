export type SupabaseSetupStatus = "missing" | "partial" | "invalid" | "ready";

export function readPublicSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    anonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  };
}

export function isUsableSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isUsableAnonKey(key: string): boolean {
  if (key.length < 20) return false;
  if (/^(your[-_]|changeme|todo|xxx|placeholder)/i.test(key)) return false;
  return true;
}

export function getSupabaseSetupStatus(): SupabaseSetupStatus {
  const { url, anonKey } = readPublicSupabaseEnv();
  if (!url && !anonKey) return "missing";
  if (!url || !anonKey) return "partial";
  if (!isUsableSupabaseUrl(url) || !isUsableAnonKey(anonKey)) return "invalid";
  return "ready";
}

export function getPublicSupabaseConfig(): { url: string; anonKey: string } | null {
  if (getSupabaseSetupStatus() !== "ready") return null;
  return readPublicSupabaseEnv();
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseSetupStatus() === "ready";
}

export const PRODUCT_NAME = "Bot My Meals";
export const PRODUCT_TAGLINE = "This week's dinners, agreed.";
export const APPEARANCE_KEY = "supper.appearance.v1";
