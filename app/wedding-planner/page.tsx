import type { Metadata } from "next";
import ServiceDetail from "@/components/services/ServiceDetail";
import { services } from "@/lib/content";

const service = services.find((s) => s.slug === "wedding-planner")!;

export const metadata: Metadata = {
  title: "Wedding Planner en Occitanie — organisation de mariage",
  description:
    "Wedding planner à Montpellier, Béziers et Narbonne. Mélina organise votre mariage de A à Z ou coordonne votre jour J, avec méthode et douceur.",
  alternates: { canonical: "/wedding-planner" },
};

export default function WeddingPlannerPage() {
  return <ServiceDetail service={service} />;
}
