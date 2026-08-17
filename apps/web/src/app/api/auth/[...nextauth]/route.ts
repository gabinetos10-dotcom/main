import { handlers } from "@/auth";

/**
 * L'adaptateur Drizzle ouvre une connexion Postgres : ce gestionnaire doit
 * tourner sur le runtime Node, pas sur edge.
 */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
