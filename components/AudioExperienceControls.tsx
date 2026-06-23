"use client";

import React, { useEffect, useState } from "react";
import { getAudioPreferences, playAudioEffect, saveAudioPreferences, setAmbientMusic, stopAmbientMusic } from "@/lib/audioExperience";

type Props = {
  compact?: boolean;
  label?: string;
};

export default function AudioExperienceControls({ compact = false, label = "Audio ceremonial" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    const prefs = getAudioPreferences();
    setMusicEnabled(prefs.musicEnabled);
    setEffectsEnabled(prefs.effectsEnabled);
    setVolume(prefs.volume);
    setMounted(true);
    return () => stopAmbientMusic();
  }, []);

  const persist = async (next: { musicEnabled?: boolean; effectsEnabled?: boolean; volume?: number }) => {
    const preferences = {
      musicEnabled: next.musicEnabled ?? musicEnabled,
      effectsEnabled: next.effectsEnabled ?? effectsEnabled,
      volume: next.volume ?? volume,
    };
    setMusicEnabled(preferences.musicEnabled);
    setEffectsEnabled(preferences.effectsEnabled);
    setVolume(preferences.volume);
    saveAudioPreferences(preferences);
    if (preferences.musicEnabled) await setAmbientMusic(true);
    else stopAmbientMusic();
  };

  if (!mounted) return null;

  return (
    <div className={`rounded-2xl border border-[#D4A017]/35 bg-[#101010]/90 text-white shadow-xl backdrop-blur ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4A017]">{label}</p>
            {!compact && <p className="text-[11px] text-gray-400">Opcional, sin autoplay y con sonidos generados libres de derechos.</p>}
          </div>
          <button
            type="button"
            onClick={() => playAudioEffect("notification")}
            className="rounded-lg border border-[#D4A017]/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#E7C36B] hover:bg-[#D4A017] hover:text-black"
          >
            Probar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => persist({ musicEnabled: !musicEnabled })}
            className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${musicEnabled ? "bg-[#D4A017] text-black" : "bg-[#1C1C1C] text-gray-300 border border-[#2E2E2E]"}`}
          >
            Música {musicEnabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => persist({ effectsEnabled: !effectsEnabled })}
            className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${effectsEnabled ? "bg-[#D4A017] text-black" : "bg-[#1C1C1C] text-gray-300 border border-[#2E2E2E]"}`}
          >
            Efectos {effectsEnabled ? "ON" : "OFF"}
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-[#2E2E2E] bg-[#1C1C1C] px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={event => persist({ volume: Number(event.target.value) })}
              className="w-full accent-[#D4A017]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
