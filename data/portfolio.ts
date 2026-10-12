/**
 * Single source of truth for every piece of personal content on the site.
 * Edit this file to change copy, links, roles, projects or skills.
 */

export type SectionId =
  | "home"
  | "about"
  | "work"
  | "projects"
  | "stack"
  | "contact";

/**
 * Template values that have not been filled in yet look like `{{THIS}}`.
 * Anything that fails this check is left off the page instead of being
 * rendered as a broken link, so fill them in to make them appear.
 */
export const isSet = (value?: string): value is string =>
  !!value && !value.includes("{{");

export const site = {
  name: "Vivek Saha",
  alias: "V!Vi",
  mark: "V!",
  role: "Frontend Software Engineer",
  location: "Bengaluru",
  timeZone: "Asia/Kolkata",
  title: "Vivek Saha — Frontend Software Engineer",
  description:
    "Portfolio of Vivek Saha (V!Vi), a frontend software engineer in Bengaluru building cloud interfaces with React, Next.js and TypeScript.",
  email: "vivek.saha0505@gmail.com",
  resume: "/resume.pdf",
  copyright: "© 2026 Vivek Saha",
  builtWith: "built with Next.js · Three.js · GSAP",
} as const;

export const socials = {
  github: { label: "GitHub", handle: "viveksaha05", href: "https://github.com/viveksaha05" },
  linkedin: {
    label: "LinkedIn",
    handle: "in/viveksaha05",
    href: "https://www.linkedin.com/in/viveksaha05",
  },
} as const;

export const linktree = {
  label: "Linktree",
  href: "{{LINKTREE_URL}}",
};

export const nav: { id: SectionId; index: string; label: string }[] = [
  { id: "home", index: "01", label: "HOME" },
  { id: "about", index: "02", label: "ABOUT" },
  { id: "work", index: "03", label: "WORK" },
  { id: "projects", index: "04", label: "PROJECTS" },
  { id: "stack", index: "05", label: "STACK" },
  { id: "contact", index: "06", label: "CONTACT" },
];

export const loader = {
  command: "> npm run build --vivek",
  success: "✓ compiled successfully",
};

export const hero = {
  label: "// frontend software engineer — bengaluru",
  name: ["VIVEK", "SAHA"],
  tag: { component: "Developer", prop: "stack", value: "React · Next.js · TypeScript" },
  tagline: "crafting interfaces that feel alive",
  primaryCta: { label: "View Work", target: "work" as SectionId },
  secondaryCta: { label: "Résumé", href: site.resume },
};

export type AboutSegment =
  | { type: "text"; value: string }
  | { type: "accent"; value: string }
  | { type: "capsule"; src: string; alt: string; position?: string };

export const about = {
  eyebrow: "02 — about",
  title: "ABOUT",
  accent: "with care",
  paragraph: [
    { type: "text", value: "I build" },
    {
      type: "capsule",
      src: "/capsules/code.svg",
      alt: "A code editor showing a React component",
    },
    { type: "text", value: "interfaces at Akamai, turning complex systems into" },
    {
      type: "capsule",
      src: "/capsules/ui.svg",
      alt: "A dashboard interface with cards and a chart",
    },
    { type: "text", value: "experiences people" },
    { type: "accent", value: "enjoy" },
    { type: "text", value: "using" },
    {
      type: "capsule",
      src: "/vivek.jpg",
      alt: "Portrait of Vivek Saha",
      position: "50% 32%",
    },
    { type: "text", value: "." },
  ] satisfies AboutSegment[],
  portrait: {
    src: "/vivek.jpg",
    alt: "Portrait of Vivek Saha",
    /** Normalised crop of the source photo that the particle portrait samples. */
    crop: { x: 0.24, y: 0, w: 0.52, h: 1 },
  },
  stats: [
    { prefix: "", value: 50, suffix: "K+", label: "DAU served" },
    { prefix: "", value: 35, suffix: "+", label: "features shipped" },
    { prefix: "", value: 65, suffix: "+", label: "bugs closed" },
    { prefix: "~", value: 40, suffix: "%", label: "faster MTTR" },
  ],
};

export type Role = {
  company: string;
  short: string;
  title: string;
  period: string;
  meta: string;
  points: string[];
  stack: string[];
};

export const experience = {
  eyebrow: "03 — experience",
  title: "WORK",
  accent: "shipped",
  backdrop: "EXPERIENCE",
  roles: [
    {
      company: "Akamai Technologies",
      short: "AKAMAI",
      title: "Software Engineer",
      period: "Sep 2026 – Present",
      meta: "Bengaluru · Remote",
      points: [
        "Cloud Experience Engineering team building and evolving Akamai Cloud (formerly Linode)",
        "Cloud application migration and re-platforming frontend workloads onto Akamai Cloud infrastructure",
        "Building cloud-facing apps with React, Next.js, TypeScript; edge computing and cloud architecture",
        "Cross-functional work with backend/infra teams through the Linode → Akamai Cloud transition",
      ],
      stack: ["React", "Next.js", "TypeScript", "Edge", "Cloud"],
    },
    {
      company: "Zopsmart Technology (Zopping)",
      short: "ZOPPING",
      title: "SDE-1",
      period: "Dec 2024 – May 2026",
      meta: "Intern → SDE-1",
      points: [
        "20+ reusable React components for Admin and Storefront platforms serving 50,000+ DAU",
        "20+ REST APIs designed end-to-end with the backend team; production defects cut by 30%",
        "RCA via Grafana logs: recurring UI defects down 25%, MTTR down ~40%",
        "35+ features shipped, 65+ bugs closed, <0.5% post-release defect rate",
        "Re-renders down 20%, TTI down 15–20%, bundle size down ~18%, dev env Dockerised",
      ],
      stack: ["React", "REST", "Grafana", "Docker", "Performance"],
    },
  ] satisfies Role[],
};

