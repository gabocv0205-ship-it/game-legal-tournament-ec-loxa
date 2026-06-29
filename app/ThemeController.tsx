"use client";

import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "gamelegal-theme";

function resolveTheme(preference: ThemePreference) {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return preference;
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
}

export default function ThemeController() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setPreference(initial);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) || "system";
      if (current === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const changeTheme = (next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    applyTheme(next);
  };

  return (
    <div className="gl-theme-control" aria-label="Selector de tema">
      <button type="button" aria-pressed={preference === "light"} title="Tema claro" onClick={() => changeTheme("light")}>
        Sol
      </button>
      <button type="button" aria-pressed={preference === "dark"} title="Tema oscuro" onClick={() => changeTheme("dark")}>
        Luna
      </button>
      <button type="button" aria-pressed={preference === "system"} title="Seguir sistema" onClick={() => changeTheme("system")}>
        Auto
      </button>
    </div>
  );
}
