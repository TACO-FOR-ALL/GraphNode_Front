import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { FiX } from "react-icons/fi";

export default function OnboardingSolution() {
  const { t } = useTranslation();
  const { currentStep, nextStep, skipOnboarding } = useOnboardingStore();

  if (currentStep !== "solution") return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-bg-primary flex flex-col items-center justify-center p-8">
      {/* 스킵 버튼 */}
      <button
        onClick={skipOnboarding}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
      >
        {t("onboarding.skip")}
        <FiX className="w-4 h-4" />
      </button>

      <div className="max-w-3xl w-full flex flex-col items-center text-center">
        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          {t("onboarding.solution.title")}
        </h1>

        {/* 서브타이틀 */}
        <p className="text-lg text-text-secondary mb-8">
          {t("onboarding.solution.subtitle")}
        </p>

        {/* 예시 그래프 이미지 */}
        <div className="w-full aspect-[16/9] max-w-xl rounded-2xl bg-bg-secondary border border-base-border mb-8 overflow-hidden flex items-center justify-center">
          <ExampleGraph />
        </div>

        {/* 시작하기 버튼 */}
        <button
          onClick={nextStep}
          className="px-8 py-3 bg-primary text-white rounded-xl font-medium text-base hover:bg-primary/90 transition-colors"
        >
          {t("onboarding.solution.start")}
        </button>
      </div>
    </div>
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
    <svg viewBox="0 0 540 280" className="w-full h-full">
      {/* 배경 그라데이션 */}
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect fill="url(#bgGrad)" width="540" height="280" />

      {/* 엣지 */}
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

      {/* 노드 */}
      {nodes.map((node) => (
        <g key={node.id}>
          {/* 노드 원 */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size / 2}
            fill={node.color}
            opacity="0.9"
          />
          {/* 노드 라벨 */}
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

      {/* 애니메이션 pulse */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0.6; }
          }
          circle { animation: pulse 3s ease-in-out infinite; }
        `}
      </style>
    </svg>
  );
}
