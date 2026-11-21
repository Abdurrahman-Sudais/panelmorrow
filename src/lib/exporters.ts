import Papa from "papaparse";

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[]) {
  return Papa.unparse(rows);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  downloadBlob(filename, new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
}

/** Multi-section CSV (sections separated by a title row and blank line). */
export function downloadSectionedCsv(filename: string, sections: { title: string; rows: Record<string, unknown>[] }[]) {
  const body = sections
    .filter((s) => s.rows.length)
    .map((s) => `# ${s.title}\n${toCsv(s.rows)}`)
    .join("\n\n");
  downloadBlob(filename, new Blob([body], { type: "text/csv;charset=utf-8" }));
}
