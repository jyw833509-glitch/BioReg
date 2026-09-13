// Calendar boundaries use the configured IANA zone, including DST-length days.
export function localDate(now: Date, timezone: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((k) => p.find((x) => x.type === k)!.value)
    .join("-");
}
export function shiftDate(date: string, days: number) {
  return new Date(Date.parse(date + "T12:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function dayWindow(date: string, timezone: string) {
  function boundary(d: string) {
    let low = Date.parse(d + "T00:00:00Z") - 36 * 3600000,
      high = low + 72 * 3600000;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (localDate(new Date(mid), timezone) < d) low = mid;
      else high = mid;
    }
    return new Date(high);
  }
  return { start: boundary(date), end: boundary(shiftDate(date, 1)) };
}
export function dueDate(now: Date, timezone: string, time: string) {
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return clock >= time ? shiftDate(localDate(now, timezone), -1) : null;
}
