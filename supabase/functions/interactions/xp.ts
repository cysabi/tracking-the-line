import { respond } from "./utils.ts";

export function command(body: Root) {
  const userid = body.member.user.id;
  const power = body.data.options?.find((o) => o.name === "power")?.value;

  return respond({
    type: 4,
    data: {
      content: `${userid} ${power}`,
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
