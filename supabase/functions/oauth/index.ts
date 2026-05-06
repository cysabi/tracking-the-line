import { createHelpers, getRequiredEnv } from "@deno/kv-oauth";

const {
  signIn,
  handleCallback,
  getSessionId,
  signOut,
} = createHelpers({
  clientId: getRequiredEnv("CLIENT_ID"),
  clientSecret: getRequiredEnv("CLIENT_SECRET"),
  authorizationEndpointUri: "https://custom.com/oauth/authorize",
  tokenUri: "https://custom.com/oauth/token",
  redirectUri: "https://my-site.com/another-dir/callback",
});

async function handler(request: Request) {
  const { pathname } = new URL(request.url);
  switch (pathname) {
    case "/oauth/signin":
      return await signIn(request);
    case "/oauth/callback": {
      const { response } = await handleCallback(request);
      return response;
    }
    case "/oauth/signout":
      return await signOut(request);
    default:
      return await getSessionId(request) === undefined
        ? new Response("Unauthorized", { status: 401 })
        : new Response("You are allowed");
  }
}

Deno.serve(handler);
