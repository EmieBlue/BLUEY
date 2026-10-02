import { Bodies, Body, Composite, Engine } from 'matter-js';

type Point = { x: number; y: number };
type Palette = { text: string; accent: string; background: string };
type Transition = {
  toDark: boolean;
  time: number;
  released: boolean;
  committed: boolean;
  commit: () => void;
  done: () => void;
};

const WIDTH = 400;
const HEIGHT = 200;
const FLOOR = 153;
const RADIUS = 20;
const HOLE = 278;
const DURATION = 2400;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createThemeScene(canvas: HTMLCanvasElement, initialDark: boolean, initialPalette: Palette) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const context = ctx;
  const engine = Engine.create({ gravity: { x: 0, y: 1.15, scale: 0.001 } });
  const ball = Bodies.circle(194, FLOOR - RADIUS, RADIUS, {
    restitution: 0.42, friction: 0.06, frictionAir: 0.012,
  });
  Composite.add(engine.world, [
    ball,
    Bodies.rectangle(119, FLOOR + 30, 238, 60, { isStatic: true, friction: 0.1 }),
    Bodies.rectangle(367, FLOOR + 30, 106, 60, { isStatic: true }),
  ]);
  let dark = initialDark;
  let palette = initialPalette;
  let transition: Transition | null = null;
  let frame = 0;
  let previousTime = 0;
  let accumulator = 0;
  let disposed = false;

  function line(points: Point[], color: string, width = 4) {
    context.beginPath();
    points.forEach((p, i) => i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y));
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  }

  function circle(x: number, y: number, radius: number, color: string) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }

  function draw() {
    if (disposed) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== WIDTH * scale || canvas.height !== HEIGHT * scale) {
      canvas.width = WIDTH * scale;
      canvas.height = HEIGHT * scale;
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, WIDTH, HEIGHT);
    const t = transition?.time ?? 0;
    const pushing = transition?.toDark === true;
    const returning = transition?.toDark === false;
    const push = pushing ? ease(t / 760) : 0;
    const back = returning ? ease(t / 800) : 0;
    let figureX = dark ? 220 : 146;
    let orb: Point = dark ? { x: HOLE, y: 112 } : { x: 194, y: FLOOR - RADIUS };
    let moon = dark;
    let lean = 0;
    let stride = 0;

    if (pushing) {
      figureX = lerp(146, 220, push);
      lean = Math.sin(push * Math.PI) * 8;
      stride = Math.sin(push * Math.PI * 6) * Math.sin(push * Math.PI) * 7;
      orb = transition!.released ? ball.position : { x: lerp(194, HOLE, push), y: FLOOR - RADIUS };
      moon = t >= 1450;
      if (moon) orb = { x: HOLE, y: lerp(185, 112, ease((t - 1450) / 750)) };
    } else if (returning) {
      figureX = lerp(220, 146, back);
      stride = Math.sin(back * Math.PI * 6) * Math.sin(back * Math.PI) * 7;
      moon = t < 600;
      orb = transition!.released ? ball.position : { x: HOLE, y: lerp(112, 183, ease(t / 460)) };
      if (t > 1900) {
        const settle = ease((t - 1900) / 500);
        orb = { x: lerp(orb.x, 194, settle), y: lerp(orb.y, FLOOR - RADIUS, settle) };
      }
    }

    const ink = getComputedStyle(canvas).color || palette.text;
    context.globalAlpha = 0.2;
    line([{ x: 44, y: FLOOR }, { x: 237, y: FLOOR }], ink, 1);
    line([{ x: 317, y: FLOOR }, { x: 358, y: FLOOR }], ink, 1);
    context.globalAlpha = 1;

    // The aperture and clipped foreground make the orb enter the surface.
    context.beginPath();
    context.ellipse(HOLE, FLOOR, 39, 10, 0, 0, Math.PI * 2);
    context.fillStyle = '#020907';
    context.fill();
    context.strokeStyle = palette.accent;
    context.lineWidth = 1.5;
    context.stroke();

    context.save();
    context.beginPath();
    context.rect(0, 0, WIDTH, FLOOR);
    context.ellipse(HOLE, FLOOR, 38, 9, 0, 0, Math.PI * 2);
    context.clip();
    context.save();
    context.translate(orb.x, orb.y);
    context.rotate(moon ? -0.3 : (pushing ? push * 2 : -back * 2));
    if (moon) {
      // A crescent path, not a background-colored circle, stays transparent.
      context.beginPath();
      context.arc(0, 0, 21, -Math.PI / 2, Math.PI / 2, true);
      context.bezierCurveTo(0, 14, -7, -9, 0, -21);
      context.fillStyle = '#e4ede7';
      context.fill();
    } else {
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4;
        line([
          { x: Math.cos(angle) * 24, y: Math.sin(angle) * 24 },
          { x: Math.cos(angle) * 28, y: Math.sin(angle) * 28 },
        ], '#d9a52c', 2.3);
      }
      circle(0, 0, RADIUS, '#f3c654');
      context.globalAlpha = 0.45;
      context.beginPath();
      context.arc(0, 0, 14, 3.5, 5.05);
      context.strokeStyle = '#fff6d1';
      context.lineWidth = 3;
      context.stroke();
      context.globalAlpha = 1;
    }
    context.restore();
    context.restore();

    // A single articulated stick figure keeps hands attached throughout the push.
    const head = { x: figureX + lean, y: 91 };
    const shoulder = { x: figureX + lean * 0.7, y: 110 };
    const hip = { x: figureX, y: 132 };
    context.beginPath();
    context.arc(head.x, head.y, 10, 0, Math.PI * 2);
    context.strokeStyle = ink;
    context.lineWidth = 3.8;
    context.stroke();
    circle(head.x + 4, head.y - 1, 1.4, ink);
    line([{ x: head.x, y: head.y + 10 }, shoulder, hip], ink);
    line([hip, { x: figureX - 10 - stride, y: FLOOR - 2 }, { x: figureX - 3 - stride, y: FLOOR - 2 }], ink);
    line([hip, { x: figureX + 9 + stride, y: FLOOR - 2 }, { x: figureX + 16 + stride, y: FLOOR - 2 }], ink);
    const reach = pushing && t < 1000 ? 1 - ease((t - 780) / 220) : 0;
    const pull = returning ? Math.sin(clamp(t / 800) * Math.PI) : 0;
    const hand = {
      x: lerp(figureX + 17, orb.x - RADIUS - 2, reach),
      y: lerp(133 - pull * 36, 127, reach),
    };
    line([shoulder, { x: figureX + 14, y: 119 - pull * 12 }, hand], ink);
    context.globalAlpha = 0.6;
    line([{ x: shoulder.x - 2, y: shoulder.y + 1 }, { x: figureX - 8, y: 123 }, { x: figureX + reach * 28 - 3, y: 136 - reach * 5 }], ink, 3);
    context.globalAlpha = 1;
    canvas.dataset.phase = transition ? (pushing ? 'sun-dropping' : 'sun-rising') : (dark ? 'night' : 'day');
  }

  function commit(active: Transition) {
    if (active.committed) return;
    active.committed = true;
    dark = active.toDark;
    active.commit();
  }

  function finish(notify = true) {
    cancelAnimationFrame(frame);
    const active = transition;
    if (!active) return;
    commit(active);
    transition = null;
    draw();
    if (notify) active.done();
  }

  function tick(now: number) {
    if (!transition || disposed) return;
    const active = transition;
    const delta = Math.min(now - previousTime, 64);
    previousTime = now;
    active.time += delta;
    const releaseAt = active.toDark ? 760 : 600;
    if (!active.released && active.time >= releaseAt) {
      active.released = true;
      Body.setPosition(ball, { x: HOLE, y: active.toDark ? FLOOR - RADIUS : 173 });
      Body.setVelocity(ball, active.toDark ? { x: 0, y: 0 } : { x: -2, y: -8.9 });
      Body.setAngularVelocity(ball, 0);
      accumulator = 0;
    }
    if (active.released) {
      accumulator += delta;
      while (accumulator >= 1000 / 60) {
        Engine.update(engine, 1000 / 60);
        accumulator -= 1000 / 60;
      }
    }
    if (active.toDark ? (active.released && ball.position.y > FLOOR + 12) : active.time >= 690) commit(active);
    draw();
    if (active.time >= DURATION) finish();
    else frame = requestAnimationFrame(tick);
  }

  draw();
  return {
    setAppearance(isDark: boolean, nextPalette: Palette) {
      palette = nextPalette;
      if (!transition) dark = isDark;
      draw();
      if (!transition) {
        cancelAnimationFrame(frame);
        const until = performance.now() + 700;
        const refreshInk = (now: number) => {
          draw();
          if (now < until && !disposed) frame = requestAnimationFrame(refreshInk);
        };
        frame = requestAnimationFrame(refreshInk);
      }
    },
    start(toDark: boolean, onCommit: () => void, onDone: () => void) {
      if (transition || disposed) return;
      cancelAnimationFrame(frame);
      transition = { toDark, time: 0, released: false, committed: false, commit: onCommit, done: onDone };
      previousTime = performance.now();
      frame = requestAnimationFrame(tick);
    },
    finish,
    destroy() {
      // Honor an accepted click even if navigation interrupts its animation.
      finish(false);
      disposed = true;
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    },
  };
}
