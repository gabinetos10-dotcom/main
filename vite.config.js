import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* The source index.html carries a tiny file:// redirect (see index.html)
   that sends people who double-click the raw source file to the built
   site/ folder. It must never survive into any build output. */
const stripFileRedirect = () => ({
  name: 'gjs-strip-file-redirect',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html.replace(/[ \t]*<script id="file-redirect">[\s\S]*?<\/script>\n?/, ''),
  },
});

/* Folder mode outputs a CLASSIC script instead of an ES module, and drops
   the crossorigin attributes — both are blocked by browsers over file://,
   which is exactly where this build is meant to run (double-clicked). */
const classicFileBuild = () => ({
  name: 'gjs-classic-file-build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html
      .replace(/<script type="module"([^>]*)>/, '<script defer$1>')
      .replace(/ crossorigin/g, ''),
  },
});

// Three build flavors:
//   npm run build           → dist/ for real hosting (code-split, lazy three.js)
//   npm run build:folder    → site/ — a normal folder (index.html + assets/)
//     that works by DOUBLE-CLICKING index.html: classic deferred script,
//     fonts inlined into the CSS, no server needed. Committed to the repo.
//   npm run build:portable  → dist-portable/index.html: everything in ONE file.
export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  const folder = mode === 'folder';
  return {
    base: './',
    plugins: [
      stripFileRedirect(),
      ...(portable ? [viteSingleFile({ removeViteModuleLoader: true })] : []),
      ...(folder ? [classicFileBuild()] : []),
    ],
    build: {
      target: 'es2020',
      outDir: portable ? 'dist-portable' : folder ? 'site' : 'dist',
      cssCodeSplit: !portable && !folder,
      // inline every asset (fonts) except in the hosted build
      assetsInlineLimit: portable || folder ? 100_000_000 : 4096,
      rollupOptions: portable || folder
        ? {
            output: {
              inlineDynamicImports: true,
              // an IIFE has no import/export/import.meta left — required
              // for the classic <script> the folder build uses
              ...(folder ? { format: 'iife' } : {}),
            },
          }
        : {
            output: {
              manualChunks: {
                // three streams in lazily after the loader hands off
                three: ['three'],
                motion: ['gsap', 'gsap/ScrollTrigger', 'lenis'],
              },
            },
          },
    },
  };
});
