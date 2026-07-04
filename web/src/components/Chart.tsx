import { createEffect, onCleanup, untrack } from "solid-js";
import * as Plot from "@observablehq/plot";
import type { Member, Point } from "../utils.ts";

export type Series = Pick<Member, "discord_id" | "name" | "points"> & {
  color: string;
};

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const AXIS = "oklch(55.4% 0.046 257.417)";

type Row = { date: Date; power: number };

function baseOptions(width: number) {
  return {
    margin: 48,
    width,
    height: Math.max(320, Math.round(width * 0.52)),
    grid: true,
    style: { width: "100%", fontSize: "13px", backgroundColor: cssVar("--color-bg"), color: AXIS, fontFamily: "VG5000" },
    x: { label: null },
    y: { tickFormat: (d: number) => "" + d, label: null },
  } as const;
}

function gradientDefs(color: string) {
  return () => {
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const grad = document.createElementNS(ns, "linearGradient");
    grad.setAttribute("id", "gradient");
    grad.setAttribute("gradientTransform", "rotate(90)");
    for (const [offset, opacity] of [["0%", "0.5"], ["100%", "0"]]) {
      const stop = document.createElementNS(ns, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      stop.setAttribute("stop-opacity", opacity);
      grad.append(stop);
    }
    defs.append(grad);
    return defs;
  };
}

function powerTip(rows: Row[] | (Row & { id: string })[]) {
  return Plot.tip(
    rows,
    Plot.pointer({
      x: "date",
      y: "power",
      title: (d: Row) => d.power.toFixed(1),
      textPadding: 4,
    }),
  );
}

function isLocalMinMax(rows: Row[], i: number): "min" | "max" | undefined {
  const d = rows[i];
  const prev = rows[i - 1];
  const next = rows[i + 1];
  if (!prev) return next.power > d.power ? "min" : "max";
  if (!next) return prev.power > d.power ? "min" : "max";
  if (prev.power < d.power && next.power < d.power) return "max";
  if (prev.power > d.power && next.power > d.power) return "min";
}

function renderSingle(points: Point[], width: number) {
  const rows: Row[] = points.map((p) => ({
    date: new Date(p.created_at),
    power: p.power,
  }));
  const minY = Math.min(...rows.map((r) => r.power)) - 100;
  const accent = cssVar("--color-accent");
  const bg = cssVar("--color-bg");

  return Plot.plot({
    ...baseOptions(width),
    marks: [
      gradientDefs(accent),
      Plot.areaY(rows, {
        x: "date",
        y1: minY,
        y2: "power",
        curve: "monotone-x",
        fill: "url(#gradient)",
      }),
      Plot.lineY(rows, {
        x: "date",
        y: "power",
        curve: "monotone-x",
        stroke: accent,
        strokeWidth: 4,
      }),
      Plot.dot(rows, {
        x: "date",
        y: "power",
        stroke: accent,
        strokeWidth: 4,
        r: 4,
        fill: bg,
      }),
      ...([["min", 1, "top"], ["max", -1, "bottom"]] as const).map(
        ([minMax, dyMult, lineAnchor]) =>
          Plot.text(rows, {
            x: "date",
            y: "power",
            text: (d: Row) => d.power.toFixed(1),
            fill: "#90a1b9",
            stroke: "#1d293d",
            strokeWidth: 4,
            filter: (_d: Row, i: number) => isLocalMinMax(rows, i) === minMax,
            dy: 14 * dyMult,
            lineAnchor,
          }),
      ),
      powerTip(rows),
    ],
  });
}

function renderMulti(series: Series[], width: number) {
  const drawn = series.filter((s) => s.points.length);
  const rows = drawn.flatMap((s) =>
    s.points.map((p) => ({
      date: new Date(p.created_at),
      power: p.power,
      id: s.discord_id,
    }))
  );

  const plot = Plot.plot({
    ...baseOptions(width),
    color: {
      domain: drawn.map((s) => s.discord_id),
      range: drawn.map((s) => s.color),
    },
    marks: [
      Plot.lineY(rows, {
        x: "date",
        y: "power",
        z: "id",
        stroke: "id",
        curve: "monotone-x",
        strokeWidth: 2,
      }),
      Plot.dot(rows, {
        x: "date",
        y: "power",
        stroke: "id",
        fill: "id",
        r: 2,
      }),
      powerTip(rows),
    ],
  });

  plot.querySelectorAll<SVGElement>('g[aria-label="line"] path')
    .forEach((el, i) => {
      const id = drawn[i]?.discord_id;
      if (id) el.dataset.series = id;
    });
  plot.querySelectorAll<SVGElement>('g[aria-label="dot"] circle')
    .forEach((el, i) => {
      const id = rows[i]?.id;
      if (id) el.dataset.series = id;
    });
  return plot;
}

export default function Chart(props: {
  variant: "single" | "multi";
  series: Series[];
  dimmed?: string | null;
}) {
  let el!: HTMLDivElement;

  const applyDim = () => {
    const dim = props.dimmed;
    el.querySelectorAll<SVGElement>("[data-series]").forEach((node) => {
      node.style.opacity = dim && node.dataset.series !== dim ? "0.1" : "";
    });
  };

  createEffect(() => {
    const series = props.series;
    const variant = props.variant;
    let lastWidth = -1;

    const draw = () => {
      const width = el.clientWidth || 800;
      if (width === lastWidth) return;
      lastWidth = width;
      el.replaceChildren();
      if (!series.some((s) => s.points.length)) return;
      const plot = variant === "single"
        ? renderSingle(series[0].points, width)
        : renderMulti(series, width);
      el.append(plot);
      untrack(applyDim);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  });

  createEffect(() => {
    props.dimmed;
    applyDim();
  });

  return <div ref={el} class="chart" style={{ width: "100%", background: "var(--color-bg)", overflow: "hidden" }} />;
}
