// Central content for the portfolio. Edit these arrays to update the site.

export const SITE = {
  name: "Sky Zheng",
  role: "Full-Stack Developer",
  email: "sky.zheng2019@gmail.com",
  phone: "816-286-6025",
} as const;

export type Tool = {
  name: string;
  category: "Language" | "Framework" | "Tool" | "Platform";
  description: string;
  /** Path to the brand logo (in /public/logos). */
  logo: string;
};

export const tools: Tool[] = [
  {
    name: "HTML, JavaScript, CSS",
    category: "Language",
    description:
      "The core trio of the web: HTML structures content, CSS styles and lays it out, and JavaScript adds interactivity in the browser.",
    logo: "/logos/html5.svg",
  },
  {
    name: "C",
    category: "Language",
    description:
      "A low-level, compiled systems language. Great for understanding memory, performance, and how software works close to the hardware.",
    logo: "/logos/c.svg",
  },
  {
    name: "Python",
    category: "Language",
    description:
      "A versatile, readable language used here for backend services, scripting, data ingestion, and AI/ML work.",
    logo: "/logos/python.svg",
  },
  {
    name: "React/Next.js",
    category: "Framework",
    description:
      "React is a component-based UI library; Next.js is the full-stack React framework adding routing, server rendering, and APIs.",
    logo: "/logos/react.svg",
  },
  {
    name: "FastAPI",
    category: "Framework",
    description:
      "A modern, high-performance Python web framework for building asynchronous REST APIs with automatic validation and docs.",
    logo: "/logos/fastapi.svg",
  },
  {
    name: "Vite/React Router",
    category: "Framework",
    description:
      "Vite is a fast build tool and dev server; React Router handles client-side navigation for single-page React applications.",
    logo: "/logos/vite.svg",
  },
  {
    name: "Claude Code",
    category: "Tool",
    description:
      "Anthropic's agentic coding tool that runs in the terminal to help plan, write, and refactor code across a codebase.",
    logo: "/logos/claude.svg",
  },
  {
    name: "Docker",
    category: "Tool",
    description:
      "Containerization platform that packages applications and their dependencies so they run consistently across environments.",
    logo: "/logos/docker.svg",
  },
  {
    name: "GitHub Desktop / Git",
    category: "Tool",
    description:
      "Git is the distributed version-control system for tracking changes; GitHub Desktop provides a visual interface for it.",
    logo: "/logos/git.svg",
  },
  {
    name: "Supabase",
    category: "Platform",
    description:
      "An open-source Firebase alternative providing a Postgres database, authentication, storage, and instant APIs.",
    logo: "/logos/supabase.svg",
  },
  {
    name: "Render",
    category: "Platform",
    description:
      "A cloud platform for deploying and hosting web services, APIs, and background workers with managed infrastructure.",
    logo: "/logos/render.svg",
  },
  {
    name: "Vercel",
    category: "Platform",
    description:
      "The deployment platform built by the creators of Next.js, offering fast global hosting and CI/CD for frontend apps.",
    logo: "/logos/vercel.svg",
  },
];

export type Project = {
  title: string;
  org: string;
  description: string;
  stack: string[];
  /** Optional screenshot/preview image (in /public/projects). Falls back to a placeholder. */
  image?: string;
};

export const projects: Project[] = [
  {
    title: "Data-Ingestion Backend",
    org: "SC Analytics Zones",
    description:
      "Architected an asynchronous data-ingestion REST API that cleans and transforms data files for Supabase to store, while tracking the development process using Render and Docker.",
    stack: ["FastAPI", "Python", "Supabase", "Docker", "Render"],
  },
  {
    title: "Client Web App",
    org: "SC Analytics Zones",
    description:
      "Developed a bundled application consisting of Vite and React Router with Supabase for authentication and data to implement role-based access (admin vs. client), deployed via Vercel.",
    stack: ["Vite", "React Router", "Supabase", "Vercel"],
  },
  {
    title: "Jaeli Construction Landing Page",
    org: "Jaeli Construction",
    description:
      "Designed and built a responsive marketing website utilizing Next.js and TypeScript, styled with Tailwind CSS for the UI, and Supabase for collecting customer reviews.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
  },
];

export type Experience = {
  title: string;
  org: string;
  period: string;
  points: string[];
};

export const experiences: Experience[] = [
  {
    title: "Camino KC Internship",
    org: "Keystone CoLAB — Kansas City, MO",
    period: "May 2026 – Present",
    points: [
      "Worked as a full-stack developer with another intern to deliver industry-grade software for local KC corporations.",
      "Helped Camino land over 5 figures in revenue through the development of 4 software applications for 3 corporations, including data-ingestion pipeline applications and web applications.",
      "Utilized tools and frameworks: Claude Code, FastAPI, Next.js, Vercel, Supabase, UV, Docker, Render, and Vite.",
    ],
  },
  {
    title: "U.S. Department of Education APEX Program",
    org: "AI Prepared Experimental Micro-Credential — U.S. Dept. of Education & dSAIC",
    period: "Feb. 2026 – May 2026",
    points: [
      "Completed the APEX (AI Prepared Experimental) micro-credential.",
      "6 classes from UMKC, Mizzou, UMSL, and Missouri S&T faculty covering: Fundamentals of AI/ML/LLM; Unsupervised Machine Learning (Network Modeling & Clustering); Automation of AI-based App Development on the Cloud; Natural Language Processing; Deep Learning for Real-life Applications; and Large Language Models.",
    ],
  },
  {
    title: "Web Development PLA",
    org: "University of Missouri — Columbia",
    period: "Jan. 2026 – May 2026",
    points: [
      "Helped students during office hours with web-development projects and homework, drawing on my expertise in web development and software engineering.",
      "Graded student assignments.",
    ],
  },
  {
    title: "Undergraduate Research with Dr. Ekincan Ufuktepe",
    org: "University of Missouri — Columbia",
    period: "Fall 2026 (Upcoming)",
    points: [
      "Conducting research on AI and software-integration performance and measuring the value of software.",
    ],
  },
  {
    title: "MUVR — Mizzou VR Hackathon",
    org: "TigerHacks, University of Missouri",
    period: "Spring 2025",
    points: [
      "Participated in TigerHacks, Mizzou's largest student-run hackathon, which featured XR technology and Unity for game creation.",
    ],
  },
];
