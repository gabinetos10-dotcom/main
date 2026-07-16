import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build flavors:
//   npm run build           → dist/ for real hosting (code-split, lazy three.js)
//   npm run build:portable  → dist-portable/index.html: ONE self-contained file
//     (fonts, CSS, JS, 3D, games all inlined) that opens by double-click,
//     no server and no npm needed. Handy for sharing/previewing.
export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  return {
    base: './',
    plugins: portable ? [viteSingleFile({ removeViteModuleLoader: true })] : [],
    build: {
      target: 'es2020',
      outDir: portable ? 'dist-portable' : 'dist',
      cssCodeSplit: !portable,
      // inline every asset (fonts) in portable mode; keep files small otherwise
      assetsInlineLimit: portable ? 100_000_000 : 4096,
      rollupOptions: portable
        ? { output: { inlineDynamicImports: true } }
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
