"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export const premiumTransition = { duration: 0.22, ease: "easeOut" } as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: premiumTransition },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.025 } },
};

type DivMotionProps = Omit<HTMLMotionProps<"div">, "children">;

export function AnimatedPage({ children, className = "", ...props }: DivMotionProps & { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function PremiumCard({ children, className = "", hover = true, ...props }: DivMotionProps & { children: React.ReactNode; hover?: boolean }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? { y: -3, scale: 1.005 } : undefined}
      transition={premiumTransition}
      className={`admin-premium-card premium-motion-card relative overflow-hidden rounded-3xl ${className}`}
      {...props}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#D4A017]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-36 w-36 rounded-full bg-green-500/10 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function AnimatedStatCard({
  label,
  value,
  sub,
  tone = "gold",
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tone?: "gold" | "green" | "red" | "blue";
}) {
  const colors = {
    gold: "text-[#D4A017] border-[#D4A017]/35 bg-[#D4A017]/10",
    green: "text-green-400 border-green-500/35 bg-green-500/10",
    red: "text-red-400 border-red-500/35 bg-red-500/10",
    blue: "text-blue-300 border-blue-500/35 bg-blue-500/10",
  };

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, scale: 1.015 }}
      transition={premiumTransition}
      className="premium-motion-card rounded-2xl border border-[#D4A017]/15 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${colors[tone]}`}>{label}</div>
      <div className="text-3xl font-black text-[var(--admin-text)]">{value}</div>
      <p className="mt-2 text-xs font-bold text-gray-500">{sub}</p>
    </motion.div>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4A017]">{eyebrow}</p>}
        <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-tight text-[var(--admin-text)] md:text-5xl">{title}</h2>
        {description && <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-gray-500">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <PremiumCard className="border-dashed border-[#D4A017]/35 px-6 py-16 text-center" hover={false}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-[#D4A017] to-green-500" />
      {icon && <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4A017]/40 bg-[#D4A017]/10 text-[#D4A017]">{icon}</div>}
      <p className="text-lg font-black uppercase tracking-wide text-[var(--admin-text)]">{title}</p>
      {description && <p className="mt-2 text-sm font-bold text-gray-500">{description}</p>}
    </PremiumCard>
  );
}

export function LoadingState({ label = "Cargando informacion..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="h-12 w-12 rounded-full border-4 border-[#D4A017] border-t-transparent animate-spin" />
      <p className="animate-pulse text-sm font-black uppercase tracking-widest text-[#D4A017]">{label}</p>
    </div>
  );
}

export function PosterPreviewCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={premiumTransition}
      className={`premium-motion-card rounded-2xl border border-[#D4A017]/30 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SidebarItem({
  href,
  active,
  icon,
  label,
  onClick,
  tone = "default",
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger" | "gold";
}) {
  const inactiveTone = {
    default: "text-[var(--admin-muted)] hover:text-[var(--admin-text)]",
    danger: "text-red-400 hover:text-red-100",
    gold: "text-[var(--admin-gold)] hover:text-black",
  }[tone];

  return (
    <Link href={href} onClick={onClick} className="block">
      <motion.span
        layout
        whileHover={{ x: 2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={premiumTransition}
        className={`relative flex w-full items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-2 text-[11px] font-black tracking-wide ${
          active
            ? "border-transparent bg-gradient-to-r from-[#D4A017] to-yellow-300 text-black shadow-[0_10px_26px_rgba(212,160,23,0.28)]"
            : `border-transparent bg-transparent ${inactiveTone} hover:border-[var(--admin-strong-border)] hover:bg-white/[0.07]`
        }`}
      >
        {active ? <motion.span layoutId="sidebar-active-pill" className="absolute inset-y-1 left-1 w-1 rounded-full bg-black/40" /> : null}
        <span className="relative z-10 flex h-5 w-5 items-center justify-center">{icon}</span>
        <span className="relative z-10 truncate">{label}</span>
      </motion.span>
    </Link>
  );
}

export function TournamentHero({
  eyebrow,
  title,
  description,
  mediaUrl,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  mediaUrl?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <PremiumCard className="p-6 md:p-8" hover={false}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.75fr] lg:items-center">
        <div>
          <span className="inline-flex rounded-full border border-[#D4A017]/35 bg-[#D4A017]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#D4A017]">
            {eyebrow}
          </span>
          <h1 className="mt-4 break-words text-4xl font-black uppercase leading-none tracking-tight text-[var(--admin-text)] md:text-6xl">
            {title}
          </h1>
          {description ? <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--admin-muted)]">{description}</p> : null}
          {action ? <div className="mt-6">{action}</div> : null}
        </div>
        <motion.div
          variants={fadeUp}
          whileHover={{ scale: 1.015 }}
          transition={premiumTransition}
          className="premium-sport-media relative h-56 overflow-hidden rounded-3xl border border-[#D4A017]/25 bg-[#0a0a0a]"
        >
          {mediaUrl ? (
            <Image src={mediaUrl} alt={title} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,.34),transparent_28%),linear-gradient(135deg,#082017,#141414,#2b2108)] text-5xl font-black text-[#D4A017]">
              GL
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        </motion.div>
      </div>
    </PremiumCard>
  );
}

export function TeamCard({
  name,
  subtitle,
  imageUrl,
  meta,
  actions,
  className = "",
}: {
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <PremiumCard className={`p-5 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D4A017]/25 bg-[#0a0a0a]">
          {imageUrl ? <Image src={imageUrl} alt={name} width={64} height={64} unoptimized className="h-full w-full object-contain p-1" /> : <span className="text-sm font-black text-[#D4A017]">GL</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black uppercase text-[var(--admin-text)]">{name}</h3>
          {subtitle ? <p className="mt-1 truncate text-xs font-bold text-[var(--admin-muted)]">{subtitle}</p> : null}
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="mt-4 border-t border-[var(--admin-border)] pt-4">{actions}</div> : null}
    </PremiumCard>
  );
}

export function MatchCard({
  home,
  away,
  homeScore,
  awayScore,
  meta,
  status,
  onClick,
}: {
  home: string;
  away: string;
  homeScore?: React.ReactNode;
  awayScore?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="truncate text-right text-sm font-black uppercase text-[var(--admin-text)]">{home}</p>
        <div className="rounded-2xl border border-[#D4A017]/30 bg-[#D4A017]/10 px-3 py-2 text-center text-lg font-black text-[#D4A017]">
          {homeScore ?? "-"} <span className="text-[var(--admin-muted)]">:</span> {awayScore ?? "-"}
        </div>
        <p className="truncate text-left text-sm font-black uppercase text-[var(--admin-text)]">{away}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--admin-muted)]">
        <span>{meta}</span>
        {status ? <span className="rounded-full border border-[#D4A017]/30 px-2 py-1 text-[#D4A017]">{status}</span> : null}
      </div>
    </>
  );

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={premiumTransition}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`premium-match-card rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${onClick ? "cursor-pointer" : ""}`}
    >
      {content}
    </motion.div>
  );
}
