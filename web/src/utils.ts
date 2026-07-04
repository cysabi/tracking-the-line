import { createContext, createSignal, useContext } from "solid-js";
import { produce } from "solid-js/store";
import { query } from "@solidjs/router";
import { getSwatchesSync } from "colorthief";
import type { Account, GuildRace, Me, Member, Point } from "../../shared/types.ts";

export type { Account, Guild, GuildRace, Me, Member, Point } from "../../shared/types.ts";

// ── auth ─────────────────────────────────────────────────────────────────────

type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export function captureTokens() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  if (!token) return;
  localStorage.setItem("token", token);
  params.delete("token");
  const qs = params.toString();
  history.replaceState(
    null,
    "",
    location.pathname + (qs ? `?${qs}` : "") + location.hash,
  );
}

export const getTokens = (): Tokens | null => {
  try {
    const raw = localStorage.getItem("token");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const clearTokens = () => localStorage.removeItem("token");
export const login =
  () => (location.href = `${import.meta.env.VITE_FUNCTIONS_URL}/oauth/login`);

const setTokens = (t: Tokens) =>
  localStorage.setItem("token", JSON.stringify(t));

// ── api ──────────────────────────────────────────────────────────────────────

export const getAccount = query(() => call<Account>("/account"), "account");
export const AccountContext = createContext<() => Account>();
export const useAccount = () => useContext(AccountContext)!;
export const getMe = query(
  (season: number) => call<Me>(`/me?season=${season}`),
  "me",
);
export const getGuild = query(
  (id: string, season: number) =>
    call<GuildRace>(`/guild?id=${encodeURIComponent(id)}&season=${season}`),
  "guild",
);

const cache: Map<string, Promise<unknown>> = import.meta.hot
  ? (import.meta.hot.data.cache ??= new Map())
  : new Map();

const getAs = () =>
  new URLSearchParams(location.search).get("as") ??
    new URLSearchParams(location.hash.split("?")[1] ?? "").get("as");

async function call<T>(path: string): Promise<T> {
  const as = getAs();
  if (as) path += `${path.includes("?") ? "&" : "?"}as=${encodeURIComponent(as)}`;
  const hit = cache.get(path) as Promise<T> | undefined;
  if (hit) return hit;
  const p = request<T>(path);
  cache.set(path, p);
  p.catch(() => cache.delete(path));
  return p;
}

async function request<T>(path: string): Promise<T> {
  const tokens = getTokens();
  if (!tokens) {
    login();
    throw new Error("not authenticated");
  }

  const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/api${path}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "X-Refresh-Token": tokens.refresh_token,
      "X-Token-Expires": String(tokens.expires_at),
    },
  });
  if (res.status === 401) {
    clearTokens();
    login();
    throw new Error("session expired");
  }

  const body: T & { token?: Tokens; error?: string } = await res.json();
  if (body.token) setTokens(body.token);
  if (!res.ok) throw new Error(body.error ?? `request failed (${res.status})`);
  return body;
}

// ── seasons ──────────────────────────────────────────────────────────────────

const [picked, setPicked] = createSignal<number | null>(null);

const newestSeason = (account?: Account) =>
  Math.max(currentSeason(), account?.latest_season ?? 0);
const goSeason = (account: Account | undefined, delta: number) =>
  setPicked(() =>
    Math.min(newestSeason(account), Math.max(0, seasonOf(account) + delta))
  );

const seasonTokens = [
  { emoji: "🌸", name: "fresh" },
  { emoji: "🔥", name: "sizzle" },
  { emoji: "☔", name: "drizzle" },
  { emoji: "❄️", name: "chill" },
];
const seasonName = (id: number) => {
  const t = seasonTokens[(id + 2) % 4];
  return `${t.emoji} ${t.name} season ${2022 + Math.floor((id + 2) / 4)}`;
};
const currentSeason = () =>
  (new Date().getUTCFullYear() - 2022) * 4 - 3 +
  Math.floor((new Date().getUTCMonth() + 1) / 3);

export const seasonOf = (account?: Account) =>
  picked() ?? account?.latest_season ?? currentSeason();

