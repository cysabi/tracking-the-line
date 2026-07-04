import { SupabaseClient } from "@supabase/supabase-js";
import { dateToSeason, respond } from "../_shared/utils.ts";
import { rememberUser } from "../_shared/users.ts";
import { respondError } from "./utils.ts";
import { type Body } from "./types.d.ts";

const APP_URL = "https://cysabi.github.io/tracking-the-line";

export async function command(body: Body, supabase: SupabaseClient) {
  const guildId = body.guild_id;
  if (!guildId) return respondError("`/race` can only be used inside a server.");

  const user = body.member.user;
  const name = user.global_name ?? user.username;
  const season = dateToSeason(new Date());

  await rememberUser(supabase, user);

  const { data: found } = await supabase
    .from("races")
    .select("id, members")
    .eq("guild_id", guildId)
    .eq("season", season)
    .maybeSingle();

  if (!found) {
    const { data: created, error } = await supabase
      .from("races")
      .insert({ guild_id: guildId, season, members: [user.id] })
      .select("id")
      .single();
    if (error?.code === "23505") return command(body, supabase); // lost the create race — join instead
    if (error) return respondError(error.message);
    return announce(`**${name}** has [started a race!](${raceUrl(guildId)})`);
  }

  const members: string[] = found.members ?? [];
  if (members.includes(user.id)) {
    return respond({
      type: 4,
      data: {
        flags: 64,
        content: `🏁 you're already in [the race!](${raceUrl(guildId)})`,
      },
    });
  }

  const { error } = await supabase
    .from("races")
    .update({ members: [...members, user.id] })
    .eq("id", found.id);
  if (error) return respondError(error.message);

  return announce(`**${name}** has [joined the race!](${raceUrl(guildId)})`);
}

const raceUrl = (guildId: string) => `<${APP_URL}/#/${guildId}>`;

const announce = (content: string) =>
  respond({ type: 4, data: { content: `🏁 ${content}` } });
