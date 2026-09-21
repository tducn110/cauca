import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "07-cauca-language";

export let isOnlineSession = false;
export const setOnlineSession = (online: boolean): void => {
  isOnlineSession = online;
};

type SupportedLanguage = "vi" | "en";
const DEFAULT_LANGUAGE: SupportedLanguage = "en";
export const isSupportedLanguage = (value: string | null): value is SupportedLanguage =>
  value === "vi" || value === "en";

export const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(value)) return value;
  } catch {
    // Storage read failure fallback
  }
  return DEFAULT_LANGUAGE;
};

export const formatNumber = (value: number, lang?: string): string => {
  const current = lang || i18n.resolvedLanguage || i18n.language || "en";
  return value.toLocaleString(current.startsWith("vi") ? "vi-VN" : "en-US");
};

export const persistLanguage = (language: string): void => {
  if (isOnlineSession) return;
  const normalized = language.split("-")[0];
  if (typeof window === "undefined" || !isSupportedLanguage(normalized)) return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Optional persistence.
  }
};

export const syncDocumentLang = (language: string): void => {
  if (typeof document === "undefined") return;
  const normalized = language.split("-")[0];
  document.documentElement.lang = isSupportedLanguage(normalized) ? normalized : "en";
};

const resources = {
  vi: {
    translation: {
      common: {
        play: "Chơi",
        pause: "Tạm dừng",
        resume: "Tiếp tục",
        back: "Quay lại",
        close: "Đóng",
        retry: "Chơi lại",
      },
      settings: {
        title: "Cài đặt",
        language: "Ngôn ngữ",
        music: "Nhạc nền",
        sfx: "Hiệu ứng âm thanh",
        on: "Bật",
        off: "Tắt",
        sound: "Âm thanh",
        soundDescription: "Hiệu ứng game",
        musicDescription: "Giai điệu thư giãn",
      },
      dock: {
        capacity: "SỨC CHỨA",
        depth: "ĐỘ SÂU",
        offlineRate: "THU NHẬP RẢNH",
        earnings: "THU NHẬP",
        bestScore: "KỶ LỤC",
        hooks: "LƯỠI CÂU",
        aquarium: "THỦY CUNG",
        collection: "Bộ sưu tập",
        level: "Cấp {{val}}",
        claimGift: "NHẬN QUÀ",
        gift: "QUÀ TẶNG",
        ready: "Sẵn sàng",
        openSettings: "Mở cài đặt",
        openLeaderboard: "Kỷ lục: {{score}}. Mở bảng xếp hạng",
        leaderboardTitle: "Bảng xếp hạng",
        openHooks: "Mở lưỡi câu, cấp {{level}}",
        openAquarium: "Mở Thủy cung",
        dockAria: "Bến câu cá",
        gearAndGifts: "Đồ nghề và quà",
        giftModalOpen: "Mở bảng quà tặng ngẫu nhiên",
        giftModalCountdown: "Bảng quà tặng - mở quà sau {{cooldown}}",
        quickUpgrades: "Nâng cấp nhanh",
        max: "MAX",
        lockPower: "Khóa lực câu và bắt đầu chơi",
        underwaterAria: "Giao diện lặn biển",
        yourRank: "Vị trí của bạn",
        highScore: "Điểm cao",
        you: "Bạn",
        closeDashboard: "Đóng bảng thành tích",
        dashboardTitle: "Bảng Thành Tích",
        highestRecord: "Kỷ lục cao nhất",
        lastGame: "Lượt chơi cuối",
        offlineGifts: "Quà Vắng Mặt",
        resting: "Nghỉ ngơi",
        claimGiftButton: "Nhận Quà",
        comingSoon: "Chưa ra mắt",
        allUnlocked: "Đã mở khóa toàn bộ",
        randomUnlock: "Mở khóa ngẫu nhiên ({{price}}đ)",
        equippedHook: "Đã trang bị: {{name}}",
        unlockedHook: "Mở khóa thành công: {{name}}!",
        notEnoughCoins: "Không đủ xu để mở khóa!",
        allHooksOwned: "Bạn đã sở hữu tất cả lưỡi câu!",
        mystery: "BÍ ẨN",
        notUnlocked: "Chưa mở khóa",
        buff_fast: "+50% TỐC ĐỘ",
        buff_plus2: "+2 SỨC CHỨA",
        buff_lucky_gold: "+50% GIÁ TRỊ",
        buff_coin: "+50% TIỀN AFK",
        buff_times: "+4H TREO MÁY",
        buff_basic: "CƠ BẢN",
        timeHoursMins: "{{hours}} giờ {{mins}} phút",
        timeMins: "{{mins}} phút",
      },
      screen: {
        capacityUnit: "cá",
        perMinute: "đ/phút",
        upgradeSuccess: "Nâng cấp thành công",
        maxUpgrade: "Đã nâng tối đa",
        insufficientFunds: "Chưa đủ tiền",
        upgradeUnavailable: "Không thể nâng cấp lúc này",
        reload: "Tải lại",
        claimed: "Đã nhận +{{amount}}đ",
        rotateTitle: "Hãy xoay dọc điện thoại",
        rotateDescription: "Trải nghiệm câu cá được thiết kế cho màn hình dọc.",
      },
      results: {
        title: "Kết quả",
        earnings: "Tiền thu hoạch",
        caught: "Bắt được <strong>{{count}}</strong> con cá",
        collect: "Thu tiền",
      },
      aquarium: {
        title: "Thủy cung ao làng",
        passiveIncome: "Thu nhập thụ động: <strong>+{{amount}}đ/phút</strong>",
        discovered: "Đã phát hiện",
        trash: "Rác",
        legendary: "Huyền thoại",
        rare: "Hiếm",
        common: "Thường",
        unknown: "???",
        objectOrTrash: "Vật thể / rác",
        price: "Giá: {{amount}}đ",
        depthRange: "Sâu: {{min}}m - {{max}}m",
        depth: "Độ sâu: {{depth}}m+",
      },
      gift: {
        title: "Quà tặng ngẫu nhiên",
        close: "Đóng",
        won: "Bạn đã trúng: {{gift}}!",
        received: "Nhận ngay <strong>+{{amount}}đ</strong> vào tài khoản!",
        spinning: "Đang quay...",
        spin: "Quay ngẫu nhiên (miễn phí)",
        opensAfter: "Quà mở sau {{time}}",
        walletFull: "Ví đã đầy!",
        congratulations: "Chúc mừng! Bạn nhận được {{gift}} (+{{amount}}đ)!",
        items: {
          "gift-1": { name: "Túi xu", rarity: "Phổ thông" },
          "gift-2": { name: "Túi may", rarity: "Phổ thông" },
          "gift-3": { name: "Hộp bí", rarity: "Khá" },
          "gift-4": { name: "Rương kim", rarity: "Hiếm" },
          "gift-5": { name: "Hũ tiền", rarity: "Hiếm" },
          "gift-6": { name: "Vé tốc", rarity: "Cực hiếm" },
          "gift-7": { name: "Báu vật", rarity: "Cực hiếm" },
          "gift-8": { name: "Kho báu", rarity: "Huyền thoại" },
          "gift-9": { name: "Siêu Jackpot", rarity: "Thần thoại" },
        },
      },
    },
  },
  en: {
    translation: {
      common: {
        play: "Play",
        pause: "Pause",
        resume: "Resume",
        back: "Back",
        close: "Close",
        retry: "Play again",
      },
      settings: {
        title: "Settings",
        language: "Language",
        music: "Background music",
        sfx: "Sound effects",
        on: "On",
        off: "Off",
        sound: "Sound",
        soundDescription: "Game sound effects",
        musicDescription: "Relaxing soundtrack",
      },
      dock: {
        capacity: "CAPACITY",
        depth: "DEPTH",
        offlineRate: "IDLE INCOME",
        earnings: "EARNINGS",
        bestScore: "RECORD",
        hooks: "HOOKS",
        aquarium: "AQUARIUM",
        collection: "Collection",
        level: "Lvl {{val}}",
        claimGift: "CLAIM GIFT",
        gift: "GIFT",
        ready: "Ready",
        openSettings: "Open settings",
        openLeaderboard: "Record: {{score}}. Open leaderboard",
        leaderboardTitle: "Leaderboard",
        openHooks: "Open hooks, lvl {{level}}",
        openAquarium: "Open Aquarium",
        dockAria: "Fishing Dock",
        gearAndGifts: "Gear and gifts",
        giftModalOpen: "Open random gift",
        giftModalCountdown: "Gift board - opens in {{cooldown}}",
        quickUpgrades: "Quick upgrades",
        max: "MAX",
        lockPower: "Lock fishing power and cast",
        underwaterAria: "Underwater interface",
        yourRank: "Your Rank",
        highScore: "High Score",
        you: "You",
        closeDashboard: "Close achievements",
        dashboardTitle: "Achievements",
        highestRecord: "Best Record",
        lastGame: "Last Game",
        offlineGifts: "Offline Earnings",
        resting: "Resting for",
        claimGiftButton: "Claim Gift",
        comingSoon: "Coming Soon",
        allUnlocked: "All hooks unlocked",
        randomUnlock: "Unlock random ({{price}})",
        equippedHook: "Equipped: {{name}}",
        unlockedHook: "Unlocked: {{name}}!",
        notEnoughCoins: "Not enough coins!",
        allHooksOwned: "All hooks already owned!",
        mystery: "MYSTERY",
        notUnlocked: "Locked",
        buff_fast: "+50% SPEED",
        buff_plus2: "+2 CAPACITY",
        buff_lucky_gold: "+50% VALUE",
        buff_coin: "+50% IDLE COIN",
        buff_times: "+4H IDLE TIME",
        buff_basic: "BASIC",
        timeHoursMins: "{{hours}}h {{mins}}m",
        timeMins: "{{mins}}m",
      },
      screen: {
        capacityUnit: "fish",
        perMinute: "/min",
        upgradeSuccess: "Upgrade complete",
        maxUpgrade: "Already at maximum level",
        insufficientFunds: "Not enough coins",
        upgradeUnavailable: "Upgrade is unavailable right now",
        reload: "Reload",
        claimed: "Claimed +{{amount}}",
        rotateTitle: "Rotate your phone upright",
        rotateDescription: "This fishing experience is designed for portrait screens.",
      },
      results: {
        title: "Results",
        earnings: "Catch earnings",
        caught: "Caught <strong>{{count}}</strong> fish",
        collect: "Collect",
      },
      aquarium: {
        title: "Village Aquarium",
        passiveIncome: "Idle income: <strong>+{{amount}}/min</strong>",
        discovered: "Discovered",
        trash: "Trash",
        legendary: "Legendary",
        rare: "Rare",
        common: "Common",
        unknown: "???",
        objectOrTrash: "Object / trash",
        price: "Value: {{amount}}",
        depthRange: "Depth: {{min}}m - {{max}}m",
        depth: "Depth: {{depth}}m+",
      },
      gift: {
        title: "Random Gift",
        close: "Close",
        won: "You won: {{gift}}!",
        received: "Added <strong>+{{amount}}</strong> to your account!",
        spinning: "SPINNING...",
        spin: "Spin for a random gift (free)",
        opensAfter: "Gift opens in {{time}}",
        walletFull: "Wallet is full!",
        congratulations: "Congratulations! You received {{gift}} (+{{amount}})!",
        items: {
          "gift-1": { name: "Coin Bag", rarity: "Common" },
          "gift-2": { name: "Lucky Bag", rarity: "Common" },
          "gift-3": { name: "Mystery Box", rarity: "Uncommon" },
          "gift-4": { name: "Gold Chest", rarity: "Rare" },
          "gift-5": { name: "Money Jar", rarity: "Rare" },
          "gift-6": { name: "Speed Pass", rarity: "Epic" },
          "gift-7": { name: "Treasure", rarity: "Epic" },
          "gift-8": { name: "Treasure Hoard", rarity: "Legendary" },
          "gift-9": { name: "Super Jackpot", rarity: "Mythic" },
        },
      },
    },
  },
} as const;

const initialLanguage = getInitialLanguage();
syncDocumentLang(initialLanguage);

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    supportedLngs: ["en", "vi"],
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  });
i18n.on("languageChanged", (lang) => {
  persistLanguage(lang);
  syncDocumentLang(lang);
});

export default i18n;
