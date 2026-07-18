import { createEffect, createResource, For, onCleanup, onMount, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { useParams } from "@solidjs/router";
import Box, { BoxEmpty, Cmd, Stat } from "../components/Box.tsx";
import Chart from "../components/Chart.tsx";
import Header from "../components/Header.tsx";
import { avatarColor, cdn, fmt, getGuild, guildOf, type RaceAction, raceInit, raceReduce, raceRows, seasonNav, seasonOf, useAccount } from "../utils.ts";

export default function Guild() {
  const params = useParams();
  const guildId = () => params.guildId!;
  const account = useAccount();

  const [data] = createResource(
    () => ({ id: guildId(), season: seasonOf(account()) }),
    (src) => getGuild(src.id, src.season),
  );

  const [race, setRace] = createStore(raceInit());
  const dispatch = (a: RaceAction) => setRace(raceReduce(a));

  const loading = () => data.loading || !data();
  const guild = () => guildOf(account(), guildId());
  const focus = () => race.rows.find((r) => r.discord_id === race.hovered);

  createEffect(() => {
    const { rows, stats } = raceRows(data()?.members ?? [], race);
    setRace("rows", reconcile(rows, { key: "discord_id" }));
    setRace("stats", stats);
  });

  createEffect(() => {
    for (const r of race.rows) {
      if (!r.avatar_b64 || r.discord_id in race.colors) continue;
      dispatch({ type: "color", id: r.discord_id, color: null });
      avatarColor(r.avatar_b64).then((color) => {
        if (color) dispatch({ type: "color", id: r.discord_id, color });
      });
    }
  });

  onMount(() => {
    const up = () => dispatch({ type: "release" });
    window.addEventListener("pointerup", up);
    window.addEventListener("mouseup", up);
    onCleanup(() => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("mouseup", up);
    });
  });

  return (
    <>
      <Header
        name={guild()?.name ?? "unknown server"}
        avatarUrl={cdn("icons", guildId(), guild()?.icon ?? null)}
        fallback={guild()?.name}
        action="home"
        season={seasonNav(account())}
      />

      <Box
        title="the race"
        right={
          <Show when={!loading() && race.stats}>
            {(stats) => (
              <Show
                when={focus()}
                fallback={
                  <>
                    <Stat label="leader" value={<span style={{ color: race.rows[0].color }}>{race.rows[0].name}</span>} />
                    <Stat label="players" value={String(race.rows.length)} />
                    <Stat label="avg" value={fmt(stats().avg)} />
                    <Stat label="peak" value={fmt(stats().peak)} />
                  </>
                }
              >
                {(f) => (
                  <>
                    <span style={{ color: f().color }}>{f().name}</span>
                    <Stat label="place" value={`#${f().place}`} />
                    <Stat label="avg" value={fmt(f().avg)} />
                    <Stat label="peak" value={fmt(f().peak)} />
                    <Stat label="current" value={fmt(f().current)} />
                  </>
                )}
              </Show>
            )}
          </Show>
        }
      >
        <Show when={!loading()} fallback={<BoxEmpty>loading…</BoxEmpty>}>
          <Show
            when={race.rows.length}
            fallback={
              <BoxEmpty>
                {data()?.race
                  ? "no one in this race has enough xp tracked to chart yet"
                  : <>no race this season — start one with <Cmd>/race</Cmd> in discord</>}
              </BoxEmpty>
            }
          >
            <div style={{ display: "grid", "grid-template-columns": "max-content minmax(0, 1fr)" }}>
              <ul class="legend-list" style={{ "list-style": "none", margin: "0", padding: "8px 0", height: "0", "min-height": "100%", "overflow-y": "scroll" }}>
                <For each={race.rows}>
                  {(r) => (
                    <li
                      classList={{ "legend-row": true, off: r.hidden, hover: race.hovered === r.discord_id || !!race.drag?.ids[r.discord_id] }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        dispatch({ type: "press", id: r.discord_id, exclude: e.shiftKey });
                      }}
                      onMouseEnter={() => dispatch({ type: "enter", id: r.discord_id })}
                      onMouseLeave={() => dispatch({ type: "leave" })}
                      style={{ display: "flex", "align-items": "center", gap: "8px", padding: "6px 12px", "font-size": "0.9rem" }}
                    >
                      <Show
                        when={r.avatar_b64}
                        fallback={
                          <span class="legend-avatar" style={{ width: "24px", height: "24px", flex: "none", display: "grid", "place-items": "center", "border-radius": "50%", border: `2px solid ${r.color}`, background: "var(--color-bg)", color: "var(--color-text-muted)", "text-transform": "uppercase", "font-weight": "600", "font-size": "0.65rem" }}>
                            {r.name[0]}
                          </span>
                        }
                      >
                        {(b64) => <img class="legend-avatar" src={`data:image/png;base64,${b64()}`} alt="" style={{ width: "24px", height: "24px", flex: "none", "border-radius": "50%", border: `2px solid ${r.color}`, "object-fit": "cover" }} />}
                      </Show>
                      <span style={{ overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>{r.name}</span>
                    </li>
                  )}
                </For>
              </ul>
              <div style={{ "min-width": "0" }}>
                <Chart
                  variant="multi"
                  series={race.rows}
                  dimmed={race.drag ? Object.keys(race.drag.ids) : race.hovered && !race.hidden[race.hovered] ? [race.hovered] : null}
                  onEnter={(id) => dispatch({ type: "enter", id })}
                  onLeave={() => dispatch({ type: "leave" })}
                  onPress={(id, shift) => dispatch({ type: "press", id, exclude: shift })}
                />
              </div>
            </div>
          </Show>
        </Show>
      </Box>
    </>
  );
}
