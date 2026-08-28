export type QualityResult = {
  is_gradeable: boolean;
  focus_score: number;
  brightness: number;
  contrast: number;
  reasons: string[];
};

export type PredictionResult = {
  icdr_grade: number | null;
  label: string;
  referable_dr: boolean;
  confidence: number;
  model_version: string;
};

export type ExplanationResult = {
  method: string;
  heatmap_url: string | null;
  text: string;
};

export type ReportResult = {
  summary: string;
  recommendation: string;
  disclaimer: string;
};

export type StorageResult = {
  input_uri: string | null;
  heatmap_uri: string | null;
  report_uri: string | null;
};

export type CaseResult = {
  case_id: string;
  status: string;
  quality: QualityResult;
  prediction: PredictionResult;
  explanation: ExplanationResult;
  report: ReportResult;
  storage: StorageResult;
};

export type HealthResponse = {
  status: string;
  environment: string;
  firestore_enabled: boolean;
  gcs_enabled: boolean;
  inference_mode: string;
  model_version: string;
  model_loaded: boolean;
};

export interface PatientInfo {
  patientId: string;
  phcCenter: string;
  eye: 'OD' | 'OS'; // OD = Right Eye, OS = Left Eye
  patientAge: string;
  diabeticDuration: string;
}
