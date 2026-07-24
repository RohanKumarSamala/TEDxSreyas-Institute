/**
 * hero-script.js
 * Handles: stars, cursor, ambient glow, neural web parallax,
 * Lenis smooth scroll, hero intro animation, scroll-driven hero exit,
 * and smooth reveal of the About section once the hero has scrolled away.
 */

document.addEventListener("DOMContentLoaded", () => {
// Removed local cursor and glow references, now handled by main.js
    const neuralWeb = document.querySelector('.neural-web');

    // Hide the About section immediately so it can be revealed smoothly later
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
        gsap.set(aboutSection, { opacity: 0, y: 60 });
    }

    // --- Smooth Scrolling (Lenis) ---
    // On mobile, native scroll is already fast & smooth — Lenis adds lag on touch.
    // Disable it on touch-capable / narrow screens and let the browser handle it.
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);

    let lenis = null;

    gsap.registerPlugin(ScrollTrigger);

    if (!isMobile) {
        lenis = new Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        // Proper Lenis + GSAP ScrollTrigger integration
        lenis.on('scroll', () => { ScrollTrigger.update(); });

        // Tell GSAP's ScrollTrigger to use Lenis's scroll position
        ScrollTrigger.scrollerProxy(document.body, {
            scrollTop(value) {
                return arguments.length
                    ? lenis.scrollTo(value, { immediate: true })
                    : lenis.animatedScroll;
            },
            getBoundingClientRect() {
                return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
            }
        });
        ScrollTrigger.defaults({ scroller: document.body });
    }

    // Smooth Cursor & Glow Logic are now handled globally.
    // We just track mouseX and mouseY for the neural web.
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // --- Antigravity Star Swarm Logic is now handled globally in main.js ---

    // Mouse parallax only makes sense on desktop (pointer device).
    // On mobile there is no mouse — skip entirely to save 60fps of wasted gsap.set() calls.
    const isMobileParallax = window.innerWidth <= 768 || ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches);

    // Lerped mouse position for neural web — smooths out raw mouse jitter
    let lerpX = mouseX, lerpY = mouseY;

    // Render loop powered by GSAP Ticker for perfect cross-refresh rate scaling
    function render(time, deltaTime) {
        if (window.__loaderActive) return;

        const fpsRatio = deltaTime / 16.666;

        // Neural web parallax — desktop only (mobile has no mouse)
        if (neuralWeb && !isMobileParallax) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const maxTilt = 25;

            lerpX += (mouseX - lerpX) * 0.06;
            lerpY += (mouseY - lerpY) * 0.06;

            const tiltX = ((lerpY - centerY) / centerY) * maxTilt * -1;
            const tiltY = ((lerpX - centerX) / centerX) * maxTilt;
            const moveX = ((lerpX - centerX) / centerX) * 40;
            const moveY = ((lerpY - centerY) / centerY) * 40;

            gsap.set(neuralWeb, { x: moveX, y: moveY, rotationX: tiltX, rotationY: tiltY });
            gsap.set('.layer-1-p', { x: moveX * 0.3, y: moveY * 0.3 });
            gsap.set('.layer-2-p', { x: moveX * 0.5, y: moveY * 0.5 });
            gsap.set('.layer-3-p', { x: moveX * 0.8, y: moveY * 0.8 });
            gsap.set('.layer-4-p', { x: moveX * 1.1, y: moveY * 1.1 });
            gsap.set('.layer-5-p', { x: moveX * 1.5, y: moveY * 1.5 });
        }
    }

    // Add to gsap's highly optimized ticker
    gsap.ticker.add((time, deltaTime) => {
        if (lenis) lenis.raf(time * 1000); // Desktop only — mobile uses native scroll
        render(time, deltaTime);
    });
    gsap.ticker.lagSmoothing(0);


    // Subtle magnetic effect for any potential future links
    const interactables = document.querySelectorAll('a, button');
    interactables.forEach(el => {
        el.addEventListener('mouseenter', () => { isHovering = true; });
        el.addEventListener('mouseleave', () => { isHovering = false; });
    });

    // --- Immediate Hero Reveal ---
    const tl = gsap.timeline();

    if (isMobile) {
        // Mobile: skip blur filter (very expensive on iOS) — use opacity+y only
        tl.add("heroIntro")
            .fromTo(".hero .line-1",
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 1.0, ease: "power3.out" },
                "heroIntro"
            )
            .fromTo(".hero .line-2",
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 1.0, ease: "power3.out" },
                "heroIntro+=0.12"
            )
            .fromTo(".hero .subtitle",
                { opacity: 0, y: 14 },
                { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" },
                "heroIntro+=0.25"
            )
            .fromTo(".neural-web-container",
                { opacity: 0, scale: 0.88 },
                { opacity: 0.75, scale: 1, duration: 1.0, ease: "power2.out" },
                "heroIntro"
            )
            .fromTo(".indicator-text",
                { opacity: 0 },
                { opacity: 1, duration: 0.8, ease: "power2.out" },
                "heroIntro+=0.4"
            )
            .fromTo(".indicator-line",
                { height: 0 },
                { height: 80, duration: 0.9, ease: "expo.inOut" },
                "heroIntro+=0.6"
            );
    } else {
        // Desktop: full cinematic blur-in animations
        tl.add("heroIntro")
            .fromTo(".hero .line-1",
                { opacity: 0, y: 30, scale: 1.15, filter: "blur(10px)" },
                { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.2, ease: "power4.out", clearProps: "filter" },
                "heroIntro"
            )
            .fromTo(".hero .line-2",
                { opacity: 0, x: -30, scale: 1.15, filter: "blur(10px)" },
                { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", duration: 1.2, ease: "power4.out", clearProps: "filter" },
                "heroIntro+=0.15"
            )
            .fromTo(".hero .subtitle",
                { opacity: 0, y: 20, scale: 1.05 },
                { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: "power3.out" },
                "heroIntro+=0.3"
            )
            .fromTo(".neural-web-container",
                { opacity: 0, scale: 0.8 },
                { opacity: 0.75, scale: 1, duration: 1.2, ease: "power3.out" },
                "heroIntro"
            )
            .fromTo(".indicator-text",
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
                "heroIntro+=0.5"
            )
            .fromTo(".indicator-line",
                { height: 0 },
                { height: 80, duration: 1.0, ease: "expo.inOut" },
                "heroIntro+=0.7"
            );
    }

    // --- Scroll Animations ---

    // Track whether about has been revealed yet
    let aboutRevealed = false;

    // The ScrollTrigger is scoped to only the .scroll-space (150vh).
    // This way the hero animation plays perfectly over JUST the hero scroll zone,
    // not diluted across the whole page.
    const scrollTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-space",
            start: "top top",
            end: "bottom bottom",
            scrub: 1,             // 1 = tight scroll tracking, still buttery, no lag tail
            anticipatePin: 1,     // Optimizes rendering slightly ahead of pin moments
            onLeave: () => {
                // The hero scroll zone is fully exited — reveal the About section.
                if (!aboutRevealed) {
                    aboutRevealed = true;
                    revealAboutSection();
                }
            },
            onEnterBack: () => {
                // If user scrolls back up into the hero zone, hide About again
                if (aboutSection) {
                    gsap.to(aboutSection, { opacity: 0, y: 60, duration: 0.4, ease: 'power2.in',
                        onComplete: () => { aboutRevealed = false; }
                    });
                }
            }
        }
    });

    // Animate the Neural Web and Hero Text during scroll exit
    if (isMobile) {
        // Mobile: no scale (causes repaints), no layer rotation — just fade+translate
        scrollTl
            .fromTo(".neural-web-container",
                { opacity: 0.75 },
                { opacity: 0, ease: "none", immediateRender: false }, 0)
            .to(".hero-content", {
                y: -80,
                opacity: 0,
                force3D: true,
                ease: "none"
            }, 0)
            .to(".scroll-indicator", { opacity: 0, ease: "none" }, 0);
    } else {
        // Desktop: full cinematic zoom + ring rotation
        scrollTl.fromTo(".neural-web-container",
            { scale: 1, opacity: 0.75 },
            {
                scale: 2.2,
                opacity: 0,
                ease: "none",
                immediateRender: false
            }, 0)
            .to(".layer-1-p", { rotation: 45, ease: "none", force3D: true }, 0)
            .to(".layer-2-p", { rotation: -60, ease: "none", force3D: true }, 0)
            .to(".layer-3-p", { rotation: 90, ease: "none", force3D: true }, 0)
            .to(".layer-4-p", { rotation: -120, ease: "none", force3D: true }, 0)
            .to(".layer-5-p", { rotation: 180, ease: "none", force3D: true }, 0)
            .to(".hero-content", {
                y: -100,
                opacity: 0,
                scale: 4,
                force3D: true,
                ease: "none"
            }, 0)
            .to(".scroll-indicator", { opacity: 0, ease: "none" }, 0);
    }

    // --- Smooth About Section Reveal ---
    function revealAboutSection() {
        if (!aboutSection) return;

        gsap.to(aboutSection, {
            opacity: 1,
            y: 0,
            duration: 1.4,
            ease: "power3.out",
            onComplete: () => {
                // Trigger the .reveal child elements (stat cards, text content)
                aboutSection.querySelectorAll('.reveal').forEach(el => {
                    el.classList.add('visible');
                });
            }
        });
    }

});
