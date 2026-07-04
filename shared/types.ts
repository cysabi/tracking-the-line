// api response shapes shared between supabase/functions/api and web

export type Point = { created_at: string; power: number };
export type Guild = { id: string; name: string; icon: string | null };

export type Member = {
  discord_id: string;
  name: string;
  avatar: string | null;
  avatar_b64: string | null;
  points: Point[];
};

export type Account = {
  discord: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  };
  guilds: Guild[];
  latest_season: number | null;
};

export type Me = {
  xp: Point[] | null;
  races: { id: number; guild_id: string }[];
};

export type GuildRace = {
  race: { id: number; season: number } | null;
  members: Member[];
};
