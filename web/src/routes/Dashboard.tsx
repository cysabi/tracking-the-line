import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import Box, { BoxEmpty, Cmd, Stat } from "../components/Box.tsx";
import Chart from "../components/Chart.tsx";
import Header from "../components/Header.tsx";
import { cdn, fmt, getMe, guildOf, pointStats, seasonNav, seasonOf, useAccount } from "../utils.ts";

export default function Dashboard() {
  const account = useAccount();
  const [me] = createResource(() => seasonOf(account()), getMe);

  const loading = () => me.loading || !me();
  const points = () => me()?.xp ?? [];
  const races = () => me()?.races ?? [];
  const stats = () => pointStats(points());

  return (
    <>
      <Header
        name={account().discord.global_name || account().discord.username}
        avatarUrl={cdn("avatars", account().discord.id, account().discord.avatar)}
        round
        action="logout"
        season={seasonNav(account())}
      />

      <div style={{ display: "flex", "flex-direction": "column", gap: "20px" }}>
        <Box title="your races">
          <Show when={!loading()} fallback={<BoxEmpty>loading…</BoxEmpty>}>
            <Show
              when={races().length}
              fallback={
                <BoxEmpty>
                  no races this season — start or join one with <Cmd>/race</Cmd> in discord
                </BoxEmpty>
              }
            >
              <ul style={{ "list-style": "none", margin: "0", padding: "8px", display: "flex", "flex-wrap": "wrap", gap: "8px" }}>
                <For each={races()}>
                  {(r) => (
                    <li>
                      <A href={`/${r.guild_id}`} class="race-link" style={{ display: "flex", "align-items": "center", gap: "8px", padding: "8px", width: "240px", color: "var(--color-text)", "text-decoration": "none", "box-sizing": "border-box" }}>
                        <Show
                          when={cdn("icons", r.guild_id, guildOf(account(), r.guild_id)?.icon ?? null)}
                          fallback={
                            <span style={{ width: "24px", height: "24px", flex: "none", display: "grid", "place-items": "center", "border-radius": "18%", background: "var(--color-bg)", color: "var(--color-text-muted)", "text-transform": "uppercase", "font-weight": "600" }}>
                              {(guildOf(account(), r.guild_id)?.name ?? "?")[0]}
                            </span>
                          }
                        >
                          {(src) => <img style={{ width: "24px", height: "24px", flex: "none", "border-radius": "18%", "object-fit": "cover" }} src={src()} alt="" />}
                        </Show>
                        <span style={{ display: "flex", "flex-direction": "column", "min-width": "0" }}>
                          <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                            {guildOf(account(), r.guild_id)?.name ?? "unknown server"}
                          </span>
                        </span>
                      </A>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </Box>

        <Box
          title="your chart"
          right={
            <Show when={!loading() && stats()}>
              {(s) => (
                <>
                  <Stat label="avg" value={fmt(s().avg)} />
                  <Stat label="peak" value={fmt(s().peak)} />
                  <Stat label="current" value={fmt(s().current)} />
                </>
              )}
            </Show>
          }
        >
          <Show when={!loading()} fallback={<BoxEmpty>loading…</BoxEmpty>}>
            <Show
              when={points().length}
              fallback={
                <BoxEmpty>
                  no xp tracked this season — set one with <Cmd>/xp</Cmd> in discord
                </BoxEmpty>
              }
            >
              <Chart variant="single" series={[{ discord_id: account().discord.id, name: account().discord.username, color: "var(--color-accent)", points: points() }]} />
            </Show>
          </Show>
        </Box>
      </div>
    </>
  );
}
