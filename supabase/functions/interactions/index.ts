import { createClient } from "@supabase/supabase-js";
import { respond, verifySignature } from "./utils.ts";
import { command } from "./xp.ts";

enum DiscordCommandType {
  Ping = 1,
  ApplicationCommand = 2,
}

Deno.serve(async (request) => {
  const { valid, body } = await verifySignature(request);
  if (!valid) {
    return respond(
      { error: "Invalid request" },
      { status: 401 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = JSON.parse(body);
  switch (json.type) {
    case DiscordCommandType.Ping: {
      return respond({ type: 1 });
    }
    case DiscordCommandType.ApplicationCommand: {
      return command(json, supabase);
    }
    default: {
      return respond({ error: "bad request" }, { status: 400 });
    }
  }
});
