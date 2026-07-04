// Prints the app's currently registered global commands:
//   deno run --allow-net --allow-env --env-file=supabase/functions/.env scripts/list-commands.ts

const CLIENT_ID = Deno.env.get("CLIENT_ID");
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");

const res = await fetch(
  `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
  { headers: { Authorization: `Bot ${BOT_TOKEN}` } },
);
if (!res.ok) {
  console.error(`failed (${res.status}):`, await res.text());
  Deno.exit(1);
}
const commands = await res.json();
console.log(JSON.stringify(
  commands.map((c: {
    name: string;
    description: string;
    contexts: number[] | null;
    integration_types: number[] | null;
    options?: { name: string }[];
  }) => ({
    name: c.name,
    description: c.description,
    contexts: c.contexts,
    integration_types: c.integration_types,
    options: c.options?.map((o) => o.name),
  })),
  null,
  2,
));
