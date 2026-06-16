/* ============================================================
   NOUS. — Interaction engine
   GSAP + ScrollTrigger + Lenis
   ============================================================ */
(function () {
    "use strict";

    const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const hasGSAP = typeof gsap !== "undefined";
    if (hasGSAP && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ========================================================
       1. SMOOTH SCROLL (Lenis) + ScrollTrigger sync
       ======================================================== */
    let lenis = null;
    function initSmoothScroll() {
        if (REDUCED || typeof Lenis === "undefined") return;
        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.5,
        });
        lenis.on("scroll", () => { if (hasGSAP) ScrollTrigger.update(); });
        if (hasGSAP) {
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }
    function scrollTo(target) {
        if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.3 });
        else { const el = typeof target === "string" ? $(target) : target; if (el) el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" }); }
    }

    /* ========================================================
       2. PRELOADER
       ======================================================== */
    function initLoader(done) {
        const loader = $("#loader");
        const countEl = $("#loaderCount");
        const chars = $$(".loader__char");
        const path = $("#loaderPath");
        document.body.classList.add("is-loading");

        if (!loader) { document.body.classList.remove("is-loading"); done(); return; }

        if (REDUCED || !hasGSAP) {
            loader.style.display = "none";
            document.body.classList.remove("is-loading");
            done();
            return;
        }

        const tl = gsap.timeline({
            onComplete: () => {
                loader.style.display = "none";
                document.body.classList.remove("is-loading");
                done();
            }
        });

        // letters in
        tl.to(chars, { y: 0, duration: 0.9, ease: "power4.out", stagger: 0.06 }, 0.1);

        // counter
        const counter = { v: 0 };
        tl.to(counter, {
            v: 100, duration: 1.6, ease: "power2.inOut",
            onUpdate: () => { if (countEl) countEl.textContent = Math.round(counter.v); }
        }, 0.1);

        // letters out
        tl.to(chars, { y: "-110%", duration: 0.7, ease: "power3.in", stagger: 0.04 }, "+=0.25");

        // curtain morph up (organic curve)
        tl.to(path, {
            duration: 0.9, ease: "power4.inOut",
            attr: { d: "M0,0 L100,0 L100,0 Q50,0 0,0 Z" }
        }, "-=0.3");
        tl.to(loader, { yPercent: -100, duration: 0.8, ease: "power4.inOut" }, "<+=0.2");
    }

    /* ========================================================
       3. CUSTOM CURSOR (magnetic + states)
       ======================================================== */
    function initCursor() {
        if (!FINE_POINTER || REDUCED) return;
        const cursor = $("#cursor");
        const dot = $("#cursorDot");
        const ring = $("#cursorRing");
        const label = $("#cursorLabel");
        if (!cursor) return;
        document.body.classList.add("has-cursor");

        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let dx = mx, dy = my, rx = mx, ry = my;

        window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
        document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
        document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));

        function render() {
            dx += (mx - dx) * 0.9;   dy += (my - dy) * 0.9;   // dot snappy
            rx += (mx - rx) * 0.18;  ry += (my - ry) * 0.18;  // ring lag
            if (dot) dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
            if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
            requestAnimationFrame(render);
        }
        render();

        // state delegation
        const map = { hover: "is-hover", view: "is-view", text: "is-text" };
        $$("[data-cursor]").forEach((el) => {
            const state = map[el.dataset.cursor] || "is-hover";
            el.addEventListener("mouseenter", () => {
                cursor.classList.add(state);
                if (el.dataset.cursor === "view" && label) label.textContent = "View";
            });
            el.addEventListener("mouseleave", () => cursor.classList.remove(state));
        });
    }

    /* ========================================================
       4. MAGNETIC ELEMENTS
       ======================================================== */
    function initMagnetic() {
        if (!FINE_POINTER || REDUCED || !hasGSAP) return;
        $$("[data-magnetic]").forEach((el) => {
            const strength = 0.4;
            const label = $(".btn-magnetic__label", el);
            el.addEventListener("mousemove", (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * strength;
                const y = (e.clientY - r.top - r.height / 2) * strength;
                gsap.to(el, { x, y, duration: 0.5, ease: "power3.out" });
                if (label) gsap.to(label, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power3.out" });
            });
            el.addEventListener("mouseleave", () => {
                gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
                if (label) gsap.to(label, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
            });
        });
    }

    /* ========================================================
       5. HERO — entrance + interactive blob
       ======================================================== */
    function initHero() {
        if (!hasGSAP) return;
        const words = $$(".hero__word");
        const eyebrow = $(".hero__eyebrow span");
        const metaP = $(".hero__meta p span");
        const btn = $(".hero__meta .btn-magnetic");

        const tl = gsap.timeline({ delay: 0.15 });
        if (eyebrow) tl.from(eyebrow, { yPercent: 110, duration: 0.8, ease: "power3.out" }, 0);
        if (words.length) tl.to(words, { y: 0, duration: 1.1, ease: "power4.out", stagger: 0.08 }, 0.1);
        if (metaP) tl.from(metaP, { yPercent: 110, duration: 0.9, ease: "power3.out" }, 0.5);
        if (btn) tl.from(btn, { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, 0.6);

        // blob: morph loop + mouse parallax + scroll drift
        const blob = $("#heroBlob");
        const path = $("#blobPath");
        const star = $("#heroStar");
        if (path && !REDUCED) {
            const shapes = [
                "M300,520 C420,520 520,420 520,300 C520,180 420,80 300,80 C180,80 80,180 80,300 C80,420 180,520 300,520 Z",
                "M300,540 C430,500 540,430 510,300 C540,170 410,70 300,90 C170,60 70,190 90,300 C60,420 180,560 300,540 Z",
                "M310,520 C400,540 530,440 510,310 C530,170 430,60 300,80 C160,70 80,200 90,310 C70,430 190,500 310,520 Z"
            ];
            let i = 0;
            const morph = () => {
                i = (i + 1) % shapes.length;
                gsap.to(path, { attr: { d: shapes[i] }, duration: 4, ease: "sine.inOut", onComplete: morph });
            };
            morph();
            gsap.to(path, { rotation: 360, transformOrigin: "50% 50%", duration: 40, repeat: -1, ease: "none" });
            if (star) gsap.to(star, { rotation: -360, transformOrigin: "50% 50%", duration: 24, repeat: -1, ease: "none" });
        }
        // mouse parallax
        if (blob && FINE_POINTER && !REDUCED) {
            window.addEventListener("mousemove", (e) => {
                const nx = (e.clientX / window.innerWidth - 0.5);
                const ny = (e.clientY / window.innerHeight - 0.5);
                gsap.to(blob, { x: nx * 80, y: ny * 60, duration: 1, ease: "power2.out" });
                if (star) gsap.to(star, { x: nx * -40, y: ny * -30, duration: 1.2, ease: "power2.out" });
            }, { passive: true });
        }
        // scroll drift + fade hero content
        if (typeof ScrollTrigger !== "undefined") {
            if (blob) gsap.to(blob, { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
            gsap.to(".hero__inner", { yPercent: -12, opacity: REDUCED ? 1 : 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        }
    }

    /* ========================================================
       6. LINE REVEALS (generic)
       ======================================================== */
    function initLineReveals() {
        if (!hasGSAP || typeof ScrollTrigger === "undefined") return;
        $$(".line-reveal").forEach((el) => {
            const inner = $("span", el) || el;
            gsap.to(inner, {
                yPercent: 0, y: 0, duration: 1, ease: "power4.out",
                scrollTrigger: { trigger: el, start: "top 88%" }
            });
            gsap.set(inner, { yPercent: 110 });
        });
    }

    /* ========================================================
       7. MANIFESTO — word by word fill on scrub
       ======================================================== */
    function initManifesto() {
        if (!hasGSAP || typeof ScrollTrigger === "undefined") return;
        [".manifesto__text", ".contact__title"].forEach((sel) => {
            const container = $(sel);
            if (!container) return;
            const words = $$(".reveal-word", container);
            if (!words.length) return;
            gsap.to(words, {
                opacity: 1, duration: 1, stagger: 1, ease: "none",
                scrollTrigger: { trigger: container, start: "top 75%", end: "bottom 60%", scrub: 0.6 }
            });
        });
    }

    /* ========================================================
       8. WORK — horizontal scroll (pinned)
       ======================================================== */
    function initHorizontalWork() {
        if (!hasGSAP || typeof ScrollTrigger === "undefined") return;
        const section = $("#work");
        const track = $("#workTrack");
        if (!section || !track) return;

        const getScrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth);

        // only pin on wider screens; small screens use native horizontal swipe via overflow
        let mm = gsap.matchMedia();
        mm.add("(min-width: 761px)", () => {
            const anim = gsap.to(track, {
                x: () => -getScrollAmount(),
                ease: "none",
                scrollTrigger: {
                    trigger: section,
                    start: "top top",
                    end: () => "+=" + getScrollAmount(),
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true,
                    anticipatePin: 1
                }
            });
            return () => anim.kill();
        });

        mm.add("(max-width: 760px)", () => {
            const vp = $("#workViewport");
            if (vp) { vp.style.overflowX = "auto"; vp.style.scrollSnapType = "x mandatory"; }
            $$(".card", track).forEach((c) => { c.style.scrollSnapAlign = "center"; });
        });
    }

    /* ========================================================
       9. SERVICES — accordion
       ======================================================== */
    function initAccordion() {
        const items = $$("[data-acc]");
        items.forEach((item) => {
            const head = $(".acc__head", item);
            const panel = $(".acc__panel", item);
            const inner = $(".acc__inner", item);
            if (!head || !panel) return;
            head.addEventListener("click", () => {
                const isOpen = item.classList.contains("is-open");
                items.forEach((other) => {
                    if (other === item) return;
                    other.classList.remove("is-open");
                    animatePanel(other, false);
                });
                item.classList.toggle("is-open", !isOpen);
                animatePanel(item, !isOpen);
            });
        });

        function animatePanel(item, open) {
            const panel = $(".acc__panel", item);
            const inner = $(".acc__inner", item);
            if (!panel) return;
            const target = open ? inner.offsetHeight : 0;
            if (hasGSAP && !REDUCED) {
                gsap.to(panel, { height: target, duration: 0.6, ease: "power3.inOut", onComplete: () => { if (open) panel.style.height = "auto"; ScrollTrigger && ScrollTrigger.refresh(); } });
                if (open) gsap.from(inner, { y: 20, opacity: 0, duration: 0.6, delay: 0.1, ease: "power3.out" });
            } else {
                panel.style.height = open ? "auto" : "0px";
            }
        }

        // open the first by default
        if (items[0]) { items[0].classList.add("is-open"); const p = $(".acc__panel", items[0]); if (p) p.style.height = "auto"; }
    }

    /* ========================================================
       10. STATS counter
       ======================================================== */
    function initStats() {
        if (!hasGSAP || typeof ScrollTrigger === "undefined") return;
        $$(".stat__num").forEach((el) => {
            const target = parseInt(el.dataset.count, 10) || 0;
            const obj = { v: 0 };
            ScrollTrigger.create({
                trigger: el, start: "top 90%", once: true,
                onEnter: () => gsap.to(obj, { v: target, duration: 1.8, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(obj.v); } })
            });
        });
    }

    /* ========================================================
       11. NAV behaviour + mobile menu
       ======================================================== */
    function initNav() {
        const nav = $("#nav");
        const burger = $("#burger");
        let lastY = 0;

        if (nav && lenis) {
            lenis.on("scroll", ({ scroll }) => {
                if (scroll > lastY && scroll > 200) nav.classList.add("is-hidden");
                else nav.classList.remove("is-hidden");
                lastY = scroll;
            });
        } else if (nav) {
            window.addEventListener("scroll", () => {
                const y = window.scrollY;
                if (y > lastY && y > 200) nav.classList.add("is-hidden"); else nav.classList.remove("is-hidden");
                lastY = y;
            }, { passive: true });
        }

        if (burger) {
            burger.addEventListener("click", () => {
                const open = document.body.classList.toggle("menu-open");
                if (lenis) { open ? lenis.stop() : lenis.start(); }
                else { document.body.style.overflow = open ? "hidden" : ""; }
            });
        }

        // anchor links -> smooth scroll
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener("click", (e) => {
                const id = a.getAttribute("href");
                if (id.length < 2) return;
                const el = $(id);
                if (!el) return;
                e.preventDefault();
                if (document.body.classList.contains("menu-open")) {
                    document.body.classList.remove("menu-open");
                    if (lenis) lenis.start(); else document.body.style.overflow = "";
                }
                scrollTo(el);
            });
        });

        const toTop = $("#toTop");
        if (toTop) toTop.addEventListener("click", () => scrollTo(0));
    }

    /* ========================================================
       12. WORK cards tilt (subtle)
       ======================================================== */
    function initTilt() {
        if (!FINE_POINTER || REDUCED || !hasGSAP) return;
        $$("[data-tilt]").forEach((el) => {
            const media = $(".card__media", el) || el;
            el.addEventListener("mousemove", (e) => {
                const r = el.getBoundingClientRect();
                const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
                const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
                gsap.to(media, { rotationX: rx, rotationY: ry, transformPerspective: 800, transformOrigin: "center", duration: 0.5, ease: "power2.out" });
            });
            el.addEventListener("mouseleave", () => gsap.to(media, { rotationX: 0, rotationY: 0, duration: 0.7, ease: "power2.out" }));
        });
    }

    /* ========================================================
       13. CONTACT curve morph on scroll
       ======================================================== */
    function initContactCurve() {
        if (!hasGSAP || typeof ScrollTrigger === "undefined" || REDUCED) return;
        const curve = $("#contactCurve");
        if (!curve) return;
        gsap.fromTo(curve,
            { attr: { d: "M0,40 Q50,80 100,40 L100,60 L0,60 Z" } },
            { attr: { d: "M0,20 Q50,-15 100,20 L100,60 L0,60 Z" }, ease: "none",
              scrollTrigger: { trigger: ".contact", start: "top bottom", end: "top center", scrub: true } }
        );
    }

    /* ========================================================
       14. MARQUEE (seamless loop)
       ======================================================== */
    function initMarquee() {
        if (!hasGSAP || REDUCED) return;
        const track = $(".marquee__track");
        if (!track) return;
        gsap.to(track, { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    }

    /* ========================================================
       15. FORM
       ======================================================== */
    function initForm() {
        const form = $("#form");
        if (!form) return;
        const submitLabel = $("#submitLabel");
        const textarea = $("#message", form);

        // auto-grow textarea
        if (textarea) {
            const grow = () => { textarea.style.height = "auto"; textarea.style.height = textarea.scrollHeight + "px"; };
            textarea.addEventListener("input", grow);
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            let valid = true;
            $$("input, textarea", form).forEach((field) => {
                const wrap = field.closest(".field");
                if (field.hasAttribute("required") && !field.value.trim()) { wrap && wrap.classList.add("is-invalid"); valid = false; }
                else { wrap && wrap.classList.remove("is-invalid"); }
                if (field.type === "email" && field.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value)) { wrap && wrap.classList.add("is-invalid"); valid = false; }
            });
            if (!valid) {
                if (hasGSAP) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
                return;
            }
            form.classList.add("is-sent");
            if (submitLabel) submitLabel.textContent = "Thank you — we'll be in touch ✦";
            form.reset();
            $$(".field", form).forEach((f) => f.classList.remove("is-invalid"));
            if (textarea) textarea.style.height = "auto";
        });
    }

    /* ========================================================
       16. MISC
       ======================================================== */
    function initMisc() {
        const year = $("#year");
        if (year) year.textContent = new Date().getFullYear();
    }

    /* ========================================================
       BOOT
       ======================================================== */
    function boot() {
        initSmoothScroll();
        initCursor();
        initMagnetic();
        initNav();
        initMisc();
        initForm();
        initAccordion();

        // animations that read layout
        initLoader(() => {
            initHero();
            initLineReveals();
            initManifesto();
            initHorizontalWork();
            initStats();
            initTilt();
            initContactCurve();
            initMarquee();
            if (hasGSAP && typeof ScrollTrigger !== "undefined") {
                ScrollTrigger.refresh();
            }
        });

        // keep ScrollTrigger honest on resize / font load
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => { if (hasGSAP && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(); });
        }
        window.addEventListener("load", () => { if (hasGSAP && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh(); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
