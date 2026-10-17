import type { CSSProperties, ComponentType, SVGProps } from "react";
import {
  Database,
  FileCode,
  FlaskConical,
  Flag,
  Gauge,
  Globe,
  KeyRound,
  Lightbulb,
  Monitor,
  Network,
  Server,
  Split,
  Wrench,
} from "lucide-react";
import {
  SiCss,
  SiDocker,
  SiExpress,
  SiFirebase,
  SiGit,
  SiGrafana,
  SiHtml5,
  SiJavascript,
  SiJest,
  SiJira,
  SiJsonwebtokens,
  SiMongodb,
  SiMysql,
  SiNetlify,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiPostman,
  SiReact,
  SiRedux,
  SiTailwindcss,
  SiTestinglibrary,
  SiTypescript,
  SiVercel,
  SiVitest,
} from "react-icons/si";
import type { StackCategory } from "@/data/portfolio";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

/**
 * `color` is the official brand colour, shown on hover. `light` overrides it
 * on the light theme where the brand colour is too pale to read. Brands whose
 * colour is black (Next.js, Vercel, Express, JWT) use the text colour instead,
 * so they never vanish on the dark theme.
 */
type Brand = { icon: Icon; color: string; light?: string };

const TEXT = "var(--text)";
const ACCENT = "var(--violet)";

const TECH: Record<string, Brand> = {
  React: { icon: SiReact, color: "#61DAFB", light: "#087EA4" },
  "Next.js": { icon: SiNextdotjs, color: TEXT },
  TypeScript: { icon: SiTypescript, color: "#3178C6" },
  "JavaScript ES6+": { icon: SiJavascript, color: "#F7DF1E", light: "#9E8700" },
  Redux: { icon: SiRedux, color: "#764ABC" },
  Tailwind: { icon: SiTailwindcss, color: "#06B6D4", light: "#0891B2" },
  HTML5: { icon: SiHtml5, color: "#E34F26" },
  CSS3: { icon: SiCss, color: "#663399" },
  "Node.js": { icon: SiNodedotjs, color: "#5FA04E" },
  Express: { icon: SiExpress, color: TEXT },
  REST: { icon: Network, color: ACCENT },
  JWT: { icon: SiJsonwebtokens, color: TEXT },
  OAuth: { icon: KeyRound, color: ACCENT },
  PostgreSQL: { icon: SiPostgresql, color: "#4169E1" },
  MySQL: { icon: SiMysql, color: "#4479A1" },
  MongoDB: { icon: SiMongodb, color: "#47A248" },
  Firebase: { icon: SiFirebase, color: "#DD2C00" },
  Jest: { icon: SiJest, color: "#C21325" },
  Vitest: { icon: SiVitest, color: "#6E9F18" },
  RTL: { icon: SiTestinglibrary, color: "#E33332" },
  // Not in Simple Icons: a flag (it's a feature-flag service) in its brand blue.
  LaunchDarkly: { icon: Flag, color: "#405BFF" },
  Git: { icon: SiGit, color: "#F05032" },
  Docker: { icon: SiDocker, color: "#2496ED" },
  Grafana: { icon: SiGrafana, color: "#F46800" },
  Postman: { icon: SiPostman, color: "#FF6C37" },
  Vercel: { icon: SiVercel, color: TEXT },
  Netlify: { icon: SiNetlify, color: "#00C7B7", light: "#00897B" },
  Jira: { icon: SiJira, color: "#0052CC" },
  SSR: { icon: Server, color: ACCENT },
  SSG: { icon: FileCode, color: ACCENT },
  "code splitting": { icon: Split, color: ACCENT },
  "performance optimisation": { icon: Gauge, color: ACCENT },
  "edge computing": { icon: Globe, color: ACCENT },
  "Unit testing": { icon: FlaskConical, color: ACCENT },
  "Regression testing": { icon: FlaskConical, color: ACCENT },
};

const GROUPS: Record<StackCategory, Icon> = {
  Frontend: Monitor,
  Backend: Server,
  Databases: Database,
  Testing: FlaskConical,
  DevOps: Wrench,
  Concepts: Lightbulb,
};

const SIZE = 14;

/** The small icon before a tech capsule's label. Decorative: the label is the name. */
export function TechIcon({ name }: { name: string }) {
  const brand = TECH[name];
  if (!brand) return null;
  const { icon: Glyph, color, light } = brand;
  const style = { "--brand": color, "--brand-light": light ?? color } as CSSProperties;
  return (
    <span className="tech-icon" style={style} aria-hidden="true">
      <Glyph size={SIZE} width={SIZE} height={SIZE} focusable="false" />
    </span>
  );
}

/** The matching line icon for a skill-group heading. */
export function GroupIcon({ name }: { name: StackCategory }) {
  const Glyph = GROUPS[name];
  return (
    <span className="group-icon" aria-hidden="true">
      <Glyph size={SIZE} width={SIZE} height={SIZE} strokeWidth={1.6} focusable="false" />
    </span>
  );
}
