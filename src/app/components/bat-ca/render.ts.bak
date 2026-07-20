// Vẽ scene game bằng Canvas 2D trong hệ toạ độ logic (390 x 844).
import {
  Game, Fish, LOGICAL_WIDTH, LOGICAL_HEIGHT, SURFACE_Y, BOTTOM_Y,
} from "./engine";

// Palette "Bộ Lạc Đậu Phộng"
const C = {
  paper: "#f5ecd7",
  paperWarm: "#efe3c4",
  ink: "#2a2418",
  bamboo: "#6b8e3d",
  bambooSoft: "#c8d68a",
  leafDeep: "#4c6630",
  earth: "#8e4e22",
  orange: "#e87432",
  yellow: "#f0b840",
};

let bgCache: { w: number; h: number; canvas: HTMLCanvasElement } | null = null;

function buildBackground(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;

  // Bầu trời giấy dó
  const sky = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  sky.addColorStop(0, C.paper);
  sky.addColorStop(1, C.paperWarm);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, SURFACE_Y);

  // Núi mờ
  ctx.fillStyle = "rgba(230,216,178,0.6)";
  ctx.beginPath();
  ctx.moveTo(0, SURFACE_Y);
  ctx.quadraticCurveTo(w * 0.25, SURFACE_Y - 70, w * 0.5, SURFACE_Y - 30);
  ctx.quadraticCurveTo(w * 0.78, SURFACE_Y + 8, w, SURFACE_Y - 40);
  ctx.lineTo(w, SURFACE_Y); ctx.closePath(); ctx.fill();

  // Đàn cò
  ctx.strokeStyle = "rgba(138,125,101,0.6)";
  ctx.lineWidth = 1.4; ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const bx = 60 + i * 60, by = 50 + (i % 2) * 16;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by); ctx.lineTo(bx, by - 5); ctx.lineTo(bx + 6, by);
    ctx.stroke();
  }

  // Khóm tre hai bên
  ctx.strokeStyle = "rgba(107,142,61,0.5)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 5;
    ctx.beginPath(); ctx.moveTo(x, SURFACE_Y); ctx.lineTo(x - 4, 40); ctx.stroke();
    const x2 = w - 6 - i * 5;
    ctx.beginPath(); ctx.moveTo(x2, SURFACE_Y); ctx.lineTo(x2 + 4, 50); ctx.stroke();
  }

  // Nước nhiều tầng (đậm dần theo độ sâu)
  const water = ctx.createLinearGradient(0, SURFACE_Y, 0, BOTTOM_Y);
  water.addColorStop(0, "#7fb4c4");
  water.addColorStop(0.35, "#4f93a8");
  water.addColorStop(0.7, "#2f6f86");
  water.addColorStop(1, "#1d4d5e");
  ctx.fillStyle = water;
  ctx.fillRect(0, SURFACE_Y, w, BOTTOM_Y - SURFACE_Y);

  // Tia sáng dưới nước
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 75;
    ctx.beginPath();
    ctx.moveTo(x, SURFACE_Y); ctx.lineTo(x + 26, SURFACE_Y);
    ctx.lineTo(x + 60, BOTTOM_Y); ctx.lineTo(x + 20, BOTTOM_Y);
    ctx.closePath(); ctx.fill();
  }

  // Đáy bùn
  ctx.fillStyle = "#163b48";
  ctx.beginPath();
  ctx.moveTo(0, BOTTOM_Y);
  ctx.quadraticCurveTo(w * 0.5, BOTTOM_Y - 18, w, BOTTOM_Y);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

  // Lá sen + bèo trên mặt nước
  drawLotus(ctx, 70, SURFACE_Y, 34);
  drawLotus(ctx, w - 64, SURFACE_Y, 28);
  drawLotus(ctx, w * 0.5, SURFACE_Y, 22);

  bgCache = { w, h, canvas: cv };
  return cv;
}

function drawLotus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#5e9e4a";
  ctx.strokeStyle = "rgba(42,36,24,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.5, 0, 0.4, Math.PI * 2 - 0.1);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(42,36,24,0.18)";
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5); ctx.stroke();
  }
  ctx.restore();
}

