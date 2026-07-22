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
  },
  {
    id: "silver",
    name: "Lưỡi Thép Bạc",
    nameEn: "Silver Steel Hook",
    desc: "Sắc bén hơn, tăng 10% giá trị cá đánh bắt.",
    descEn: "Sharper hook, +10% fish catch value.",
    price: 150,
    valueMultiplier: 1.1,
    speedMultiplier: 1.0,
    color: "#94a3b8",
    accentColor: "#475569",
    rarity: "rare",
  },
  {
    id: "gold",
    name: "Lưỡi Vàng Hoàng Gia",
    nameEn: "Royal Gold Hook",
    desc: "Mạ vàng nguyên chất, tăng 25% giá trị cá.",
    descEn: "Pure gold plated, +25% fish value.",
    price: 400,
    valueMultiplier: 1.25,
    speedMultiplier: 1.05,
    color: "#f59e0b",
    accentColor: "#b45309",
    rarity: "epic",
  },
  {
    id: "magnet",
    name: "Lưỡi Nam Châm",
    nameEn: "Magnet Hook",
    desc: "Hút cá nhanh hơn, tăng 20% tốc độ kéo.",
    descEn: "Attracts fish faster, +20% pull speed.",
    price: 800,
    valueMultiplier: 1.15,
    speedMultiplier: 1.2,
    color: "#ef4444",
    accentColor: "#991b1b",
    rarity: "epic",
  },
  {
    id: "cyber",
    name: "Lưỡi Neon Cyber",
    nameEn: "Cyber Neon Hook",
    desc: "Công nghệ tương lai, tăng 50% giá trị cá.",
    descEn: "Futuristic tech, +50% fish catch value.",
    price: 1500,
    valueMultiplier: 1.5,
    speedMultiplier: 1.15,
    color: "#06b6d4",
    accentColor: "#0e7490",
    rarity: "legendary",
  },
];

export const RANDOM_HOOK_UNLOCK_PRICE = 200;

export function getHookDefinition(id: string): HookDefinition {
  return HOOK_DEFINITIONS.find((h) => h.id === id) ?? HOOK_DEFINITIONS[0];
}
