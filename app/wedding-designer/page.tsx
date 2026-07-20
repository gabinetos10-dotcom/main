import type { Metadata } from "next";
import ServiceDetail from "@/components/services/ServiceDetail";
import { services } from "@/lib/content";

const service = services.find((s) => s.slug === "wedding-designer")!;

export const metadata: Metadata = {
  title: "Wedding Designer & décoratrice de mariage — Occitanie",
  description:
    "Wedding designer et décoratrice de mariage à Montpellier, Béziers, Narbonne. Direction artistique, scénographie et palette sur-mesure pour un mariage cohérent et sensible.",
  alternates: { canonical: "/wedding-designer" },
};

export default function WeddingDesignerPage() {
  return <ServiceDetail service={service} />;
}
