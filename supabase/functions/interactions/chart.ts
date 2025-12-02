import * as Plot from "@observablehq/plot";
import * as htl from "htl";
import * as resvg from "@resvg/resvg-wasm";
import { JSDOM } from "jsdom";
import { promises } from "node:fs";

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
    height: 900,
    width: 1600,
    grid: true,
    style: {
      fontSize: "17px",
      backgroundColor: "#1d293d",
      color: "#62748e",
      fontFamily: "Space Mono",
    },
    y: { tickFormat: (d) => "" + d, label: null, tickSize: 0 },
    marks: [
      () =>
        htl
          .svg`<defs><linearGradient id="gradient" gradientTransform="rotate(90)">
            <stop offset="0%" stop-color="#0fdb9b" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#0fdb9b" stop-opacity="0" />
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
        fill: "#1d293d",
      }),
      ...[["min", 1, "top"] as const, ["max", -1, "bottom"] as const]
        .map(([minMax, dyMult, lineAnchor]) =>
          Plot.text(rows, {
            x: "date",
            y: "power",
            text: (d: { power: number }) => `${d.power.toFixed(1)}`,
            fill: "#90a1b9",
            stroke: "#1d293d",
            strokeWidth: 5,
            filter: (_d, i) => {
              const local = isLocalMinMax(rows, i);
              return local === minMax;
            },
            dy: 16 * dyMult,
            lineAnchor,
          })
        ),
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

  await resvg.initWasm(promises.readFile("./index_bg.wasm"));
  return new resvg.Resvg(
    plot.outerHTML,
    {
      background: `#1d293d`,
      font: {
        fontBuffers: [await promises.readFile("./SpaceMono-Regular.ttf")],
      },
    },
  ).render().asPng();
}

function isLocalMinMax(rows: { power: number }[], i: number) {
  const d = rows[i];
  const prev = rows[i - 1];
  const next = rows[i + 1];

  if (!prev) return (next.power > d.power ? "min" : "max");
  if (!next) return (prev.power > d.power ? "min" : "max");

  if (prev.power < d.power && next.power < d.power) return "max";
  if (prev.power > d.power && next.power > d.power) return "min";
}
