/**
 * TEDx Sreyas Institute — main.js
 * Shared across all pages.
 */

'use strict';

/* ── Sticky Navbar ── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ── Mobile Hamburger Menu ── */
(function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    // No overflow lock — menu is a small floating card
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', function (e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ── Scroll Reveal ── */
(function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  if (!window.IntersectionObserver) {
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach(el => observer.observe(el));
})();

/* ── Smooth Scroll ── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navHeight - 16, behavior: 'smooth' });
    });
  });
})();

/* ── Active Nav Link & Sliding Pill ── */
(function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  let activeLink = null;
  
  document.querySelectorAll('.nav-links a, .nav-mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPage = href.split('#')[0] || 'index.html';
    if (linkPage === currentPage) {
      link.classList.add('active');
      if (link.closest('.nav-links')) {
        activeLink = link;
      }
    }
  });

  // Sliding pill logic
  const navLinksContainer = document.querySelector('.nav-links');
  const activeBg = document.querySelector('.nav-active-bg');
  
  if (navLinksContainer && activeBg) {
    function movePill(targetLink) {
      if (!targetLink) {
        activeBg.style.opacity = '0';
        return;
      }
      activeBg.style.opacity = '1';
      activeBg.style.width = targetLink.offsetWidth + 'px';
      activeBg.style.left = targetLink.offsetLeft + 'px';
    }

    // Initialize pill position
    if (activeLink) {
      // Small delay to ensure layout is ready
      setTimeout(() => movePill(activeLink), 50);
    }

    // Hover interactions
    const links = navLinksContainer.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('mouseenter', () => movePill(link));
    });

    navLinksContainer.addEventListener('mouseleave', () => movePill(activeLink));
    
    window.addEventListener('resize', () => {
      if (activeLink && !navLinksContainer.matches(':hover')) {
        movePill(activeLink);
      }
    });
  }
})();

/* ── Global Premium Cursor & Ambient Glow ── */
(function initGlobalCursor() {
  const body = document.body;
  if (!body || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return; // Disable on very strictly detected mobile

  body.classList.add('has-custom-cursor');

  // Check if they already exist in HTML, otherwise create them
  let cursor = document.getElementById('custom-cursor') || document.querySelector('.cursor-dot');
  if(!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'cursor-dot';
      cursor.id = 'custom-cursor';
      document.body.appendChild(cursor);
  }

  let glow = document.querySelector('.ambient-glow');
  if(!glow) {
      glow = document.createElement('div');
      glow.className = 'ambient-glow';
      document.body.appendChild(glow);
  }

  let savedX = sessionStorage.getItem('cursorX');
  let savedY = sessionStorage.getItem('cursorY');
  
  let mouseX = savedX !== null ? parseFloat(savedX) : window.innerWidth / 2;
  let mouseY = savedY !== null ? parseFloat(savedY) : window.innerHeight / 2;
  
  let cX = mouseX, cY = mouseY;
  let gX = mouseX, gY = mouseY;
  
  // Set initial transforms immediately 
  if (cursor) cursor.style.transform = `translate(${cX - 3}px, ${cY - 3}px)`;
  if (glow) glow.style.transform = `translate(${gX - 400}px, ${gY - 400}px)`;

  document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX; 
      mouseY = e.clientY;
      sessionStorage.setItem('cursorX', mouseX);
      sessionStorage.setItem('cursorY', mouseY);
  });

  function renderCursor() {
      requestAnimationFrame(renderCursor);
      if (window.__loaderActive) return;

      // Dot — instant snap: no lerp = perfectly accurate, zero lag
      if(cursor && !cursor.classList.contains('active')) {
          cX = mouseX;
          cY = mouseY;
          cursor.style.transform = `translate(${cX - 3}px, ${cY - 3}px)`;
      } else if (cursor) {
          // Active state: perfectly center the larger ring on cursor
          cursor.style.transform = `translate(${mouseX - 30}px, ${mouseY - 30}px)`;
      }

      // Glow (Centered based on its actual size - now perfectly sticks to cursor)
      if(glow) {
          gX = mouseX; 
          gY = mouseY;
          const offset = glow.offsetWidth / 2 || 38; 
          glow.style.transform = `translate(${gX - offset}px, ${gY - offset}px)`;
      }
  }
  renderCursor();

  // Global hover triggers for a, button, nav-hamburger, and custom interactive classes
  function attachHoverTriggers() {
      document.querySelectorAll('a, button, [role="button"], .clickable, .gc-frame, .orbit-card, .carousel-ring, .nav-hamburger').forEach(el => {
          // Avoid attaching multiple times
          if(!el.dataset.cursorAttached) {
              el.dataset.cursorAttached = 'true';
              el.addEventListener('mouseenter', () => cursor && cursor.classList.add('active'));
              el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('active'));
          }
      });
  }
  attachHoverTriggers();

  // Re-attach in case dynamic elements are added
  const observer = new MutationObserver(() => attachHoverTriggers());
  observer.observe(document.body, { childList: true, subtree: true });

})();

