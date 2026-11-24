import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sx } from '../lib/css';
import { introSeen, markIntroSeen, prefersReducedMotion } from '../lib/env';
import type { Content } from '../content/types';
import { useSiteEffects } from './effects';
import { SECTIONS, type SectionId } from './icons';
import { CaseStudy } from './CaseStudy';
import { Contact } from './Contact';
import { Experience } from './Experience';
import { Hero, type EnterDelays } from './Hero';
import { Intro } from './Intro';
import { Marquee } from './Marquee';
import { Palette } from './Palette';
import { Playground } from './Playground';
import { Sidebar } from './Sidebar';
import { Statement } from './Statement';
import { Terminal } from './Terminal';
import { Work } from './Work';

const INTRO_MS = 3300;
const CASE_HASH = '#/work/';
const WRAP = sx(`max-width: 1080px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 64px)`);

const caseFromHash = () => (window.location.hash.startsWith(CASE_HASH) ? decodeURIComponent(window.location.hash.slice(CASE_HASH.length)) : null);
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

export default function Site({ content }: { content: Content }) {
  const { profile, projects } = content;
  const cursorRef = useRef<HTMLDivElement>(null);
  useSiteEffects(cursorRef);

  /* ---------- intro: first visit only ---------- */
  const [skipIntro] = useState(() => introSeen() || prefersReducedMotion());
  const [intro, setIntro] = useState(!skipIntro);
  const [introRun, setIntroRun] = useState(0);
  const [fast, setFast] = useState(skipIntro);
  const [kickerRun, setKickerRun] = useState(0);

  useEffect(() => {
    if (!intro) return;
    const timer = window.setTimeout(() => {
      markIntroSeen();
      setIntro(false);
    }, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [intro, introRun]);

  useEffect(() => {
    const timer = window.setTimeout(() => setKickerRun((n) => n + 1), skipIntro ? 200 : 2650);
    return () => window.clearTimeout(timer);
  }, [skipIntro]);

  const skip = useCallback(() => {
    markIntroSeen();
    setIntro(false);
    setFast(true);
  }, []);

  const delays = useMemo<EnterDelays>(() => {
    const base = fast ? 0 : 2.5;
    const at = (offset: number) => `${(base + offset).toFixed(2)}s`;
    return { side: fast ? '0s' : '2.5s', k: at(0.05), l1: at(0.1), l2: at(0.22), p: at(0.45), ask: at(0.55), dl: at(0.65) };
  }, [fast]);

  /* ---------- overlays ---------- */
  const [palette, setPalette] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [lamp, setLamp] = useState(false);
  const [cordFlip, setCordFlip] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(caseFromHash);
  const [caseFlip, setCaseFlip] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);

  const caseIndex = caseId ? projects.findIndex((p) => p.id === caseId) : -1;
  const caseProject = caseIndex >= 0 ? projects[caseIndex] : null;
  const nextProject = caseProject ? projects[(caseIndex + 1) % projects.length] : null;

  const rememberFocus = () => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) returnFocus.current = document.activeElement;
  };
  const restoreFocus = () => {
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  };

  const openPalette = useCallback(() => {
    rememberFocus();
    setTerminal(false);
    setPalette(true);
  }, []);
  const closePalette = useCallback(() => {
    setPalette(false);
    restoreFocus();
  }, []);
  const openTerminal = useCallback(() => {
    rememberFocus();
    setPalette(false);
    setTerminal(true);
  }, []);
  const closeTerminal = useCallback(() => {
    setTerminal(false);
    restoreFocus();
  }, []);
  const toggleLamp = useCallback(() => {
    setPalette(false);
    setLamp((on) => !on);
    setCordFlip((v) => !v);
  }, []);

  // A case study has its own URL, so it can be shared and the Back button closes it.
  const openCase = useCallback((id: string) => {
    setPalette(false);
    setTerminal(false);
    setCaseId(id);
    setCaseFlip((v) => !v);
    const url = CASE_HASH + encodeURIComponent(id);
    if (window.history.state?.caseOpen) window.history.replaceState({ caseOpen: true }, '', url);
    else window.history.pushState({ caseOpen: true }, '', url);
  }, []);
  const closeCase = useCallback(() => {
    if (window.history.state?.caseOpen) window.history.back();
    else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setCaseId(null);
    }
  }, []);
  const openNextCase = useCallback(() => {
    if (nextProject) openCase(nextProject.id);
  }, [nextProject, openCase]);

  useEffect(() => {
    const onPop = () => setCaseId(caseFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // A link to a project that no longer exists: drop the hash, show the page.
  useEffect(() => {
    if (caseId && !caseProject) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setCaseId(null);
    }
  }, [caseId, caseProject]);

  const goSection = useCallback((id: SectionId) => {
    setPalette(false);
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (permissions or an insecure origin): open the mail client instead.
      window.location.href = `mailto:${profile.email}`;
    }
  }, [profile.email]);
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const replayIntro = useCallback(() => {
    setPalette(false);
    setTerminal(false);
    window.scrollTo({ top: 0 });
    setIntroRun((n) => n + 1);
    setIntro(true);
  }, []);

  /* ---------- global keys ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette) closePalette();
        else openPalette();
      } else if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        if (terminal) closeTerminal();
        else openTerminal();
      } else if (e.key === 'Escape') {
        if (palette) closePalette();
        else if (terminal) closeTerminal();
        else if (caseProject) closeCase();
        else if (lamp) toggleLamp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette, terminal, lamp, caseProject, openPalette, closePalette, openTerminal, closeTerminal, closeCase, toggleLamp]);

  // Full-screen overlays own the scroll while they are open.
  const covered = terminal || !!caseProject;
  useEffect(() => {
    if (!covered) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [covered]);

  /* ---------- which section is being read ---------- */
  const [active, setActive] = useState<SectionId>('overview');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id as SectionId);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className={lamp ? 'dk-root dk-lamp-on' : 'dk-root'} style={sx(`display: flex; flex-wrap: wrap; background: #070707; color: #EDEDED; font-family: var(--sans); min-height: 100vh; -webkit-font-smoothing: antialiased`)}>
      <div ref={cursorRef} className="dk-cursor" aria-hidden="true" />

      {intro && (
        <Intro
          key={introRun}
          name={profile.name}
          initials={profile.initials}
          projectCount={projects.length}
          experienceCount={content.experience.length}
          onSkip={skip}
        />
      )}

      <Sidebar
        profile={profile}
        enterDelay={delays.side}
        active={active}
        lamp={lamp}
        cordFlip={cordFlip}
        onCord={toggleLamp}
        onPalette={openPalette}
        onTerminal={openTerminal}
        onReplay={replayIntro}
      />

      <main style={sx(`flex: 999 1 560px; min-width: 0; overflow-x: clip`)}>
        <Hero profile={profile} d={delays} kickerRun={kickerRun} onPalette={openPalette} />
        <Marquee rows={profile.marquee} />
        <Statement text={profile.statement} />
        <div style={WRAP}>
          <Work projects={projects} secret={profile.secrets[1]} active={active === 'work'} onOpenCase={openCase} />
        </div>
        <Experience items={content.experience} active={active === 'experience'} />
        <div style={WRAP}>
          <Playground stack={content.stack} active={active === 'stack'} />
          <Contact profile={profile} copied={copied} onCopy={copyEmail} />
        </div>
      </main>

      {lamp && (
        <>
          <div className="dk-lamp" aria-hidden="true" />
          <div role="status" style={sx(`position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 125; border: 1px solid #262626; border-radius: 999px; background: #0A0A0A; padding: 8px 14px; font-family: var(--mono); font-size: 12px; color: #C9C9C9; pointer-events: none`)}>
            Flashlight on · pull the cord to switch off
          </div>
        </>
      )}

      {terminal && <Terminal content={content} onClose={closeTerminal} onOpenCase={openCase} />}

      {palette && (
        <Palette
          content={content}
          onClose={closePalette}
          onSection={goSection}
          onOpenCase={openCase}
          onTerminal={openTerminal}
          onLamp={toggleLamp}
          onCopy={copyEmail}
          onReplay={replayIntro}
        />
      )}

      {caseProject && nextProject && (
        <CaseStudy project={caseProject} nextName={nextProject.name} flip={caseFlip} onClose={closeCase} onNext={openNextCase} />
      )}
    </div>
  );
}
