import * as Plot from "@observablehq/plot";
import * as htl from "htl";
import * as resvg from "@resvg/resvg-wasm";
import { JSDOM } from "jsdom";

export async function visualize(data: { created_at: string; power: number }[]) {
  const rows = data.map((row) => ({
    date: new Date(row.created_at),
    power: row.power,
  }));

  const { window } = new JSDOM("");
  globalThis.window = window;
  globalThis.document = window.document;

  const plot = Plot.plot({
    document: window.document,
    margin: 64,
    marginLeft: 64 + 8,
    height: 90,
    width: 160,
    grid: true,
    style: {
      fontSize: "17px",
      backgroundColor: "oklch(27.9% 0.041 260.031)",
      color: "oklch(55.4% 0.046 257.417)",
      fontFamily: "monospace",
    },
    y: { tickFormat: (d) => "" + d, label: null, tickSize: 0 },
    marks: [
      () =>
        htl
          .svg`<defs><linearGradient id="gradient" gradientTransform="rotate(90)">
            <stop offset="0%" stop-color="#0fdb9b" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#0fdb9b" />
          </linearGradient></defs>`,
      Plot.areaY(rows, {
        x: "date",
        y1: Math.min(...rows.map((r) => r.power)) - 100,
        y2: "power",
        curve: "monotone-x",
        fill: "url(#gradient)",
      }),
      Plot.lineY(rows, {
        x: "date",
        y: "power",
        curve: "monotone-x",
        stroke: "#0fdb9b",
        strokeWidth: 5,
      }),
      Plot.dot(rows, {
        x: "date",
        y: "power",
        stroke: "#0fdb9b",
        strokeWidth: 5,
        r: 5,
        fill: "oklch(27.9% 0.041 260.031)",
      }),
      Plot.text(rows, {
        ...plotTextArgs,
        filter: (_d, i) => {
          const local = isLocalMinMax(rows, i);
          return local === "max";
        },
        dy: -16,
        lineAnchor: "bottom",
      }),
      Plot.text(rows, {
        ...plotTextArgs,
        filter: (_d, i) => {
          const local = isLocalMinMax(rows, i);
          return local === "min";
        },
        dy: 16,
        lineAnchor: "top",
      }),
      Plot.text(rows, {
        ...plotTextArgs,
        filter: (_d, i) => {
          return i === rows.length - 1;
        },
        lineAnchor: "middle",
      }),
    ],
  });

  plot.setAttributeNS(
    "http://www.w3.org/2000/xmlns/",
    "xmlns",
    "http://www.w3.org/2000/svg",
  );
  plot.setAttributeNS(
    "http://www.w3.org/2000/xmlns/",
    "xmlns:xlink",
    "http://www.w3.org/1999/xlink",
  );
  await resvg.initWasm(
    fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"),
  );

  return new resvg.Resvg(plot.outerHTML).render().asPng();
}

function isLocalMinMax(rows: { power: number }[], i: number) {
  const d = rows[i];
  const prev = rows[i - 1];
  const next = rows[i + 1];

  if (!prev || !next) return "edge";
  if (prev.power < d.power && next.power < d.power) return "max";
  if (prev.power > d.power && next.power > d.power) return "min";
}

const plotTextArgs = {
  x: "date",
  y: "power",
  text: (d: { power: number }) => `${d.power.toFixed(1)}`,
  fill: "oklch(70.4% 0.04 256.788)",
  stroke: "oklch(27.9% 0.041 260.031)",
  strokeWidth: 5,
};
