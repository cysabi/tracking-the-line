import { SupabaseClient } from "@supabase/supabase-js";
import { dateToSeason, respond } from "../_shared/utils.ts";
import { rememberUser } from "../_shared/users.ts";
import { respondError } from "./utils.ts";
import { type Body } from "./types.d.ts";

const APP_URL = "https://cysabi.github.io/tracking-the-line/";

export async function command(body: Body, supabase: SupabaseClient) {
  await rememberUser(supabase, body.member.user);

  const power = parsePower(body);
  const season = dateToSeason(new Date());

  if (power === false) {
    return respondError(
      "Malformed power, it should be in the format: `-15`, `+22.4`, `2650.5`",
    );
  }
  if (power === null) {
    return statusReply(supabase, body.member.user.id, season, body.guild_id);
  }
  return trackPower(
    supabase,
    body.member.user.id,
    season,
    power,
    body.guild_id,
  );
}

function raceUrl(guildId: string) {
  return `${APP_URL}#/${guildId}`;
}

async function statusReply(
  supabase: SupabaseClient,
  discordId: string,
  season: number,
  guildId: string | undefined,
) {
  const [{ data: calcs }, { data: race }] = await Promise.all([
    supabase
      .from("powers")
      .select("power")
      .eq("discord_id", discordId)
      .eq("season", season)
      .limit(1),
    guildId
      ? supabase
        .from("races")
        .select("id, members")
        .eq("guild_id", guildId)
        .eq("season", season)
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lines = [
    calcs?.length
      ? `- 📊 [view your chart](${APP_URL})`
      : "- 📊 you don't have a calc for this season yet. set one with `/xp [power]`",
  ];

  if (guildId) {
    if (race) {
      if ((race.members ?? []).includes(discordId)) {
        lines.push(`- 🏁 [view this race](${raceUrl(guildId)})`);
      } else {
        lines.push(`- 🏁 you haven't joined this server's race yet. join it with \`/race\``,);
      }
    } else {
      lines.push(`- 🏁 no race in this server. start one with \`/race\``);
    }
  }

  return respond({
    type: 4,
    data: { flags: 64, content: lines.join("\n") },
  });
}

async function trackPower(
  supabase: SupabaseClient,
  discordId: string,
  season: number,
  power: { op: "add" | "set"; value: number },
  guildId: string | undefined,
) {
  const [{ data, error: queryError }, { data: race }] = await Promise.all([
    supabase
      .from("powers")
      .select("power")
      .eq("discord_id", discordId)
      .eq("season", season)
      .order("created_at", { ascending: false }),
    guildId
      ? supabase
        .from("races")
        .select("guild_id")
        .eq("guild_id", guildId)
        .eq("season", season)
        .contains("members", [discordId])
        .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (queryError) return respondError(queryError.message);

  if (power.op === "add") {
    if (data.length === 0) {
      return respondError(
        "You don't have a calc for this season yet, set one with `/xp [power]`",
      );
    }

    power.value = (power.value * 10 + data[0].power * 10) / 10;
  }

  const { error: insertError } = await supabase.from("powers").insert({
    discord_id: discordId,
    season: season,
    power: power.value,
  });
  if (insertError) return respondError(insertError.message);

  return respond({
    type: 4,
    data: { content: displayTrackedPower(data, power, race) },
  });
}

function displayTrackedPower(
  data: { power: number }[],
  power: { op: "add" | "set"; value: number },
  race: { guild_id: string } | null,
) {
  let content = "";
  if (data.length === 0) {
    content = `⏱️ **\`${power.value}\`**`;
  } else {
    const delta = (power.value * 10 - data[0].power * 10) / 10;
    const icon = delta >= 0 ? "📈" : "📉";
    const prefix = delta > 0 ? "+" : "";
    content = `${icon} **\`${prefix}${delta}\`**\n-# \`${
      data[0].power
    }\` ↠ \`${power.value}\``;
    if (race) content += ` · [**race**](${raceUrl(race.guild_id)})`;
  }
  return content;
}

function parsePower(body: Body) {
  const arg = body.data.options?.find((o) => o.name === "power")?.value;
  if (!arg) return null;

  let op: "add" | "set" = "set";
  const value = Math.round(parseFloat(arg) * 10) / 10;

  if (isNaN(value)) return false;
  if (arg.at(0) === "+" || arg.at(0) === "-") {
    if (Math.abs(value) < 5 || Math.abs(value) > 999) return false;
    op = "add";
  } else {
    if (value < 1000 || value > 9999) return false;
  }
  return { op, value };
}
