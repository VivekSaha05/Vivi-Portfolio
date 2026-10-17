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
  handle: "linktr.ee/viveksaha",
  href: "https://linktr.ee/viveksaha",
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

/** Icon names understood by components/Icons.tsx `<Glyph />`. */
export type GlyphName =
  | "play"
  | "code"
  | "badge"
  | "trophy"
  | "blocks"
  | "search"
  | "team"
  | "smile";

/**
 * The About lead: revealed word by word on scroll. The accent is set in the
 * cursive face. Typed wide so capsule segments stay usable (the loader
 * preloads any capsule images).
 */
const aboutLead: AboutSegment[] = [
  {
    type: "text",
    value: "Software Engineer at Akamai, building React & Next.js interfaces that",
  },
  { type: "accent", value: "ship fast" },
  {
    type: "text",
    value:
      "and hold up under real traffic. Previously scaled admin and storefront platforms at Zopping for 50K+ daily users.",
  },
];

export const about = {
  eyebrow: "// about me",
  title: "ABOUT",
  accent: "with care",
  /** Small outlined capsules under the title; they stagger in and flood on hover. */
  tags: [
    "Frontend Engineer",
    "React & Next.js",
    "Scalable Frontend Architecture",
    "Micro-Frontends",
    "Performance & Bundle Optimization",
  ],
  paragraph: aboutLead,
  portrait: {
    src: "/vivek.jpg",
    alt: "Portrait of Vivek Saha",
    /** Normalised crop of the source photo that the particle portrait samples. */
    crop: { x: 0.24, y: 0, w: 0.52, h: 1 },
  },
  /** Impact numbers. `value` is what counts up; prefix/suffix decode around it. */
  stats: [
    { prefix: "15–", value: 20, suffix: "%", label: "faster time-to-interactive" },
    { prefix: "~", value: 18, suffix: "%", label: "smaller bundle size" },
    { prefix: "", value: 20, suffix: "%", label: "fewer unnecessary re-renders" },
    { prefix: "", value: 25, suffix: "%", label: "fewer recurring UI defects" },
  ],
  belief: {
    before: "The best component is the one you ",
    accent: "don't have to rewrite",
    after: ".",
    attribution: "— my one rule of frontend",
  },
  factsLabel: "// quick facts",
  facts: [
    { label: "origin", value: "Odisha, India" },
    { label: "based in", value: "Bengaluru" },
    { label: "languages", value: "Hindi (native) · English (fluent)" },
    {
      label: "off-screen",
      value: "gym & powerlifting · anime · gaming · music · YouTube (tech + travel vlogs)",
    },
  ],
  educationLabel: "// education",
  education: [
    { period: "2021 – 2025", title: "B.Tech in CSE", school: "GIET University, Gunupur" },
    {
      period: "2019 – 2021",
      title: "Intermediate",
      school: "Madnawati Public School, Sambalpur",
    },
    {
      period: "2006 – 2019",
      title: "Matriculation",
      school: "Sri Satya Sai Kiddies Abode, Burla",
    },
  ],
  activitiesLabel: "// beyond work",
  activities: [
    {
      icon: "play",
      label: "Tech + Travel YouTube channel",
      meta: "2021 – present",
      href: "{{YOUTUBE_URL}}",
    },
    {
      icon: "code",
      label: "Core Member, WebEye: Web Development Club, GIETU",
      meta: "2022 – 2025",
    },
    { icon: "badge", label: "5★ Gold Badge, 30 Days of C", meta: "HackerRank" },
    {
      icon: "trophy",
      label: "Winner of multiple college & district powerlifting competitions",
    },
  ] satisfies { icon: GlyphName; label: string; meta?: string; href?: string }[],
  connectLabel: "// let's talk",
  connect: [
    { label: "LinkedIn DM", href: socials.linkedin.href },
    { label: site.email, href: `mailto:${site.email}` },
    { label: linktree.handle, href: linktree.href },
  ],
};

