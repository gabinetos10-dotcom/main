"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Custom preloader: a red sports-car silhouette draws itself on black,
// then the veil lifts to reveal the site.
export default function Preloader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = "";
    }, 2600);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-noir"
          exit={{ y: "-100%", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
        >
          <svg
            viewBox="0 0 800 360"
            className="w-[78vw] max-w-[520px]"
            fill="none"
            aria-hidden
          >
            <path
              className="draw-car"
              d="M62 266 C58 244 66 230 92 224 C130 214 178 210 224 194 C280 174 314 148 376 140 C440 132 510 136 556 150 C600 164 620 190 660 204 C695 216 728 222 740 236 C750 248 748 260 742 268 C736 276 726 278 712 278 L688 278 C686 242 656 214 618 214 C580 214 550 242 548 278 L262 278 C260 242 230 214 192 214 C154 214 124 242 122 278 L96 278 C76 278 66 274 62 266 Z"
              stroke="#e11d2e"
              strokeWidth="3"
            />
            <circle className="draw-car" cx="192" cy="272" r="45" stroke="#e11d2e" strokeWidth="3" />
            <circle className="draw-car" cx="618" cy="272" r="45" stroke="#e11d2e" strokeWidth="3" />
          </svg>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.2, duration: 0.6 } }}
            className="mt-8 font-display text-xl tracking-widest2 uppercase text-white"
          >
            Loc<span className="text-blood">&apos;N&apos;</span>Joy
          </motion.div>
          <motion.div
            className="mt-6 h-px w-40 origin-left bg-blood"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1, transition: { delay: 0.4, duration: 1.8, ease: "easeInOut" } }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
