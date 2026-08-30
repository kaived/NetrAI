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

export function formatGradeLabel(rawLabel: unknown, grade?: number | null): string {
  if (grade !== null && grade !== undefined) {
    switch (grade) {
      case 0:
        return 'No DR';
      case 1:
        return 'Mild NPDR';
      case 2:
        return 'Moderate NPDR';
      case 3:
        return 'Severe NPDR';
      case 4:
        return 'PDR';
    }
  }

  if (typeof rawLabel === 'string') {
    const norm = rawLabel.trim().toLowerCase().replace(/_/g, ' ');
    if (norm === 'no dr' || norm === 'nodr' || norm === 'no apparent dr') return 'No DR';
    if (norm === 'mild' || norm === 'mild npdr') return 'Mild NPDR';
    if (norm === 'moderate' || norm === 'moderate npdr') return 'Moderate NPDR';
    if (norm === 'severe' || norm === 'severe npdr') return 'Severe NPDR';
    if (norm === 'proliferative dr' || norm === 'proliferative' || norm === 'pdr') return 'PDR';
    return norm.charAt(0).toUpperCase() + norm.slice(1);
  }

  return 'Not assessed';
}
