/* ============================================================
   GJS GROUP — INTERACTIVE ENGINE
   Virtual router · Particle field · Cursor · Reveals · Form
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   CONTACT SEND CONFIG
   ------------------------------------------------------------ */

const CONTACT_SEND = {
    formsprreeEndpoint: 'https://formspree.io/f/xldaepjq', // e.g. 'https://formspree.io/f/XXXXXXXX'
    emailJs: {
        publicKey: '',      // e.g. 'YOUR_PUBLIC_KEY'
        serviceId: '',      // e.g. 'service_xxx'
        templateId: '',     // e.g. 'template_xxx'
    }
};

/* ------------------------------------------------------------
   ENVIRONMENT FLAGS
   ------------------------------------------------------------ */

const MEDIA = {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
    finePointer: window.matchMedia('(hover: hover) and (pointer: fine)'),
    mobile: window.matchMedia('(max-width: 768px)'),
};

const $ = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    Preloader.init();
    Router.init();
    Header.init();
    Cursor.init();
    ParticleField.init();
    Reveal.init();
    Counters.init();
    Spotlight.init();
    ContactForm.init();
    updateCurrentYear();
});

/* ------------------------------------------------------------
   PRELOADER
   ------------------------------------------------------------ */

const Preloader = {
    init() {
        const el = $('#preloader');
        if (!el) return;

        const done = () => {
            el.classList.add('is-done');
            document.body.classList.add('is-loaded');
        };

        if (document.readyState === 'complete') {
            setTimeout(done, 350);
        } else {
            window.addEventListener('load', () => setTimeout(done, 350), { once: true });
            // Safety net if the load event stalls on a slow asset
            setTimeout(done, 3200);
        }
    },
};

/* ------------------------------------------------------------
   VIRTUAL ROUTER — SPA feel with curtain transitions
   ------------------------------------------------------------ */

