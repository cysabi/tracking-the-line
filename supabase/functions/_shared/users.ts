import { SupabaseClient } from "@supabase/supabase-js";

type Identity = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function rememberUser(supabase: SupabaseClient, user: Identity) {
  const { data: found } = await supabase
    .from("users")
    .select("avatar, avatar_b64")
    .eq("discord_id", user.id)
    .maybeSingle();

  const stale = found?.avatar !== (user.avatar ?? null) || !found?.avatar_b64;
  return supabase
    .from("users")
    .upsert({
      discord_id: user.id,
      username: user.username,
      global_name: user.global_name ?? null,
      avatar: user.avatar ?? null,
      updated_at: new Date().toISOString(),
      ...(stale ? { avatar_b64: await fetchAvatarB64(user) } : {}),
    }, { onConflict: "discord_id" });
}

async function fetchAvatarB64(user: Identity) {
  if (!user.avatar) return null;

  const res = await fetch(
    `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`,
  );
  if (!res.ok) return null;

  let bin = "";
  for (const byte of new Uint8Array(await res.arrayBuffer())) {
    bin += String.fromCharCode(byte);
  }
  return btoa(bin);
}
