-- Extensions attendues par le schéma.
-- citext : comparaison d'emails insensible à la casse le jour où on la basculera côté base.
-- pg_trgm : recherche floue dans la médiathèque et la galerie de templates (phases 4 et 5).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
