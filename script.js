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
// Hero graphic — node content
//
// One object per node on the clock. `x` / `y` are the node's position in
// the SVG's own 420×420 viewBox — the same units as the rings and ticks in
// index.html. Everything else about a node's drawing is derived from that
// position: its connector line, where its label sits, and the angle the
// minute hand swings to when it's selected.
//
//   id             unique; used to build element ids
//   label          short mono label shown on hover / focus / selection
//   title, text    the story shown in the panel when the node is selected
//   tone           dot color: 'accent' or 'warm' (warm stays on one node)
//   connectorTone  connector line color: 'accent', 'warm' or 'border'
//
// Array order is the Tab and arrow-key order, so keep it running clockwise.
// To add a node, add one object here — plus its line in the no-JS fallback
// list in index.html, which mirrors this content for visitors without JS.
// ===================================================================
const HERO_NODES = [
  {
    id: 'curiosity',
    label: 'curiosity',
    title: 'Curiosity',
    text: 'Always starting with “how does this work?”',
    x: 120,
    y: 130,
    tone: 'warm',
    connectorTone: 'warm',
  },
  {
    id: 'design',
    label: 'design',
    title: 'Design',
    text: 'Good software should make sense.',
    x: 300,
    y: 160,
    tone: 'accent',
    connectorTone: 'accent',
  },
  {
    id: 'intention',
    label: 'intention',
    title: 'Intention',
    text: "If something works simply, I don't see a reason to complicate it.",
    x: 150,
    y: 300,
    tone: 'accent',
    connectorTone: 'border',
  },
];

// The clock always shows Philadelphia time, whatever the visitor's own zone.
const CLOCK_TIME_ZONE = 'America/New_York';

// ===================================================================
// Clock geometry
// ===================================================================

