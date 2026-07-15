import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* Two build flavors:
   - `npm run build`          → optimized, code-split bundle for hosting (dist/)
   - `npm run build:portable` → ONE self-contained index.html you can
     double-click or email — everything inlined (dist-portable/)        */
export default defineConfig(({ mode }) => {
  const portable = mode === 'portable';
  return {
    base: './', // relative asset paths → works on any host, subfolder or file://
    plugins: portable ? [viteSingleFile()] : [],
    build: {
      target: 'es2020',
      rollupOptions: portable
        ? {}
        : {
            output: {
              manualChunks: {
                three: ['three'],
                motion: ['gsap', 'lenis'],
              },
            },
          },
    },
  };
});
