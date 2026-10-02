// ===================================================================
// Shared media queries
//
// These are live MediaQueryList objects, not booleans captured once at
// load: each feature reads `.matches` at the moment it needs the answer,
// and listens for 'change' where it has state to undo. That way the site
// follows OS/device changes made while the page is open (e.g. turning on
// Reduce Motion, or a 2-in-1 laptop switching between mouse and touch).
// ===================================================================
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
// must match the inline-nav breakpoint in style.css (HEADER / NAVIGATION)
const desktopNavQuery = window.matchMedia('(min-width: 900px)');

// ===================================================================
// Footer year
// ===================================================================
function initFooterYear() {
  const year = document.getElementById('year');
  if (!year) return;

  year.textContent = new Date().getFullYear();
}

// ===================================================================
// Mobile navigation menu
// ===================================================================
function initMobileMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!menuBtn || !mobileNav) return;

  const isMenuOpen = () => mobileNav.classList.contains('is-open');

  // Single place that keeps the visual state and the button's ARIA state in
  // sync, so opening and closing can never disagree about either.
  function setMenuOpen(open) {
    mobileNav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function closeMobileMenu({ instant } = {}) {
    if (instant) {
      // Skip the collapse animation so the layout height updates immediately —
      // otherwise the scroll target below is measured before the menu has
      // actually collapsed, and the page lands in the wrong spot.
      mobileNav.style.transition = 'none';
    }
    setMenuOpen(false);
    if (instant) {
      mobileNav.offsetHeight; // force a reflow so the collapse applies now
      mobileNav.style.transition = '';
    }
  }

  menuBtn.addEventListener('click', () => setMenuOpen(!isMenuOpen()));

  // Escape closes the menu. If focus was on one of its links, hand it back
  // to the menu button so keyboard users aren't left on a link that's about
  // to become hidden.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isMenuOpen()) return;
    const focusWasInMenu = mobileNav.contains(document.activeElement);
    closeMobileMenu();
    if (focusWasInMenu) menuBtn.focus();
  });

  // Widening past the breakpoint hides the menu button and the mobile nav
  // (style.css), so close the menu too — otherwise it would reappear already
  // open, with aria-expanded still "true", when the viewport narrows again.
  desktopNavQuery.addEventListener('change', (event) => {
    if (event.matches && isMenuOpen()) closeMobileMenu({ instant: true });
  });

  // Close the mobile menu whenever a link inside it is clicked, then jump to the
  // target section ourselves — letting the browser's own anchor scroll run at
  // the same time as the menu's collapse animation causes it to land in the
  // wrong place, since the header's height is still changing mid-scroll.
  mobileNav.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.getAttribute('href').slice(1));
      // no matching section: leave the browser's default link behavior alone
      if (!target) return;

      event.preventDefault();
      closeMobileMenu({ instant: true });
      target.scrollIntoView({ behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
    });
  });
}

