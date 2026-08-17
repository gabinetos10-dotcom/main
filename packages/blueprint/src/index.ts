/**
 * Point d'entrée navigateur-compatible : uniquement des schémas et des types.
 *
 * Le calcul d'identifiants vit dans `@calque/blueprint/ids` parce qu'il dépend de
 * `node:crypto`. L'éditeur runtime tourne dans une iframe et ne doit jamais tirer
 * de dépendance Node dans son bundle (budget < 40 kB gz, §4).
 */
export * from "./schema";
export * from "./types";
export * from "./adapter";
