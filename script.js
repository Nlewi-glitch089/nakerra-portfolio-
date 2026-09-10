// ===================================================================
// Footer year
// ===================================================================
document.getElementById('year').textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// ===================================================================
// Mobile navigation menu
// ===================================================================
const menuBtn = document.getElementById('menu-btn');
const mobileNav = document.getElementById('mobile-nav');

function closeMobileMenu({ instant } = {}) {
  if (instant) {
    // Skip the collapse animation so the layout height updates immediately —
    // otherwise the scroll target below is measured before the menu has
    // actually collapsed, and the page lands in the wrong spot.
    mobileNav.style.transition = 'none';
  }
  mobileNav.classList.remove('is-open');
  if (instant) {
    mobileNav.offsetHeight; // force a reflow so the collapse applies now
    mobileNav.style.transition = '';
  }
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Open menu');
}

function toggleMobileMenu() {
  const isOpen = mobileNav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

menuBtn.addEventListener('click', toggleMobileMenu);

// Close the mobile menu whenever a link inside it is clicked, then jump to the
// target section ourselves — letting the browser's own anchor scroll run at
// the same time as the menu's collapse animation causes it to land in the
// wrong place, since the header's height is still changing mid-scroll.
document.querySelectorAll('.mobile-nav-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    event.preventDefault();
    closeMobileMenu({ instant: true });
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
});

// ===================================================================
// Highlight the current section in the nav while scrolling
// ===================================================================
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function setActiveLink(id) {
  navLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', isMatch);
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

// ===================================================================
// Scroll-reveal — fades/slides elements in as they enter the viewport.
// Progressive enhancement: the `no-js` class (removed by an inline
// head script before first paint) keeps everything visible if this
// file never runs, and prefers-reduced-motion skips the effect too.
// ===================================================================
const revealEls = document.querySelectorAll('[data-reveal]');

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('is-revealed'));
} else {
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
const heroGraphic = document.querySelector('.hero__graphic');
const heroFrame = document.querySelector('.hero__graphic-frame');
const technicalGraphic = document.querySelector('.technical-graphic');
const graphicNodes = [...document.querySelectorAll('.technical-graphic__node')];
const graphicConnectors = [...document.querySelectorAll('.technical-graphic__connector')];
const graphicPanel = document.querySelector('.hero__graphic-panel');
const panelTitle = document.querySelector('[data-panel-title]');
const panelText = document.querySelector('[data-panel-text]');

const PANEL_DEFAULT_TITLE = 'Explore';
const PANEL_DEFAULT_TEXT = 'Click or tap a node to explore.';

let activeIndex = null;

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

  // Brief crossfade so switching between nodes reads as a smooth transition
  // rather than a jump cut; skipped entirely under reduced motion.
  if (prefersReducedMotion || !graphicPanel) {
    applyContent();
    return;
  }
  graphicPanel.classList.add('is-transitioning');
  window.setTimeout(() => {
    applyContent();
    graphicPanel.classList.remove('is-transitioning');
  }, 150);
}

function setActiveIndex(index) {
  activeIndex = index;
  graphicNodes.forEach((node, i) => node.classList.toggle('is-active', i === index));
  graphicConnectors.forEach((line, i) => line.classList.toggle('is-active', i === index));
  if (technicalGraphic) {
    technicalGraphic.classList.toggle('has-active', index !== null);
  }
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
if (heroGraphic) {
  heroGraphic.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.technical-graphic__node')) {
      setActiveIndex(null);
    }
  });
}

// subtle cursor-driven parallax tilt — desktop, fine-pointer devices only
const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (heroFrame && supportsHover && !prefersReducedMotion) {
  let rafId = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

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

  heroGraphic.style.perspective = '600px';

  heroGraphic.addEventListener('pointermove', (event) => {
    const rect = heroGraphic.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    targetX = relX * 14;
    targetY = relY * -14;
    queueTilt();
  });

  heroGraphic.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    queueTilt();
  });
}

// ===================================================================
// Profile photo fallback — if the file is ever missing or renamed, fall
// back to the on-brand placeholder graphic instead of a broken image icon.
// ===================================================================
const profilePhoto = document.getElementById('profile-photo');
if (profilePhoto) {
  profilePhoto.addEventListener(
    'error',
    () => {
      profilePhoto.src = 'assets/images/profile-placeholder.svg';
      profilePhoto.alt = 'Placeholder portrait — add a photo to assets/images to replace it';
      profilePhoto.classList.add('about__intro-photo-img--placeholder');
    },
    { once: true }
  );
}
