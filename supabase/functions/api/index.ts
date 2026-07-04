import { createClient } from "@supabase/supabase-js";
import { refreshTokens, type Tokens } from "../_shared/discord.ts";
import { isOp } from "../_shared/ops.ts";
import { respond } from "../_shared/utils.ts";
import { account } from "./account.ts";
import { me } from "./me.ts";
import { guild } from "./guild.ts";
import { type Guild } from "./types.d.ts";
import {
  APP_ORIGIN,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "../_shared/env.ts";

const cors = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-refresh-token, x-token-expires",
};
const json = (data: unknown, status = 200) =>
  respond(data, { status, headers: cors });

const API = "https://discord.com/api/v10";
const get = (path: string, auth: string) =>
  fetch(`${API}${path}`, { headers: { Authorization: auth } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const access = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  const refresh = req.headers.get("X-Refresh-Token");
  if (!access || !refresh) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let token: Tokens | null;
  try {
    const expiresAt = Number(req.headers.get("X-Token-Expires") ?? 0);
    token = await refreshTokens(refresh, expiresAt);
  } catch {
    return json({ error: "unauthorized" }, 401);
  }

  const bearer = `Bearer ${token?.access_token ?? access}`;
  const userRes = await get("/users/@me", bearer);
  if (userRes.status === 429) {
    return json({ error: "rate limited, try again shortly" }, 429);
  }
  if (!userRes.ok) return json({ error: await userRes.text() }, 502);
  let user = await userRes.json();

  const url = new URL(req.url);
  const as = url.searchParams.get("as");
  let impersonating = false;
  if (as && isOp(user.id)) {
    const { data: target } = await supabase
      .from("users")
      .select("id:discord_id, username, global_name, avatar")
      .eq("discord_id", as)
      .maybeSingle();
    if (target) {
      user = target;
      impersonating = true;
    }
  }

  const path = url.pathname;
  if (path.endsWith("/account")) {
    const guildRes = await get("/users/@me/guilds", bearer);
    if (guildRes.status === 429) {
      return json({ error: "rate limited, try again shortly" }, 429);
    }
    if (!guildRes.ok) return json({ error: await guildRes.text() }, 502);
    const guilds = (await guildRes.json()) as Guild[];
    const { status, body } = await account(supabase, user, guilds, impersonating);
    return json({ ...body, token }, status);
  }

  const season = Number(url.searchParams.get("season") ?? NaN);
  if (path.endsWith("/me")) {
    if (!Number.isInteger(season)) return json({ error: "missing season" }, 400);
    const { status, body } = await me(supabase, user, season);
    return json({ ...body, token }, status);
  }
  if (path.endsWith("/guild")) {
    const id = url.searchParams.get("id");
    if (!id || !Number.isInteger(season)) {
      return json({ error: "missing id or season" }, 400);
    }
    const { status, body } = await guild(supabase, user, id, season);
    return json({ ...body, token }, status);
  }
  return json({ error: "not found" }, 404);
});
