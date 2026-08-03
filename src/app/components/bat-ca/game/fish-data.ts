import { MAX_DEPTH_LIMIT } from "./constants";
import { GEAR_MAX_LEVEL, GEAR_UPGRADE_COSTS } from "./economyConfig";
import type { FishKind, UpgradeType } from "./types";

export const FISH_KINDS: FishKind[] = [
  // Tầng 0-200m: cá nước nông
  { type: "longtong", name: "Cá lòng tong", value: 10, weight: 1, depthMin: 180, depthMax: Math.min(360, MAX_DEPTH_LIMIT), speed: 55, size: 9, rarity: 30, isBad: false, behavior: "normal", color: "#38bdf8", belly: "#e0f2fe" },
  { type: "ro", name: "Cá rô", value: 18, weight: 2, depthMin: 200, depthMax: Math.min(440, MAX_DEPTH_LIMIT), speed: 60, size: 12, rarity: 26, isBad: false, behavior: "normal", color: "#34d399", belly: "#ecfdf5" },
  { type: "tom", name: "Tôm hồng", value: 22, weight: 1, depthMin: 220, depthMax: Math.min(470, MAX_DEPTH_LIMIT), speed: 48, size: 10, rarity: 22, isBad: false, behavior: "normal", color: "#fb923c", belly: "#ffedd5" },

  // Tầng 200-500m
  { type: "cua", name: "Cua đỏ", value: 30, weight: 4, depthMin: 400, depthMax: Math.min(580, MAX_DEPTH_LIMIT), speed: 38, size: 14, rarity: 18, isBad: false, behavior: "normal", color: "#f87171", belly: "#fee2e2" },
  { type: "tre", name: "Cá trê", value: 45, weight: 5, depthMin: 420, depthMax: Math.min(600, MAX_DEPTH_LIMIT), speed: 70, size: 15, rarity: 15, isBad: false, behavior: "normal", color: "#10b981", belly: "#d1fae5" },
  { type: "rac", name: "Rác / dép cũ", value: -5, weight: 3, depthMin: 240, depthMax: Math.min(500, MAX_DEPTH_LIMIT), speed: 18, size: 13, rarity: 16, isBad: true, behavior: "normal", color: "#6b7280", belly: "#9ca3af" },

  // Tầng 500-800m
  { type: "chep", name: "Cá chép vàng", value: 70, weight: 7, depthMin: 500, depthMax: Math.min(650, MAX_DEPTH_LIMIT), minLevel: 2, speed: 80, size: 18, rarity: 10, isBad: false, behavior: "fast", color: "#f59e0b", belly: "#fef3c7" },
  { type: "loc", name: "Cá lóc", value: 95, weight: 6, depthMin: 550, depthMax: Math.min(680, MAX_DEPTH_LIMIT), minLevel: 2, speed: 110, size: 17, rarity: 7, isBad: false, behavior: "fast", color: "#059669", belly: "#a7f3d0" },
  { type: "luondien", name: "Lươn điện", value: 0, weight: 6, depthMin: 350, depthMax: Math.min(600, MAX_DEPTH_LIMIT), speed: 95, size: 12, rarity: 4, isBad: true, behavior: "electric", color: "#06b6d4", belly: "#cffafe" },
  { type: "tuibian", name: "Túi bí ẩn", value: 25, weight: 5, depthMin: 300, depthMax: Math.min(550, MAX_DEPTH_LIMIT), speed: 25, size: 14, rarity: 6, isBad: false, behavior: "mystery", color: "#c084fc", belly: "#f3e8ff" },
  { type: "hoangkim", name: "Cá Hoàng Kim", value: 400, weight: 10, depthMin: 400, depthMax: Math.min(800, MAX_DEPTH_LIMIT), minLevel: 2, speed: 90, size: 16, rarity: 4, isBad: false, behavior: "golden", color: "#fef08a", belly: "#fef9c3", specialVisual: "golden" },

  // Tầng 800-1300m
  { type: "chepvang", name: "Chép Hoàng Gia", value: 160, weight: 10, depthMin: 600, depthMax: Math.min(1000, MAX_DEPTH_LIMIT), minLevel: 3, speed: 100, size: 19, rarity: 3, isBad: false, behavior: "fast", color: "#fbbf24", belly: "#fffbeb" },
  { type: "cavang", name: "Cá Vàng Đèn", value: 250, weight: 4, depthMin: 580, depthMax: Math.min(900, MAX_DEPTH_LIMIT), minLevel: 3, speed: 145, size: 17, rarity: 2, isBad: false, behavior: "golden", color: "#facc15", belly: "#fef9c3" },
  { type: "cadien", name: "Cá Điện", value: 650, weight: 8, depthMin: 700, depthMax: Math.min(1200, MAX_DEPTH_LIMIT), minLevel: 3, speed: 130, size: 15, rarity: 2, isBad: false, behavior: "electric", color: "#0ea5e9", belly: "#e0f2fe", specialVisual: "electric" },

  // Tầng sâu 1300-2000m
  { type: "cangu", name: "Cá ngừ lam", value: 420, weight: 14, depthMin: 1000, depthMax: Math.min(1400, MAX_DEPTH_LIMIT), minLevel: 4, speed: 120, size: 22, rarity: 3, isBad: false, behavior: "fast", color: "#60a5fa", belly: "#dbeafe" },
  { type: "cakieu", name: "Cá kiếm dạ quang", value: 550, weight: 12, depthMin: 1100, depthMax: Math.min(1500, MAX_DEPTH_LIMIT), minLevel: 4, speed: 160, size: 24, rarity: 2, isBad: false, behavior: "fast", color: "#38bdf8", belly: "#e0f2fe" },
  { type: "cavoi", name: "Cá voi xanh", value: 1200, weight: 35, depthMin: 1300, depthMax: Math.min(1700, MAX_DEPTH_LIMIT), minLevel: 4, speed: 50, size: 32, rarity: 1, isBad: false, behavior: "normal", color: "#818cf8", belly: "#e0e7ff" },
  { type: "camabien", name: "Cá Ma Biển", value: 1500, weight: 12, depthMin: 1200, depthMax: Math.min(2000, MAX_DEPTH_LIMIT), minLevel: 4, speed: 85, size: 20, rarity: 1.5, isBad: false, behavior: "mystery", color: "#c084fc", belly: "#f3e8ff", specialVisual: "ghost" },

  // Tầng rất sâu 2000m+
  { type: "caangler", name: "Cá Cần Cẩu Hồng", value: 1800, weight: 18, depthMin: 1800, depthMax: Math.min(2400, MAX_DEPTH_LIMIT), minLevel: 5, speed: 30, size: 20, rarity: 1, isBad: false, behavior: "normal", color: "#f43f5e", belly: "#ffe4e6" },
  { type: "squalodon", name: "Cá mập tím", value: 3000, weight: 45, depthMin: 2000, depthMax: Math.min(3000, MAX_DEPTH_LIMIT), minLevel: 5, speed: 90, size: 36, rarity: 0.6, isBad: false, behavior: "fast", color: "#a855f7", belly: "#f3e8ff" },
  { type: "kraken", name: "Kraken Thần Thoại", value: 8000, weight: 80, depthMin: 2500, depthMax: Math.min(4000, MAX_DEPTH_LIMIT), minLevel: 6, speed: 70, size: 48, rarity: 0.2, isBad: false, behavior: "normal", color: "#ec4899", belly: "#fdf2f8" },
  { type: "cauvong", name: "Cá Cầu Vồng", value: 5000, weight: 20, depthMin: 2000, depthMax: Math.min(3500, MAX_DEPTH_LIMIT), minLevel: 5, speed: 110, size: 26, rarity: 0.5, isBad: false, behavior: "fast", color: "#f472b6", belly: "#fce7f3", specialVisual: "rainbow" },
];

export const UPGRADE_ORDER: UpgradeType[] = ["depth", "netSize", "pullSpeed", "capacity"];

export const UPGRADE_META = {
  depth: {
    name: "Độ sâu",
    desc: "Lưới xuống sâu hơn để gặp cá to.",
    maxLevel: GEAR_MAX_LEVEL,
    costs: GEAR_UPGRADE_COSTS.depth,
  },
  netSize: {
    name: "Cỡ lưới",
    desc: "Bán kính bắt cá lớn hơn.",
    maxLevel: GEAR_MAX_LEVEL,
    costs: GEAR_UPGRADE_COSTS.netSize,
  },
  pullSpeed: {
    name: "Tốc độ kéo",
    desc: "Kéo lưới lên nhanh hơn.",
    maxLevel: GEAR_MAX_LEVEL,
    costs: GEAR_UPGRADE_COSTS.pullSpeed,
  },
  capacity: {
    name: "Sức chứa",
    desc: "Bắt được nhiều cá hơn mỗi lượt.",
    maxLevel: GEAR_MAX_LEVEL,
    costs: GEAR_UPGRADE_COSTS.capacity,
  },
} as const;
