export const clean = (s: string) =>
  s.normalize("NFC").replace(/\s+/g, " ").trim();
