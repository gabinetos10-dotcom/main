import { Prisma } from '@prisma/client';

/**
 * Soft delete transparent sur `Site` et `Page`.
 *
 * Sans ce filtre, un site archivé continue d'apparaître dans les listes, les compteurs de quota et
 * les sitemaps — un bug qu'on ne découvre qu'après coup, site par site. Le filtre est donc appliqué
 * par défaut, et l'échappatoire (`withArchived()`) est explicite et greppable.
 */

export const SOFT_DELETE_MODELS = new Set(['Site', 'Page']);

/** Opérations dont le `where` accepte un filtre arbitraire. */
const FILTERABLE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * `findUnique` n'accepte que des champs uniques dans son `where` : on ne peut pas y injecter
 * `archivedAt: null`. On filtre donc le résultat après coup, en s'assurant que `archivedAt` fait
 * partie de la sélection — puis en le retirant si l'appelant ne l'avait pas demandé.
 */
const UNIQUE_READS = new Set(['findUnique', 'findUniqueOrThrow']);

type UnknownArgs = { where?: Record<string, unknown>; select?: Record<string, unknown> };

export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return query(args);
        }

        const typedArgs = (args ?? {}) as UnknownArgs;

        if (FILTERABLE.has(operation)) {
          return query({
            ...typedArgs,
            where: { ...typedArgs.where, archivedAt: null },
          });
        }

        if (UNIQUE_READS.has(operation)) {
          const selectsExplicitly = typedArgs.select !== undefined;
          const needsInjection = selectsExplicitly && typedArgs.select?.archivedAt === undefined;

          const result = (await query(
            needsInjection
              ? { ...typedArgs, select: { ...typedArgs.select, archivedAt: true } }
              : typedArgs,
          )) as Record<string, unknown> | null;

          if (result === null) {
            return null;
          }
          if (result.archivedAt !== null && result.archivedAt !== undefined) {
            if (operation === 'findUniqueOrThrow') {
              throw new Prisma.PrismaClientKnownRequestError(
                `${model} archivé : introuvable sans withArchived().`,
                { code: 'P2025', clientVersion: Prisma.prismaVersion.client },
              );
            }
            return null;
          }
          if (needsInjection) {
            delete result.archivedAt;
          }
          return result;
        }

        return query(args);
      },
    },
  },
});
