import { GitHubIcon, LinkedInIcon } from "@/components/Icons";
import Magnetic from "@/components/Magnetic";
import ThemeToggle from "@/components/ThemeToggle";
import { socials } from "@/data/portfolio";

/** The bottom-left glass capsule: GitHub, LinkedIn, and the theme switch. */
export default function Dock() {
  return (
    <aside className="dock liquid-glass liquid-glass--refract" aria-label="Profiles and theme">
      <Magnetic
        soft
        href={socials.github.href}
        className="dock-item"
        aria-label="GitHub profile (opens in a new tab)"
      >
        <GitHubIcon />
      </Magnetic>
      <Magnetic
        soft
        href={socials.linkedin.href}
        className="dock-item"
        aria-label="LinkedIn profile (opens in a new tab)"
      >
        <LinkedInIcon />
      </Magnetic>
      <span className="dock-rule" aria-hidden="true" />
      <ThemeToggle />
    </aside>
  );
}
