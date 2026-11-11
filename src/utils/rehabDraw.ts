/**
 * Canvas drawing engine directly ported from rehab-web/frontend/src/draw.js
 * and post_surgery_rehab.py.
 * Exactly matches colors, dimensions, layouts, degree badges, and UI overlays.
 */

export const W = 1280;
export const H = 720;

// BGR to RGB helper
const bgr = (b: number, g: number, r: number) => `rgb(${r},${g},${b})`;

// Landmark indices (MediaPipe 33 Keypoints)
export const NOSE = 0;
export const R_EAR = 8;
export const L_EAR = 7;
export const L_SHLD = 11;
export const R_SHLD = 12;
export const L_ELB = 13;
export const R_ELB = 14;
export const L_WRI = 15;
export const R_WRI = 16;
export const L_HIP = 23;
export const R_HIP = 24;

export const DOTS = [NOSE, R_EAR, R_SHLD, R_ELB, R_WRI, R_HIP, L_SHLD, L_ELB, L_WRI, L_HIP];

export const CONNECTIONS: [number, number][] = [
  [R_EAR, R_SHLD],
  [R_SHLD, R_ELB],
  [R_ELB, R_WRI],
  [R_SHLD, R_HIP],
  [L_SHLD, L_ELB],
  [L_ELB, L_WRI],
  [L_SHLD, L_HIP],
  [R_SHLD, L_SHLD],
  [R_HIP, L_HIP],
];

// Helper functions matching Python cv2 primitives
export const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const rad = (d: number) => (d * Math.PI) / 180;

