"use client";

export type AudioEffect =
  | "draw_start"
  | "drum_roll"
  | "team_pick"
  | "group_assign"
  | "confirm"
  | "fixture"
  | "notification";

export type AudioPreferences = {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  volume: number;
};

const STORAGE_KEY = "gameLegalAudioPreferences";
let audioContext: AudioContext | null = null;
let ambientNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];

export function getAudioPreferences(): AudioPreferences {
  if (typeof window === "undefined") return { musicEnabled: false, effectsEnabled: true, volume: 0.35 };
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        musicEnabled: Boolean(parsed.musicEnabled),
        effectsEnabled: parsed.effectsEnabled !== false,
        volume: Math.min(1, Math.max(0, Number(parsed.volume ?? 0.35))),
      };
    }
  } catch {
    // Preferimos valores seguros si localStorage trae datos inválidos.
  }
  return { musicEnabled: false, effectsEnabled: true, volume: 0.35 };
}

export function saveAudioPreferences(next: AudioPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor();
  return audioContext;
}

async function ensureRunning() {
  const context = getContext();
  if (!context) return null;
  if (context.state === "suspended") await context.resume();
  return context;
}

function tone(context: AudioContext, frequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

export async function playAudioEffect(effect: AudioEffect) {
  const prefs = getAudioPreferences();
  if (!prefs.effectsEnabled) return;
  const context = await ensureRunning();
  if (!context) return;
  const volume = Math.max(0.02, prefs.volume * 0.32);

  if (effect === "draw_start") {
    tone(context, 196, 0.14, volume, "triangle");
    tone(context, 392, 0.18, volume, "triangle", 0.12);
    return;
  }
  if (effect === "drum_roll") {
    for (let i = 0; i < 18; i++) tone(context, 95 + (i % 3) * 12, 0.045, volume * 0.7, "square", i * 0.055);
    return;
  }
  if (effect === "team_pick") {
    tone(context, 523.25, 0.1, volume, "sine");
    tone(context, 659.25, 0.16, volume, "sine", 0.08);
    return;
  }
  if (effect === "group_assign") {
    tone(context, 329.63, 0.1, volume, "triangle");
    tone(context, 493.88, 0.12, volume, "triangle", 0.09);
    tone(context, 659.25, 0.16, volume, "triangle", 0.18);
    return;
  }
  if (effect === "confirm") {
    tone(context, 783.99, 0.18, volume, "sine");
    return;
  }
  if (effect === "fixture") {
    tone(context, 261.63, 0.12, volume, "sawtooth");
    tone(context, 523.25, 0.18, volume * 0.75, "sawtooth", 0.12);
    return;
  }
  tone(context, 880, 0.08, volume * 0.8, "sine");
}

export async function setAmbientMusic(enabled: boolean) {
  const prefs = getAudioPreferences();
  saveAudioPreferences({ ...prefs, musicEnabled: enabled });
  stopAmbientMusic();
  if (!enabled) return;
  const context = await ensureRunning();
  if (!context) return;
  const masterVolume = Math.max(0.001, prefs.volume * 0.045);
  const chords = [130.81, 196, 261.63];
  ambientNodes = chords.map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(masterVolume / (index + 1.8), context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    return { oscillator, gain };
  });
}

export function stopAmbientMusic() {
  ambientNodes.forEach(node => {
    try {
      node.gain.gain.exponentialRampToValueAtTime(0.0001, getContext()?.currentTime || 0.01);
      node.oscillator.stop((getContext()?.currentTime || 0) + 0.05);
    } catch {
      // Ignorar nodos ya detenidos.
    }
  });
  ambientNodes = [];
}
