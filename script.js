// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initHeroCanvas();
    initScrollAnimations();
    initCounterAnimation();
    initPartnersCarousel();
    initContactForm();
    updateCurrentYear();
    initPageTransitions();
});

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
    const header = document.getElementById('header');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Header scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Mobile menu toggle
    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close mobile menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// ============================================
// HERO CANVAS (3D Effect)
// ============================================

function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 100;
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2,
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap around edges
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99, 102, 241, ${particle.opacity})`;
            ctx.fill();
        });
        
        // Draw connections
        particles.forEach((particle, i) => {
            particles.slice(i + 1).forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particle.x, particle.y);
                    ctx.lineTo(otherParticle.x, otherParticle.y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.2 * (1 - distance / 150)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    
    function checkReveal() {
        reveals.forEach(element => {
            const windowHeight = window.innerHeight;
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    }
    
    window.addEventListener('scroll', checkReveal);
    checkReveal(); // Check on load
}

// ============================================
// COUNTER ANIMATION
// ============================================

function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        // Start animation when element is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });
        
        observer.observe(counter);
    });
}

// ============================================
// PARTNERS CAROUSEL
// ============================================

function initPartnersCarousel() {
    const carousel = document.getElementById('partnersCarousel');
    if (!carousel) return;
    
    let scrollPosition = 0;
    let scrollSpeed = 1;
    let isPaused = false;
    
    function autoScroll() {
        if (!isPaused) {
            scrollPosition += scrollSpeed;
            carousel.scrollLeft = scrollPosition;
            
            // Reset scroll position when reaching the end
            if (scrollPosition >= carousel.scrollWidth - carousel.clientWidth) {
                scrollPosition = 0;
            }
        }
        
        requestAnimationFrame(autoScroll);
    }
    
    // Pause on hover
    carousel.addEventListener('mouseenter', () => {
        isPaused = true;
    });
    
    carousel.addEventListener('mouseleave', () => {
        isPaused = false;
    });
    
    autoScroll();
}

// ============================================
// CONTACT FORM
// ============================================

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Honeypot check
        const honeypot = form.querySelector('[name="honeypot"]').value;
        if (honeypot) {
            return; // Bot detected
        }
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone') ? document.getElementById('phone').value : '',
            company: document.getElementById('company').value,
            service: document.getElementById('service').value,
            budget: document.getElementById('budget').value,
            message: document.getElementById('message').value,
        };
        
        // Show loading state
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
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearError(input));
    });
}

function validateForm() {
    const form = document.getElementById('contactForm');
    let isValid = true;
    
    // Name validation
    const name = document.getElementById('name');
    if (name && name.value.trim().length < 2) {
        showFieldError(name, 'Le nom doit contenir au moins 2 caractères');
        isValid = false;
    }
    
    // Email validation
    const email = document.getElementById('email');
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            showFieldError(email, 'Email invalide');
            isValid = false;
        }
    }
    
    // Message validation
    const message = document.getElementById('message');
    if (message && message.value.trim().length < 10) {
        showFieldError(message, 'Le message doit contenir au moins 10 caractères');
        isValid = false;
    }
    
    // Consent validation
    const consent = document.getElementById('consent');
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
    field.style.borderColor = 'var(--error)';
    const errorId = field.id + 'Error';
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(field) {
    field.style.borderColor = '';
    const errorId = field.id + 'Error';
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.classList.remove('show');
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(title, message, type = 'default') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastTitle || !toastMessage) return;
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.className = 'toast';
    if (type === 'success') {
        toast.classList.add('success');
    } else if (type === 'error') {
        toast.classList.add('error');
    }
    
    toast.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.remove('show');
    }
}

// Close toast button
const toastClose = document.getElementById('toastClose');
if (toastClose) {
    toastClose.addEventListener('click', hideToast);
}

// ============================================
// PAGE TRANSITIONS
// ============================================

function initPageTransitions() {
    const links = document.querySelectorAll('a[href$=".html"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Don't apply transition for external links or anchors
            if (href.startsWith('http') || href.startsWith('#')) {
                return;
            }
            
            // Add fade out effect
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.3s ease';
            
            // Navigate after fade
            setTimeout(() => {
                window.location.href = href;
            }, 300);
        });
    });
    
    // Fade in on page load
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ============================================
// IMAGE LAZY LOADING
// ============================================

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ============================================
// CONTACT SEND CONFIG
// ============================================

const CONTACT_SEND = {
    formsprreeEndpoint: 'https://formspree.io/f/xldaepjq', // e.g. 'https://formspree.io/f/XXXXXXXX'
    emailJs: {
        publicKey: '',      // e.g. 'YOUR_PUBLIC_KEY'
        serviceId: '',      // e.g. 'service_xxx'
        templateId: '',     // e.g. 'template_xxx'
    }
};

