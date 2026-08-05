import { loadRootEnv } from '@atelier/config/load-env';

// Les tests de ce paquet parlent à une vraie base : sans le .env de la racine, ils échoueraient
// sur une erreur de connexion illisible plutôt que sur ce qu'ils testent.
loadRootEnv(import.meta.dirname);
