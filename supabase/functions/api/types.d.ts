export type Guild =
  & { id: string; name: string; icon: string | null }
  & Record<string, unknown>;

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export type Reply = { status: number; body: Record<string, unknown> };
