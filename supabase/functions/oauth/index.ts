import * as client from "openid-client";
import { discord, toTokens } from "../_shared/discord.ts";
import { APP_URL, REDIRECT_URI } from "../_shared/env.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname.endsWith("/login")) {
    const state = client.randomState();
    const to = client.buildAuthorizationUrl(discord(), {
      redirect_uri: REDIRECT_URI,
      scope: "identify guilds",
      state,
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: to.href,
        "Set-Cookie":
          `state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`,
      },
    });
  }

  const state = req.headers.get("Cookie")?.match(/(?:^|; )state=([^;]+)/)?.[1];
  if (!state) return new Response("missing state", { status: 400 });

  const current = new URL(REDIRECT_URI);
  current.search = url.search;

  try {
    const tokens = await client.authorizationCodeGrant(discord(), current, {
      expectedState: state,
    });
    const to = new URL(APP_URL);
    to.searchParams.set("token", JSON.stringify(toTokens(tokens)));
    return Response.redirect(to.href, 302);
  } catch (e) {
    return new Response(`oauth failed: ${e}`, { status: 400 });
  }
});
