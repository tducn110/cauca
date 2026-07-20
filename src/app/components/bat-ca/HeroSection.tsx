import { HeroBackdrop } from "./HeroBackdrop";
import { HeroPeanutAnimation } from "./HeroPeanutAnimation";

interface Props {
  onPlay: () => void;
  best: number;
}

export function HeroSection({ onPlay, best }: Props) {
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      {/* ── HERO SECTION ── */}
      <section
        id="gioi-thieu"
        className="hero-section relative h-full pt-20 grid place-items-center overflow-hidden w-full"
      >
        <HeroBackdrop />
        <HeroPeanutAnimation />
        
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(245,236,215,0.2)] via-transparent to-[rgba(245,236,215,0.55)] pointer-events-none" />

        <div className="hero-content relative max-w-[1100px] px-6 py-10 grid grid-cols-1 gap-5 text-center z-10">
          <div className="hero-badge inline-block mx-auto px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.7)] border border-pencil text-xs font-bold text-earth-brown tracking-[1.5px]">
            MINI GAME · BỘ LẠC ĐẬU PHỘNG
          </div>

          <h1 className="hero-title text-[clamp(38px,6vw,72px)] font-extrabold leading-[1.05] text-ink-dark m-0 drop-shadow-[0_2px_0_rgba(255,255,255,0.6)]">
            Bắt Cá <span className="text-orange-cta">Ao Làng</span>
          </h1>

          <p className="hero-desc text-[clamp(14px,1.5vw,17px)] text-[#4a4232] max-w-[600px] mx-auto leading-relaxed">
            Thả lưới xuống lòng ao sâu thẳm, khéo léo tránh rác và tóm gọn những chú cá chép vàng lấp lánh mang về bán lấy tiền nâng cấp ngư cụ nhé!
          </p>

          <div className="text-[13px] font-bold text-earth-brown mt-1">
            🏆 Kỷ lục câu cá hiện tại: <span className="text-orange-cta text-base">{best}đ</span>
          </div>

          <div className="hero-cta flex gap-4 justify-center items-center flex-wrap mt-3">
            <button
              onClick={onPlay}
              className="hero-play-button px-9 py-4 rounded-full bg-gradient-to-b from-[#f08a48] to-orange-cta text-white border-[3px] border-[#b85a22] font-extrabold text-[17px] cursor-pointer shadow-[0_10px_24px_rgba(232,116,50,0.4)]"
            >
              ▶ Chơi ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
