import { defineConfig } from "vitest/config";

/**
 * Un projet Vitest par package testable. Les projets sont déclarés ici plutôt que
 * dans un fichier par package : il n'y a rien de spécifique à configurer par
 * package pour l'instant, et un seul fichier vaut mieux que six presque vides.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "blueprint",
          root: "./packages/blueprint",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "parser",
          root: "./packages/parser",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "builder",
          root: "./packages/builder",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "ingest",
          root: "./packages/ingest",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "storage",
          root: "./packages/storage",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "jobs",
          root: "./packages/jobs",
          environment: "node",
          include: ["test/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      {
        test: {
          name: "protocol",
          root: "./packages/protocol",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "editor-runtime",
          root: "./packages/editor-runtime",
          // Le runtime ne vit que dans un navigateur : le tester dans Node
          // reviendrait à tester autre chose que ce qui sera exécuté.
          environment: "happy-dom",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "db",
          root: "./packages/db",
          environment: "node",
          include: ["test/**/*.test.ts"],
          // PGlite démarre un Postgres embarqué : plus lent qu'un test unitaire pur.
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "web",
          root: "./apps/web",
          environment: "node",
          include: ["src/**/*.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        test: {
          name: "fixtures",
          root: "./fixtures",
          environment: "node",
          include: ["**/*.test.ts"],
        },
      },
    ],
  },
});