export type Role = {
  company: string;
  short: string;
  /**
   * Logo files to try, in order. Each one that fails to load falls through to
   * the next; if none load, a capsule with `initials` is shown instead.
   */
  logos: string[];
  initials: string;
  title: string;
  team?: string;
  period: string;
  location: string;
  /** Date shown on the violet timeline beside this panel. */
  marker: string;
  /** Optional "Responsibilities" paragraph; `points` then become "Highlights". */
  summary?: string;
  points: string[];
  stack: string[];
};

export const experience = {
  eyebrow: "03 — experience",
  title: "MY EXPERIENCE",
  subline:
    "From bug-slaying to feature-wrangling, here's the epic saga of my developer journey so far.",
  expertise: ["Frontend Development · React & Next.js", "Full-Stack Development · MERN"],
  backdrop: "EXPERIENCE",
  summaryLabel: "Responsibilities",
  pointsLabel: "Highlights",
  /** Newest first: panels run left to right in this order. */
  roles: [
    {
      company: "Akamai Technologies",
      short: "AKAMAI",
      logos: ["/logos/akamai.svg"],
      initials: "AK",
      title: "Software Engineer",
      team: "Cloud Experience Engineering",
      period: "Sep 2026 – Present",
      location: "Bengaluru (Remote)",
      marker: "Sep '26",
      points: [
        "Part of the team building and evolving Akamai Cloud (formerly Linode)",
        "Cloud application migration and re-platforming frontend workloads onto Akamai Cloud infrastructure",
        "Building cloud-facing applications with React, Next.js, JavaScript, and TypeScript; contributing to cloud architecture and edge computing capabilities",
        "Collaborating with backend and infrastructure teams on reliability and consistent UX through the Linode → Akamai Cloud transition",
      ],
      stack: ["React", "Next.js", "TypeScript", "Edge", "Cloud"],
    },
    {
      company: "Zopping",
      short: "ZOPPING",
      logos: ["/logos/zopping.svg"],
      initials: "ZP",
      title: "SDE 1 (Frontend)",
      period: "Sep 2025 – May 2026",
      location: "Bengaluru, KA",
      marker: "May '25",
      summary:
        "Worked on the Zopping admin dashboard and the consumer (storefront) team, contributing bug fixes, enhancements, and new features.",
      points: [
        "Built and maintained 20+ reusable React components for Admin and Storefront, serving 50,000+ daily active users",
        "Designed 20+ REST API contracts end-to-end with backend; unit and regression testing cut production defects by 30%",
        "Grafana-based RCA reduced recurring UI defects by 25% and mean time to resolution by ~40%",
        "Shipped 35+ features and closed 65+ bugs with a <0.5% post-release defect rate",
        "Cut re-renders by 20%, TTI by 15–20%, and bundle size by ~18%; Dockerised the dev environment",
        "Collaborated cross-functionally to deliver seamless experiences across multiple modules",
      ],
      stack: ["React", "REST", "Grafana", "Docker", "Performance"],
    },
    {
      company: "ZopSmart",
      short: "ZOPSMART",
      logos: ["/logos/zopsmart.svg", "/logos/zopping.svg"],
      initials: "ZS",
      title: "SDE Intern (Frontend)",
      period: "Dec 2024 – Feb 2025",
      location: "Bengaluru, KA",
      marker: "Dec '24",
      summary:
        "Contributed to the Zopping admin dashboard, focusing on bug fixes, minor enhancements, and learning best practices in large-scale frontend systems.",
      points: [
        "Adapted quickly to the team's workflow, tools, and codebase",
        "Built 8+ reusable UI components and integrated 5+ REST APIs, reducing component duplication by ~30% and data-sync errors by ~20%",
        "Gained hands-on experience with production-scale React/Next.js applications under mentorship",
      ],
      stack: ["React", "Next.js", "REST"],
    },
  ] satisfies Role[],
  closing: {
    title: "What I bring on board",
    subline: "Skills, sarcasm, and clean code, mostly in that order.",
    cards: [
      { icon: "blocks", text: "Build smart, clean, and scalable solutions" },
      { icon: "search", text: "Debug like a detective (with better coffee)" },
      { icon: "team", text: "Team up, level up, and keep the vibe fun" },
      {
        icon: "smile",
        text: "Always ready to debug, and maybe crack a few jokes in the process",
      },
    ] satisfies { icon: GlyphName; text: string }[],
  },
};

