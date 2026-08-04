export interface HookDefinition {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  price: number;
  valueMultiplier: number;
  speedMultiplier: number;
  color: string;
  accentColor: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  capacityBonus?: number;
  offlineTimeBonusHours?: number;
  offlineRateMultiplier?: number;
  image: string;
}

export const HOOK_DEFINITIONS: HookDefinition[] = [
  {
    id: "classic",
    name: "Lưỡi Treo Cổ Điển",
    nameEn: "Classic Hook",
    desc: "Lưỡi câu tiêu chuẩn của ngư dân ao làng.",
    descEn: "Standard village fishing hook.",
    price: 0,
    valueMultiplier: 1.0,
    speedMultiplier: 1.0,
    color: "#cbd5e1",
    accentColor: "#64748b",
    rarity: "common",
    image: "/hook.png",
  },
  {
    id: "fast",
    name: "Lưỡi Siêu Tốc",
    nameEn: "Super Fast Hook",
    desc: "Thiết kế khí động học, tăng 50% tốc độ kéo.",
    descEn: "Aerodynamic design, +50% pull speed.",
    price: 600,
    valueMultiplier: 1.0,
    speedMultiplier: 1.5,
    color: "#3b82f6",
    accentColor: "#1d4ed8",
    rarity: "rare",
    image: "/hooks/hooksfast.png",
  },
  {
    id: "plus2",
    name: "Lưỡi Cú Đúp",
    nameEn: "Double Catch Hook",
    desc: "Lưỡi câu đôi, bắt thêm 2 con cá mỗi lần thả.",
    descEn: "Double hook, catch +2 fish per cast.",
    price: 1000,
    valueMultiplier: 1.0,
    speedMultiplier: 1.0,
    capacityBonus: 2,
    color: "#10b981",
    accentColor: "#047857",
    rarity: "epic",
    image: "/hooks/hookplus2fish.png",
  },
  {
    id: "lucky_gold",
    name: "Lưỡi Vàng Tài Lộc",
    nameEn: "Lucky Gold Hook",
    desc: "Đúc từ vàng khối ròng, tăng 50% giá trị cá bán được.",
    descEn: "Solid gold, +50% fish value.",
    price: 2000,
    valueMultiplier: 1.5,
    speedMultiplier: 1.0,
    color: "#f59e0b",
    accentColor: "#b45309",
    rarity: "legendary",
    image: "/hooks/hookplusgold.png",
  },
  {
    id: "coin",
    name: "Lưỡi Tiền Tệ",
    nameEn: "Coin Hook",
    desc: "Thu hút đồng xu ngay cả khi bạn không có mặt. Tăng 50% tiền treo máy.",
    descEn: "Attracts coins while you're away. +50% AFK money.",
    price: 3000,
    valueMultiplier: 1.0,
    speedMultiplier: 1.0,
    offlineRateMultiplier: 1.5,
    color: "#eab308",
    accentColor: "#a16207",
    rarity: "legendary",
    image: "/hooks/hookcoin.png",
  },
  {
    id: "times",
    name: "Lưỡi Thời Gian",
    nameEn: "Time Hook",
    desc: "Bẻ cong thời gian, tăng giới hạn treo máy nhận tiền thêm 4 giờ.",
    descEn: "Bends time, adds 4 hours to AFK limit.",
    price: 3000,
    valueMultiplier: 1.0,
    speedMultiplier: 1.0,
    offlineTimeBonusHours: 4,
    color: "#6366f1",
    accentColor: "#4338ca",
    rarity: "legendary",
    image: "/hooks/hooktimes.png",
  },
];

export const HOOK_UNLOCK_PRICES = [
  0,        // 1st (default)
  5000,     // 2nd
  25000,    // 3rd
  75000,    // 4th
  250000,   // 5th
  1000000,  // 6th
];

export function getHookUnlockPrice(unlockedCount: number): number {
  return HOOK_UNLOCK_PRICES[unlockedCount] || 1000000;
}

export function getHookDefinition(id: string): HookDefinition {
  return HOOK_DEFINITIONS.find((h) => h.id === id) ?? HOOK_DEFINITIONS[0];
}
