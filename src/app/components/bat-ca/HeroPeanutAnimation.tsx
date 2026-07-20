export function HeroPeanutAnimation() {
  return (
    <div
      className="hero-peanut-stage absolute overflow-hidden pointer-events-none z-10"
      aria-hidden="true"
      style={{
        left: "clamp(8px, 4vw, 72px)",
        bottom: "clamp(16px, 4vh, 48px)",
        width: "clamp(150px, 22vw, 270px)",
        aspectRatio: "3 / 4",
      }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 150 200"
        style={{
          animation: "peanut-float 4s ease-in-out infinite, peanut-wiggle 6s ease-in-out infinite",
        }}
      >
        <defs>
          <style>{`
            @keyframes peanut-float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes peanut-wiggle {
              0%, 100% { transform: rotate(-2deg); }
              50% { transform: rotate(2deg); }
            }
            @keyframes arm-wave {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(25deg); }
            }
            .mascot-shadow {
              fill: rgba(42, 36, 24, 0.15);
            }
          `}</style>
        </defs>

        {/* Shadow */}
        <ellipse cx="75" cy="185" rx="45" ry="8" className="mascot-shadow" />

        {/* Body (oval đôi: đầu nhỏ + thân lớn) */}
        {/* Thân lớn */}
        <ellipse cx="75" cy="125" rx="36" ry="42" fill="#f0b840" stroke="#2a2418" strokeWidth="3" />
        {/* Đầu nhỏ */}
        <ellipse cx="75" cy="72" rx="28" ry="30" fill="#f0b840" stroke="#2a2418" strokeWidth="3" />

        {/* Cổ nối (đè lên nét viền giữa) */}
        <ellipse cx="75" cy="92" rx="24" ry="12" fill="#f0b840" />

        {/* Vân ngang nâu */}
        <path d="M 52 70 Q 75 76 98 70" stroke="#8e4e22" strokeWidth="2.5" fill="none" />
        <path d="M 44 110 Q 75 118 106 110" stroke="#8e4e22" strokeWidth="3" fill="none" />
        <path d="M 40 135 Q 75 144 110 135" stroke="#8e4e22" strokeWidth="3" fill="none" />
        <path d="M 48 156 Q 75 163 102 156" stroke="#8e4e22" strokeWidth="2.5" fill="none" />

        {/* Mặt cười kiểu dấu chấm */}
        {/* Mắt */}
        <circle cx="64" cy="62" r="3.5" fill="#2a2418" />
        <circle cx="86" cy="62" r="3.5" fill="#2a2418" />
        {/* Má hồng */}
        <ellipse cx="55" cy="68" rx="6" ry="4" fill="#e87432" opacity="0.4" />
        <ellipse cx="95" cy="68" rx="6" ry="4" fill="#e87432" opacity="0.4" />
        {/* Miệng cười */}
        <path d="M 68 74 Q 75 82 82 74" stroke="#2a2418" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Chân */}
        <path d="M 55 164 C 50 182 45 182 60 182" stroke="#2a2418" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 95 164 C 100 182 105 182 90 182" stroke="#2a2418" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Tay trái */}
        <path d="M 42 120 C 24 125 22 135 34 140" stroke="#2a2418" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Tay phải vẫy (có animation rotate) */}
        <g style={{ transformOrigin: "105px 115px", animation: "arm-wave 2s ease-in-out infinite" }}>
          <path d="M 105 115 C 124 110 130 95 124 85" stroke="#2a2418" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
