import { SupabaseClient } from "@supabase/supabase-js";
import {
  dateToSeason,
  respond,
  seasonIdtoName,
  seasonIdtoTokens,
} from "./utils.ts";
import { encodeBase64 } from "@std/encoding/base64";
import { visualize } from "./chart.ts";
import { type Body } from "./types.d.ts";

export function component(body: Body, supabase: SupabaseClient) {
  const season = parseInt(body.data.custom_id?.split("season_").at(-1)!);

  return graphPower(supabase, body.message?.interaction.user.id!, season, true);
}

export function command(body: Body, supabase: SupabaseClient) {
  const power = parsePower(body);
  const season = dateToSeason(new Date());

  if (power === false) {
    return respondError(
      "Malformed power, it should be in the format: `-15`, `+22.4`, `2650.5`",
    );
  }
  if (power === null) {
    return graphPower(supabase, body.member.user.id, season);
  }
  return trackPower(supabase, body.member.user.id, season, power);
}

async function graphPower(
  supabase: SupabaseClient,
  discordId: string,
  season: number,
  edit: boolean = false,
) {
  const [
    { data: prevData },
    { data, error },
    { data: nextData },
  ] = await Promise.all([
    supabase
      .from("powers")
      .select("season")
      .eq("discord_id", discordId)
      .lt("season", season)
      .order("season", { ascending: false }).limit(1),
    supabase
      .from("powers")
      .select("power, created_at")
      .eq("discord_id", discordId)
      .eq("season", season)
      .order("created_at", { ascending: false }),
    supabase
      .from("powers")
      .select("season")
      .eq("discord_id", discordId)
      .gt("season", season)
      .order("season", { ascending: true }).limit(1),
  ]);

  const prevSeason = {
    exists: prevData?.[0]?.season !== undefined,
    id: prevData?.[0]?.season ?? season - 1,
  };
  const nextSeason = {
    exists: nextData?.[0]?.season !== undefined,
    id: nextData?.[0]?.season ?? season + 1,
  };

  if (error) return respondError(error.message);
  if (data.length === 0) {
    return respondError(
      "You don't have a calc for this season yet, set one with `/xp [power]`",
    );
  }

  const uriData = data.map((row) => {
    const timestamp = Math.floor(
      new Date(row.created_at).valueOf() / 1000,
    );
    const power = row.power * 10;
    return [
      intToBase64(timestamp, 4).substring(0, 6),
      intToBase64(power, 2).substring(0, 3),
    ].join("");
  }).join("").replaceAll("+", "~").replaceAll("/", "_").replaceAll("=", "-");

  const payload = {
    type: edit ? 7 : 4,
    data: {
      embeds: [{
        title: seasonIdtoName(season),
        url: `https://cysabi.github.io/tracking-the-line/chart?data=${uriData}`,
        image: { url: "attachment://chart.png" },
        color: 1039259,
        fields: [
          {
            name: "Average XP",
            value: `\`${
              (Math.round(
                (data.reduce((acc, val) => acc + val.power, 0) / data.length) *
                  10,
              ) / 10).toFixed(1)
            }\``,
            inline: true,
          },
          {
            name: "Peak XP",
            value: `\`${Math.max(...data.map((r) => r.power)).toFixed(1)}\``,
            inline: true,
          },
          {
            name: "Current XP",
            value: `\`${data[0].power.toFixed(1)}\``,
            inline: true,
          },
        ],
      }],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: prevSeason.id - season === -1 ? "🠜" : "🠜🠜",
              emoji: {
                name: seasonIdtoTokens(prevSeason.id)?.emoji,
              },
              custom_id: `season_${prevSeason.id}`,
              style: 2,
              disabled: !prevSeason.exists,
            },
            {
              type: 2,
              label: nextSeason.id - season === 1 ? "🠞" : "🠞🠞",
              emoji: {
                name: seasonIdtoTokens(nextSeason.id)?.emoji,
              },
              custom_id: `season_${nextSeason.id}`,
              style: 2,
              disabled: !nextSeason.exists,
            },
          ],
        },
      ],
    },
  };

  const formData = new FormData();

  formData.append(
    "payload_json",
    JSON.stringify(payload),
  );
  // formData.append(
  //   "files[0]",
  //   new File([await visualize(data)], "chart.png", { type: "image/png" }),
  // );

  return new Response(formData);
}

async function trackPower(
  supabase: SupabaseClient,
  discordId: string,
  season: number,
  power: { op: "add" | "set"; value: number },
) {
  const { data, error: queryError } = await supabase
    .from("powers")
    .select("power")
    .eq("discord_id", discordId)
    .eq("season", season)
    .order("created_at", { ascending: false });
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
    data: { content: displayTrackedPower(data, power) },
  });
}

function displayTrackedPower(
  data: { power: number }[],
  power: { op: "add" | "set"; value: number },
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

function respondError(message: string) {
  return respond({
    type: 4,
    data: {
      flags: 64,
      content: `🚫 ${message}`,
    },
  });
}

function intToBase64(int: number, len: number): string {
  const buffer = new ArrayBuffer(len);
  const view = new DataView(buffer);

  if (len >= 4) view.setUint32(0, int, true);
  else view.setUint16(0, int, true);

  const uint8Array = new Uint8Array(buffer);
  return encodeBase64(uint8Array);
}
