// Brand marks for the stack playground (Simple Icons, CC0). Stack items are free text edited in the
// admin, so they are matched by name; anything not listed here stays a text chip.
import {
  siBun,
  siClaude,
  siClaudecode,
  siDocker,
  siFirebase,
  siFlutter,
  siGithubactions,
  siGooglegemini,
  siLaravel,
  siLinux,
  siModelcontextprotocol,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNginx,
  siPhp,
  siPostgresql,
  siPrisma,
  siProxmox,
  siReact,
  siRedis,
  siTypescript,
  siWireguard,
} from 'simple-icons';

type Icon = { path: string };

const ICONS: Record<string, Icon> = {
  'claude code': siClaudecode,
  claude: siClaude,
  mcp: siModelcontextprotocol,
  'model context protocol': siModelcontextprotocol,
  gemini: siGooglegemini,
  'gemini api': siGooglegemini,
  'google gemini': siGooglegemini,
  typescript: siTypescript,
  php: siPhp,
  react: siReact,
  'next.js': siNextdotjs,
  nextjs: siNextdotjs,
  nestjs: siNestjs,
  laravel: siLaravel,
  flutter: siFlutter,
  bun: siBun,
  postgresql: siPostgresql,
  postgres: siPostgresql,
  mysql: siMysql,
  redis: siRedis,
  prisma: siPrisma,
  firebase: siFirebase,
  linux: siLinux,
  docker: siDocker,
  proxmox: siProxmox,
  'proxmox ve': siProxmox,
  nginx: siNginx,
  wireguard: siWireguard,
  'github actions': siGithubactions,
};

/** The SVG path (24x24 viewBox) for a stack item, or undefined when it has no mark. */
export const techIcon = (name: string): string | undefined => ICONS[name.trim().toLowerCase()]?.path;
