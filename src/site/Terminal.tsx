import { Fragment, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { sx } from '../lib/css';
import type { Content } from '../content/types';
import { completions, runCommand, welcome, type TermLine } from '../lib/terminal';

interface Props {
  content: Content;
  onClose: () => void;
  onOpenCase: (id: string) => void;
}

const MAX_LINES = 400;

export function Terminal({ content, onClose, onOpenCase }: Props) {
  const [lines, setLines] = useState<TermLine[]>(welcome);
  const [termIn, setTermIn] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef(0);
  const options = useMemo(() => completions(content), [content]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = (raw: string) => {
    const result = runCommand(raw, content);
    setLines((prev) => (result.clear ? [] : [...prev, ...result.lines].slice(-MAX_LINES)));
    setTermIn('');
    if (raw.trim()) {
      const next = [...history, raw.trim()].slice(-50);
      setHistory(next);
      setCursor(next.length);
    }
    if (result.close) {
      const openId = result.openId;
      timer.current = window.setTimeout(() => (openId ? onOpenCase(openId) : onClose()), openId ? 450 : 200);
    }
  };

  const focusTerm = () => inputRef.current?.focus();
  const closeTerm = (e: MouseEvent) => {
    e.stopPropagation();
    onClose();
  };
  const onTermIn = (e: ChangeEvent<HTMLInputElement>) => setTermIn(e.target.value);
  const onTermKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run(termIn);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const at = Math.max(0, cursor - 1);
      if (history[at] !== undefined) {
        setCursor(at);
        setTermIn(history[at]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const at = Math.min(history.length, cursor + 1);
      setCursor(at);
      setTermIn(history[at] ?? '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = termIn ? options.find((o) => o.startsWith(termIn) && o !== termIn) : undefined;
      if (match) setTermIn(match);
    }
  };
  const termLines = lines.map((l) => ({ ...l, isLink: !!l.href }));

  return (
    <div className="dk-term" role="dialog" aria-modal="true" aria-label="Terminal" onClick={focusTerm}>
    <div style={sx(`height: 44px; flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 12px 0 18px; border-bottom: 1px solid #1C1C1C; font-size: 12px; color: #8A8A8A`)}>
    <span>yongky@portfolio: ~ — zsh</span>
    <button type="button" onClick={closeTerm} style={sx(`min-height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #262626; background: transparent; color: #C9C9C9; font-family: var(--mono); font-size: 12px`)}>exit · back to GUI</button>
    </div>
    <div style={sx(`flex-grow: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column-reverse; padding: 20px clamp(16px, 4vw, 40px)`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 2px; font-size: 14px; line-height: 1.65`)}>
    {termLines.map((l, i) => (<Fragment key={i}>
    <div style={sx(`color: ${l.c}; white-space: pre-wrap; overflow-wrap: anywhere`)}>{l.t}{l.isLink && (<><a href={l.href} style={sx(`color: #FFFFFF`)}>{l.link}</a></>)}</div>
    </Fragment>))}
    <div style={sx(`display: flex; align-items: center; gap: 10px; color: #EDEDED`)}>
    <span style={sx(`flex: none`)}>yongky@portfolio:~$</span>
    <input type="text" ref={inputRef} className="dk-term-in" aria-label="Terminal command" value={termIn} onChange={onTermIn} onKeyDown={onTermKey} autoFocus spellCheck={false} autoComplete="off" style={sx(`flex-grow: 1; min-width: 0; min-height: 32px; border: 0; background: transparent; color: #FFFFFF; font-family: var(--mono); font-size: 14px; outline: none; caret-color: #FFFFFF`)} />
    </div>
    </div>
    </div>
    </div>
  );
}
