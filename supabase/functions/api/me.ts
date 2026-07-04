import { SupabaseClient } from "@supabase/supabase-js";
import { isOp } from "../_shared/ops.ts";
import { type DiscordUser, type Reply } from "./types.d.ts";
import { type Me } from "../../../shared/types.ts";

export async function me(
  supabase: SupabaseClient,
  user: DiscordUser,
  season: number,
): Promise<Reply> {
  let racesQuery = supabase
    .from("races")
    .select("id, guild_id")
    .eq("season", season);
  if (!isOp(user.id)) racesQuery = racesQuery.contains("members", [user.id]);

  const [{ data: xp }, { data: races }] = await Promise.all([
    supabase
      .from("powers")
      .select("power, created_at")
      .eq("discord_id", user.id)
      .eq("season", season)
      .order("created_at"),
    racesQuery.order("id", { ascending: false }),
  ]);

  return {
    status: 200,
    body: { xp, races: races ?? [] } satisfies Me,
  };
}
