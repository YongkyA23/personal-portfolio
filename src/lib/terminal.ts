import type { Content, Project } from '../content/types';

export interface TermLine {
  t: string;
  c: string;
  href?: string;
  link?: string;
}

export interface TermResult {
  lines: TermLine[];
  clear?: boolean;
  close?: boolean;
  openId?: string;
}

export const PROMPT = 'yongky@portfolio:~$';
const BRIGHT = '#EDEDED';
const DIM = '#A8A8A8';

const HELP = [
  'Commands:',
  '  whoami              who is this',
  '  ls [projects]       list files or projects',
  '  cat <file>          read about.md, stack.md, experience.md, contact.md or a project, e.g. cat empuan.md',
  '  open <project>      open a case study',
  '  neofetch            system info, but it is me',
  '  sudo hire yongky    you know what this does',
  '  clear               clear the screen',
  '  exit                back to the normal site',
];

function findProject(name: string, projects: Project[]): Project | undefined {
  const key = name.replace(/^projects\//, '').replace(/\.md$/, '').toLowerCase();
  return projects.find((p) => p.id === key || p.name.toLowerCase() === key);
}

export function welcome(now = new Date()): TermLine[] {
  return [
    { t: `Last login: ${now.toDateString()} on ttys001`, c: '#8A8A8A' },
    { t: 'Welcome to yongky.portfolio. Type `help` to see what you can do.', c: BRIGHT },
    { t: ' ', c: '#8A8A8A' },
  ];
}

export function completions(content: Content): string[] {
  return [
    'help', 'whoami', 'ls', 'ls projects', 'cat about.md', 'cat stack.md', 'cat experience.md', 'cat contact.md',
    'neofetch', 'sudo hire yongky', 'clear', 'exit',
    ...content.projects.map((p) => `cat ${p.id}.md`),
    ...content.projects.map((p) => `open ${p.id}`),
  ];
}

/** Pure command interpreter: takes what was typed, returns what to print and what to do. */
export function runCommand(raw: string, content: Content): TermResult {
  const { profile, projects } = content;
  const cmd = raw.trim();
  const lines: TermLine[] = [{ t: `${PROMPT} ${cmd}`, c: '#FFFFFF' }];
  const say = (t: string, bright = false) => lines.push({ t, c: bright ? BRIGHT : DIM });
  if (!cmd) return { lines };

  const parts = cmd.split(/\s+/);
  const head = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');
  const strip = (url: string) => url.replace(/^https?:\/\//, '');

  switch (head) {
    case 'help':
      HELP.forEach((line, i) => say(line, i === 0));
      return { lines };
    case 'whoami':
      say(`${profile.name}. ${profile.role} in Jakarta.`, true);
      return { lines };
    case 'ls':
      if (/project/i.test(rest)) say(projects.map((p) => `${p.id}.md`).join('   '), true);
      else say('about.md   experience.md   stack.md   contact.md   projects/', true);
      return { lines };
    case 'cat': {
      const file = rest.toLowerCase();
      if (!file) say('cat: which file? Try `ls`.');
      else if (file === 'about.md' || file === 'about') {
        say('# About', true);
        profile.about.forEach((line) => say(line));
      } else if (file === 'stack.md' || file === 'stack') {
        say('# Stack', true);
        content.stack.forEach((g) => say(`${g.label.toLowerCase()}: ${g.items.join(', ')}`));
      } else if (file === 'experience.md' || file === 'experience') {
        say('# Experience', true);
        content.experience.forEach((e) => say(`${e.when.toLowerCase()}  ${e.role} · ${e.org}`));
      } else if (file === 'contact.md' || file === 'contact') {
        say('# Contact', true);
        lines.push({ t: 'email: ', c: DIM, href: `mailto:${profile.email}`, link: profile.email });
        say(`linkedin: ${strip(profile.linkedin)}`);
        say(`github: ${strip(profile.github)}`);
      } else {
        const p = findProject(file, projects);
        if (p) {
          say(`# ${p.name}`, true);
          say(p.desc);
          say(`stack: ${p.stack.join(', ')}`);
          say(`status: ${p.status.toLowerCase()}${p.url ? `  ·  ${p.url}` : ''}`);
          say(`tip: open ${p.id} for the full case study`);
        } else say(`cat: ${rest}: no such file. Try \`ls\` or \`ls projects\`.`);
      }
      return { lines };
    }
    case 'open': {
      const p = rest ? findProject(rest.toLowerCase(), projects) : undefined;
      if (!p) {
        say('open: unknown project. Try `ls projects`.');
        return { lines };
      }
      say(`opening ${p.name}…`, true);
      return { lines, close: true, openId: p.id };
    }
    case 'neofetch': {
      const live = projects.filter((p) => p.status === 'LIVE').length;
      const internal = projects.filter((p) => p.cat === 'internal').length;
      [
        '  ██╗   ██╗ █████╗     yongky@portfolio',
        '  ╚██╗ ██╔╝██╔══██╗    ----------------',
        `   ╚████╔╝ ███████║    role      ${profile.role}`,
        `    ╚██╔╝  ██╔══██║    location  ${profile.location} (${profile.tz})`,
        '     ██║   ██║  ██║    editor    Claude Code + Codex',
        `     ╚═╝   ╚═╝  ╚═╝    shipped   ${live} live · ${internal} internal`,
        `                       projects  ${projects.length} in ~/projects`,
      ].forEach((line) => say(line, true));
      return { lines };
    }
    case 'sudo':
      if (/^hire\s+yongky\b/i.test(rest)) {
        say('[sudo] password for recruiter: ********');
        say(`checking availability… ${profile.availability.toLowerCase()}`);
        say('permission granted ✓', true);
        lines.push({
          t: 'next step: ',
          c: DIM,
          href: `mailto:${profile.email}?subject=${encodeURIComponent('Let’s build something')}`,
          link: `email ${profile.email}`,
        });
      } else say('Nice try. The only sudo allowed here is `sudo hire yongky`.');
      return { lines };
    case 'clear':
      return { lines: [], clear: true };
    case 'exit':
    case 'quit':
    case 'gui':
      say('bye.');
      return { lines, close: true };
    case 'date':
      say(new Date().toString());
      return { lines };
    case 'echo':
      say(rest, true);
      return { lines };
    default:
      say(`command not found: ${head}. Type \`help\`.`);
      return { lines };
  }
}
