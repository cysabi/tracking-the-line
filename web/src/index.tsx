import { render } from "solid-js/web";
import { ErrorBoundary, type ParentProps, Show } from "solid-js";
import { createAsync, HashRouter, Route } from "@solidjs/router";
import Dashboard from "./routes/Dashboard.tsx";
import Guild from "./routes/Guild.tsx";
import { AccountContext, captureTokens, getAccount, getTokens, login } from "./utils.ts";
import "./index.css";

captureTokens();

function Layout(props: ParentProps) {
  if (!getTokens()) {
    login();
    return null;
  }

  const account = createAsync(() => getAccount());

  return (
    <main style={{ "max-width": "1260px", margin: "0 auto", padding: "24px 16px 64px", "box-sizing": "border-box" }}>
      <ErrorBoundary
        fallback={(err) => (
          <p style={{ color: "var(--color-error)" }}>
            {(err as Error)?.message ?? String(err)}
          </p>
        )}
      >
        <Show when={account()} fallback={<p style={{ color: "var(--color-text-muted)", "font-size": "0.8rem" }}>loading…</p>}>
          {(acc) => (
            <AccountContext.Provider value={acc}>
              {props.children}
            </AccountContext.Provider>
          )}
        </Show>
      </ErrorBoundary>
    </main>
  );
}

render(
  () => (
    <HashRouter root={Layout}>
      <Route path="/" component={Dashboard} />
      <Route path="/:guildId" component={Guild} />
    </HashRouter>
  ),
  document.getElementById("root")!,
);
