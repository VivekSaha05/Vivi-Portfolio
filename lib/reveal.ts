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
