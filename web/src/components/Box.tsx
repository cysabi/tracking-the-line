import { JSX, Show } from "solid-js";

export default function Box(props: { title: string; right?: JSX.Element; children: JSX.Element }) {
  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "2px", background: "var(--color-bg-surface)", border: "2px solid var(--color-bg-surface)" }}>
      <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between", gap: "1rem", background: "var(--color-bg)" }}>
        <div style={{ padding: "8px", color: "var(--color-text-muted)", "white-space": "nowrap" }}>{props.title}</div>
        <Show when={props.right}>
          <div style={{ display: "flex", "align-items": "center", gap: "1rem", padding: "8px", "overflow-x": "auto", "white-space": "nowrap" }}>{props.right}</div>
        </Show>
      </div>
      <div style={{ background: "var(--color-bg)" }}>{props.children}</div>
    </div>
  );
}

export function Stat(props: { label: string; value: JSX.Element }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <span style={{ color: "var(--color-text-muted)" }}>{props.label}</span>
      <span>{props.value}</span>
    </div>
  );
}

export function BoxEmpty(props: { children: JSX.Element }) {
  return <p style={{ margin: "0", padding: "8px", color: "var(--color-text-muted)" }}>{props.children}</p>;
}

export function Cmd(props: { children: JSX.Element }) {
  return <code style={{ background: "var(--color-bg-surface)", padding: "1px 5px" }}>{props.children}</code>;
}
