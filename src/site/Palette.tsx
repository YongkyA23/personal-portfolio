import { Fragment, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { sx } from '../lib/css';
import { useFocusTrap } from '../lib/focus';
import type { Content } from '../content/types';
import { localAnswer } from '../lib/answer';
import { ICON, SECTIONS, type SectionId } from './icons';

interface Props {
  content: Content;
  onClose: () => void;
  onSection: (id: SectionId) => void;
  onOpenCase: (id: string) => void;
  onTerminal: () => void;
  onLamp: () => void;
  onCopy: () => void;
  onReplay: () => void;
}

interface Command {
  group: string;
  label: string;
  hint: string;
  d: string;
  run: () => void;
}

interface Answer {
  q: string;
  full: string;
  shown: string;
  thinking: boolean;
}

const STARTERS = ['What has he shipped?', 'How does he build with AI?', 'Is he available?'];
const THINK_MS = 850;

export function Palette({ content, onClose, onSection, onOpenCase, onTerminal, onLamp, onCopy, onReplay }: Props) {
  const { profile, projects } = content;
  const [palQ, setPalQ] = useState('');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef);
  const timers = useRef({ think: 0, type: 0 });

  const stopTyping = () => {
    window.clearTimeout(timers.current.think);
    window.clearInterval(timers.current.type);
  };
  useEffect(() => stopTyping, []);

  const ask = (q: string) => {
    const full = localAnswer(q, content);
    stopTyping();
    setAnswer({ q, full, shown: '', thinking: true });
    setPalQ('');
    setIndex(0);
    timers.current.think = window.setTimeout(() => {
      let n = 0;
      timers.current.type = window.setInterval(() => {
        n += 3;
        setAnswer({ q, full, shown: full.slice(0, n), thinking: false });
        if (n >= full.length) window.clearInterval(timers.current.type);
      }, 16);
    }, THINK_MS);
  };

  const raw = palQ.trim();
  const query = raw.toLowerCase();
  const all: Command[] = [
    ...SECTIONS.map((s) => ({ group: 'NAVIGATE', label: `Go to ${s.label}`, hint: s.no, d: s.d, run: () => onSection(s.id) })),
    ...projects.map((p) => ({ group: 'CASE STUDIES', label: p.name, hint: p.kind, d: ICON.folder, run: () => onOpenCase(p.id) })),
    { group: 'MODES', label: 'Open terminal mode', hint: '`', d: ICON.terminal, run: onTerminal },
    { group: 'MODES', label: 'Toggle flashlight', hint: 'pull the cord', d: ICON.torch, run: onLamp },
    { group: 'ACTIONS', label: 'Copy email address', hint: profile.email, d: ICON.copy, run: () => { onCopy(); onClose(); } },
    { group: 'ACTIONS', label: 'Download CV', hint: 'PDF', d: ICON.download, run: () => { window.open(profile.cvUrl, '_blank', 'noopener'); onClose(); } },
    { group: 'ACTIONS', label: 'Replay intro', hint: '', d: ICON.replay, run: onReplay },
  ];
  const asks: Command[] = raw
    ? [{ group: 'ASK AI', label: `Ask: “${raw}”`, hint: '↵', d: ICON.spark, run: () => ask(raw) }]
    : STARTERS.map((q) => ({ group: 'ASK AI', label: q, hint: '', d: ICON.spark, run: () => ask(q) }));
  const matches = query ? all.filter((c) => `${c.label} ${c.hint} ${c.group}`.toLowerCase().includes(query)) : all;
  const commands = [...asks, ...matches];
  const selected = Math.min(index, commands.length - 1);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const cmds = commands.map((c, i) => ({
    ...c,
    at: i,
    head: i === 0 || commands[i - 1].group !== c.group,
    on: i === selected,
    bg: i === selected ? '#1A1A1A' : 'transparent',
    hover: () => setIndex(i),
  }));
  const ai = answer
    ? { on: true, q: answer.q, thinking: answer.thinking, shown: answer.shown, caret: answer.shown.length < answer.full.length ? '▍' : '' }
    : { on: false, q: '', thinking: false, shown: '', caret: '' };

  const closePal = onClose;
  const stop = (e: MouseEvent) => e.stopPropagation();
  const onPalQ = (e: ChangeEvent<HTMLInputElement>) => {
    setPalQ(e.target.value);
    setIndex(0);
  };
  const onPalKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(Math.min(selected + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(Math.max(selected - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commands[selected]?.run();
    }
  };

  return (
    <div ref={rootRef} className="dk-pal-back" onClick={closePal}>
    <div role="dialog" aria-modal="true" aria-label="Command palette" onClick={stop} style={sx(`width: min(640px, 100%); border-radius: 20px; border: 1px solid #262626; background: #0C0C0C; box-shadow: 0 30px 80px rgba(0,0,0,0.7); overflow: hidden; animation: dk-pop .25s cubic-bezier(.2,.8,.2,1) both`)}>
    <div style={sx(`display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid #1C1C1C`)}>
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1.6"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input type="text" role="combobox" aria-expanded={true} aria-controls="pal-list" aria-autocomplete="list" aria-activedescendant={commands.length ? `pal-opt-${selected}` : undefined} aria-label="Search commands or ask the AI" placeholder="Search, jump, or ask the AI about Yongky…" value={palQ} onChange={onPalQ} onKeyDown={onPalKey} autoFocus style={sx(`flex-grow: 1; min-width: 0; min-height: 58px; border: 0; background: transparent; color: #EDEDED; font-size: 16px; outline: none`)} />
    <button type="button" onClick={closePal} style={sx(`min-height: 32px; padding: 0 8px; border: 1px solid #262626; border-radius: 6px; background: transparent; color: #9A9A9A; font-family: var(--mono); font-size: 11px`)}>ESC</button>
    </div>
    {ai.on && (<>
    <div style={sx(`padding: 16px 18px; border-bottom: 1px solid #1C1C1C; display: flex; gap: 12px; animation: dk-swap-a .3s ease both`)}>
    <span aria-hidden="true" style={sx(`width: 28px; height: 28px; border-radius: 50%; background: #EDEDED; color: #070707; display: flex; align-items: center; justify-content: center; flex: none`)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg></span>
    <div style={sx(`flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>{ai.q}</span>
    {ai.thinking && (<>
    <span style={sx(`display: flex; align-items: center; gap: 10px; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}><span style={sx(`display: flex; gap: 4px`)}><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #EDEDED; animation: dk-dot 1s ease-in-out infinite`)}></span><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #EDEDED; animation: dk-dot 1s ease-in-out .15s infinite`)}></span><span style={sx(`width: 6px; height: 6px; border-radius: 50%; background: #EDEDED; animation: dk-dot 1s ease-in-out .3s infinite`)}></span></span>thinking</span>
    </>)}
    <p aria-live="polite" style={sx(`margin: 0; font-size: 15px; line-height: 1.6; color: #DADADA`)}>{ai.shown}<span className="dk-blink" style={sx(`color: #EDEDED`)}>{ai.caret}</span></p>
    </div>
    </div>
    </>)}
    <div ref={listRef} id="pal-list" role="listbox" aria-label="Commands" style={sx(`max-height: 340px; overflow-y: auto; padding: 8px`)}>
    {cmds.map((c, i) => (<Fragment key={i}>
    {c.head && (<><div style={sx(`padding: 10px 12px 6px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; color: #8A8A8A`)}>{c.group}</div></>)}
    <button type="button" id={`pal-opt-${c.at}`} role="option" aria-selected={c.on} onClick={c.run} onMouseEnter={c.hover} style={sx(`width: 100%; min-height: 44px; border: 0; border-radius: 10px; background: ${c.bg}; color: #EDEDED; display: flex; align-items: center; gap: 12px; padding: 0 12px; font-size: 14px; text-align: left`)}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1.6" strokeLinejoin="round"><path d={c.d}/></svg>
    <span style={sx(`flex-grow: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`)}>{c.label}</span>
    <span style={sx(`font-family: var(--mono); font-size: 11px; color: #8A8A8A; white-space: nowrap`)}>{c.hint}</span>
    </button>
    </Fragment>))}
    </div>
    <div style={sx(`display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; padding: 10px 16px; border-top: 1px solid #1C1C1C; font-family: var(--mono); font-size: 11px; color: #8A8A8A`)}>
    <span>↑↓ navigate · ↵ select · esc close</span><span>Answers come from Yongky’s own notes</span>
    </div>
    </div>
    </div>
  );
}
