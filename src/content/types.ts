export type ProjectCategory = 'product' | 'internal' | 'personal';
export type ProjectType = 'web' | 'phone' | 'term';

export interface Project {
  id: string;
  cat: ProjectCategory;
  type: ProjectType;
  name: string;
  kind: string;
  status: string;
  role: string;
  /** Bare host, e.g. "qi-r.me". Empty when the project is not public. */
  url: string;
  desc: string;
  stack: string[];
  built: string[];
  how: string;
  outcome: string[];
  /** Terminal preview lines: [text, 1 for bright / 0 for dim]. */
  lines?: Array<[string, 0 | 1]>;
  /** Full-page screenshot shown scrolling inside the preview frame: a /path in public/ or an https URL. */
  shot?: string;
}

export interface Experience {
  when: string;
  year: string;
  role: string;
  org: string;
  note: string;
}

export interface StackGroup {
  label: string;
  items: string[];
}

export interface Profile {
  name: string;
  initials: string;
  role: string;
  location: string;
  tz: string;
  availability: string;
  email: string;
  linkedin: string;
  github: string;
  cvUrl: string;
  kicker: string;
  headline: [string, string];
  intro: string;
  statement: string;
  contactHeadline: [string, string];
  marquee: [string[], string[]];
  stats: Array<{ value: string; label: string }>;
  secrets: [string, string, string];
  about: string[];
}

export interface Content {
  profile: Profile;
  projects: Project[];
  experience: Experience[];
  stack: StackGroup[];
  answers: Array<{ match: string; text: string }>;
  fallbackAnswer: string;
}