/* ── Countdown Timer ── */
(function initCountdown() {
  var countdownContainer = document.getElementById('countdown');
  if (!countdownContainer) return;

  // Target: July 4, 2026 00:00:00 local time
  var targetDate = new Date('July 4, 2026 00:00:00').getTime();

  function calculateTimeRemaining() {
    var now = Date.now();
    var difference = targetDate - now;
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  }

  function createCountdownUnit(value, label) {
    var digits = value.toString().padStart(2, '0').split('');
    return (
      '<div class="countdown-unit">' +
      '<div class="number-container">' +
      '<div class="glow-effect"></div>' +
      '<div class="rotating-border"></div>' +
      '<div class="digits-container">' +
      digits.map(function (digit, index) {
        return (
          '<div class="digit-box">' +
          '<div class="top-shine"></div>' +
          '<div class="inner-glow"></div>' +
          '<div class="digit-number-wrapper">' +
          '<span class="digit-number" data-digit="' + index + '">' + digit + '</span>' +
          '</div>' +
          '<div class="bottom-highlight"></div>' +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="countdown-label"><span>' + label + '</span></div>' +
      '</div>'
    );
  }

  function createSeparator() {
    return '<div class="separator"><div class="separator-dot"></div><div class="separator-dot"></div></div>';
  }

  var previousTime = null;

  function updateCountdown() {
    var timeRemaining = calculateTimeRemaining();

    if (!previousTime) {
      // First render — build full HTML
      countdownContainer.innerHTML =
        createCountdownUnit(timeRemaining.days, 'DAYS') + createSeparator() +
        createCountdownUnit(timeRemaining.hours, 'HOURS') + createSeparator() +
        createCountdownUnit(timeRemaining.minutes, 'MINUTES') + createSeparator() +
        createCountdownUnit(timeRemaining.seconds, 'SECONDS');
    } else {
      // Subsequent renders — only update changed digits
      var unitKeys = ['days', 'hours', 'minutes', 'seconds'];
      var unitElements = countdownContainer.querySelectorAll('.countdown-unit');

      unitKeys.forEach(function (key, i) {
        if (timeRemaining[key] !== previousTime[key]) {
          var digits = timeRemaining[key].toString().padStart(2, '0').split('');
          var digitElements = unitElements[i].querySelectorAll('.digit-number');
          digits.forEach(function (digit, j) {
            if (digit !== digitElements[j].textContent) {
              digitElements[j].textContent = digit;
              digitElements[j].classList.remove('digit-change');
              void digitElements[j].offsetWidth; // reflow to restart animation
              digitElements[j].classList.add('digit-change');
            }
          });
        }
      });
    }

    previousTime = { days: timeRemaining.days, hours: timeRemaining.hours, minutes: timeRemaining.minutes, seconds: timeRemaining.seconds };
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
})();

/* \u2500\u2500 Global Loader \u2500\u2500\n *  Strategy:
 *  1. Lock body scroll while loader is visible (avoids background jitter).
 *  2. Use requestAnimationFrame to flush the GPU layer promotion before
 *     triggering the CSS opacity transition \u2014 eliminates first-frame flicker.
 *  3. Remove the element from the DOM entirely only after the transition ends
 *     so the opacity fade always plays at full 60 fps.
 *  4. Dismiss on video `ended`; canplaythrough starts play immediately.
 *  5. Hard 6s safety timeout as a fallback.
 */
(function initLoader() {
  var loader = document.getElementById('global-loader');
  var video  = document.getElementById('loader-video');
  if (!loader || !video) return;

  /* ── Detect if this is a page refresh (F5) or a link navigation ──
   *  - 'reload'    → F5 / browser reload  → show loader
   *  - 'navigate'  → link click (e.g. "Home" nav) → skip loader
   *  First-ever visit (no sessionStorage flag) always shows the loader.
   */
  var navType = 'navigate';
  try {
    var navEntry = performance.getEntriesByType('navigation')[0];
    navType = navEntry ? navEntry.type : (performance.navigation.type === 1 ? 'reload' : 'navigate');
  } catch (e) {}

  var isFirstVisit = !sessionStorage.getItem('__siteVisited');
  sessionStorage.setItem('__siteVisited', '1');

  if (navType !== 'reload' && !isFirstVisit) {
    /* Link navigation — hide loader instantly, no animation */
    loader.style.display = 'none';
    window.__loaderActive = false;
    return;
  }

  /* Flag: suppresses cursor + starfield mouse effects while loader covers the screen */
  window.__loaderActive = true;

  /* --- Lock scroll so background content doesn’t paint during load --- */
  document.body.style.overflow = 'hidden';

  var dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;

    /* Restore scroll and re-enable cursor/starfield mouse tracking */
    document.body.style.overflow = '';
    window.__loaderActive = false;

    /* RAF flush: let the browser commit the current paint,
       then start the opacity transition on the next frame.
       This guarantees the compositor layer exists before fading. */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        loader.classList.add('hidden');

        /* Hard-remove from the render tree after the CSS fade finishes */
        loader.addEventListener('transitionend', function onEnd(e) {
          if (e.propertyName !== 'opacity') return;
          loader.removeEventListener('transitionend', onEnd);
          loader.style.display = 'none';
        });
      });
    });
  }

  /* Primary: dismiss exactly when the video finishes */
  video.addEventListener('ended', function() {
    clearTimeout(t);
    dismiss();
  });

  /* Safety fallback: dismiss after 6s if video never plays/ends */
  var t = setTimeout(dismiss, 6000);

  /* Muted autoplay is policy-exempt in all modern browsers —
     the browser starts playback via the `autoplay` attribute itself.
     We do NOT call video.play() manually to avoid triggering
     Chrome’s “click anywhere” autoplay policy overlay. */
})();

