// Turns deviceorientation readings into a steering aim in -1..1 for the hero monogram.
// Tilt is measured from how the phone is held when the page opens (that pose is "neutral"), with a
// dead zone for hand tremor and thumb scrolling, and a slow drift so a new grip becomes the new rest.
// Axes follow the screen, so landscape steers the right way.
export function createTiltAim(deadZone = 4, range = 22, drift = 0.004) {
  let rest: { side: number; fwd: number } | null = null;
  const shape = (d: number) => {
    const v = Math.abs(d) < deadZone ? 0 : (d - Math.sign(d) * deadZone) / range;
    return Math.max(-1, Math.min(1, v));
  };
  return (beta: number | null, gamma: number | null, screenAngle: number): { x: number; y: number } | null => {
    if (beta == null || gamma == null) return null;
    const a = ((screenAngle % 360) + 360) % 360;
    const side = a === 90 ? beta : a === 270 ? -beta : a === 180 ? -gamma : gamma;
    const fwd = a === 90 ? -gamma : a === 270 ? gamma : a === 180 ? -beta : beta;
    if (!rest) rest = { side, fwd };
    rest.side += (side - rest.side) * drift;
    rest.fwd += (fwd - rest.fwd) * drift;
    return { x: shape(side - rest.side) * 0.75, y: shape(fwd - rest.fwd) * 0.6 };
  };
}
