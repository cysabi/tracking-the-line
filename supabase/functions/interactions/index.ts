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

  const json = JSON.parse(body);
  switch (json.type) {
    case DiscordCommandType.Ping: {
      return respond({ type: 1 });
    }
    case DiscordCommandType.ApplicationCommand: {
      return command(json);
    }
    default: {
      return respond({ error: "bad request" }, { status: 400 });
    }
  }
});
