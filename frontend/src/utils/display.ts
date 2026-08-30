export function displayText(value: unknown, fallback = 'Not available'): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') {
      return fallback;
    }
    return cleaned;
  }

  return String(value);
}

export function sanitizeForDisplayExport(value: unknown): unknown {
  if (value === null || value === undefined) {
    return 'Not available';
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForDisplayExport);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeForDisplayExport(entry)]),
    );
  }

  return value;
}

export function getTriageDisplay(prediction: { icdr_grade: number | null }) {
  const gradeBasedReferable = prediction.icdr_grade !== null && prediction.icdr_grade !== undefined && prediction.icdr_grade >= 2;

  if (gradeBasedReferable) {
    return {
      label: 'Referable',
      copyLabel: 'Referable',
      positive: true,
    };
  }

  return {
    label: 'Routine',
    copyLabel: 'Routine',
    positive: false,
  };
}