// ===================================================================
// Highlight the current section in the nav while scrolling — on both the
// desktop links and the mobile menu's links. The active link also gets
// aria-current="location", so assistive tech can announce which section
// is in view, not just sighted users via the accent color.
// ===================================================================
function initScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  if (!sections.length || !navLinks.length || !('IntersectionObserver' in window)) return;

  function setActiveLink(id) {
    navLinks.forEach((link) => {
      const isMatch = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isMatch);
      if (isMatch) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        setActiveLink(visible.target.id);
      }
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

// ===================================================================
// Scroll-reveal — fades/slides elements in as they enter the viewport.
// Progressive enhancement: the `no-js` class (removed by an inline
// head script before first paint) keeps everything visible if this
// file never runs, and prefers-reduced-motion skips the effect too.
// (If Reduce Motion is switched on mid-visit, style.css already forces
// every [data-reveal] element visible, so there's nothing to undo here.)
// ===================================================================
function initRevealAnimations() {
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (!revealEls.length) return;

  if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // stagger items that share a reveal group (e.g. a grid of cards)
  const groups = new Map();
  revealEls.forEach((el) => {
    const group = el.getAttribute('data-reveal-group');
    if (!group) return;
    const index = groups.get(group) || 0;
    el.style.setProperty('--reveal-delay', `${Math.min(index * 90, 360)}ms`);
    groups.set(group, index + 1);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  revealEls.forEach((el) => revealObserver.observe(el));
}

// ===================================================================
// Hero graphic — the signature interactive diagram
//
// Each node carries its own content as `data-title`/`data-text` attributes
// (see index.html) — to change what a node reveals, edit those attributes,
// not this file.
//
// Two layers of behavior:
//  1. Hover/focus previews a node's short SVG label (pure CSS, see
//     style.css) — a quick, low-commitment preview.
//  2. Click, tap, or Enter/Space opens that node's full story in the panel
//     below the graphic, highlights its connector line, and dims the
//     others. Activating a different node smoothly swaps the panel
//     content. On pointer-capable, non-touch devices a subtle parallax
//     tilt also responds to cursor position for a sense of depth.
// All motion is skipped under prefers-reduced-motion.
// ===================================================================
function initHeroGraphic() {
  const heroGraphic = document.querySelector('.hero__graphic');
  const heroFrame = document.querySelector('.hero__graphic-frame');
  const technicalGraphic = document.querySelector('.technical-graphic');
  const graphicNodes = [...document.querySelectorAll('.technical-graphic__node')];
  const graphicConnectors = [...document.querySelectorAll('.technical-graphic__connector')];
  const graphicPanel = document.querySelector('.hero__graphic-panel');
  const panelTitle = document.querySelector('[data-panel-title]');
  const panelText = document.querySelector('[data-panel-text]');

  if (!heroGraphic || !technicalGraphic || !graphicNodes.length) return;
  if (!graphicPanel || !panelTitle || !panelText) return;

  const PANEL_DEFAULT_TITLE = 'Explore';
  const PANEL_DEFAULT_TEXT = 'Click or tap a node to explore.';

  let activeIndex = null;
  let panelTimer = null;

  function renderPanel() {
    const node = activeIndex === null ? null : graphicNodes[activeIndex];

    const applyContent = () => {
      if (node) {
        panelTitle.textContent = node.dataset.title;
        panelText.textContent = node.dataset.text;
        graphicPanel.classList.add('has-selection');
      } else {
        panelTitle.textContent = PANEL_DEFAULT_TITLE;
        panelText.textContent = PANEL_DEFAULT_TEXT;
        graphicPanel.classList.remove('has-selection');
      }
    };

    // Cancel any crossfade still in flight, so rapid clicks across several
    // nodes only ever apply the latest selection — instead of a queue of
    // older timers each swapping content and ending the fade early.
    window.clearTimeout(panelTimer);
    panelTimer = null;

    // Brief crossfade so switching between nodes reads as a smooth transition
    // rather than a jump cut; skipped entirely under reduced motion.
    if (reducedMotionQuery.matches) {
      graphicPanel.classList.remove('is-transitioning');
      applyContent();
      return;
    }
    graphicPanel.classList.add('is-transitioning');
    panelTimer = window.setTimeout(() => {
      panelTimer = null;
      applyContent();
      graphicPanel.classList.remove('is-transitioning');
    }, 150);
  }

  function setActiveIndex(index) {
    activeIndex = index;
    graphicNodes.forEach((node, i) => node.classList.toggle('is-active', i === index));
    graphicConnectors.forEach((line, i) => line.classList.toggle('is-active', i === index));
    technicalGraphic.classList.toggle('has-active', index !== null);
    renderPanel();
  }

  graphicNodes.forEach((node, index) => {
    // Click/tap toggles this node open (or closed, if it's already the
    // active one) and is the single source of truth for `is-active` — a
    // 'focus' handler here would double-set the same state, since focus
    // always fires just before click for a pointer interaction.
    node.addEventListener('click', () => {
      setActiveIndex(activeIndex === index ? null : index);
    });

    // SVG <g> elements don't get automatic Enter/Space activation the way a
    // real <button> would, so it's wired up explicitly for keyboard users.
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActiveIndex(activeIndex === index ? null : index);
      }
    });
  });

  // clicking anywhere else on the graphic (not a node) closes the open story
  heroGraphic.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.technical-graphic__node')) {
      setActiveIndex(null);
    }
  });

  if (heroFrame) initHeroTilt(heroGraphic, heroFrame);
}

