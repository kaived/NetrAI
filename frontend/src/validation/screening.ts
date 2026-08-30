import { z } from 'zod';
import type { PatientInfo, ScreeningFormErrors } from '../types';

const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const CASE_ID_PATTERN = /^CASE-\d{8}-\d{6}-[A-F0-9]{6}$/;
export const DIABETES_TYPES = [
  'Type 2 Diabetes',
  'Type 1 Diabetes',
  'Gestational Diabetes',
  'Pre-Diabetes',
  'Secondary / Other',
] as const;

export type DiabetesType = (typeof DIABETES_TYPES)[number];

const YEARS_DIAGNOSIS_PATTERN = /^(\d{1,2}(?:\.\d{1,2})?)(?:\s*(?:yrs?|years?))?$/i;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export const patientInfoRawSchema = z.object({
  eye: z.enum(['OD', 'OS'], {
    message: 'Select OD (Right Eye) or OS (Left Eye)',
  }),
  patientAge: z
    .string()
    .trim()
    .min(1, 'Patient age is required')
    .regex(/^\d{1,3}$/, 'Enter age in years (e.g. 54)')
    .refine((value) => {
      const age = Number(value);
      return Number.isInteger(age) && age >= 1 && age <= 120;
    }, 'Age must be between 1 and 120 years'),
  diabetesType: z.enum(DIABETES_TYPES, {
    message: 'Please select a diabetes type',
  }),
  diabeticDuration: z
    .string()
    .trim()
    .min(1, 'Years since diagnosis is required')
    .refine((value) => {
      const match = value.match(YEARS_DIAGNOSIS_PATTERN);
      if (!match) return false;
      const years = parseFloat(match[1]);
      return !isNaN(years) && years >= 0 && years <= 100;
    }, 'Enter valid years (e.g. 8, 12, or 0.5)'),
});

export const patientInfoSchema = patientInfoRawSchema.refine(
  (data) => {
    const age = Number(data.patientAge);
    const match = data.diabeticDuration.match(YEARS_DIAGNOSIS_PATTERN);
    if (age && match) {
      const years = parseFloat(match[1]);
      return years <= age;
    }
    return true;
  },
  {
    message: 'Years since diagnosis cannot exceed patient age',
    path: ['diabeticDuration'],
  },
);

export const caseIdSchema = z
  .string()
  .trim()
  .regex(CASE_ID_PATTERN, 'Case ID must look like CASE-YYYYMMDD-HHMMSS-ABC123');

export const imageFileSchema = z
  .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
    message: 'Select a fundus photograph before running screening',
  })
  .refine(
    (file) => ALLOWED_IMAGE_TYPES.has(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name),
    'Use PNG, JPEG, or WebP fundus images only',
  )
  .refine((file) => file.size > 0, 'Selected image file is empty')
  .refine((file) => file.size <= MAX_IMAGE_SIZE_BYTES, 'Image must be 20 MB or smaller');

export function validatePatientField<K extends keyof PatientInfo>(
  field: K,
  value: PatientInfo[K],
): string | undefined {
  const fieldSchema = patientInfoRawSchema.shape[field];
  if (!fieldSchema) return undefined;
  const result = fieldSchema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message;
  }
  return undefined;
}

export function validateScreeningInput(
  patientInfo: PatientInfo,
  file: File | null,
  caseId: string,
): { success: true; patientInfo: PatientInfo; file: File; caseId: string } | { success: false; errors: ScreeningFormErrors } {
  const errors: ScreeningFormErrors = {};
  const patientResult = patientInfoSchema.safeParse(patientInfo);
  const fileResult = imageFileSchema.safeParse(file);
  const caseResult = caseIdSchema.safeParse(caseId);

  if (!patientResult.success) {
    for (const issue of patientResult.error.issues) {
      const field = issue.path[0] as keyof PatientInfo;
      errors[field] ??= issue.message;
    }
  }

  if (!fileResult.success) {
    errors.image = fileResult.error.issues[0]?.message ?? 'Select a valid fundus photograph';
  }

  if (!caseResult.success) {
    errors.caseId = caseResult.error.issues[0]?.message ?? 'Invalid Case ID';
  }

  if (!fileResult.success || !fileResult.data) {
    return { success: false, errors: { ...errors, image: fileResult.error?.issues[0]?.message ?? 'Select a valid fundus photograph' } };
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    patientInfo: (patientResult.data ?? patientInfo) as PatientInfo,
    file: fileResult.data as File,
    caseId: (caseResult.data ?? caseId) as string,
  };
}
