// Bulk-overwrites the app's global slash commands. Rerun whenever these change:
//   deno run --allow-net --allow-env --env-file=supabase/functions/.env scripts/register-commands.ts

const CLIENT_ID = Deno.env.get("CLIENT_ID");
const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
if (!CLIENT_ID || !BOT_TOKEN) {
  console.error("missing CLIENT_ID or BOT_TOKEN");
  Deno.exit(1);
}

const GUILD_ONLY = [0]; // both commands read body.member, which only exists in guilds

const commands = [
  {
    name: "xp",
    type: 1,
    description: "track your x power",
    contexts: GUILD_ONLY,
    options: [
      {
        type: 3, // STRING
        name: "power",
        description: "2650.5 to set your power, +22.4 / -15 to adjust it",
        required: false,
      },
    ],
  },
  {
    name: "race",
    type: 1,
    description: "start/join this server's race for the season",
    contexts: GUILD_ONLY,
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!res.ok) {
  console.error(`failed (${res.status}):`, await res.text());
  Deno.exit(1);
}
const registered = (await res.json()) as { name: string }[];
console.log("registered:", registered.map((c) => c.name).join(", "));
