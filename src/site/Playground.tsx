import { Fragment, memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { sx } from '../lib/css';
import type { StackGroup } from '../content/types';
import { prefersReducedMotion } from '../lib/env';
import { createWorld, type World } from '../lib/physics';
import { Scramble } from './Scramble';

interface Props {
  stack: StackGroup[];
  active: boolean;
}

/** Stack tags as physical chips: they drop in when the box scrolls into view and can be grabbed and thrown. */
export const Playground = memo(function Playground({ stack: groups, active }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const [still] = useState(prefersReducedMotion);

  const chips = useMemo(
    () =>
      groups.flatMap((g, gi) =>
        g.items.map((t) => {
          const lead = gi === 0;
          return {
            t,
            bg: lead ? '#EDEDED' : gi === 1 ? '#151515' : '#0A0A0A',
            color: lead ? '#070707' : '#EDEDED',
            border: lead ? '#EDEDED' : gi === 1 ? '#2A2A2A' : '#3A3A3A',
            cls: lead ? 'dk-chip is-lead' : 'dk-chip',
          };
        }),
      ),
    [groups],
  );

  useEffect(() => {
    const box = boxRef.current;
    if (!box || still) return;
    let world: World | null = null;
    let raf = 0;
    const loop = () => {
      world?.step();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!world) {
        world = createWorld(box, Array.from(box.querySelectorAll<HTMLElement>('.dk-chip')));
        worldRef.current = world;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // Simulate only while the box is on screen; build the world once a third of it shows.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) stop();
        else if (world || entry.intersectionRatio >= 0.3) start();
      },
      { threshold: [0, 0.3] },
    );
    io.observe(box);
    const ro = new ResizeObserver(() => world?.resize());
    ro.observe(box);
    let alive = true;
    document.fonts?.ready.then(() => alive && world?.resize());
    return () => {
      alive = false;
      stop();
      io.disconnect();
      ro.disconnect();
      worldRef.current = null;
    };
  }, [chips, still]);

  const boxCls = still ? 'dk-box dk-reveal is-static' : 'dk-box dk-reveal';
  const shake = () => worldRef.current?.shake();
  const dropAgain = () => worldRef.current?.drop();
  const boxMove = (e: PointerEvent) => worldRef.current?.drag(e.clientX, e.clientY);
  const boxUp = () => worldRef.current?.release();
  const grab = (index: number) => (e: PointerEvent<HTMLElement>) => {
    const world = worldRef.current;
    if (!world) return;
    e.preventDefault();
    world.grab(index, e.clientX, e.clientY);
    // Keep receiving moves even when the pointer leaves the chip.
    boxRef.current?.setPointerCapture(e.pointerId);
  };
  const stack = groups.map((g) => ({ label: g.label, text: g.items.join(', ') }));

  return (
    <section id="stack" style={sx(`padding: 72px 0; border-top: 1px solid #1C1C1C`)}>
    <div className="dk-reveal" style={sx(`display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px`)}>
    <div style={sx(`display: flex; flex-direction: column; gap: 10px`)}>
    <span style={sx(`font-family: var(--mono); font-size: 13px; color: #8A8A8A`)}>04 · stack</span>
    <h2 aria-label="Stack" style={sx(`margin: 0; font-weight: 500; font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.04em; line-height: 1`)}><span aria-hidden="true"><Scramble text="Stack" when={active} /></span></h2>
    </div>
    <div style={sx(`display: flex; gap: 8px`)}>
    <button type="button" onClick={shake} className="dk-ghost dk-mag" style={sx(`min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #262626; background: transparent; color: #EDEDED; font-size: 14px`)}>Shake</button>
    <button type="button" onClick={dropAgain} className="dk-ghost dk-mag" style={sx(`min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #262626; background: transparent; color: #EDEDED; font-size: 14px`)}>Drop again</button>
    </div>
    </div>
    <div ref={boxRef} className={boxCls} aria-hidden="true" onPointerMove={boxMove} onPointerUp={boxUp} onPointerCancel={boxUp} style={sx(`position: relative; border: 1px solid #1C1C1C; border-radius: 28px; background: radial-gradient(#141414 1px, transparent 1px) 0 0/24px 24px, #0A0A0A; overflow: hidden`)}>
    <span style={sx(`position: absolute; left: 24px; top: 20px; font-family: var(--mono); font-size: 12px; color: #8A8A8A`)}>grab, throw, stack</span>
    {chips.map((c, i) => (<Fragment key={i}>
    <span className={c.cls} data-cursor="Drag" onPointerDown={grab(i)} style={sx(`position: absolute; left: 0; top: 0; transform: translate(-999px, -999px); white-space: nowrap; border-radius: 999px; font-weight: 500; letter-spacing: -0.01em; background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.border}`)}>{c.t}</span>
    </Fragment>))}
    </div>
    <div style={sx(`margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 24px; font-size: 13px; line-height: 1.6; color: #9A9A9A`)}>
    {stack.map((g, i) => (<Fragment key={i}><p style={sx(`margin: 0`)}><span style={sx(`font-family: var(--mono); font-size: 11px; color: #EDEDED; display: block`)}>{g.label}</span>{g.text}</p></Fragment>))}
    </div>
    </section>
  );
});
