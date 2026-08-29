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
  confidence_level?: string;
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

export type PatientMetadata = {
  eye: string | null;
  patient_age: string | null;
  diabetes_type?: string | null;
  diabetic_duration: string | null;
};

export type EyeCode = 'OD' | 'OS';

export type EyeScreeningResult = {
  eye: EyeCode;
  status: string;
  patient: PatientMetadata | null;
  quality: QualityResult;
  prediction: PredictionResult;
  explanation: ExplanationResult;
  report: ReportResult;
  storage: StorageResult;
};

export type FinalReportResult = {
  summary: string;
  recommendation: string;
  disclaimer: string;
  referable_dr: boolean;
  worst_eye: EyeCode | null;
  worst_icdr_grade: number | null;
  worst_label: string | null;
  completed_eyes: EyeCode[];
};

export type CaseResult = {
  case_id: string;
  status: string;
  patient: PatientMetadata | null;
  quality: QualityResult;
  prediction: PredictionResult;
  explanation: ExplanationResult;
  report: ReportResult;
  storage: StorageResult;
  completed_eyes: EyeCode[];
  next_eye: EyeCode | null;
  is_case_complete: boolean;
  eyes: Partial<Record<EyeCode, EyeScreeningResult>>;
  final_report: FinalReportResult | null;
};

export interface PatientInfo {
  eye: 'OD' | 'OS';
  patientAge: string;
  diabetesType: string;
  diabeticDuration: string;
}

export type ScreeningFormErrors = Partial<Record<keyof PatientInfo | 'caseId' | 'image', string>>;
