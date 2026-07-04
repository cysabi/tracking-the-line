import * as client from "openid-client";
import { CLIENT_ID, CLIENT_SECRET } from "./env.ts";

const server: client.ServerMetadata = {
  issuer: "https://discord.com",
  authorization_endpoint: "https://discord.com/oauth2/authorize",
  token_endpoint: "https://discord.com/api/oauth2/token",
};

export function discord() {
  return new client.Configuration(
    server,
    CLIENT_ID,
    CLIENT_SECRET,
    client.ClientSecretPost(CLIENT_SECRET),
  );
}

export type Tokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

export const toTokens = (
  t: { access_token?: string; refresh_token?: string; expires_in?: number },
  refresh?: string,
): Tokens => ({
  access_token: t.access_token ?? "",
  refresh_token: t.refresh_token ?? refresh ?? "",
  expires_at: Date.now() + (t.expires_in ?? 604800) * 1000,
});

export const refreshTokens = async (
  refresh: string,
  expiresAt: number,
): Promise<Tokens | null> => {
  if (!expiresAt || Date.now() <= expiresAt - 60_000) return null;
  return toTokens(await client.refreshTokenGrant(discord(), refresh), refresh);
};
