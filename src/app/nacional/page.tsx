"use client";

import { useState } from "react";
import { NacionalLeaderboard } from "@/components/nacional-leaderboard";

export default function NacionalPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState(false);

  if (!authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="rounded-xl border border-border bg-surface p-8 w-full max-w-xs">
          <h2 className="text-lg font-bold text-foreground text-center">
            Clasificación al Nacional
          </h2>
          <p className="mt-2 text-sm text-muted text-center">
            Ingresá la contraseña para continuar
          </p>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (password.toUpperCase() === "ORDER66") {
                setAuthenticated(true);
              } else {
                setError(true);
                setPassword("");
              }
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Contraseña"
              className={`w-full rounded-lg border bg-background py-3 px-4 text-center text-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-1 ${
                error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-border focus:border-gold/50 focus:ring-gold/30"
              }`}
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-400 text-center">Contraseña incorrecta</p>}
            <button
              type="submit"
              className="mt-3 w-full rounded-lg bg-gold/10 border border-gold/20 py-2 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    );
  }

  return <NacionalLeaderboard />;
}
