// Shape check shared by the API (before saving) and the client (before trusting a response).
// Returns an error message, or null when the content is usable.
const isStr = (v) => typeof v === 'string';
const isStrArr = (v) => Array.isArray(v) && v.every(isStr);
const CATS = ['product', 'internal', 'personal'];
const TYPES = ['web', 'phone', 'term'];
// Answer patterns run in every visitor's browser. Groups and repetition (* + {n}) are not allowed,
// so a pattern can never backtrack badly enough to freeze the page.
const SAFE_PATTERN = /^[\p{L}\p{N}\s|.?\\'’!-]+$/u;

export function validateContent(c) {
  if (!c || typeof c !== 'object') return 'content must be an object';
  const p = c.profile;
  if (!p || typeof p !== 'object') return 'profile is missing';
  for (const k of ['name', 'initials', 'role', 'location', 'tz', 'availability', 'email', 'linkedin', 'github', 'cvUrl', 'kicker', 'intro', 'statement']) {
    if (!isStr(p[k])) return `profile.${k} must be a string`;
  }
  for (const k of ['headline', 'contactHeadline']) {
    if (!isStrArr(p[k]) || p[k].length !== 2) return `profile.${k} must be two strings`;
  }
  if (!isStrArr(p.secrets) || p.secrets.length !== 3) return 'profile.secrets must be three strings';
  if (!isStrArr(p.about)) return 'profile.about must be a list of strings';
  if (!Array.isArray(p.marquee) || p.marquee.length !== 2 || !p.marquee.every((r) => isStrArr(r) && r.length > 0)) return 'profile.marquee must be two non-empty lists';
  if (!Array.isArray(p.stats) || !p.stats.every((s) => s && isStr(s.value) && isStr(s.label))) return 'profile.stats entries need value and label';
  for (const k of ['linkedin', 'github']) {
    if (!/^https:\/\//.test(p[k])) return `profile.${k} must be an https URL`;
  }
  if (!/^(\/(?!\/)|https:\/\/)/.test(p.cvUrl)) return 'profile.cvUrl must start with / or https://';

  if (!Array.isArray(c.projects) || c.projects.length === 0) return 'projects must be a non-empty list';
  const ids = new Set();
  for (const [i, x] of c.projects.entries()) {
    const at = `projects[${i}]`;
    if (!x || typeof x !== 'object') return `${at} must be an object`;
    if (!isStr(x.id) || !/^[a-z0-9-]{1,40}$/.test(x.id)) return `${at}.id must be lowercase letters, digits or dashes`;
    if (ids.has(x.id)) return `${at}.id "${x.id}" is used twice`;
    ids.add(x.id);
    if (!CATS.includes(x.cat)) return `${at}.cat must be one of ${CATS.join(', ')}`;
    if (!TYPES.includes(x.type)) return `${at}.type must be one of ${TYPES.join(', ')}`;
    for (const k of ['name', 'kind', 'status', 'role', 'url', 'desc', 'how']) {
      if (!isStr(x[k])) return `${at}.${k} must be a string`;
    }
    if (/[\s/:]/.test(x.url)) return `${at}.url must be a bare host such as qi-r.me`;
    for (const k of ['stack', 'built', 'outcome']) {
      if (!isStrArr(x[k])) return `${at}.${k} must be a list of strings`;
    }
    if (x.shot !== undefined && !(isStr(x.shot) && /^(\/(?!\/)[^\s"'()]*|https:\/\/[^\s"'()]+)?$/.test(x.shot))) {
      return `${at}.shot must be empty, a path starting with / or an https URL`;
    }
    if (x.lines !== undefined &&!(Array.isArray(x.lines) && x.lines.every((l) => Array.isArray(l) && isStr(l[0]) && (l[1] === 0 || l[1] === 1)))) {
      return `${at}.lines entries must look like ["text", 0 or 1]`;
    }
  }

  if (!Array.isArray(c.experience) || c.experience.length === 0) return 'experience must be a non-empty list';
  for (const [i, e] of c.experience.entries()) {
    for (const k of ['when', 'year', 'role', 'org', 'note']) {
      if (!e || !isStr(e[k])) return `experience[${i}].${k} must be a string`;
    }
  }
  if (!Array.isArray(c.stack) || c.stack.length === 0) return 'stack must be a non-empty list';
  for (const [i, g] of c.stack.entries()) {
    if (!g || !isStr(g.label) || !isStrArr(g.items)) return `stack[${i}] needs a label and items`;
  }
  if (!Array.isArray(c.answers)) return 'answers must be a list';
  for (const [i, a] of c.answers.entries()) {
    if (!a || !isStr(a.match) || !isStr(a.text)) return `answers[${i}] needs match and text`;
    if (a.match.length > 200) return `answers[${i}].match is too long`;
    if (!SAFE_PATTERN.test(a.match)) return `answers[${i}].match may only use words, spaces, | . ? - and \\b`;
    try { new RegExp(a.match, 'i'); } catch { return `answers[${i}].match is not a valid pattern`; }
  }
  if (!isStr(c.fallbackAnswer)) return 'fallbackAnswer must be a string';
  return null;
}
