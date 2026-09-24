import type { Metadata } from "next";
import LandingPage from "./LandingPage";

const siteUrl = "https://game-legal-tournament-ec-loxa.vercel.app";
export const metadata: Metadata = {
  title: "Game Legal | Torneos de fútbol y gestión de ligas",
  description:
    "Sigue las ligas activas y lleva tu campeonato al siguiente nivel. Organiza equipos, calendario, resultados y finanzas con Game Legal. Explora la demo.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "Game Legal — Tu torneo merece jugar en grande",
    description:
      "La casa digital del fútbol. Sigue tu liga y descubre una forma profesional de organizar tu campeonato.",
    url: siteUrl,
    siteName: "Game Legal",
    locale: "es_EC",
    type: "website",
    images: [
      {
        url: `${siteUrl}/landing/game-legal-arena.webp`,
        width: 1536,
        height: 1024,
        alt: "Game Legal: ilustración de un estadio en tonos dorados",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Legal — Tu torneo merece jugar en grande",
    images: [`${siteUrl}/landing/game-legal-arena.webp`],
  },
};

export default function Page() {
  return <LandingPage />;
}
