import { MAX_DEPTH_LIMIT } from "./constants";
import type { FishKind, UpgradeType } from "./types";

export const FISH_KINDS: FishKind[] = [
  // Tầng 0-200m: cá nước nông
  { type: "longtong", name: "Cá lòng tong", value: 10, weight: 1, depthMin: 180, depthMax: Math.min(360, MAX_DEPTH_LIMIT), speed: 55, size: 9, rarity: 30, isBad: false, behavior: "normal", color: "#9fb6c8", belly: "#e8eef3" },
  { type: "ro", name: "Cá rô", value: 18, weight: 2, depthMin: 200, depthMax: Math.min(440, MAX_DEPTH_LIMIT), speed: 60, size: 12, rarity: 26, isBad: false, behavior: "normal", color: "#7d8a55", belly: "#cdd79a" },
  { type: "tom", name: "Tôm", value: 22, weight: 1, depthMin: 220, depthMax: Math.min(470, MAX_DEPTH_LIMIT), speed: 48, size: 10, rarity: 22, isBad: false, behavior: "normal", color: "#e88a5a", belly: "#f6c6a3" },

  // Tầng 200-500m
  { type: "cua", name: "Cua đồng", value: 30, weight: 4, depthMin: 400, depthMax: Math.min(580, MAX_DEPTH_LIMIT), speed: 38, size: 14, rarity: 18, isBad: false, behavior: "normal", color: "#b85a22", belly: "#e0a06a" },
  { type: "tre", name: "Cá trê", value: 45, weight: 5, depthMin: 420, depthMax: Math.min(600, MAX_DEPTH_LIMIT), speed: 70, size: 15, rarity: 15, isBad: false, behavior: "normal", color: "#4c5240", belly: "#8a906f" },
  { type: "rac", name: "Rác / dép cũ", value: -5, weight: 3, depthMin: 240, depthMax: Math.min(500, MAX_DEPTH_LIMIT), speed: 18, size: 13, rarity: 16, isBad: true, behavior: "normal", color: "#6b6354", belly: "#8a8170" },

  // Tầng 500-800m
  { type: "chep", name: "Cá chép", value: 70, weight: 7, depthMin: 500, depthMax: Math.min(650, MAX_DEPTH_LIMIT), speed: 80, size: 18, rarity: 10, isBad: false, behavior: "fast", color: "#c07a3a", belly: "#f0c177" },
  { type: "loc", name: "Cá lóc", value: 95, weight: 6, depthMin: 550, depthMax: Math.min(680, MAX_DEPTH_LIMIT), speed: 110, size: 17, rarity: 7, isBad: false, behavior: "fast", color: "#3d4733", belly: "#7c8560" },
  { type: "luondien", name: "Lươn điện", value: 0, weight: 6, depthMin: 350, depthMax: Math.min(600, MAX_DEPTH_LIMIT), speed: 95, size: 12, rarity: 4, isBad: true, behavior: "electric", color: "#5aa8c7", belly: "#a8d8ec" },
  { type: "tuibian", name: "Túi bí ẩn", value: 25, weight: 5, depthMin: 300, depthMax: Math.min(550, MAX_DEPTH_LIMIT), speed: 25, size: 14, rarity: 6, isBad: false, behavior: "mystery", color: "#8e4e22", belly: "#d4a76a" },

  // Tầng 800-1300m
  { type: "chepvang", name: "Cá chép vàng", value: 160, weight: 10, depthMin: 600, depthMax: Math.min(1000, MAX_DEPTH_LIMIT), speed: 100, size: 19, rarity: 3, isBad: false, behavior: "fast", color: "#f0b840", belly: "#ffe39a" },
  { type: "cavang", name: "Cá vàng", value: 250, weight: 4, depthMin: 580, depthMax: Math.min(900, MAX_DEPTH_LIMIT), speed: 145, size: 17, rarity: 2, isBad: false, behavior: "golden", color: "#f0b840", belly: "#ffe39a" },

  // Tầng sâu 1300-2000m
  { type: "cangu", name: "Cá ngừ vây xanh", value: 420, weight: 14, depthMin: 1000, depthMax: Math.min(1400, MAX_DEPTH_LIMIT), speed: 120, size: 22, rarity: 3, isBad: false, behavior: "fast", color: "#2a4d6e", belly: "#6b8fa8" },
  { type: "cakieu", name: "Cá kiếm", value: 550, weight: 12, depthMin: 1100, depthMax: Math.min(1500, MAX_DEPTH_LIMIT), speed: 160, size: 24, rarity: 2, isBad: false, behavior: "fast", color: "#5a7a96", belly: "#9fb6c8" },
  { type: "cavoi", name: "Cá voi nhỏ", value: 1200, weight: 35, depthMin: 1300, depthMax: Math.min(1700, MAX_DEPTH_LIMIT), speed: 50, size: 32, rarity: 1, isBad: false, behavior: "normal", color: "#3d4a52", belly: "#7a8a94" },

  // Tầng rất sâu 2000m+
  { type: "caangler", name: "Cá cần cẩu", value: 1800, weight: 18, depthMin: 1800, depthMax: Math.min(2400, MAX_DEPTH_LIMIT), speed: 30, size: 20, rarity: 1, isBad: false, behavior: "normal", color: "#1a2a33", belly: "#4a5a64" },
  { type: "squalodon", name: "Cá mập cổ đại", value: 3000, weight: 45, depthMin: 2000, depthMax: Math.min(3000, MAX_DEPTH_LIMIT), speed: 90, size: 36, rarity: 0.6, isBad: false, behavior: "fast", color: "#2a2a2a", belly: "#4f4f4f" },
  { type: "kraken", name: "Kraken", value: 8000, weight: 80, depthMin: 2500, depthMax: Math.min(4000, MAX_DEPTH_LIMIT), speed: 70, size: 48, rarity: 0.2, isBad: false, behavior: "normal", color: "#1a1020", belly: "#3a2a40" },
];

export const UPGRADE_ORDER: UpgradeType[] = ["depth", "netSize", "pullSpeed", "capacity"];

export const UPGRADE_META = {
  depth: {
    name: "Độ sâu",
    desc: "Lưới xuống sâu hơn để gặp cá to.",
    maxLevel: 5,
    costs: [120, 300, 800, 2000, 5500],
  },
  netSize: {
    name: "Cỡ lưới",
    desc: "Bán kính bắt cá lớn hơn.",
    maxLevel: 5,
    costs: [150, 350, 750, 1500, 2800],
  },
  pullSpeed: {
    name: "Tốc độ kéo",
    desc: "Kéo lưới lên nhanh hơn.",
    maxLevel: 5,
    costs: [130, 320, 700, 1400, 2600],
  },
  capacity: {
    name: "Sức chứa",
    desc: "Bắt được nhiều cá hơn mỗi lượt.",
    maxLevel: 5,
    costs: [180, 420, 900, 1700, 3200],
  },
} as const;

