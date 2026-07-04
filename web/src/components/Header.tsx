import { JSX, Show } from "solid-js";
import { A } from "@solidjs/router";
import { clearTokens, login } from "../utils.ts";

type Season = {
  label: JSX.Element;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
};

export default function Header(props: {
  name: string;
  avatarUrl: string | null;
  fallback?: string;
  round?: boolean;
  action: "logout" | "home";
  season?: Season;
}) {
  const logout = () => {
    clearTokens();
    login();
  };
  const radius = () => (props.round ? "50%" : "18%");

  return (
    <header style={{ "padding-bottom": "20px", display: "flex", "flex-direction": "column" }}>
      <nav style={{ display: "flex", "margin-bottom": "20px", "font-size": "0.8rem" }}>
        {props.action === "logout"
          ? (
            <button type="button" class="navlink logout" onClick={logout}>
              log out
            </button>
          )
          : <A href="/" class="navlink">back home</A>}
      </nav>

      <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
        {props.avatarUrl
          ? <img src={props.avatarUrl} alt="" style={{ width: "44px", height: "44px", "border-radius": radius(), "object-fit": "cover", flex: "none" }} />
          : (
            <span style={{ width: "44px", height: "44px", "border-radius": radius(), flex: "none", display: "grid", "place-items": "center", background: "var(--color-bg-surface)", color: "var(--color-text-muted)", "text-transform": "uppercase", "font-weight": "600" }}>
              {(props.fallback ?? props.name ?? "?")[0]}
            </span>
          )}
        <div style={{ display: "flex", "flex-direction": "column", gap: "2px", "min-width": "0" }}>
          <div style={{ "font-size": "0.95rem", "font-weight": "500", margin: "0", "line-height": "1.15" }}>
            {props.name}
          </div>
          <Show when={props.season}>
            {(s) => (
              <div style={{ display: "flex", "align-items": "center", "margin": "0 -8px" }}>
                <button type="button" class="seasonbtn" disabled={s().prevDisabled} onClick={() => s().onPrev()}>
                  {`<`}
                </button>
                <span style={{ "font-size": "0.95rem", "width": "160px", "text-align": "center", color: "var(--color-text-muted)" }}>
                  {s().label}
                </span>
                <button type="button" class="seasonbtn" disabled={s().nextDisabled} onClick={() => s().onNext()}>
                  {`>`}
                </button>
              </div>
            )}
          </Show>
        </div>
      </div>
    </header>
  );
}