// The clock-face angle of a direction in SVG space, in degrees clockwise
// from 12 o'clock (0–360) — the same convention as the hands' rotation.
//
// Math.atan2(y, x) gives the textbook angle: counter-clockwise from the +x
// axis (3 o'clock), with y pointing up. SVG differs in two ways: its y axis
// points down, and CSS rotate() turns clockwise; clock angles also start at
// 12, not 3. Calling atan2(dx, -dy) covers all of that at once — swapping
// the arguments measures from the vertical axis instead of the horizontal
// one, and negating dy turns SVG's "down" back into "up". Result: straight
// up is 0°, 3 o'clock is 90°, 6 o'clock 180°, 9 o'clock 270°.
function clockAngle(dx, dy) {
  const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

// Where a node's label goes, relative to the node. Not along the node's
// radius — the connector runs inward along it and the pointing hand runs
// outward — but perpendicular to it, on whichever side is higher on the
// clock. Returns an offset in SVG units, plus how to anchor the text at
// that point so it grows away from the node.
function labelPlacement(dx, dy, gap) {
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  // the two perpendiculars to (ux, uy) are (-uy, ux) and (uy, -ux)
  let px = -uy;
  let py = ux;
  if (py > 0 || (py === 0 && px < 0)) {
    px = uy;
    py = -ux;
  }
  return {
    x: px * gap,
    y: py * gap,
    shiftX: px >= 0 ? '0%' : '-100%',
    shiftY: py < 0 ? '-100%' : '0%',
  };
}

// ===================================================================
// Philadelphia time
// ===================================================================

// Returns a function that reads the current time in Philadelphia, or null
// if this browser can't format that time zone. Every reading starts from
// Date.now() — a UTC timestamp — and Intl converts it, so neither the
// visitor's time zone nor a change to it while the page is open matters.
function createPhiladelphiaTimeReader() {
  let partsFormat;
  let labelFormat;
  try {
    partsFormat = new Intl.DateTimeFormat('en-US', {
      timeZone: CLOCK_TIME_ZONE,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    labelFormat = new Intl.DateTimeFormat('en-US', {
      timeZone: CLOCK_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (error) {
    console.warn('[portfolio] Philadelphia time is unavailable here; the clock will stay static.', error);
    return null;
  }

  const pad = (n) => String(n).padStart(2, '0');

  return () => {
    const now = Date.now();
    const parts = {};
    partsFormat.formatToParts(now).forEach(({ type, value }) => {
      parts[type] = value;
    });
    // % 24 guards older engines that report midnight as "24" even with h23
    const hours = Number(parts.hour) % 24;
    const minutes = Number(parts.minute);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

    return {
      hours,
      minutes,
      label: labelFormat.format(now),
      datetime: `${pad(hours)}:${pad(minutes)}`,
    };
  };
}

// Calls `onTick` just after each minute boundary while the page is visible.
// One timer a minute, not a second: the clock only shows hours and minutes.
// Each tick re-reads the real time instead of counting minutes, so it can't
// drift. A hidden tab clears its timer entirely (background timers are
// throttled and can't be trusted to fire on time) and re-reads the time the
// moment the tab is visible again.
function startMinuteTicker(onTick) {
  let timer = null;

  function schedule() {
    window.clearTimeout(timer);
    if (document.hidden) return;
    // America/New_York is a whole-hour offset from UTC, so its minutes roll
    // over exactly when the UTC timestamp crosses a minute boundary. The extra
    // 50ms makes sure the tick lands just after the boundary, never before it.
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    timer = window.setTimeout(() => {
      onTick();
      schedule();
    }, msUntilNextMinute + 50);
  }

  function resync() {
    onTick();
    schedule();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(timer);
    } else {
      resync();
    }
  });
  // restored from the back/forward cache: the old timer is meaningless
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resync();
  });

  schedule();
}

// ===================================================================
// Hero graphic — the signature interactive instrument
//
// Two states, both rendered from one small state object:
//  - time  (state.activeId === null): the hands show the current time in
//    Philadelphia, and the panel below reads it out.
//  - node  (state.activeId set): the minute hand swings to point at the
//    selected node, its connector lights up, and the panel tells its story.
//
// Nodes are HTML <button>s generated from HERO_NODES and laid over the
// decorative SVG. Hover/focus previews a node's label (pure CSS); click,
// tap, Enter or Space selects it; selecting it again, Escape, or "Back to
// clock" returns to the time. Arrow keys move focus around the nodes.
// All motion is skipped under prefers-reduced-motion.
// ===================================================================
function initHeroGraphic() {
  const heroGraphic = document.querySelector('.hero__graphic');
  if (!heroGraphic) return;

  const find = (selector) => heroGraphic.querySelector(selector);
  const heroFrame = find('.hero__graphic-frame');
  const technicalGraphic = find('.technical-graphic');
  const minuteHandEl = find('[data-hand="minute"]');
  const hourHandEl = find('[data-hand="hour"]');
  const connectorGroup = find('[data-hero-connectors]');
  const nodeGroup = find('[data-hero-nodes]');
  const panel = find('#hero-graphic-panel');
  const readout = find('[data-clock-readout]');
  const readoutTitle = find('[data-clock-title]');
  const readoutTime = find('[data-clock-time]');
  const story = find('[data-clock-story]');
  const resetButton = find('[data-clock-reset]');

  const required = [technicalGraphic, minuteHandEl, hourHandEl, connectorGroup, nodeGroup, panel, readout, readoutTitle, story, resetButton];
  if (required.some((el) => !el)) return;

  // ---- geometry, from the SVG's own viewBox ----
  const viewBox = technicalGraphic.viewBox.baseVal;
  if (!viewBox || !viewBox.width || !viewBox.height) return;
  const center = { x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height / 2 };
  nodeGroup.style.setProperty('--clock-size', viewBox.width);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LABEL_GAP = 13; // SVG units between a node's center and its label
  const CONNECTOR_STROKES = {
    accent: 'var(--color-accent)',
    warm: 'var(--color-warm)',
    border: 'var(--color-border)',
  };

  // ---- hands ----
  // Each hand rotates relative to the direction it's drawn in, read from its
  // own line coordinates, so the markup can draw it at any resting angle.
  function createHand(el) {
    const restAngle = clockAngle(
      el.x2.baseVal.value - el.x1.baseVal.value,
      el.y2.baseVal.value - el.y1.baseVal.value
    );
    return { el, restAngle, angle: restAngle };
  }
  const hands = { minute: createHand(minuteHandEl), hour: createHand(hourHandEl) };

  function pointHand(hand, targetAngle) {
    // turn the shorter way round: 350° → 10° is +20°, not −340°. The hand's
    // angle keeps counting past 360 so the CSS transition never spins back.
    const delta = ((((targetAngle - hand.angle) % 360) + 540) % 360) - 180;
    hand.angle += delta;
    hand.el.style.transform = `rotate(${hand.angle - hand.restAngle}deg)`;
  }

  // ---- nodes, rendered from HERO_NODES ----
  const seenIds = new Set();
  const isValidNode = (data) => {
    const ok =
      data &&
      typeof data.id === 'string' &&
      !seenIds.has(data.id) &&
      Number.isFinite(data.x) &&
      Number.isFinite(data.y) &&
      typeof data.label === 'string' &&
      typeof data.title === 'string' &&
      typeof data.text === 'string';
    if (!ok) console.warn('[portfolio] Skipping an invalid or duplicate HERO_NODES entry:', data);
    else seenIds.add(data.id);
    return ok;
  };

  const nodes = HERO_NODES.filter(isValidNode).map((data) => {
    const dx = data.x - center.x;
    const dy = data.y - center.y;

    const connector = document.createElementNS(SVG_NS, 'line');
    connector.setAttribute('class', 'technical-graphic__connector');
    connector.setAttribute('x1', center.x);
    connector.setAttribute('y1', center.y);
    connector.setAttribute('x2', data.x);
    connector.setAttribute('y2', data.y);
    connector.setAttribute('stroke', CONNECTOR_STROKES[data.connectorTone] || CONNECTOR_STROKES.border);
    connector.setAttribute('stroke-width', '1.5');
    connectorGroup.append(connector);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hero__node';
    button.id = `hero-node-${data.id}`;
    button.dataset.tone = data.tone === 'warm' ? 'warm' : 'accent';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panel.id);
    button.style.setProperty('--x', `${((data.x - viewBox.x) / viewBox.width) * 100}%`);
    button.style.setProperty('--y', `${((data.y - viewBox.y) / viewBox.height) * 100}%`);

    const place = labelPlacement(dx, dy, LABEL_GAP);
    button.style.setProperty('--label-x', place.x.toFixed(2));
    button.style.setProperty('--label-y', place.y.toFixed(2));
    button.style.setProperty('--label-shift-x', place.shiftX);
    button.style.setProperty('--label-shift-y', place.shiftY);

    const dot = document.createElement('span');
    dot.className = 'hero__node-dot';
    dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'hero__node-label';
    label.textContent = data.label; // also the button's accessible name

    button.append(dot, label);
    nodeGroup.append(button);

    return { ...data, angle: clockAngle(dx, dy), button, connector };
  });
  if (!nodes.length) return;

  // ---- state ----
  const readTime = createPhiladelphiaTimeReader();
  const state = {
    activeId: null, // null = "time" mode; a node id = "node" mode
    time: readTime ? readTime() : null,
  };
  const activeNode = () => nodes.find((node) => node.id === state.activeId) || null;

  // ---- rendering ----
  // The drawing (cheap; also re-run every minute) and the panel (crossfades,
  // so only re-run when the selection changes) render separately.
  function renderGraphic() {
    const active = activeNode();

    nodes.forEach((node) => {
      const isActive = node === active;
      node.button.classList.toggle('is-active', isActive);
      node.button.setAttribute('aria-expanded', String(isActive));
      node.connector.classList.toggle('is-active', isActive);
    });
    technicalGraphic.classList.toggle('has-active', Boolean(active));

    const { time } = state;
    if (time) {
      pointHand(hands.hour, (time.hours % 12) * 30 + time.minutes * 0.5);
      if (readoutTime) {
        readoutTime.textContent = time.label;
        readoutTime.dateTime = time.datetime;
      }
    }
    if (active) {
      pointHand(hands.minute, active.angle);
    } else if (time) {
      pointHand(hands.minute, time.minutes * 6);
    } else {
      pointHand(hands.minute, hands.minute.restAngle);
    }
  }

  let panelTimer = null;

  function renderPanel({ instant = false } = {}) {
    const active = activeNode();

    const applyContent = () => {
      readout.hidden = Boolean(active);
      resetButton.hidden = !active;
      panel.classList.toggle('has-selection', Boolean(active));

      if (!active) {
        story.replaceChildren();
        return;
      }
      // filling the live region is what announces the story to screen readers
      const title = document.createElement('p');
      title.className = 'hero__graphic-panel-title mono';
      title.textContent = active.title;
      const text = document.createElement('p');
      text.className = 'hero__graphic-panel-text';
      text.textContent = active.text;
      story.replaceChildren(title, text);
    };

    // Cancel any crossfade still in flight, so rapid clicks across several
    // nodes only ever apply the latest selection — instead of a queue of
    // older timers each swapping content and ending the fade early.
    window.clearTimeout(panelTimer);
    panelTimer = null;

    // Brief crossfade so switching between nodes reads as a smooth transition
    // rather than a jump cut; skipped entirely under reduced motion.
    if (instant || reducedMotionQuery.matches) {
      panel.classList.remove('is-transitioning');
      applyContent();
      return;
    }
    panel.classList.add('is-transitioning');
    panelTimer = window.setTimeout(() => {
      panelTimer = null;
      applyContent();
      panel.classList.remove('is-transitioning');
    }, 150);
  }

  function select(id) {
    state.activeId = id;
    renderGraphic();
    renderPanel();
  }

  // Back to time mode. When focus was inside the panel (on the "Back to
  // clock" button, which is about to disappear), hand it back to the node
  // that was open so keyboard users stay where they were.
  function deselect() {
    const active = activeNode();
    if (!active) return;
    if (panel.contains(document.activeElement)) active.button.focus();
    select(null);
  }

  // ---- events ----
  nodes.forEach((node) => {
    // click/tap/Enter/Space all arrive as 'click' on a real <button>;
    // choosing the open node again closes it
    node.button.addEventListener('click', () => {
      select(state.activeId === node.id ? null : node.id);
    });
  });

  // Arrow keys move focus around the clock (wrapping), in HERO_NODES order.
  // They don't select — like hovering, they preview a node's label, and
  // Enter/Space opens it — so focus and selection stay predictable.
  nodeGroup.addEventListener('keydown', (event) => {
    const index = nodes.findIndex((node) => node.button === document.activeElement);
    if (index < 0) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next;
    if (step) next = (index + step + nodes.length) % nodes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = nodes.length - 1;
    else return;
    event.preventDefault();
    nodes[next].button.focus();
  });

  // Escape returns to the clock while the visitor is using it: focus inside
  // the graphic or its panel, or on nothing in particular (Safari doesn't
  // focus buttons on click, so a mouse user's focus is often just <body>).
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || state.activeId === null) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body && !heroGraphic.contains(focused)) return;
    deselect();
  });

  resetButton.addEventListener('click', deselect);

  // ---- first render ----
  if (!readTime) {
    // no time zone support: keep the original resting hint instead of a time
    readoutTitle.textContent = 'Explore';
  }
  find('[data-clock-fallback]')?.remove();
  renderGraphic();
  renderPanel({ instant: true });

  // Hand transitions switch on only after this first pose has been painted,
  // so the hands appear at the right time instead of sweeping there on load.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => technicalGraphic.classList.add('is-ready'));
  });

  if (readTime) {
    startMinuteTicker(() => {
      state.time = readTime();
      renderGraphic();
    });
  }

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
// Work — the "specimen bench"
//
// index.html ships the Work section as plain content: an index of links
// that jump to three full project write-ups, each with its inside already
// showing. That's the no-JavaScript version. This upgrades it:
//  - The index becomes an ARIA tablist showing one project at a time.
//    Arrow keys, Home and End move between projects, like a native tab
//    strip; Tab moves on into the project itself.
//  - Each project's inside (what's in it, my part, notes) folds behind a
//    "Look inside" toggle. Its open/closed state is shared by all the
//    projects, so someone comparing them doesn't have to reopen each one.
//  - A "Next" button at the foot of each project, so on a phone you can
//    go through them without scrolling back up to the index.
// Links to a project's id (#project-…) still work: they select it.
// ===================================================================
function initWorkBench() {
  const bench = document.querySelector('[data-work-bench]');
  if (!bench) return;

  const list = bench.querySelector('[data-bench-index]');
  const projects = Array.from(bench.querySelectorAll('[data-bench-tab]')).map((tab) => {
    const panel = document.getElementById(tab.hash.slice(1));
    return {
      tab,
      panel,
      toggle: panel?.querySelector('[data-bench-toggle]'),
      inside: panel?.querySelector('[data-bench-inside]'),
      code: tab.querySelector('.bench__index-code')?.textContent.trim() || '',
      name: tab.querySelector('.bench__index-name')?.textContent.trim() || '',
    };
  });
  if (!list || !projects.length || projects.some((p) => !p.panel || !p.toggle || !p.inside)) return;

  const state = {
    index: 0,
    insideOpen: false, // closed by default: the surface is the first read
  };

  // ---- tablist semantics on top of the plain list ----
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  Array.from(list.children).forEach((li) => li.setAttribute('role', 'presentation'));

  projects.forEach((project) => {
    project.tab.setAttribute('role', 'tab');
    project.tab.id = `${project.panel.id}-tab`;
    project.tab.setAttribute('aria-controls', project.panel.id);
    // the panel keeps its own aria-labelledby (its <h3>), a shorter name
    // than the tab's, which also includes the code, type and status
    project.panel.setAttribute('role', 'tabpanel');
    project.toggle.hidden = false;
  });

  function render() {
    projects.forEach((project, i) => {
      const isSelected = i === state.index;
      project.tab.setAttribute('aria-selected', String(isSelected));
      project.tab.tabIndex = isSelected ? 0 : -1;
      project.panel.hidden = !isSelected;
      project.toggle.setAttribute('aria-expanded', String(state.insideOpen));
      project.inside.hidden = !state.insideOpen;
    });
  }

  function select(index) {
    state.index = (index + projects.length) % projects.length;
    render();
  }

  // ---- events ----
  projects.forEach((project, i) => {
    project.tab.addEventListener('click', (event) => {
      event.preventDefault(); // select in place, don't jump to the anchor
      select(i);
    });

    project.toggle.addEventListener('click', () => {
      state.insideOpen = !state.insideOpen;
      render();
    });

    // "Next: AP-02 Philly ArtPulse →" at the foot of each project
    const next = projects[(i + 1) % projects.length];
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'specimen__next';
    const parts = [
      ['specimen__next-label mono', 'Next'],
      ['specimen__next-code mono', next.code],
      ['specimen__next-name', next.name],
      ['specimen__next-arrow', '→'],
    ];
    parts.forEach(([className, text]) => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      if (text === '→') span.setAttribute('aria-hidden', 'true');
      nextButton.append(span);
    });
    nextButton.addEventListener('click', () => {
      select(i + 1);
      // Focus moves to the newly selected tab (this button just vanished
      // along with its panel). If the top of the bench has scrolled away,
      // which is the usual case on a phone, bring it back so the new
      // project is read from its start.
      next.tab.focus({ preventScroll: true });
      if (bench.getBoundingClientRect().top < 0) {
        bench.scrollIntoView({ behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
      }
    });
    const foot = document.createElement('div');
    foot.className = 'specimen__foot';
    foot.append(nextButton);
    project.panel.append(foot);
  });

  // Arrow keys select as they move (automatic activation): every panel is
  // already in the page, so there's nothing to wait for.
  list.addEventListener('keydown', (event) => {
    const index = projects.findIndex((p) => p.tab === document.activeElement);
    if (index < 0) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    let next;
    if (step) next = index + step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = projects.length - 1;
    else return;
    event.preventDefault();
    select(next);
    projects[state.index].tab.focus();
  });

  // A link to #project-… (shared, bookmarked, or from elsewhere on the page)
  // selects that project.
  function selectFromHash() {
    const index = projects.findIndex((p) => `#${p.panel.id}` === window.location.hash);
    if (index >= 0) select(index);
  }
  window.addEventListener('hashchange', selectFromHash);

  bench.classList.add('is-enhanced');
  render();
  selectFromHash();
}

// ===================================================================
// Pause off-screen decorative loops — the hero clock's sweep/pulse and the
// About rail's traveling glow run forever, so each
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
  initWorkBench,
  initOffscreenAnimationPause,
  initProfilePhotoFallback,
].forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`[portfolio] ${init.name} failed to start:`, error);
  }
});
