import { SupabaseClient } from "@supabase/supabase-js";
import { isOp } from "../_shared/ops.ts";
import { type DiscordUser, type Reply } from "./types.d.ts";
import { type GuildRace, type Point } from "../../../shared/types.ts";

type UserRow = {
  discord_id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  avatar_b64: string | null;
};

export async function guild(
  supabase: SupabaseClient,
  user: DiscordUser,
  guildId: string,
  season: number,
): Promise<Reply> {
  let raceQuery = supabase
    .from("races")
    .select("id, season, members")
    .eq("guild_id", guildId)
    .eq("season", season);
  if (!isOp(user.id)) raceQuery = raceQuery.contains("members", [user.id]);
  const { data: found } = await raceQuery
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!found) {
    return { status: 200, body: { race: null, members: [] } satisfies GuildRace };
  }

  const [{ data: idents }, { data: pts }] = await Promise.all([
    supabase
      .from("users")
      .select("discord_id, username, global_name, avatar, avatar_b64")
      .in("discord_id", found.members),
    supabase
      .from("powers")
      .select("discord_id, power, created_at")
      .eq("season", found.season)
      .in("discord_id", found.members)
      .order("created_at"),
  ]);

  const identById = new Map(
    ((idents ?? []) as UserRow[]).map((u) => [u.discord_id, u]),
  );
  const byUser = new Map<string, Point[]>();
  for (const p of pts ?? []) {
    const list = byUser.get(p.discord_id) ?? [];
    list.push({ created_at: p.created_at, power: p.power });
    byUser.set(p.discord_id, list);
  }

  const members = (found.members as string[]).map((mid) => {
    const u = identById.get(mid);
    return {
      discord_id: mid,
      name: u?.global_name ?? u?.username ?? mid,
      avatar: u?.avatar ?? null,
      avatar_b64: u?.avatar_b64 ?? null,
      points: byUser.get(mid) ?? [],
    };
  });

  return {
    status: 200,
    body: {
      race: { id: found.id, season: found.season },
      members,
    } satisfies GuildRace,
  };
}
