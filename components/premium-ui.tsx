"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

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

