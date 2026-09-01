// ===================================================================
// Footer year
// ===================================================================
document.getElementById('year').textContent = new Date().getFullYear();

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
    target.scrollIntoView({ behavior: 'smooth' });
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
