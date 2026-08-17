import React from "react";

type SponsorMarqueeProps = { sponsors: string[]; className?: string };

/** A CSS-only, accessible marquee. The duplicate sequence creates a seamless loop. */
export function SponsorMarquee({ sponsors, className = "" }: SponsorMarqueeProps) {
  const uniqueSponsors = Array.from(new Set(sponsors.map(sponsor => sponsor.trim()).filter(Boolean)));
  if (!uniqueSponsors.length) return null;

  // Few sponsors are repeated before cloning so the moving track never has empty space.
  const baseItems = Array.from({ length: uniqueSponsors.length < 4 ? 4 : 1 }, () => uniqueSponsors).flat();
  const loopItems = [...baseItems, ...baseItems];

  return (
    <div className={`sponsor-marquee ${className}`} aria-label="Auspiciantes oficiales">
      <div className="sponsor-marquee-track">
        {loopItems.map((sponsor, index) => <span className="sponsor-marquee-item" key={`${sponsor}-${index}`}>{sponsor}</span>)}
      </div>
    </div>
  );
}