// Subtle cursor-driven parallax tilt — desktop, fine-pointer devices only,
// and never under reduced motion. Both conditions are re-checked live: if
// either stops holding mid-visit, the tilt eases off and the frame resets.
function initHeroTilt(heroGraphic, heroFrame) {
  let rafId = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const canTilt = () => fineHoverQuery.matches && !reducedMotionQuery.matches;

  function applyTilt() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    heroFrame.style.transform = `rotateX(${currentY}deg) rotateY(${currentX}deg)`;

    if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
      rafId = requestAnimationFrame(applyTilt);
    } else {
      rafId = null;
    }
  }

  function queueTilt() {
    if (!rafId) rafId = requestAnimationFrame(applyTilt);
  }

  // Turns the effect on or off to match the current media queries. Turning
  // it off drops the tilt instantly (no easing back) — that return motion is
  // exactly what reduced motion asks us not to play.
  function syncTiltSupport() {
    if (canTilt()) {
      heroGraphic.style.perspective = '600px';
      return;
    }
    cancelAnimationFrame(rafId);
    rafId = null;
    targetX = targetY = currentX = currentY = 0;
    heroFrame.style.transform = '';
    heroGraphic.style.perspective = '';
  }

  syncTiltSupport();
  fineHoverQuery.addEventListener('change', syncTiltSupport);
  reducedMotionQuery.addEventListener('change', syncTiltSupport);

  heroGraphic.addEventListener('pointermove', (event) => {
    if (!canTilt()) return;
    const rect = heroGraphic.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    targetX = relX * 14;
    targetY = relY * -14;
    queueTilt();
  });

  heroGraphic.addEventListener('pointerleave', () => {
    if (!canTilt()) return;
    targetX = 0;
    targetY = 0;
    queueTilt();
  });
}

// ===================================================================
// Pause off-screen decorative loops — the hero clock's sweep/pulse, the
// About rail's traveling glow, and the Contact glow run forever, so each
// container marked `data-pause-offscreen` (index.html) gets `is-offscreen`
// while it's scrolled out of view, and style.css pauses its infinite
// animations. They resume exactly where they stopped, so there's no
// visible change — the browser just stops doing work nobody can see.
// (Hidden tabs are already throttled by the browser itself.)
// ===================================================================
function initOffscreenAnimationPause() {
  const containers = document.querySelectorAll('[data-pause-offscreen]');
  if (!containers.length || !('IntersectionObserver' in window)) return;

  const offscreenObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    },
    // a little margin so loops are already running again just before they scroll into view
    { rootMargin: '120px 0px' }
  );

  containers.forEach((el) => offscreenObserver.observe(el));
}

// ===================================================================
// Profile photo fallback — if the file is ever missing or renamed, fall
// back to the on-brand placeholder graphic instead of a broken image icon.
// ===================================================================
function initProfilePhotoFallback() {
  const profilePhoto = document.getElementById('profile-photo');
  if (!profilePhoto) return;

  const useFallback = () => {
    profilePhoto.src = 'assets/images/profile-placeholder.svg';
    profilePhoto.alt = 'Placeholder portrait — add a photo to assets/images to replace it';
    profilePhoto.classList.add('about__intro-photo-img--placeholder');
  };

  // the image may already have failed before this script ran
  if (profilePhoto.complete && profilePhoto.naturalWidth === 0 && profilePhoto.currentSrc) {
    useFallback();
    return;
  }
  profilePhoto.addEventListener('error', useFallback, { once: true });
}

// ===================================================================
// Start everything. Each feature initializes on its own: a missing element
// just makes that one feature skip itself (the guard clauses above), and an
// unexpected error in one is still logged to the console in full but can't
// stop the features after it from starting.
// ===================================================================
[
  initFooterYear,
  initMobileMenu,
  initScrollSpy,
  initRevealAnimations,
  initHeroGraphic,
  initOffscreenAnimationPause,
  initProfilePhotoFallback,
].forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`[portfolio] ${init.name} failed to start:`, error);
  }
});
