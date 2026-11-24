import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from './physics';

// Node has no DOM: a box and one chip with just the fields createWorld reads.
function setup() {
  const box = { clientWidth: 600, clientHeight: 400, getBoundingClientRect: () => ({ left: 0, top: 0 }) } as unknown as HTMLElement;
  const chip = { offsetWidth: 100, offsetHeight: 40, style: {} as CSSStyleDeclaration } as unknown as HTMLElement;
  // Drop the chip at the left wall so a throw to the right always has room.
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const world = createWorld(box, [chip]);
  for (let i = 0; i < 120; i++) world.step(); // let it land
  const x = () => Number(/translate3d\(([-\d.]+)px/.exec(chip.style.transform)![1]);
  return { world, x };
}

let now = 0;
afterEach(() => vi.restoreAllMocks());

describe('physics throw', () => {
  it('flings a chip released mid-swipe', () => {
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { world, x } = setup();
    world.grab(0, x() + 50, 380);
    for (let i = 1; i <= 5; i++) {
      now += 16;
      world.drag(x() + 50 + 20, 380);
      world.step(); // writes the dragged position
    }
    world.release();
    const at = x();
    world.step();
    expect(x() - at).toBeGreaterThan(5);
  });

  it('drops, not flings, a chip held still before release', () => {
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { world, x } = setup();
    world.grab(0, x() + 50, 380);
    for (let i = 1; i <= 5; i++) {
      now += 16;
      world.drag(x() + 50 + 20, 380);
      world.step(); // writes the dragged position
    }
    now += 300; // pointer rests on the chip
    world.release();
    const at = x();
    world.step();
    expect(Math.abs(x() - at)).toBeLessThan(0.5);
  });
});
