import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Navigation consciente de la locale. À utiliser partout à la place de `next/link` et
 * `next/navigation` : sinon un lien renvoie un anglophone sur la version française.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
