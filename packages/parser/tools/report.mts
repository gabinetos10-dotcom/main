#!/usr/bin/env node
/**
 * Rapport d'analyse d'un site déposé.
 *
 *   pnpm --filter @calque/parser run report ../../fixtures/01-artisan-landing
 */
import { resolve } from "node:path";
import { loadSnapshot } from "@calque/fixtures";
import { analyze } from "../src/index";
import { renderReport } from "../src/report";

const cible = process.argv[2];
if (cible === undefined) {
  console.error("Usage : report <dossier du site>");
  process.exit(1);
}

const racine = resolve(process.cwd(), cible);
const snapshot = await loadSnapshot(racine);
const resultat = await analyze(snapshot);

console.log(renderReport(resultat, { siteName: racine.split("/").pop() }));
