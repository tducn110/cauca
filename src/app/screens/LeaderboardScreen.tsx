import { ArrowLeft, Medal } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer?: boolean;
}

interface Props {
  playerScore: number;
  playerRank: number;
  leaderboard: LeaderboardEntry[];
  onBack: () => void;
}

export function LeaderboardScreen({
  playerScore,
  playerRank,
  leaderboard,
  onBack,
}: Props) {
  return (
    <div className="absolute inset-0 z-50 bg-rice-paper overflow-y-auto overscroll-contain">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgba(245,236,215,0.95)] backdrop-blur-sm border-b border-[rgba(138,125,101,0.18)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-pencil flex items-center justify-center text-ink-dark"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold text-ink-dark">Bảng xếp hạng</h1>
        </div>
      </div>

      {/* Player card */}
      <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-orange-cta to-[#f08a48] rounded-2xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-90">Vị trí của bạn</div>
            <div className="text-3xl font-extrabold">#{playerRank}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Điểm cao</div>
            <div className="text-2xl font-extrabold">{playerScore}đ</div>
          </div>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="px-4 mt-4 pb-8">
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                entry.isPlayer
                  ? "bg-mascot-yellow/20 border-2 border-mascot-yellow"
                  : "bg-white border border-[rgba(138,125,101,0.2)]"
              }`}
            >
              {/* Rank */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg">
                {entry.rank === 1 ? (
                  <Medal size={24} className="text-mascot-yellow" />
                ) : entry.rank === 2 ? (
                  <Medal size={24} className="text-pencil-gray" />
                ) : entry.rank === 3 ? (
                  <Medal size={24} className="text-earth-brown" />
                ) : (
                  <span className="text-pencil-gray">{entry.rank}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1">
                <div className={`font-bold ${entry.isPlayer ? "text-orange-cta" : "text-ink-dark"}`}>
                  {entry.name}
                  {entry.isPlayer && " (Bạn)"}
                </div>
              </div>

              {/* Score */}
              <div className="font-extrabold text-ink-dark">{entry.score}đ</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
