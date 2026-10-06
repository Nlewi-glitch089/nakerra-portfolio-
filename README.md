# Nakerra Lewis — Portfolio

My personal portfolio and freelance website. It's a single-page site that introduces who I am, shows selected projects, lays out the services I offer for client work, and gives visitors a clear way to get in touch.

## Overview

This site exists to do three things:

- Explain, in my own words, how I got into software and what I care about when I build.
- Showcase real projects I've built, with an honest description of my role in each.
- Give small businesses, independent brands, and potential collaborators a clear path to hire me for freelance web work.

It's built to be a long-term site I keep using and updating — not a one-off assignment or program deliverable.

## Features

- Single-page layout with smooth-scrolling navigation between sections, with the current section highlighted in both the desktop nav and the mobile menu
- Interactive hero clock — at rest it shows the current time in Philadelphia; selecting a node (mouse, touch, or keyboard) swings the hand to point at it and tells its story in the panel below
- Subtle scroll-reveal animations, paused decorative loops when off-screen, and full `prefers-reduced-motion` support
- Fully responsive design (mobile, tablet, desktop)
- Selected work section showcasing real projects
- Services section describing the type of freelance/client work I take on
- Experience & skills section with my working principles and technical skills
- Contact section with real, working links (email, GitHub, LinkedIn)
- Accessible markup: semantic HTML and heading structure, visible focus states, `aria-current` / `aria-expanded` state, Escape-to-close mobile menu
- Open Graph / social sharing metadata

## Tech Stack

This is a plain, foundational front-end project — no frameworks, no build tools, no package manager:

- **HTML5** — semantic markup, all content lives directly in `index.html`
- **CSS3** — one stylesheet (`style.css`), organized by section, using CSS custom properties for the color system
- **Vanilla JavaScript** — one script (`script.js`), loaded as a plain classic script (not an ES module, so the site still works when `index.html` is opened directly from disk). Each feature has its own `init…()` function: footer year, mobile menu, scrollspy nav highlighting, scroll-reveal animations, the interactive hero graphic (and its cursor tilt), the Work section's project bench, pausing off-screen animations, and the profile-photo fallback. Each one checks for the elements it needs and quietly skips itself if they're missing, and an unexpected error in one feature is logged to the console without stopping the others.

## Getting Started

There is nothing to install and no terminal commands are required to run this site.

**Option 1 — open directly:**
Double-click `index.html` (or open it from your file explorer) and it will load in your browser.

**Option 2 — Live Server (recommended while editing):**
If you're using VS Code, install the "Live Server" extension, right-click `index.html`, and choose **Open with Live Server**. This gives you auto-reload whenever you save a file.

There is no `npm install`, `npm run dev`, or build step of any kind — edit the files and refresh the page.

## Project Structure

```
index.html            # All page content and structure (single page)
style.css              # All styles: design tokens, layout, and every section
script.js               # All interactivity — one init function per feature (see Tech Stack)
README.md
assets/
  images/               # Favicon and any other images used on the site
```

Every section of the page (Hero, About, Work, Services, Experience, Contact) lives directly in `index.html`, marked off with HTML comments (`<!-- ============ WORK ============ -->`) so it's easy to find and edit.

## Customization

**Your photo** — the photo sits at the top of the About section (the `about__intro` block inside `<!-- ============ ABOUT ============ -->`). Replace `assets/images/Solstice Summit Headshot.JPG` with a new file and update the `<img src>` to match (or overwrite the same filename), and set the `<img>`'s `width`/`height` to the new file's pixel dimensions. If the file is ever missing, it automatically falls back to `assets/images/profile-placeholder.svg` instead of showing a broken image.

**Hero clock nodes** — the nodes are listed in `HERO_NODES` near the top of the hero section of `script.js`: one object per node with its label, panel title/text, color, and `x`/`y` position in the SVG's 420×420 coordinate space. The connector line, label placement, and the angle the hand points to are all calculated from that position, so adding a node means adding one object. Also update the short no-JavaScript fallback list in the hero's panel in `index.html`, which shows the same values as plain text.

**Projects** — find the `<!-- ============ WORK ============ -->` section in `index.html`. The Work section is a "specimen bench": an index of projects beside one featured project at a time. Each project is two pieces: a row in the index (`<a class="bench__index-item" href="#project-…">`) and an `<article class="specimen" id="project-…">` with its surface (preview, summary, facts, live link) and its inside (`.specimen__inside`: what's in it, my part, notes). To add one, copy both, give the article a new `id`, and point the index link's `href` at it — `initWorkBench()` in `script.js` builds the tabs, the "Look inside" toggle, and the "Next" buttons from whatever is there. Without JavaScript, the index links simply jump to each project, with everything visible. Preview images are 1280×800 screenshots in `assets/images/work-*.webp`; keep that size (or update the `<img>`'s `width`/`height`). Smaller earlier projects go in the `.bench__earlier` list.

**Services** — find the `<!-- ============ SERVICES ============ -->` section: a short intro and three steps (`.stage`: Understand, Build, Refine), each a title and one sentence.

**Skills** — find the `<!-- ============ EXPERIENCE & SKILLS ============ -->` section and edit the `.skill-group` blocks.

**Working principles** — in the same Experience section, edit the `.experience__principle` list items ("What I bring to a project").

**Contact links** — find the `<!-- ============ CONTACT ============ -->` section and update the email `mailto:` link (the primary action, `.contact__primary`) and the GitHub/LinkedIn URLs (`.contact__link`).

**Navigation** — the nav links live in the `<header>` at the top of `index.html`, once for the desktop nav and once for the mobile menu — keep both lists in sync. Each link's `href="#id"` must match the `id` on the section it should scroll to. The 900px breakpoint where the mobile menu switches to the inline nav is defined in both `style.css` and `script.js` (`desktopNavQuery`); change them together.

**Sharing preview** — the Open Graph / Twitter `<meta>` tags at the top of `index.html` control how the link looks when shared. Once the live URL and a 1200×630 preview image exist, add `og:url` and `og:image` (both absolute URLs).

**Colors** — all colors are defined once as CSS custom properties at the top of `style.css` (see Design System below). Change a value there and it updates everywhere it's used.

**Copy** — headline, intro text, and section descriptions are plain text directly inside each section's HTML.

## Design System

Colors are defined as CSS custom properties at the top of `style.css` and referenced everywhere else — never hard-coded — so the palette stays centralized.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0A0D13` | Primary page background |
| `--color-surface` | `#141925` | Elevated panels: cards, contact surface |
| `--color-text` | `#E9ECF4` | Headings and high-contrast text |
| `--color-text-muted` | `#A1AAB6` | Body copy, nav, descriptions |
| `--color-text-subtle` | `#697080` | Metadata, small labels, annotations |
| `--color-accent` | `#6C97F2` | Primary buttons, links, active nav state, numbering |
| `--color-accent-deep` | `#5E88D3` | Hover states, secondary accent detail |
| `--color-warm` | `#E6A45E` | Rare emphasis only — small indicator dots, tiny labels |
| `--color-border` | `#2A3140` | Card borders, dividers, structural lines |

The palette is intentionally restrained: dark background, blue as the single primary accent, warm orange reserved for occasional small details. No gradients, no additional hues.

Typography pairs a system sans-serif for body copy and headings with a monospace stack for section numbers, labels, and technical metadata — reinforcing the site's structured, engineering-minded feel.

## Notes

This site is actively maintained as my personal portfolio and freelance site. Project and contact information should stay current — see **Customization** above for where to update it.
