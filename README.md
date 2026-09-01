# Nakerra Lewis — Portfolio

My personal portfolio and freelance website. It's a single-page site that introduces who I am, shows selected projects, lays out the services I offer for client work, and gives visitors a clear way to get in touch.

## Overview

This site exists to do three things:

- Explain, in my own words, how I got into software and what I care about when I build.
- Showcase real projects I've built, with an honest description of my role in each.
- Give small businesses, independent brands, and potential collaborators a clear path to hire me for freelance web work.

It's built to be a long-term site I keep using and updating — not a one-off assignment or program deliverable.

## Features

- Single-page layout with smooth-scrolling navigation between sections
- Fully responsive design (mobile, tablet, desktop)
- Selected work section showcasing real projects
- Services section describing the type of freelance/client work I take on
- Experience & skills section with my working principles and technical skills
- Contact section with real, working links (email, GitHub, LinkedIn)
- Accessible markup: semantic HTML, visible focus states, reduced-motion support

## Tech Stack

This is a plain, foundational front-end project — no frameworks, no build tools, no package manager:

- **HTML5** — semantic markup, all content lives directly in `index.html`
- **CSS3** — one stylesheet (`style.css`), organized by section, using CSS custom properties for the color system
- **Vanilla JavaScript** — one script (`script.js`) for the mobile menu, scroll-based nav highlighting, and the footer year

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
script.js               # Mobile menu, scroll-spy nav highlighting, footer year
README.md
assets/
  images/               # Favicon and any other images used on the site
```

Every section of the page (Hero, About, Work, Services, Experience, Contact) lives directly in `index.html`, marked off with HTML comments (`<!-- ============ WORK ============ -->`) so it's easy to find and edit.

## Customization

**Projects** — find the `<!-- ============ WORK ============ -->` section in `index.html`. Each project is an `<article class="work-card">` block — copy one, edit the name/description/role/tags, and add a link if the project has a live URL or repo.

**Services** — find the `<!-- ============ SERVICES ============ -->` section. Each service is an `<article class="service-card">` block.

**Skills** — find the `<!-- ============ EXPERIENCE & SKILLS ============ -->` section and edit the `.skill-group` blocks.

**Working principles** — in the same Experience section, edit the `.experience__principle` list items ("What I bring to a project").

**Contact links** — find the `<!-- ============ CONTACT ============ -->` section and update the email `mailto:` link and the GitHub/LinkedIn URLs.

**Navigation** — the nav links live in the `<header>` at the top of `index.html`. Each link's `href="#id"` must match the `id` on the section it should scroll to.

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
