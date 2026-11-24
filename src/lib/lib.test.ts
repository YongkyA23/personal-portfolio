import { describe, expect, it } from 'vitest';
import { sx } from './css';
import { localAnswer } from './answer';
import { completions, runCommand, welcome } from './terminal';
import { validateContent } from '../../shared/validate.js';
import { seed } from '../content/seed';
import type { Content } from '../content/types';

const clone = (): Content => structuredClone(seed);
const text = (raw: string) => runCommand(raw, seed).lines.map((l) => l.t).join('\n');

describe('sx', () => {
  it('camel-cases properties and keeps values', () => {
    expect(sx('font-size: 13px; letter-spacing: -0.01em')).toEqual({ fontSize: '13px', letterSpacing: '-0.01em' });
  });
  it('handles vendor prefixes and custom properties', () => {
    expect(sx('-webkit-text-stroke: 1px #1E1E1E; --to: 142')).toEqual({ WebkitTextStroke: '1px #1E1E1E', '--to': '142' });
  });
  it('keeps colons and commas inside values', () => {
    expect(sx('background: radial-gradient(#161616 1px, transparent 1px) 0 0/28px 28px')).toEqual({
      background: 'radial-gradient(#161616 1px, transparent 1px) 0 0/28px 28px',
    });
  });
  it('ignores empty pieces and returns one object per string', () => {
    expect(sx('color: red;; ;')).toEqual({ color: 'red' });
    expect(sx('margin: 0')).toBe(sx('margin: 0'));
  });
});

describe('validateContent', () => {
  it('accepts the seed', () => {
    expect(validateContent(seed)).toBeNull();
  });
  it('names the field of a duplicate project id', () => {
    const c = clone();
    c.projects[1].id = c.projects[0].id;
    expect(validateContent(c)).toContain('projects[1].id');
  });
  it('rejects a project url with a scheme', () => {
    const c = clone();
    c.projects[0].url = 'https://empuanapp.id';
    expect(validateContent(c)).toContain('projects[0].url');
  });
  it('rejects an invalid answer pattern', () => {
    const c = clone();
    c.answers[0].match = '(';
    expect(validateContent(c)).toContain('answers[0].match');
  });
  it('rejects a javascript: link', () => {
    const c = clone();
    c.profile.github = 'javascript:alert(1)';
    expect(validateContent(c)).toContain('profile.github');
  });
  it('rejects non-objects', () => {
    expect(validateContent(null)).not.toBeNull();
    expect(validateContent('x')).not.toBeNull();
    expect(validateContent({})).not.toBeNull();
  });
});

describe('localAnswer', () => {
  it('matches a keyword', () => {
    expect(localAnswer('tell me about the Roblox game', seed)).toContain('Warteg Sultan');
  });
  it('falls back when nothing matches', () => {
    expect(localAnswer('zzzz', seed)).toBe(seed.fallbackAnswer);
  });
  it('skips a broken pattern', () => {
    const c = clone();
    c.answers = [{ match: '(', text: 'never' }];
    expect(localAnswer('anything', c)).toBe(c.fallbackAnswer);
  });
});

describe('terminal', () => {
  it('echoes the prompt line first', () => {
    expect(runCommand('whoami', seed).lines[0].t).toBe('yongky@portfolio:~$ whoami');
  });
  it('lists commands on help', () => {
    expect(text('help')).toContain('sudo hire yongky');
  });
  it('lists every project', () => {
    const out = text('ls projects');
    for (const p of seed.projects) expect(out).toContain(`${p.id}.md`);
  });
  it('prints a project file', () => {
    const out = text('cat empuan.md');
    expect(out).toContain('# Empuan');
    expect(out).toContain('empuanapp.id');
  });
  it('explains cat without a file and an unknown file', () => {
    expect(text('cat')).toContain('which file');
    expect(text('cat nope.md')).toContain('no such file');
  });
  it('opens a case study', () => {
    const r = runCommand('open qir', seed);
    expect(r.openId).toBe('qir');
    expect(r.close).toBe(true);
  });
  it('does not open anything for open without a name', () => {
    const r = runCommand('open', seed);
    expect(r.openId).toBeUndefined();
    expect(r.close).toBeUndefined();
  });
  it('grants sudo hire yongky with a mail link', () => {
    const r = runCommand('sudo hire yongky', seed);
    expect(r.lines.some((l) => l.href?.startsWith(`mailto:${seed.profile.email}`))).toBe(true);
    expect(text('sudo rm -rf /')).toContain('Nice try');
  });
  it('clears and exits', () => {
    expect(runCommand('clear', seed)).toEqual({ lines: [], clear: true });
    expect(runCommand('exit', seed).close).toBe(true);
  });
  it('survives input nobody planned for', () => {
    expect(runCommand('', seed).lines).toHaveLength(1);
    expect(runCommand('   ', seed).lines).toHaveLength(1);
    expect(text('frobnicate')).toContain('command not found: frobnicate');
    expect(() => runCommand('x'.repeat(5000), seed)).not.toThrow();
    expect(() => runCommand('cat ' + '../'.repeat(500), seed)).not.toThrow();
  });
  it('offers completions for every project and a welcome banner', () => {
    expect(completions(seed)).toContain('open warteg');
    expect(welcome(new Date(0))[1].t).toContain('help');
  });
});
