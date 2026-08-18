import type { z } from "zod";

/**
 * Exécution des travaux de fond (§5 : INGEST, BUILD, DEPLOY).
 *
 * Un travail est une fonction pure de sa charge utile validée par Zod. Le
 * *lanceur* décide seulement du quand et du où : en ligne pour le développement
 * et les tests, différé en production.
 *
 * ⚠️ Le §3 fige Trigger.dev v3 comme lanceur de production. Seul le lanceur en
 * ligne est écrit et exercé ici : aucun projet Trigger.dev n'est joignable
 * depuis ce dépôt. Le branchement est une implémentation de `JobRunner` et rien
 * d'autre — voir `docs/RUNBOOK.md`.
 */

export interface JobDefinition<TPayload, TResult> {
  name: string;
  payload: z.ZodType<TPayload>;
  run(payload: TPayload): Promise<TResult>;
}

export interface JobRunner {
  readonly id: string;
  enqueue<TPayload, TResult>(
    job: JobDefinition<TPayload, TResult>,
    payload: TPayload,
  ): Promise<TResult>;
}

export function defineJob<TPayload, TResult>(
  definition: JobDefinition<TPayload, TResult>,
): JobDefinition<TPayload, TResult> {
  return definition;
}

/**
 * Exécute immédiatement, dans le processus appelant.
 *
 * C'est ce qui rend le parcours de dépôt vérifiable de bout en bout par un test
 * Playwright : aucune infrastructure à démarrer, et le même code de travail
 * qu'en production.
 */
export function createInlineRunner(): JobRunner {
  return {
    id: "inline",
    async enqueue(job, payload) {
      return job.run(job.payload.parse(payload));
    },
  };
}
