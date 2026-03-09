import nacl from "tweetnacl";

export function respond(data: any, options: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}

export async function verifySignature(
  request: Request,
): Promise<{ valid: boolean; body: string }> {
  const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");
  if (!PUBLIC_KEY) {
    throw Error("missing `DISCORD_PUBLIC_KEY`");
  }
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp || request.method !== "POST") {
    return { valid: false, body: "" };
  }
  const body = await request.text();
  const valid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY),
  );

  return { valid, body };
}
function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}

export function dateToSeason(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  const seasonId = (((year - 2022) * 4) - 3) + Math.floor((month + 1) / 3);
  return seasonId;
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