export type Contributor = { name: string; avatar: string; linkedin: string };

export type ProjectCategory = "professional" | "personal";

/**
 * Not yet assigned. Allowed so the site keeps building while you sort the
 * projects, but an unassigned project is listed under neither tab on
 * /projects. Replace it with "professional" or "personal".
 */
type UnassignedCategory = "{{professional|personal}}";

export type Project = {
  slug: string;
  title: string;
  /** `{{…}}` hides the date. */
  date: string;
  /** `{{…}}` entries are left out. */
  stack: string[];
  description: string;
  image: string;
  imageAlt: string;
  /** `{{…}}` hides the GitHub button. */
  githubUrl: string;
  /** Leave out (or empty) to hide the "Live" button. */
  liveUrl?: string;
  contributors?: Contributor[];
  /** Required: which tab it is listed under on /projects. */
  category: ProjectCategory | UnassignedCategory;
  /** Featured projects are the ones shown on the home page, whatever their category. */
  featured?: boolean;
};

export const projects = {
  eyebrow: "04 — projects",
  title: "PROJECTS",
  accent: "crafted",
  viewAll: "VIEW ALL PROJECTS →",
  allTitle: "ALL PROJECTS",
  /** Tabs on /projects, in order. The first one is the default. */
  categories: [
    { id: "professional", label: "PROFESSIONAL" },
    { id: "personal", label: "PERSONAL" },
  ] satisfies { id: ProjectCategory; label: string }[],
  empty: "// shipping soon",
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
      category: "{{professional|personal}}",
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
      category: "{{professional|personal}}",
      featured: true,
    },
    {
      slug: "shrujan",
      title: "Shrujan 2.0",
      date: "{{DATE}}",
      stack: ["{{STACK}}"],
      description: "University fest platform serving 6,000+ users with zero downtime.",
      image: "/projects/shrujan.svg",
      imageAlt:
        "Abstract interface of the Shrujan 2.0 fest platform: an event schedule, a countdown and a live attendee counter",
      githubUrl: "{{URL}}",
      liveUrl: "{{URL}}",
      category: "{{professional|personal}}",
    },
    {
      slug: "projectswithmani",
      title: "ProjectsWithMani",
      date: "{{DATE}}",
      stack: ["{{STACK}}"],
      description: "E-commerce platform built for a YouTube creator.",
      image: "/projects/projectswithmani.svg",
      imageAlt:
        "Abstract interface of the ProjectsWithMani storefront: a product grid, a video banner and a cart",
      githubUrl: "{{URL}}",
      liveUrl: "{{URL}}",
      category: "{{professional|personal}}",
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
        "Next.js (TypeScript)",
        "JavaScript ES6+ (React.js)",
        "Redux Toolkit",
        "Tailwind CSS",
        "HTML5",
        "CSS3",
        "Node.js + Express (REST APIs)",
        "JWT",
        "OAuth",
      ],
    },
    {
      label: "// db · testing · tools",
      items: [
        "MongoDB",
        "MySQL",
        "PostgreSQL",
        "Firebase (Auth & Firestore)",
        "Jest",
        "React Testing Library",
        "Vitest",
        "LaunchDarkly",
        "Git",
        "GitHub",
        "Docker",
        "Grafana",
        "Postman",
        "Jira",
        "Vercel",
        "Netlify",
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
