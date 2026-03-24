import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingSolution() {
  const { t } = useTranslation();
  const { nextStep } = useOnboardingStore();

  return (
    <OnboardingModal>
      <div className="flex flex-col items-center text-center px-8 pt-6 pb-8">
        {/* 타이틀 */}
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {t("onboarding.solution.title")}
        </h1>

        {/* 서브타이틀 */}
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">
          {t("onboarding.solution.subtitle")}
        </p>

        {/* 예시 그래프 이미지 */}
        <div className="w-full rounded-xl bg-bg-secondary border border-base-border mb-6 overflow-hidden">
          <ExampleGraph />
        </div>

        {/* 시작하기 버튼 */}
        <button
          onClick={nextStep}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {t("onboarding.solution.start")}
        </button>
      </div>
    </OnboardingModal>
  );
}

// 예시 그래프 SVG
function ExampleGraph() {
  const nodes = [
    { id: 1, x: 200, y: 120, label: "AI/ML", color: "#6366f1", size: 40 },
    { id: 2, x: 350, y: 80, label: "Python", color: "#8b5cf6", size: 32 },
    { id: 3, x: 320, y: 200, label: "Data", color: "#a855f7", size: 28 },
    { id: 4, x: 120, y: 200, label: "Project", color: "#ec4899", size: 36 },
    { id: 5, x: 450, y: 160, label: "API", color: "#f43f5e", size: 24 },
    { id: 6, x: 80, y: 100, label: "Ideas", color: "#f97316", size: 30 },
  ];

  const edges = [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 2, to: 3 },
    { from: 2, to: 5 },
    { from: 3, to: 5 },
    { from: 4, to: 6 },
    { from: 1, to: 6 },
  ];

  return (
    <svg viewBox="0 0 540 240" className="w-full">
      <defs>
        <radialGradient id="bgGrad2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect fill="url(#bgGrad2)" width="540" height="240" />

      {edges.map((edge, idx) => {
        const from = nodes.find((n) => n.id === edge.from)!;
        const to = nodes.find((n) => n.id === edge.to)!;
        return (
          <line
            key={idx}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--color-text-tertiary)"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
        );
      })}

      {nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={node.size / 2} fill={node.color} opacity="0.9" />
          <text
            x={node.x}
            y={node.y + node.size / 2 + 14}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize="11"
            fontWeight="500"
          >
            {node.label}
          </text>
        </g>
      ))}

      <style>
        {`
          @keyframes pulse2 {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0.6; }
          }
          .pulse-node { animation: pulse2 3s ease-in-out infinite; }
        `}
      </style>
    </svg>
  );
}
