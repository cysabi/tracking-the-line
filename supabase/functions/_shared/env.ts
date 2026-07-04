function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing required env var: ${name}`);
  return value;
}

export const CLIENT_ID = required("CLIENT_ID");
export const CLIENT_SECRET = required("CLIENT_SECRET");
export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

export const APP_URL = Deno.env.get("APP_URL") ??
  "https://cysabi.github.io/tracking-the-line/";
export const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://cysabi.github.io";
export const REDIRECT_URI = Deno.env.get("OAUTH_REDIRECT_URI") ??
  `${SUPABASE_URL}/functions/v1/oauth/callback`;