function put(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  thick = 1
) {
  ctx.font = `${thick >= 2 ? 700 : 500} ${Math.round(scale * 32)}px "Segoe UI", Arial, sans-serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function circle(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  r: number,
  color: string,
  fill = true,
  width = 1
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function line(
  ctx: CanvasRenderingContext2D,
  a: [number, number],
  b: [number, number],
  color: string,
  width: number
) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function box(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fill: string | null,
  stroke?: string | null,
  alpha = 1,
  strokeW = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  }
  if (stroke) {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }
  ctx.restore();
}

// ── _draw_skeleton ──
export function drawSkeleton(ctx: CanvasRenderingContext2D, pts: [number, number][], ok: boolean) {
  const cDot = ok ? bgr(0, 220, 100) : bgr(0, 0, 255);
  const cLine = ok ? bgr(0, 180, 80) : bgr(0, 0, 200);

  DOTS.forEach((i) => {
    if (pts[i]) circle(ctx, pts[i], 5, cDot);
  });

  CONNECTIONS.forEach(([a, b]) => {
    if (pts[a] && pts[b]) line(ctx, pts[a], pts[b], cLine, 2);
  });
}

// ── _draw_degree_badge ──
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  angle: number,
  label: string,
  color: string
) {
  const text = `${label}: ${Math.round(angle)}°`;
  const scale = 0.55;
  ctx.font = `700 ${Math.round(scale * 32)}px "Segoe UI", Arial, sans-serif`;
  const tw = ctx.measureText(text).width;
  const th = Math.round(scale * 22);
  const padX = 6, padY = 4;

  let bx = x + 15 + tw + padX * 2 < W ? x + 15 : x - tw - padX * 2 - 15;
  let by = y - 10 - th - padY * 2 > 0 ? y - 10 : y + 25;
  bx = Math.max(5, Math.min(W - tw - padX * 2 - 5, bx));
  by = Math.max(5 + th + padY * 2, Math.min(H - 5, by));

  box(ctx, bx, by - th - padY * 2, bx + tw + padX * 2, by, bgr(20, 20, 20), color, 0.75, 1);
  put(ctx, text, bx + padX, by - padY - 2, scale, '#fff', 2);
}

// ── _draw_joint_datapoints_and_angle ──
export function drawJoint(
  ctx: CanvasRenderingContext2D,
  base: [number, number],
  vertex: [number, number],
  arm: [number, number],
  angle: number,
  label: string,
  active: boolean
) {
  const accent = active ? bgr(0, 255, 200) : bgr(0, 230, 255);
  const ray = active ? bgr(0, 215, 255) : bgr(255, 200, 0);

  line(ctx, vertex, base, ray, 3);
  line(ctx, vertex, arm, ray, 3);

  [base, arm].forEach((p) => {
    circle(ctx, p, 6, bgr(255, 180, 0));
    circle(ctx, p, 8, '#fff', false, 1);
  });

  circle(ctx, vertex, active ? 12 : 10, accent, false, 2);
  circle(ctx, vertex, 6, accent);
  circle(ctx, vertex, 2, '#fff');

  const d1 = dist(vertex, base), d2 = dist(vertex, arm);
  if (d1 > 10 && d2 > 10) {
    const a1 = (Math.atan2(base[1] - vertex[1], base[0] - vertex[0]) * 180) / Math.PI;
    const a2 = (Math.atan2(arm[1] - vertex[1], arm[0] - vertex[0]) * 180) / Math.PI;
    const diff = (((a2 - a1) % 360) + 360) % 360;
    const [start, end] = diff <= 180 ? [a1, a1 + diff] : [a2, a2 + (360 - diff)];
    const r = Math.max(18, Math.min(35, Math.trunc(Math.min(d1, d2) * 0.35)));
    ctx.beginPath();
    ctx.arc(vertex[0], vertex[1], r, rad(start), rad(end));
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }
  drawBadge(ctx, vertex, angle, label, accent);
}

// ── _draw_shoulder_measurements ──
export function drawShoulders(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  info: { l_angle: number; r_angle: number; use_wrist?: boolean; r_active?: boolean }
) {
  const lArm = info.use_wrist ? pts[L_WRI] : pts[L_ELB];
  const rArm = info.use_wrist ? pts[R_WRI] : pts[R_ELB];

  if (pts[L_HIP] && pts[L_SHLD] && lArm) {
    drawJoint(ctx, pts[L_HIP], pts[L_SHLD], lArm, info.l_angle, 'L', false);
  }
  if (pts[R_HIP] && pts[R_SHLD] && rArm) {
    drawJoint(ctx, pts[R_HIP], pts[R_SHLD], rArm, info.r_angle, 'R', !!info.r_active);
  }
}

// ── ProgressBar.draw ──
export function drawProgressBar(ctx: CanvasRenderingContext2D, progress: number) {
  const x1 = W - 20 - 30, x2 = W - 20, y1 = 80, y2 = H - 40, barH = y2 - y1;
  box(ctx, x1 - 2, y1 - 2, x2 + 2, y2 + 2, bgr(50, 50, 50));
  box(ctx, x1 - 2, y1 - 2, x2 + 2, y2 + 2, null, bgr(200, 200, 200));

  const clampedProg = Math.max(0, Math.min(1, progress));
  const fillH = Math.trunc(barH * clampedProg);
  const color = clampedProg >= 0.8 ? bgr(0, 220, 100) : clampedProg >= 0.4 ? bgr(0, 200, 255) : bgr(0, 80, 220);
  box(ctx, x1, y2 - fillH, x2, y2, color);
  put(ctx, `${Math.trunc(clampedProg * 100)}%`, x1 - 5, y2 + 25, 0.55, '#fff');
}

// ── _draw_hud ──
export function drawHud(
  ctx: CanvasRenderingContext2D,
  info: {
    exercise: string;
    reps: number;
    angle: number;
    target?: number;
    l_angle: number;
    r_angle: number;
    hit_target: boolean;
    form_ok: boolean;
    form_message: string;
  }
): [number, number, number, number] {
  box(ctx, 0, 0, W, 70, bgr(30, 30, 30), null, 0.75);
  put(ctx, info.exercise, 15, 30, 0.85, bgr(0, 255, 200), 2);
  put(ctx, `Completed Reps: ${info.reps}`, 15, 58, 0.7, '#fff', 2);
  
  const targetDeg = info.target || 110;
  put(ctx, `Angle: ${Math.trunc(info.angle)}°  [Target: ${Math.trunc(targetDeg)}°]`, W / 2 - 130, 30, 0.65, bgr(0, 255, 255), 2);
  put(
    ctx,
    `Shoulders: L:${Math.trunc(info.l_angle)}° | R:${Math.trunc(info.r_angle)}°`,
    W / 2 - 130,
    58,
    0.5,
    bgr(200, 220, 255)
  );

  put(
    ctx,
    info.hit_target ? 'TARGET HIT! Return to count rep' : `Raise arm to ${targetDeg}°`,
    W / 2 + 100,
    30,
    0.55,
    info.hit_target ? bgr(0, 255, 120) : bgr(255, 200, 0),
    2
  );

  const bw = 135, bh = 46, bx1 = W - bw - 20, by1 = 12;
  box(ctx, bx1, by1, bx1 + bw, by1 + bh, bgr(40, 42, 52), bgr(0, 230, 255), 0.85, 2);
  put(ctx, '< BACK', bx1 + 18, by1 + 27, 0.65, '#fff', 2);
  put(ctx, '[Esc / Click]', bx1 + 24, by1 + 40, 0.35, bgr(180, 220, 220));

  if (!info.form_ok && info.form_message) {
    put(ctx, `!! ${info.form_message} !!`, 15, H - 30, 0.75, bgr(0, 0, 255), 2);
  }
  return [bx1, by1, bx1 + bw, by1 + bh];
}

// ── _draw_idle (Main Menu) ──
export const MENU_ITEMS: [string, string, string, string][] = [
  ['f', 'F', 'Shoulder Flexion', 'Forward Arm Raise (Target: 150 deg)'],
  ['a', 'A', 'Shoulder Abduction', 'Lateral Arm Raise to Side (Target: 150 deg)'],
  ['c', 'C', 'Cross-Body Reach', 'Horizontal Adduction Stretch (Target: 30 deg)'],
  ['p', 'P', 'Shoulder Press', 'Overhead Shoulder Press (Target: 170 deg)'],
];

export function drawIdle(
  ctx: CanvasRenderingContext2D,
  lAngle?: number,
  rAngle?: number
): Record<string, [number, number, number, number]> {
  box(ctx, 0, 0, W, 75, bgr(30, 30, 30), null, 0.65);
  put(ctx, 'SHOULDER REHABILITATION ASSISTANT', 15, 30, 0.75, bgr(0, 255, 200), 2);
  if (lAngle != null && rAngle != null) {
    put(
      ctx,
      `Shoulders Live: L:${Math.trunc(lAngle)} deg | R:${Math.trunc(rAngle)} deg`,
      W - 440,
      30,
      0.55,
      bgr(0, 255, 255)
    );
  }
  put(
    ctx,
    'Select a Shoulder Exercise: Click card below or press key  |  Q = Quit',
    15,
    60,
    0.5,
    bgr(200, 200, 200)
  );

  const rects: Record<string, [number, number, number, number]> = {};
  MENU_ITEMS.forEach(([key, keyChar, name, desc], i) => {
    const x1 = 30, y1 = 105 + i * 62, x2 = x1 + 540, y2 = y1 + 50;
    rects[key] = [x1, y1, x2, y2];
    box(ctx, x1, y1, x2, y2, bgr(25, 28, 35), bgr(70, 100, 120), 0.8);
    box(ctx, x1 + 10, y1 + 10, x1 + 46, y1 + 40, bgr(0, 200, 160));
    put(ctx, keyChar, x1 + 20, y1 + 32, 0.6, bgr(20, 20, 20), 2);
    put(ctx, name, x1 + 58, y1 + 23, 0.6, '#fff', 2);
    put(ctx, desc, x1 + 58, y1 + 42, 0.42, bgr(180, 200, 200));
    put(ctx, '>', x2 - 25, y1 + 32, 0.65, bgr(0, 255, 200), 2);
  });
  return rects;
}

/**
 * Draws the camera frame mirrored onto the 1280x720 canvas,
 * followed by the skeleton, joint angles, HUD, and buttons.
 */
export function drawCompleteFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  info: any,
  activeKey: string | null
): { back: [number, number, number, number] | null; menu: Record<string, [number, number, number, number]> | null } {
  const rects: {
    back: [number, number, number, number] | null;
    menu: Record<string, [number, number, number, number]> | null;
  } = { back: null, menu: null };

  // 1. Draw mirrored video directly onto the 1280x720 canvas (center-cover preserving aspect ratio)
  if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const canvasRatio = W / H;
    const videoRatio = vw / vh;

    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoRatio > canvasRatio) {
      // Video is wider than canvas
      sw = vh * canvasRatio;
      sx = (vw - sw) / 2;
    } else {
      // Video is taller than canvas (e.g. mobile portrait video)
      sh = vw / canvasRatio;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();
  } else {
    // Backdrop if camera initializing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Draw Pose overlays or Idle screen
  if (info && info.found && info.landmarks && info.landmarks.length > 0) {
    const pts: [number, number][] = info.landmarks.map(([x, y]: [number, number]) => [
      Math.trunc(x * W),
      Math.trunc(y * H),
    ]);

    if (activeKey) {
      // Active exercise screen
      drawSkeleton(ctx, pts, info.form_ok);
      drawShoulders(ctx, pts, info);
      rects.back = drawHud(ctx, info);
      drawProgressBar(ctx, info.progress);
    } else {
      // Main menu with a person in camera view
      drawSkeleton(ctx, pts, true);
      drawShoulders(ctx, pts, info);
      rects.menu = drawIdle(ctx, info.l_angle, info.r_angle);
    }
  } else {
    // Nobody detected or idle menu
    if (activeKey) {
      rects.back = drawHud(ctx, {
        exercise: info?.exercise || 'EXERCISE',
        reps: info?.reps ?? 0,
        angle: info?.angle ?? 0,
        l_angle: info?.l_angle ?? 0,
        r_angle: info?.r_angle ?? 0,
        hit_target: !!info?.hit_target,
        form_ok: info?.form_ok !== false,
        form_message: info?.form_message || '',
      });
      drawProgressBar(ctx, info?.progress ?? 0);
    } else {
      rects.menu = drawIdle(ctx, info?.l_angle, info?.r_angle);
    }
  }

  return rects;
}
