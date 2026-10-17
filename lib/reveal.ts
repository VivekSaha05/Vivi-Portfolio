import { gsap } from "@/lib/gsap";

/**
 * Entrance for project cards, shared by the home page and /projects.
 * Call inside a gsap.context()/matchMedia() scoped to the list:
 *  - the cover wipes open from the bottom with a clip-path,
 *  - the image inside drifts against the scroll (parallax),
 *  - the glass info panel rises in.
 */
export function revealProjectCards() {
  gsap.utils.toArray<HTMLElement>(".project-media").forEach((media) => {
    gsap.fromTo(
      media,
      { clipPath: "inset(100% 0% 0% 0% round 28px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 28px)",
        duration: 1.3,
        ease: "expo.out",
        scrollTrigger: { trigger: media, start: "top 88%", once: true },
      },
    );
    const inner = media.querySelector<HTMLElement>(".project-media-inner");
    if (inner) {
      gsap.fromTo(
        inner,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    }
  });

  gsap.utils.toArray<HTMLElement>(".project-info").forEach((info) => {
    gsap.from(info, {
      autoAlpha: 0,
      y: 50,
      duration: 1.1,
      ease: "expo.out",
      scrollTrigger: { trigger: info, start: "top 92%", once: true },
    });
  });
}

/**
 * Entrance for cards that replace others in place (the /projects category
 * switch): they rise and fade in one after another, with the same cover
 * parallax as above. Call inside a gsap.context()/matchMedia() scoped to the list.
 */
export function enterProjectCards() {
  gsap.fromTo(
    ".project-card",
    { autoAlpha: 0, y: 60 },
    { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12, clearProps: "transform" },
  );
  gsap.utils.toArray<HTMLElement>(".project-media").forEach((media) => {
    const inner = media.querySelector<HTMLElement>(".project-media-inner");
    if (!inner) return;
    gsap.fromTo(
      inner,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  });
}

/** Exit for the cards being replaced: a staggered wipe upward. */
export function exitProjectCards(targets: Element[], onComplete: () => void) {
  return gsap.to(targets, {
    clipPath: "inset(0% 0% 100% 0%)",
    autoAlpha: 0,
    y: -24,
    duration: 0.55,
    ease: "power3.in",
    stagger: 0.08,
    onComplete,
  });
}
