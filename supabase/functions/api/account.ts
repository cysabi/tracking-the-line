import { SupabaseClient } from "@supabase/supabase-js";
import { isOp } from "../_shared/ops.ts";
import { rememberUser } from "../_shared/users.ts";
import { type DiscordUser, type Guild, type Reply } from "./types.d.ts";
import { type Account } from "../../../shared/types.ts";

export async function account(
  supabase: SupabaseClient,
  user: DiscordUser,
  guilds: Guild[],
  impersonating = false,
): Promise<Reply> {
  if (!impersonating) await rememberUser(supabase, user);

  let racesQuery = supabase.from("races").select("season");
  if (!isOp(user.id)) racesQuery = racesQuery.contains("members", [user.id]);

  const [{ data: power }, { data: race }] = await Promise.all([
    supabase
      .from("powers")
      .select("season")
      .eq("discord_id", user.id)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    racesQuery.order("season", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const seasons = [power?.season, race?.season].filter(
    (s): s is number => typeof s === "number",
  );

  return {
    status: 200,
    body: {
      discord: {
        id: user.id,
        username: user.username,
        global_name: user.global_name,
        avatar: user.avatar,
      },
      guilds: guilds.map((g) => ({ id: g.id, name: g.name, icon: g.icon })),
      latest_season: seasons.length ? Math.max(...seasons) : null,
    } satisfies Account,
  };
}
