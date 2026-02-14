import { useParams, useNavigate } from "react-router-dom";
import PaperGraphVisualizationKr from "@/components/test/PaperGraphVisualizationKr";

// JSON 파일에서 데이터 import
import paperData from "../../18_Multitask_Transformer_for_Cross-Corpus_Speech_Emotion_Recognition_standardized.json";

export default function VisualizeDetail() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full overflow-hidden">
      <PaperGraphVisualizationKr
        data={paperData}
        title="크로스-코퍼스 SER을 위한 멀티태스크 트랜스포머"
        subtitle="IEEE Trans. Affective Computing, 2025 • 지식 그래프 시각화"
        onBack={() => navigate("/visualize")}
      />
    </div>
  );
}
