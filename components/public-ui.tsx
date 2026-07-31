"use client";

import React, { useRef } from "react";

type PublicSpotlightCardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/** Lightweight pointer spotlight. It updates CSS variables without re-rendering React. */
export function PublicSpotlightCard({ children, className = "", style }: PublicSpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const updateSpotlight = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    glowRef.current.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    glowRef.current.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={updateSpotlight}
      onPointerEnter={event => {
        if (event.pointerType !== "touch") glowRef.current?.style.setProperty("opacity", "1");
      }}
      onPointerLeave={() => glowRef.current?.style.setProperty("opacity", "0")}
      style={style}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition-opacity duration-300"
        style={{
          background: "radial-gradient(520px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(212,160,23,.18), transparent 42%)",
        }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">{children}</div>
    </div>
  );
}
