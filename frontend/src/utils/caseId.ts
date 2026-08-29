export function generateCaseId(date = new Date()): string {
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('');
  const clock = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');

  return `CASE-${timestamp}-${clock}-${randomSuffix()}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function randomSuffix(): string {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(3);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
}
