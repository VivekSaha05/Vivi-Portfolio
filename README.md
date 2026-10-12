# Vivek Saha — portfolio

Personal portfolio for Vivek Saha (V!Vi), frontend software engineer.
Next.js (App Router) · TypeScript · Tailwind CSS v4 · Three.js (react-three-fiber, drei, postprocessing) · GSAP (ScrollTrigger, SplitText) · Lenis.

Routes: `/` (the one-page site) and `/projects` (every project).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build
npm run lint
```

Deploys to Vercel as-is. Set `NEXT_PUBLIC_SITE_URL` if you use a custom domain (it feeds the canonical URL and Open Graph tags; on Vercel the production URL is used automatically).

## Edit the content

Everything written on the site lives in [`data/portfolio.ts`](data/portfolio.ts): name, links, hero copy, the About paragraph (including its inline capsules), roles, projects, skills and the closing quote.

### Still to fill in

Values written as `{{LIKE_THIS}}` are unfilled template slots. They are **left off the page** until you replace them (see `isSet()` in the data file), so nothing renders as a broken link.

| Where | What |
| --- | --- |
| `linktree.href` | `{{LINKTREE_URL}}`. Once set, Linktree appears in the Contact section. |
| `projects.items[].contributors` | SkySpace has one sample contributor with `{{CONTRIBUTOR_NAME}}`, `/contributors/{{file}}.jpg`, `{{CONTRIBUTOR_LINKEDIN_URL}}`. Fill all three and put the photo in `public/contributors/`. Without a photo the initials are shown. |
| `projects.items[].liveUrl` | Empty for both projects, so the "Live ↗" button is hidden. |
| `projects.items[].githubUrl` | Points at the GitHub profile; set each to its repository. |
| `public/resume.pdf` | The "Résumé" links. **Not included: add your PDF here.** |
| `public/projects/*.svg` | Generated abstract covers standing in for real screenshots. |

A project shows on the home page when `featured: true`; `/projects` lists all of them.
`npm run art` regenerates the abstract covers and capsule art from `scripts/make-art.mjs`.

## Structure

```
app/          layout (fonts, metadata, theme script, site-wide chrome), page, projects/page,
              favicon + OG image, globals.css
sections/     Hero, About, Experience (+ flip into Projects), ProjectsStack (Projects + Stack and
              the horizontal slide between them), Contact, Footer, AllProjects (/projects)
components/   Loader, Menu, ProgressLine, Dock (GitHub · LinkedIn · theme switch), TransitionOverlay,
              ProjectCard, Quote, EmailLink, Cursor, CursorTrail, Grain, LiquidText, Magnetic, …
components/three/  HeroScene, ParticlePortrait, ProjectCanvas, Tesseract, CanvasShell
shaders/      GLSL: particle portrait, project image (RGB shift + wave), tesseract vertices
hooks/        media queries, in-view, theme colours, magnet, store
lib/          gsap setup, scroll helpers, page transitions, theme, scramble, magnet loop, store
data/         portfolio.ts
assets/fonts/ DM Mono files used to render the favicon and OG image
```

Navigation is the MENU button and its drawer; there is no sidebar. The cursor, grain, menu, progress line, capsule, smooth scroll and the transition overlay are mounted in `app/layout.tsx`, so they persist across route changes. That is what lets `TransitionOverlay` animate a navigation: `navigate()` in `lib/transition.ts` covers the screen, swaps the route underneath, restores the scroll position, then uncovers.

## How the motion is tiered

One set of media conditions (`MQ` in `lib/gsap.ts`, mirrored in `globals.css`) decides what runs:

- **Pinned choreography** (≥360px wide, motion allowed; phones included): About slides over the pinned hero as a card; Work scrolls horizontally (right to left) from vertical scroll, then flips over into Projects; Projects hands off to Stack with a horizontal slide the other way (left to right).
- **Mouse extras** (fine pointer, ≥768px): custom cursor and trail, magnets, drag on Work, refractive hero glass, WebGL project covers. Hover interactions (tesseract notes, the closing quote) switch to tap on touch.
- **Touch**: no Lenis; `ScrollTrigger.normalizeScroll()` handles scrolling so pins do not jump with the mobile address bar. Lower particle count, DPR capped at 1.5.
- **Under 360px, or reduced motion**: no pins. Work becomes stacked cards, transitions become a crossfade, the portrait is a still photo.

Every canvas is loaded with `next/dynamic` (`ssr: false`), mounted only when it nears the viewport, and stops rendering when scrolled away. Theme (dark/light) is stored in `localStorage` and applied by an inline script before first paint.

Note on browsers: refraction inside `backdrop-filter` (the liquid-glass surfaces) needs Chromium. Safari and Firefox get the same glass with blur, saturation and the moving highlight, without the displacement.
