// Coordinates share a 360 × 480 scene. These worklets run on the animation
// thread: liquid geometry changes every frame without React rerendering.
export const TEA_SCENE = { width: 360, height: 480, x: 247, rim: 188 };

export function smooth(from: number, to: number, value: number) {
  'worklet';
  const u = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return u * u * (3 - 2 * u);
}

export function teaEnergy(t: number) {
  'worklet';
  return t > 0 && t < 1.8 ? Math.pow(Math.sin((t / 1.8) * Math.PI), 1.3) : 0;
}

export function teaSurface(t: number, closed = true) {
  'worklet';
  // Removing a little liquid lowers the level, then returning droplets excite
  // a damped surface wave. The final surface is exactly stationary.
  const energy = teaEnergy(t);
  const settling = t > 1.5 ? Math.exp(-(t - 1.5) * 4) * (1 - smooth(2.7, 3.2, t)) : 0;
  const wave = energy * 8 * Math.sin(t * 8) + settling * 7 * Math.sin((t - 1.5) * 17);
  const y = 239 + energy * 14;
  const back = `M184 ${y + wave} C207 ${y - 13 - wave} 278 ${y - 13 + wave} 310 ${y - wave}`;
  return closed
    ? `${back} C285 ${y + 13 + wave} 208 ${y + 13 - wave} 184 ${y + wave} Z`
    : `${back} L300 420 Q247 441 195 420 Z`;
}

export function teaJet(t: number, strand = 0) {
  'worklet';
  const e = teaEnergy(t);
  const baseY = 245 + e * 12;
  const h = 172 * e;
  const bend = Math.sin(t * 5.1) * 19 * e;
  const topX = 247 + bend;
  const topY = baseY - h;
  const narrow = 8 + 5 * Math.sin(t * 11);
  if (strand) {
    const side = strand % 2 ? -1 : 1;
    const reach = (31 + strand * 8) * e;
    const endX = topX + side * reach;
    const endY = topY + (strand * 6 + 13) * e;
    return `M${244 + side * 5} ${baseY} C${247 + side * 35 * e} ${baseY - h * 0.4} ${topX + side * 10} ${topY + 36} ${endX} ${endY} C${endX + side * 4} ${endY - 6} ${endX + side * 6} ${endY + 4} ${endX} ${endY + 9} C${topX + side * 18} ${topY + 43} ${247 + side * 24 * e} ${baseY - h * 0.3} ${250 + side * 5} ${baseY} Z`;
  }
  // Two unequal edges stretch, curl and pinch; this is a changing silhouette,
  // rather than a scaled splash photograph.
  return `M230 ${baseY} C${225 - bend} ${baseY - h * 0.38} ${topX - narrow} ${topY + h * 0.43} ${topX - 25 * e} ${topY + 11} C${topX - 42 * e} ${topY - 8 * e} ${topX - 11 * e} ${topY - 13 * e} ${topX + 3} ${topY + 3} C${topX + 15 * e} ${topY - 9 * e} ${topX + 44 * e} ${topY + 6 * e} ${topX + 21 * e} ${topY + 20} C${topX + narrow} ${topY + h * 0.5} ${269 + bend} ${baseY - h * 0.4} 264 ${baseY} Z`;
}

export function teaDroplet(t: number, index: number) {
  'worklet';
  const launch = 0.17 + (index % 7) * 0.075;
  const age = t - launch;
  const velocityX = Math.sin(index * 2.4 + 0.4) * (46 + (index % 4) * 12);
  const velocityY = -185 - (index % 5) * 19;
  const x = 247 + Math.sin(index * 3.1) * 10 + velocityX * Math.max(0, age);
  const y = 205 + velocityY * Math.max(0, age) + 235 * Math.max(0, age) ** 2;
  return {
    x,
    y,
    radius: 1.3 + (index % 4) * 0.65,
    stretch: 1 + Math.abs(velocityY + 470 * Math.max(0, age)) / 260,
    opacity: smooth(0, 0.06, age) * (1 - smooth(400, 443, y)) * (1 - smooth(1.5, 1.65, age)),
  };
}

export function teaIce(t: number, index: number) {
  'worklet';
  const start = 0.12 + index * 0.11;
  const duration = 1.65 - index * 0.13;
  const u = Math.max(0, Math.min(1, (t - start) / duration));
  const flight = 4 * u * (1 - u);
  const after = Math.max(0, t - start - duration);
  const bob =
    after > 0 ? Math.sin(after * 15) * Math.exp(-after * 5) * (1 - smooth(2.8, 3.2, t)) : 0;
  return {
    x: Math.sin(u * Math.PI * 2) * (index === 1 ? 16 : -11),
    y: -(141 - index * 16) * flight + bob * 5,
    rotation: Math.sin(u * Math.PI) * (index === 1 ? 32 : -25) + bob * 3,
  };
}
