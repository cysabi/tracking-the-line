import { SupabaseClient } from "@supabase/supabase-js";
import { respond } from "./utils.ts";
import { dateToSeason } from "./utils.ts";

export async function command(body: Root, supabase: SupabaseClient) {
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
) {
  const { data, error } = await supabase
    .from("powers")
    .select("*")
    .eq("discord_id", discordId)
    .eq("season", season)
    .order("created_at", { ascending: false });
  if (error) return respondError(error.message);

  // show a graph
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

function parsePower(body: Root) {
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

export interface Root {
  app_permissions: string;
  application_id: string;
  attachment_size_limit: number;
  authorizing_integration_owners: AuthorizingIntegrationOwners;
  channel: Channel;
  channel_id: string;
  context: number;
  data: Data;
  entitlement_sku_ids: any[];
  entitlements: any[];
  guild: Guild;
  guild_id: string;
  guild_locale: string;
  id: string;
  locale: string;
  member: Member;
  token: string;
  type: number;
  version: number;
}

export interface AuthorizingIntegrationOwners {
  "0": string;
}

export interface Channel {
  flags: number;
  guild_id: string;
  icon_emoji: IconEmoji;
  id: string;
  last_message_id: string;
  name: string;
  nsfw: boolean;
  parent_id: string;
  permissions: string;
  position: number;
  rate_limit_per_user: number;
  theme_color: any;
  topic: any;
  type: number;
}

export interface IconEmoji {
  id: any;
  name: string;
}

export interface Data {
  id: string;
  name: string;
  options: Option[];
  type: number;
}

export interface Option {
  name: string;
  type: number;
  value: string;
}

export interface Guild {
  features: any[];
  id: string;
  locale: string;
}

export interface Member {
  avatar: any;
  banner: any;
  collectibles: any;
  communication_disabled_until: any;
  deaf: boolean;
  display_name_styles: any;
  flags: number;
  joined_at: string;
  mute: boolean;
  nick: any;
  pending: boolean;
  permissions: string;
  premium_since: any;
  roles: any[];
  unusual_dm_activity_until: any;
  user: User;
}

export interface User {
  avatar: string;
  avatar_decoration_data: any;
  clan: Clan;
  collectibles: any;
  discriminator: string;
  display_name_styles: any;
  global_name: any;
  id: string;
  primary_guild: PrimaryGuild;
  public_flags: number;
  username: string;
}

export interface Clan {
  badge: string;
  identity_enabled: boolean;
  identity_guild_id: string;
  tag: string;
}

export interface PrimaryGuild {
  badge: string;
  identity_enabled: boolean;
  identity_guild_id: string;
  tag: string;
}