export const seasonNav = (account?: Account) => {
  const season = seasonOf(account);
  return {
    label: seasonName(season),
    onPrev: () => goSeason(account, -1),
    onNext: () => goSeason(account, 1),
    prevDisabled: season <= 0,
    nextDisabled: season >= newestSeason(account),
  };
};

// ── discord ──────────────────────────────────────────────────────────────────

export const guildOf = (account: Account | undefined, id: string) =>
  account?.guilds.find((g) => g.id === id);

export const cdn = (
  kind: "avatars" | "icons",
  id: string,
  hash: string | null,
) =>
  hash
    ? `https://cdn.discordapp.com/${kind}/${id}/${hash}.${
      hash.startsWith("a_") ? "gif" : "png"
    }?size=64`
    : null;

// ── member colors ────────────────────────────────────────────────────────────

export const hashColor = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `oklch(72% 0.16 ${h % 360})`;
};

export const avatarColor = async (b64: string): Promise<string | undefined> => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  try {
    await img.decode();
    return getSwatchesSync(img, { colorSpace: "oklch" }).Vibrant?.color.css("oklch");
  } catch {
    return undefined;
  }
};

// ── points ───────────────────────────────────────────────────────────────────

export const fmt = (n: number) => String(Math.round(n * 10) / 10);
export const pointStats = (points: Point[]) =>
  points.length
    ? {
      current: points[points.length - 1].power,
      avg: points.reduce((acc, p) => acc + p.power, 0) / points.length,
      peak: Math.max(...points.map((p) => p.power)),
    }
    : null;

// ── race page ────────────────────────────────────────────────────────────────
// actions mutate the raw fields via raceReduce; rows/stats are derived from the
// fetched members + raw fields by raceRows, reconciled into the store by the route

export type Row = Member & {
  color: string;
  hidden: boolean;
  place: number;
  current: number;
  avg: number;
  peak: number;
};

export type Race = {
  hidden: Record<string, boolean>;
  hovered: string | null;
  dragging: "hide" | "show" | null;
  colors: Record<string, string | null>;
  rows: Row[];
  stats: { avg: number; peak: number } | null;
};
export type RaceAction =
  | { type: "press"; id: string; solo: boolean }
  | { type: "enter"; id: string }
  | { type: "leave" }
  | { type: "release" }
  | { type: "color"; id: string; color: string | null };

export const raceInit = (): Race => ({
  hidden: {},
  hovered: null,
  dragging: null,
  colors: {},
  rows: [],
  stats: null,
});

export const raceRows = (members: Member[], race: Race): Pick<Race, "rows" | "stats"> => {
  const rows = members
    .filter((m) => m.points.length >= 2)
    .map((m) => ({
      ...m,
      ...pointStats(m.points)!,
      color: race.colors[m.discord_id] ?? hashColor(m.discord_id),
      hidden: !!race.hidden[m.discord_id],
      place: 0,
    }))
    .sort((a, b) => b.current - a.current);
  rows.forEach((r, i) => r.place = i + 1);
  return {
    rows,
    stats: rows.length
      ? {
        avg: rows.reduce((acc, r) => acc + r.current, 0) / rows.length,
        peak: Math.max(...rows.map((r) => r.peak)),
      }
      : null,
  };
};

export const raceReduce = (a: RaceAction) =>
  produce<Race>((s) => {
    switch (a.type) {
      case "press": {
        if (a.solo) {
          const others = s.rows.map((r) => r.discord_id).filter((id) => id !== a.id);
          const already = !s.hidden[a.id] && others.every((id) => s.hidden[id]);
          s.hidden = Object.fromEntries(already ? [] : others.map((id) => [id, true]));
          return;
        }
        s.dragging = s.hidden[a.id] ? "show" : "hide";
        toggle(s, a.id, s.dragging);
        return;
      }
      case "enter":
        s.hovered = a.id;
        if (s.dragging) toggle(s, a.id, s.dragging);
        return;
      case "leave":
        s.hovered = null;
        return;
      case "release":
        s.dragging = null;
        return;
      case "color":
        s.colors[a.id] = a.color;
        return;
    }
  });

const toggle = (s: Race, id: string, to: "hide" | "show") => {
  to === "hide" ? s.hidden[id] = true : delete s.hidden[id];
  if (s.rows.every((r) => s.hidden[r.discord_id])) s.hidden = {};
};