const Router = {
    routes: {
        'accueil': { label: 'Accueil', title: 'GJS Group — Sites web futuristes & Automatisations' },
        'a-propos': { label: 'À propos', title: 'À propos — GJS Group' },
        'services': { label: 'Services', title: 'Services — GJS Group' },
        'expertise': { label: 'Expertise', title: 'Expertise — GJS Group' },
        'blog': { label: 'Blog', title: 'Blog — GJS Group' },
        'contact': { label: 'Contact', title: 'Contact — GJS Group' },
    },

    current: null,
    busy: false,
    pending: null,

    init() {
        this.curtain = $('#curtain');
        this.curtainLabel = $('#curtainLabel');

        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-link]');
            if (!link) return;
            e.preventDefault();
            this.go(link.dataset.link);
        });

        window.addEventListener('popstate', () => {
            this.activate(this.fromLocation(), { push: false, animate: true });
        });

        this.activate(this.fromLocation(), { push: false, animate: false });
    },

    fromLocation() {
        const route = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
        return this.routes[route] ? route : 'accueil';
    },

    go(route) {
        if (!this.routes[route]) return;
        this.activate(route, { push: true, animate: true });
    },

    activate(route, { push, animate }) {
        if (this.busy) {
            this.pending = { route, push };
            return;
        }
        MobileMenu.close();

        if (route === this.current) {
            if (push) history.pushState(null, '', `#/${route}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const swap = () => {
            $$('.view').forEach((view) => {
                view.classList.toggle('is-active', view.dataset.view === route);
            });
            this.current = route;
            document.title = this.routes[route].title;
            if (push) history.pushState(null, '', `#/${route}`);
            this.markNav(route);
            window.scrollTo(0, 0);

            // Move focus to the view for keyboard / screen reader users
            const activeView = $(`.view[data-view="${route}"]`);
            if (activeView) {
                activeView.setAttribute('tabindex', '-1');
                activeView.focus({ preventScroll: true });
            }
        };

        if (!animate || MEDIA.reducedMotion.matches || !this.curtain) {
            swap();
            return;
        }

        this.busy = true;
        document.body.classList.add('is-transitioning');
        this.curtainLabel.textContent = this.routes[route].label;
        this.curtain.classList.add('is-covering');

        setTimeout(() => {
            swap();
            this.curtain.classList.remove('is-covering');
            this.curtain.classList.add('is-revealing');

            setTimeout(() => {
                this.curtain.classList.remove('is-revealing');
                document.body.classList.remove('is-transitioning');
                this.busy = false;
                if (this.pending) {
                    const { route: next, push: nextPush } = this.pending;
                    this.pending = null;
                    this.activate(next, { push: nextPush, animate: true });
                }
            }, 700);
        }, 700);
    },

    markNav(route) {
        $$('[data-link]').forEach((link) => {
            const isNavLink = link.classList.contains('nav-link') || link.classList.contains('mobile-menu-link');
            if (!isNavLink) return;
            if (link.dataset.link === route) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    },
};

/* ------------------------------------------------------------
   HEADER & MOBILE MENU
   ------------------------------------------------------------ */

const Header = {
    init() {
        const header = $('#header');
        if (!header) return;

        let ticking = false;
        const update = () => {
            header.classList.toggle('scrolled', window.scrollY > 40);
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        update();

        MobileMenu.init();
    },
};

const MobileMenu = {
    init() {
        this.toggle = $('#menuToggle');
        this.menu = $('#mobileMenu');
        if (!this.toggle || !this.menu) return;

        this.toggle.addEventListener('click', () => {
            this.menu.classList.contains('is-open') ? this.close() : this.open();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    },

    open() {
        this.menu.classList.add('is-open');
        this.toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
    },

    close() {
        if (!this.menu) return;
        this.menu.classList.remove('is-open');
        this.toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    },
};

/* ------------------------------------------------------------
   CUSTOM CURSOR — lerped dot + magnetic ring
   ------------------------------------------------------------ */

const Cursor = {
    init() {
        if (!MEDIA.finePointer.matches || MEDIA.reducedMotion.matches) return;

        const dot = $('#cursorDot');
        const ring = $('#cursorRing');
        if (!dot || !ring) return;

        const pos = { x: innerWidth / 2, y: innerHeight / 2 };
        const ringPos = { x: pos.x, y: pos.y };

        window.addEventListener('mousemove', (e) => {
            pos.x = e.clientX;
            pos.y = e.clientY;
            document.body.classList.add('cursor-active');
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-active');
        });

        document.addEventListener('mouseover', (e) => {
            const interactive = e.target.closest('a, button, [data-link], input, select, textarea, label');
            document.body.classList.toggle('cursor-hover', Boolean(interactive));
        });

        const render = () => {
            ringPos.x += (pos.x - ringPos.x) * 0.16;
            ringPos.y += (pos.y - ringPos.y) * 0.16;
            dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
            ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    },
};

/* ------------------------------------------------------------
   PARTICLE FIELD — interactive canvas with cursor gravity
   ------------------------------------------------------------ */

const ParticleField = {
    init() {
        this.canvas = $('#heroCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
        this.running = false;
        this.visible = false;
        this.rafId = null;

        this.palette = [
            [129, 140, 248],  // indigo
            [139, 92, 246],   // violet
            [236, 72, 153],   // pink
        ];

        this.resize();
        this.build();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.resize();
                this.build();
                if (MEDIA.reducedMotion.matches) this.drawFrame();
            }, 200);
        });

        // Pointer gravity (mouse + touch)
        window.addEventListener('pointermove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.tx = e.clientX - rect.left;
            this.mouse.ty = e.clientY - rect.top;
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
            this.mouse.tx = -9999;
            this.mouse.ty = -9999;
        });

        // Only burn CPU when the hero is actually on screen
        const io = new IntersectionObserver(([entry]) => {
            this.visible = entry.isIntersecting;
            // Deep links land on other routes with the hero hidden (0×0):
            // rebuild once real dimensions are available
            if (this.visible && this.canvas.offsetWidth !== this.w) {
                this.resize();
                this.build();
                if (MEDIA.reducedMotion.matches) this.drawFrame();
            }
            this.toggleLoop();
        }, { threshold: 0.05 });
        io.observe(this.canvas);

        document.addEventListener('visibilitychange', () => this.toggleLoop());

        if (MEDIA.reducedMotion.matches) {
            this.drawFrame(); // static constellation, no animation loop
        } else {
            this.toggleLoop();
        }
    },

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const { offsetWidth: w, offsetHeight: h } = this.canvas;
        this.w = w;
        this.h = h;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    build() {
        const density = MEDIA.mobile.matches ? 20000 : 11000;
        const cap = MEDIA.mobile.matches ? 60 : 150;
        const count = Math.min(cap, Math.max(35, Math.round((this.w * this.h) / density)));

        this.linkDist = MEDIA.mobile.matches ? 110 : 150;
        this.gravityRadius = MEDIA.mobile.matches ? 130 : 210;

        this.particles = Array.from({ length: count }, () => {
            const color = this.palette[Math.floor(Math.random() * this.palette.length)];
            return {
                x: Math.random() * this.w,
                y: Math.random() * this.h,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 1.8 + 0.7,
                alpha: Math.random() * 0.5 + 0.25,
                color,
            };
        });
    },

    toggleLoop() {
        const shouldRun = this.visible && !document.hidden && !MEDIA.reducedMotion.matches;
        if (shouldRun && !this.running) {
            this.running = true;
            this.rafId = requestAnimationFrame(() => this.loop());
        } else if (!shouldRun && this.running) {
            this.running = false;
            cancelAnimationFrame(this.rafId);
        }
    },

    loop() {
        if (!this.running) return;
        this.step();
        this.drawFrame();
        this.rafId = requestAnimationFrame(() => this.loop());
    },

    step() {
        // Ease the gravity well toward the pointer for an organic feel
        this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.08;
        this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.08;

        const gr = this.gravityRadius;

        for (const p of this.particles) {
            const dx = this.mouse.x - p.x;
            const dy = this.mouse.y - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < gr && dist > 0.001) {
                const force = ((gr - dist) / gr) * 0.045;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            p.vx *= 0.985; // friction keeps the swarm stable
            p.vy *= 0.985;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -20) p.x = this.w + 20;
            if (p.x > this.w + 20) p.x = -20;
            if (p.y < -20) p.y = this.h + 20;
            if (p.y > this.h + 20) p.y = -20;
        }
    },

    drawFrame() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        const pts = this.particles;
        const linkDist = this.linkDist;

        for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            for (let j = i + 1; j < pts.length; j++) {
                const b = pts[j];
                const dx = a.x - b.x;
                if (dx > linkDist || dx < -linkDist) continue;
                const dy = a.y - b.y;
                if (dy > linkDist || dy < -linkDist) continue;
                const dist = Math.hypot(dx, dy);
                if (dist >= linkDist) continue;

                const fade = (1 - dist / linkDist) * 0.16;
                ctx.strokeStyle = `rgba(${a.color[0]}, ${a.color[1]}, ${a.color[2]}, ${fade})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        for (const p of pts) {
            ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    },
};

/* ------------------------------------------------------------
   SCROLL REVEALS — staggered IntersectionObserver
   ------------------------------------------------------------ */

const Reveal = {
    init() {
        const items = $$('[data-reveal]');
        if (!items.length) return;

        if (MEDIA.reducedMotion.matches || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-visible'));
            return;
        }

        // Stagger siblings inside a reveal group
        $$('[data-reveal-group]').forEach((group) => {
            $$('[data-reveal]', group).forEach((el, i) => {
                el.style.setProperty('--reveal-delay', `${Math.min(i * 0.09, 0.55)}s`);
            });
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        items.forEach((el) => io.observe(el));
    },
};

/* ------------------------------------------------------------
   COUNTERS — eased count-up on visibility
   ------------------------------------------------------------ */

const Counters = {
    init() {
        const counters = $$('[data-target]');
        if (!counters.length) return;

        const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

        const animate = (el) => {
            const target = parseInt(el.dataset.target, 10);
            if (MEDIA.reducedMotion.matches) {
                el.textContent = target;
                return;
            }

            const duration = 1800;
            const start = performance.now();

            const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                el.textContent = Math.round(target * easeOutExpo(progress));
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animate(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach((el) => io.observe(el));
    },
};

/* ------------------------------------------------------------
   SPOTLIGHT — glass cards track the pointer
   ------------------------------------------------------------ */

const Spotlight = {
    init() {
        if (!MEDIA.finePointer.matches) return;

        document.addEventListener('pointermove', (e) => {
            const card = e.target.closest('.glass-card');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        }, { passive: true });
    },
};

/* ------------------------------------------------------------
   CONTACT FORM — validation + Formspree / EmailJS delivery
   ------------------------------------------------------------ */

const ContactForm = {
    init() {
        const form = $('#contactForm');
        if (!form) return;

        const submitBtn = $('#submitBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoading = submitBtn?.querySelector('.btn-loading');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Honeypot check
            const honeypot = form.querySelector('[name="honeypot"]').value;
            if (honeypot) {
                return; // Bot detected
            }

            if (!validateForm()) {
                return;
            }

            const formData = {
                name: $('#name').value,
                email: $('#email').value,
                phone: $('#phone') ? $('#phone').value : '',
                company: $('#company').value,
                service: $('#service').value,
                budget: $('#budget').value,
                message: $('#message').value,
            };

            if (submitBtn && btnText && btnLoading) {
                submitBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline-flex';
            }

            try {
                if (CONTACT_SEND.formsprreeEndpoint) {
                    const response = await fetch(CONTACT_SEND.formsprreeEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(formData),
                    });
                    if (!response.ok) {
                        throw new Error('Form submission failed');
                    }
                    showToast('Message envoyé !', 'Nous vous recontacterons sous 24h.', 'success');
                    form.reset();
                } else if (window.emailjs && CONTACT_SEND.emailJs.publicKey && CONTACT_SEND.emailJs.serviceId && CONTACT_SEND.emailJs.templateId) {
                    if (!emailjs.__inited) {
                        emailjs.init(CONTACT_SEND.emailJs.publicKey);
                        emailjs.__inited = true;
                    }
                    await emailjs.send(CONTACT_SEND.emailJs.serviceId, CONTACT_SEND.emailJs.templateId, formData);
                    showToast('Message envoyé !', 'Nous vous recontacterons sous 24h.', 'success');
                    form.reset();
                } else {
                    showToast('Configuration requise', "Ajoutez un endpoint Formspree ou des identifiants EmailJS pour l'envoi automatique.", 'error');
                }
            } catch (error) {
                showToast('Erreur', 'Une erreur est survenue. Veuillez réessayer.', 'error');
            } finally {
                if (submitBtn && btnText && btnLoading) {
                    submitBtn.disabled = false;
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                }
            }
        });

        // Real-time validation
        form.querySelectorAll('input, textarea, select').forEach((input) => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => clearError(input));
        });
    },
};

function validateForm() {
    let isValid = true;

    const name = $('#name');
    if (name && name.value.trim().length < 2) {
        showFieldError(name, 'Le nom doit contenir au moins 2 caractères');
        isValid = false;
    }

    const email = $('#email');
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            showFieldError(email, 'Email invalide');
            isValid = false;
        }
    }

    const message = $('#message');
    if (message && message.value.trim().length < 10) {
        showFieldError(message, 'Le message doit contenir au moins 10 caractères');
        isValid = false;
    }

    const consent = $('#consent');
    if (consent && !consent.checked) {
        showFieldError(consent, 'Vous devez accepter les conditions');
        isValid = false;
    }

    return isValid;
}

function validateField(field) {
    clearError(field);

    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'Ce champ est requis');
        return false;
    }

    if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            showFieldError(field, 'Email invalide');
            return false;
        }
    }

    if (field.id === 'name' && field.value.trim().length < 2) {
        showFieldError(field, 'Le nom doit contenir au moins 2 caractères');
        return false;
    }

    if (field.id === 'message' && field.value.trim().length < 10) {
        showFieldError(field, 'Le message doit contenir au moins 10 caractères');
        return false;
    }

    return true;
}

function showFieldError(field, message) {
    field.classList.add('is-invalid');
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(field) {
    field.classList.remove('is-invalid');
    const errorElement = document.getElementById(field.id + 'Error');
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

/* ------------------------------------------------------------
   TOAST NOTIFICATIONS
   ------------------------------------------------------------ */

let toastTimer;

function showToast(title, message, type = 'default') {
    const toast = $('#toast');
    const toastTitle = $('#toastTitle');
    const toastMessage = $('#toastMessage');
    if (!toast || !toastTitle || !toastMessage) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.className = 'toast';
    if (type === 'success') toast.classList.add('success');
    if (type === 'error') toast.classList.add('error');

    // Force a reflow so re-triggering the toast restarts its transition
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
    const toast = $('#toast');
    if (toast) toast.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
    const toastClose = $('#toastClose');
    if (toastClose) toastClose.addEventListener('click', hideToast);
});

/* ------------------------------------------------------------
   UTILITIES
   ------------------------------------------------------------ */

function updateCurrentYear() {
    const yearElement = $('#currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}
