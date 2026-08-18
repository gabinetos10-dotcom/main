#!/usr/bin/env node
/**
 * Copie le bundle du runtime d'édition dans `public/`.
 *
 * Il est servi comme un fichier statique plutôt que lu depuis le disque à
 * l'exécution : sur un hébergeur serverless, rien ne garantit qu'un fichier
 * d'un autre package du monorepo se retrouve dans le paquet déployé.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(RACINE, "../../packages/editor-runtime/dist/editor-runtime.js");
const DESTINATION = join(RACINE, "public/apercu/editor-runtime.js");

await mkdir(dirname(DESTINATION), { recursive: true });
await copyFile(SOURCE, DESTINATION);
console.log(`  runtime d'édition copié dans public/apercu/`);