function drawFish(ctx: CanvasRenderingContext2D, f: Fish) {
  const dir = f.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(dir, 1);
  const s = f.size;

  if (f.kind.isBad) {
    // Rác / dép cũ
    ctx.fillStyle = f.kind.color;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.6, 0.3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.2); ctx.lineTo(s * 0.4, -s * 0.5); ctx.stroke();
    ctx.restore();
    return;
  }

  if (f.kind.type === "tom") {
    ctx.fillStyle = f.kind.color; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, s, 0.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s, -2); ctx.lineTo(s + 6, -6); ctx.moveTo(s, 2); ctx.lineTo(s + 6, 6); ctx.stroke();
    ctx.restore();
    return;
  }

  if (f.kind.type === "cua") {
    ctx.fillStyle = f.kind.color; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s, 0); ctx.lineTo(-s - 6, -4); ctx.moveTo(s, 0); ctx.lineTo(s + 6, -4);
    ctx.moveTo(-s * 0.6, s * 0.5); ctx.lineTo(-s * 0.6, s + 4);
    ctx.moveTo(s * 0.6, s * 0.5); ctx.lineTo(s * 0.6, s + 4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Cá thường: thân ellipse + đuôi tam giác
  // Đuôi
  ctx.fillStyle = f.kind.color;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, 0);
  ctx.lineTo(-s * 1.7, -s * 0.7);
  ctx.lineTo(-s * 1.7, s * 0.7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Thân
  const g = ctx.createLinearGradient(0, -s, 0, s);
  g.addColorStop(0, f.kind.color);
  g.addColorStop(1, f.kind.belly);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 1.3, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Vây lưng
  ctx.fillStyle = f.kind.color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.7); ctx.lineTo(s * 0.3, -s * 1.1); ctx.lineTo(s * 0.5, -s * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Mắt
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.1, s * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawNet(ctx: CanvasRenderingContext2D, g: Game) {
  const n = g.net;
  const r = g.stats.netSize;
  // Dây từ cầu tre xuống lưới
  ctx.strokeStyle = "rgba(42,36,24,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(n.x, 110);
  ctx.lineTo(n.x, n.y - r);
  ctx.stroke();

  // Cần tre nhỏ ở mặt nước
  ctx.strokeStyle = C.earth; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(n.x - 22, 108); ctx.lineTo(n.x + 14, 100); ctx.stroke();

  // Vành lưới
  ctx.strokeStyle = "#d8c9a0"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
  // Túi lưới
  ctx.fillStyle = "rgba(245,236,215,0.18)";
  ctx.beginPath();
  ctx.moveTo(n.x - r, n.y);
  ctx.quadraticCurveTo(n.x, n.y + r * 1.8, n.x + r, n.y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(245,236,215,0.5)"; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const sx = n.x + (i / 2) * r;
    ctx.beginPath(); ctx.moveTo(sx, n.y);
    ctx.quadraticCurveTo(n.x, n.y + r * 1.8, sx * 0 + n.x + (i / 4) * r, n.y + r * 1.4);
    ctx.stroke();
  }
}

export function renderScene(ctx: CanvasRenderingContext2D, g: Game) {
  const w = LOGICAL_WIDTH, h = LOGICAL_HEIGHT;
  const bg = bgCache && bgCache.w === w && bgCache.h === h ? bgCache.canvas : buildBackground(w, h);
  ctx.drawImage(bg, 0, 0);

  // Gợn nước mặt
  ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 12) {
    const yy = SURFACE_Y + Math.sin(x * 0.08 + performance.now() * 0.002) * 2;
    if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke();

  for (const f of g.fish) drawFish(ctx, f);
  drawNet(ctx, g);

  // Ripples
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  for (const rp of g.ripples) {
    ctx.globalAlpha = 1 - rp.age / 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Feedback text
  ctx.textAlign = "center";
  ctx.font = "700 16px 'Be Vietnam Pro', sans-serif";
  for (const t of g.feedback) {
    ctx.globalAlpha = 1 - t.age / t.life;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(t.text, t.x + 1, t.y + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
