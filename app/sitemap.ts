import type { MetadataRoute } from "next";
import { posts } from "@/lib/content";

const SITE_URL = "https://www.maisonjoliewedding.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/wedding-planner", priority: 0.9 },
    { path: "/wedding-designer", priority: 0.9 },
    { path: "/portfolio", priority: 0.8 },
    { path: "/blog", priority: 0.7 },
    { path: "/contact", priority: 0.9 },
    { path: "/mentions-legales", priority: 0.2 },
    { path: "/politique-de-confidentialite", priority: 0.2 },
  ];

  return [
    ...routes.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: r.priority,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
