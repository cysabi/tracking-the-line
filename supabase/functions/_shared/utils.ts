export function respond(data: unknown, options: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}

export function dateToSeason(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  return ((year - 2022) * 4 - 3) + Math.floor((month + 1) / 3);
}

const seasonTokens = [
  { emoji: "🌸", name: "Fresh" },
  { emoji: "🔥", name: "Sizzle" },
  { emoji: "☔", name: "Drizzle" },
  { emoji: "❄️", name: "Chill" },
];

export function seasonIdtoTokens(seasonId: number) {
  return seasonTokens.at((seasonId + 2) % 4);
}

export function seasonIdtoName(seasonId: number) {
  const tokens = seasonIdtoTokens(seasonId)!;
  const month = `${tokens.emoji} ${tokens.name}`;
  const year = 2022 + Math.floor((seasonId + 2) / 4);
  return `${month} Season ${year}`;
}
