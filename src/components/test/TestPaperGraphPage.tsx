import PaperGraphVisualization from "./PaperGraphVisualization";

// JSON 데이터 (실제로는 파일에서 import하거나 fetch)
const paperData = [
  {
    "nodes": [
      {
        "name": "Multitask Transformer (cross-corpus / multitask variants)",
        "type": "Paper",
        "source_chunk_id": 1,
        "description": "IEEE Trans. Affective Computing, 2025. Proposes multitask transformer with contrastive learning and information maximization as auxiliary tasks."
      },
      {
        "name": "Cross-corpus Speech Emotion Recognition (SER / MER)",
        "type": "Problem",
        "source_chunk_id": 2,
        "description": "Generalization across disparate speech emotion datasets; low accuracy in cross-corpus scenarios."
      },
      {
        "name": "Low cross-corpus generalization / low accuracy",
        "type": "Problem",
        "source_chunk_id": 1,
        "description": "Overall accuracy for cross-corpus SER remains relatively low and needs attention."
      },
      {
        "name": "Multitask Transformer (cross-corpus / multitask variants)",
        "type": "Method",
        "source_chunk_id": 4,
        "description": "Framework using a pre-trained transformer as backbone with SER as primary task and contrastive learning + information maximization as auxiliary tasks."
      },
      {
        "name": "Auxiliary tasks / auxiliary losses",
        "type": "Method",
        "source_chunk_id": 9,
        "description": "Unsupervised auxiliary loss that attracts positive pairs (two augmentations of same instance) and repels negatives."
      },
      {
        "name": "Data Augmentation (audio and text)",
        "type": "Method",
        "source_chunk_id": 7,
        "description": "Audio: five waveform augmentation types (torch-audiomentations) applied twice per sample for contrastive learning. Text: token cutoff applied (five times)."
      },
      {
        "name": "Decision-level fusion",
        "type": "Method",
        "source_chunk_id": 10,
        "description": "During inference, logits from audio and text transformers are added for multimodal prediction (no fusion training)."
      },
      {
        "name": "IEMOCAP",
        "type": "Dataset",
        "source_chunk_id": 11,
        "description": "Approx. 12 hours dyadic English acted sessions; used with four emotion classes (neutral, happiness, sadness, anger)."
      },
      {
        "name": "MSP-IMPROV",
        "type": "Dataset",
        "source_chunk_id": 11,
        "description": "Dyadic English dataset with target sentences for emotions; used with four emotion classes; larger volume than IEMOCAP."
      },
      {
        "name": "EMO-DB",
        "type": "Dataset",
        "source_chunk_id": 11,
        "description": "German acted dataset (800 utterances; used subset of 535 utterances mapped to four emotion classes)."
      },
      {
        "name": "MSP-PODCAST",
        "type": "Dataset",
        "source_chunk_id": 18,
        "description": "Naturalistic dataset (~238 hours); higher variability and distribution shift relative to lab datasets; used in preliminary experiments."
      },
      {
        "name": "Unweighted Average Recall (UAR)",
        "type": "Metric",
        "source_chunk_id": 12,
        "description": "Primary evaluation metric reported on target test set (Tte) for cross-corpus experiments."
      },
      {
        "name": "5% improvement over state-of-the-art",
        "type": "Result",
        "source_chunk_id": 14,
        "description": "Reported significant improvement of 5% over prior state-of-the-art for MSP-IMPROV -> IEMOCAP cross-corpus setting."
      },
      {
        "name": "4% multimodal improvement",
        "type": "Result",
        "source_chunk_id": 16,
        "description": "Adding text modality with decision-level fusion yields ~4% improvement over unimodal cross-corpus SER."
      },
      {
        "name": "2% decrease using ASR transcripts",
        "type": "Result",
        "source_chunk_id": 16,
        "description": "When using ASR-produced transcripts instead of ground-truth text, multimodal accuracy decreased by ~2%."
      },
      {
        "name": "Adversarial learning based multitask learning",
        "type": "Baseline",
        "source_chunk_id": 14,
        "description": "Prior common approach for cross-corpus SER using domain-adversarial objectives (gradient reversal / minimax)."
      },
      {
        "name": "Wav2Vec2",
        "type": "Baseline",
        "source_chunk_id": 17,
        "description": "Pre-trained waveform-based transformer (discussed/compared; authors favor AST over Wav2Vec2 for SER)."
      },
      {
        "name": "EMO-DB language limitation",
        "type": "Limitation",
        "source_chunk_id": 11,
        "description": "EMO-DB is in German and transcripts are curated/neutral; thus not suitable for text-based emotion recognition in study."
      },
      {
        "name": "MSP-PODCAST variance",
        "type": "Limitation",
        "source_chunk_id": 18,
        "description": "MSP-PODCAST exhibits much larger variance between train and test; naturalistic conditions make cross-corpus transfer harder."
      },
      {
        "name": "Multimodal fusion generalization challenge",
        "type": "Limitation",
        "source_chunk_id": 4,
        "description": "Cross-corpus MER presents non-trivial fusion challenges due to higher specificity and doubled input feature sizes."
      }
    ],
    "edges": [
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Cross-corpus Speech Emotion Recognition (SER / MER)",
        "type": "addresses",
        "source_chunk_id": 4,
        "description": "Framework designed to improve cross-corpus generalization in SER.",
        "confidence": 0.95
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "IEMOCAP",
        "type": "evaluates_on",
        "source_chunk_id": 1,
        "description": "Audio transformer evaluated in cross-corpus experiments using IEMOCAP as source or target.",
        "confidence": 0.9
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "MSP-IMPROV",
        "type": "evaluates_on",
        "source_chunk_id": 1,
        "description": "Audio transformer evaluated in cross-corpus experiments using MSP-IMPROV as source or target.",
        "confidence": 0.9
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "EMO-DB",
        "type": "evaluates_on",
        "source_chunk_id": 1,
        "description": "Audio transformer evaluated in cross-corpus experiments using EMO-DB as source or target.",
        "confidence": 0.9
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Auxiliary tasks / auxiliary losses",
        "type": "uses",
        "source_chunk_id": 4,
        "description": "Contrastive learning is employed as an unsupervised auxiliary task in the multitask framework.",
        "confidence": 0.95
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Data Augmentation (audio and text)",
        "type": "uses",
        "source_chunk_id": 7,
        "description": "Audio: five augmentation types (torch-audiomentations) to increase data by factor of five; Text: token cutoff augmentation.",
        "confidence": 0.93
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Decision-level fusion",
        "type": "uses",
        "source_chunk_id": 10,
        "description": "Multimodal MER achieved by decision-level addition of logits from audio and text branches at inference.",
        "confidence": 0.92
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "5% improvement over state-of-the-art",
        "type": "achieves",
        "source_chunk_id": 14,
        "description": "Reported significant improvement of ~5% over previous SOTA in one cross-corpus setting.",
        "confidence": 0.88
      },
      {
        "start": "5% improvement over state-of-the-art",
        "target": "Unweighted Average Recall (UAR)",
        "type": "measured_by",
        "source_chunk_id": 12,
        "description": "Reported improvements in cross-corpus experiments are quantified using UAR.",
        "confidence": 0.95
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Adversarial learning based multitask learning",
        "type": "outperforms",
        "source_chunk_id": 14,
        "description": "Authors report their unsupervised multitask approach outperforms adversarial learning approaches.",
        "confidence": 0.9
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Wav2Vec2",
        "type": "outperforms",
        "source_chunk_id": 17,
        "description": "Authors validated AST choice over Wav2Vec2 and confirmed AST yielded significant improvement for SER.",
        "confidence": 0.9
      },
      {
        "start": "Decision-level fusion",
        "target": "4% multimodal improvement",
        "type": "achieves",
        "source_chunk_id": 16,
        "description": "Decision-level fusion produced approximately 4% improvement over unimodal cross-corpus SER.",
        "confidence": 0.9
      },
      {
        "start": "Decision-level fusion",
        "target": "2% decrease using ASR transcripts",
        "type": "achieves",
        "source_chunk_id": 16,
        "description": "Using ASR transcripts at test time caused ~2% drop versus ground-truth transcripts.",
        "confidence": 0.88
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "MSP-PODCAST",
        "type": "evaluates_on",
        "source_chunk_id": 18,
        "description": "Preliminary experiments conducted using IEMOCAP as source and MSP-PODCAST as test (naturalistic dataset).",
        "confidence": 0.9
      },
      {
        "start": "EMO-DB",
        "target": "EMO-DB language limitation",
        "type": "suffers_from",
        "source_chunk_id": 11,
        "description": "EMO-DB cannot be used for text-based experiments due to language and curated transcripts.",
        "confidence": 0.95
      },
      {
        "start": "Multitask Transformer (cross-corpus / multitask variants)",
        "target": "Multimodal fusion generalization challenge",
        "type": "suffers_from",
        "source_chunk_id": 4,
        "description": "Authors note cross-corpus MER introduces non-trivial fusion challenges and higher specificity.",
        "confidence": 0.9
      },
      {
        "start": "Auxiliary tasks / auxiliary losses",
        "target": "Data Augmentation (audio and text)",
        "type": "uses",
        "source_chunk_id": 7,
        "description": "Augmentation-type classifier uses labels from audio augmentations.",
        "confidence": 0.9
      }
    ]
  }
];

export default function TestPaperGraphPage() {
  return (
    <div className="w-full h-screen">
      <PaperGraphVisualization data={paperData} />
    </div>
  );
}