export type Contributor = { name: string; avatar: string; linkedin: string };

export type Project = {
  slug: string;
  title: string;
  date: string;
  stack: string[];
  description: string;
  image: string;
  imageAlt: string;
  githubUrl: string;
  /** Leave out (or empty) to hide the "Live" button. */
  liveUrl?: string;
  contributors?: Contributor[];
  /** Featured projects are the ones shown on the home page. */
  featured?: boolean;
};

export const projects = {
  eyebrow: "04 — projects",
  title: "PROJECTS",
  accent: "crafted",
  viewAll: "VIEW ALL PROJECTS →",
  allTitle: "ALL PROJECTS",
  items: [
    {
      slug: "healthcare-saas",
      title: "HealthCare SaaS",
      date: "May 2026",
      stack: ["Next.js 16 (TypeScript)", "Firebase", "Tailwind", "Resend"],
      description:
        "Full-stack healthcare platform: 3-step appointment booking, dual email confirmations (patient + doctor), role-based admin dashboard (doctor management, scheduling, analytics).",
      image: "/projects/healthcare.svg",
      imageAlt:
        "Abstract interface of the HealthCare SaaS booking flow: a three-step stepper, a calendar and doctor cards",
      githubUrl: socials.github.href,
      liveUrl: "",
      featured: true,
    },
    {
      slug: "skyspace",
      title: "SkySpace",
      date: "Nov 2024",
      stack: ["Next.js (TypeScript)", "Appwrite"],
      description:
        "Secure cloud storage inspired by Google Drive: file organisation, folder hierarchies, real-time collaborative sharing; 20+ users, sub-2s loads.",
      image: "/projects/skyspace.svg",
      imageAlt:
        "Abstract interface of SkySpace cloud storage: a folder tree, a grid of files and shared avatars",
      githubUrl: socials.github.href,
      liveUrl: "",
      // Sample contributor: replace the three {{…}} values and it will appear.
      contributors: [
        {
          name: "{{CONTRIBUTOR_NAME}}",
          avatar: "/contributors/{{file}}.jpg",
          linkedin: "{{CONTRIBUTOR_LINKEDIN_URL}}",
        },
      ],
      featured: true,
    },
  ] satisfies Project[],
};

export type StackCategory =
  | "Frontend"
  | "Backend"
  | "Databases"
  | "Testing"
  | "DevOps"
  | "Concepts";

export const stack = {
  eyebrow: "05 — stack",
  title: "STACK",
  accent: "everyday",
  /** Row 1 runs left, row 2 runs right. */
  marquee: [
    {
      label: "// frontend + backend",
      items: [
        "React.js",
        "Next.js",
        "TypeScript",
        "JavaScript (ES6+)",
        "Redux",
        "Tailwind CSS",
        "HTML5",
        "CSS3",
        "Node.js",
        "Express.js",
        "REST APIs",
        "JWT",
        "OAuth",
      ],
    },
    {
      label: "// db · testing · tools",
      items: [
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Firebase",
        "Jest",
        "Vitest",
        "React Testing Library",
        "LaunchDarkly",
        "Git",
        "GitHub",
        "Docker",
        "Grafana",
        "Postman",
        "Jira",
        "Vercel",
        "Netlify",
        "SSR",
        "SSG",
        "Code Splitting",
        "Edge Computing",
      ],
    },
  ],
  groups: [
    {
      name: "Frontend",
      items: [
        "React",
        "Next.js",
        "TypeScript",
        "JavaScript ES6+",
        "Redux",
        "Tailwind",
        "HTML5",
        "CSS3",
      ],
    },
    { name: "Backend", items: ["Node.js", "Express", "REST", "JWT", "OAuth"] },
    { name: "Databases", items: ["PostgreSQL", "MySQL", "MongoDB", "Firebase"] },
    { name: "Testing", items: ["Jest", "Vitest", "RTL", "LaunchDarkly"] },
    {
      name: "DevOps",
      items: ["Git", "Docker", "Grafana", "Postman", "Vercel", "Netlify", "Jira"],
    },
    {
      name: "Concepts",
      items: [
        "SSR",
        "SSG",
        "code splitting",
        "performance optimisation",
        "edge computing",
      ],
    },
  ] satisfies { name: StackCategory; items: string[] }[],
};

export const contact = {
  eyebrow: "06 — contact",
  headline: ["LET'S BUILD", "SOMETHING."],
  accent: "together",
  copied: "copied ✓",
  education: "B.Tech CSE, GIET University Gunupur (2021–2025)",
  quote: {
    text: "Watashi wa kaizoku-ō ni narimasu!",
    /** Shown while the line is hovered. */
    japanese: "私は海賊王になります！",
    attribution: "— Vivek Saha",
    flag: "🏴‍☠️",
  },
};