/* ── Global Antigravity Stars ── */
(function initGlobalStars() {
    const canvas = document.getElementById('stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const TWO_PI = Math.PI * 2;

    // Check if this is the homepage to determine density
    const isHomePage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
    
    function initParticles() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        particles = [];

        // Dynamically scale particles based on screen area to save potato devices
        const baseArea = 1920 * 1080;
        const currentArea = width * height;
        const densityFactor = Math.min(1, currentArea / baseArea);
        
        // Vastly fewer stars if not on homepage, but also cap homepage to save CPU
        const multiplier = isHomePage ? 400 : 150; 
        const numParticles = Math.floor(multiplier * densityFactor); // Cap at sensible number

        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                baseX: Math.random() * width,
                baseY: Math.random() * height,
                radius: Math.random() * 1.2 + 0.2, // Tiny tiny stars like before
                opacity: Math.random(),
                speed: Math.random() * 0.015 + 0.005, // For twinkle effect
                wanderTheta: Math.random() * TWO_PI,
                wanderSpeed: Math.random() * 0.5 + 0.1
            });
        }
    }

    let globalMouseX = window.innerWidth / 2;
    let globalMouseY = window.innerHeight / 2;

    // On touch-only devices there's no mouse — disable repulsion so stars wander naturally
    const isTouchOnly = ('ontouchstart' in window) && !window.matchMedia('(pointer: fine)').matches;

    if (!isTouchOnly) {
        document.addEventListener("mousemove", (e) => {
            globalMouseX = e.clientX;
            globalMouseY = e.clientY;
        });
    }

    function drawParticles() {
        if (window.__loaderActive) {
            requestAnimationFrame(drawParticles);
            return;
        }

        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        const mouseRadius = 250;
        const mouseRadiusSq = mouseRadius * mouseRadius;

        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];

            // Twinkle effect
            p.opacity += p.speed;
            if (p.opacity > 1 || p.opacity < 0.1) {
                p.speed = -p.speed;
            }

            // Slow organic wandering
            p.wanderTheta += 0.02 * p.wanderSpeed;
            p.baseX += Math.cos(p.wanderTheta) * p.wanderSpeed;
            p.baseY += Math.sin(p.wanderTheta) * p.wanderSpeed;

            // Wrap around screen
            if (p.baseX > width + 50) p.baseX = -50;
            if (p.baseX < -50) p.baseX = width + 50;
            if (p.baseY > height + 50) p.baseY = -50;
            if (p.baseY < -50) p.baseY = height + 50;

            let targetX = p.baseX;
            let targetY = p.baseY;

            // Mouse repulsion — desktop only
            if (!isTouchOnly) {
                const dx = p.x - globalMouseX;
                const dy = p.y - globalMouseY;
                const distSq = dx * dx + dy * dy;

                if (distSq < mouseRadiusSq) {
                    const distance = Math.sqrt(distSq);
                    const force = (mouseRadius - distance) / mouseRadius;
                    const pushX = (dx / distance) * force * 150;
                    const pushY = (dy / distance) * force * 150;

                    targetX = p.baseX + pushX;
                    targetY = p.baseY + pushY;
                }
            }

            // Lerp physical position for fluid, heavy inertia effect
            p.x += (targetX - p.x) * 0.05;
            p.y += (targetY - p.y) * 0.05;

            // Draw the star (dot)
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, TWO_PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.4})`;
            ctx.fill();
        }
        requestAnimationFrame(drawParticles);
    }

    // On mobile, scrolling shows/hides the address bar which fires resize events.
    // Only reinit stars on real orientation/width changes — not on tiny height jitter.
    let lastWidth  = window.innerWidth;
    let lastHeight = window.innerHeight;
    let resizeTimer = null;

    function onResize() {
        const newW = window.innerWidth;
        const newH = window.innerHeight;
        const widthChanged  = newW !== lastWidth;
        const bigHeightChange = Math.abs(newH - lastHeight) > 100; // address bar = ~50-80px

        if (widthChanged || bigHeightChange) {
            lastWidth  = newW;
            lastHeight = newH;
            initParticles();
        }
    }

    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onResize, 120); // debounce
    }, { passive: true });

    initParticles();
    requestAnimationFrame(drawParticles);
})();

