import type { DailyRecord } from "@/types";

/** Sum daily records across sites by date (portfolio series). */
export function sumByDate(seriesList: DailyRecord[][]): DailyRecord[] {
  const map = new Map<string, DailyRecord & { _irrN: number; _irrSum: number; _tempSum: number; _cloudSum: number; _hasActual: boolean }>();
  for (const series of seriesList) {
    for (const r of series) {
      const cur = map.get(r.date);
      if (!cur) {
        map.set(r.date, {
          ...r,
          actualKwh: r.actualKwh ?? 0,
          _hasActual: r.actualKwh != null,
          _irrN: 1,
          _irrSum: r.irradianceKwhM2,
          _tempSum: r.ambientTempC,
          _cloudSum: r.cloudCoverPct,
        });
      } else {
        // Gaps: add expected only where actual exists so the comparison stays like-for-like.
        if (r.actualKwh != null) {
          cur.actualKwh = (cur.actualKwh ?? 0) + r.actualKwh;
          cur.expectedKwh += r.expectedKwh;
          cur._hasActual = true;
        }
        cur._irrN++;
        cur._irrSum += r.irradianceKwhM2;
        cur._tempSum += r.ambientTempC;
        cur._cloudSum += r.cloudCoverPct;
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      actualKwh: r._hasActual ? +(r.actualKwh as number).toFixed(1) : null,
      actualSource: r.actualSource,
      expectedKwh: +r.expectedKwh.toFixed(1),
      expectedSource: r.expectedSource,
      irradianceKwhM2: +(r._irrSum / r._irrN).toFixed(2),
      ambientTempC: +(r._tempSum / r._irrN).toFixed(1),
      cloudCoverPct: Math.round(r._cloudSum / r._irrN),
      weatherSource: r.weatherSource,
    }));
}

/** Aggregate daily records into weekly buckets (week starting date). */
export function weekly(records: DailyRecord[]): DailyRecord[] {
  const out: DailyRecord[] = [];
  for (let i = 0; i < records.length; i += 7) {
    const chunk = records.slice(i, i + 7);
    const withActual = chunk.filter((r) => r.actualKwh != null);
    out.push({
      ...chunk[0],
      actualKwh: withActual.length ? +withActual.reduce((a, r) => a + (r.actualKwh as number), 0).toFixed(0) : null,
      expectedKwh: +withActual.reduce((a, r) => a + r.expectedKwh, 0).toFixed(0),
      irradianceKwhM2: +(chunk.reduce((a, r) => a + r.irradianceKwhM2, 0) / chunk.length).toFixed(2),
      ambientTempC: +(chunk.reduce((a, r) => a + r.ambientTempC, 0) / chunk.length).toFixed(1),
      cloudCoverPct: Math.round(chunk.reduce((a, r) => a + r.cloudCoverPct, 0) / chunk.length),
    });
  }
  return out;
}
