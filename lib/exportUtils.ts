export type FinanceExportRow = {
  fecha: string;
  equipo: string;
  tipo: string;
  categoria: string;
  metodo?: string;
  descripcion?: string;
  ingreso: number;
  egreso: number;
  saldo: number;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportFinanceCsv(rows: FinanceExportRow[], filename: string) {
  const headers = ["Fecha", "Equipo", "Tipo", "Categoria", "Metodo", "Descripcion", "Ingreso", "Egreso", "Saldo"];
  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map(row => [
      row.fecha, row.equipo, row.tipo, row.categoria, row.metodo || "", row.descripcion || "",
      row.ingreso.toFixed(2), row.egreso.toFixed(2), row.saldo.toFixed(2),
    ].map(escapeCsv).join(",")),
  ].join("\r\n");
  downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportFinancePdf(rows: FinanceExportRow[], filename: string, title: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    p { margin: 0 0 16px; color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    th { background: #111; color: #d4a017; text-transform: uppercase; }
    td.num { text-align: right; font-family: monospace; }
  </style></head><body>
    <h1>${title}</h1>
    <p>Generado: ${new Date().toLocaleString("es-EC")}</p>
    <table><thead><tr>${["Fecha","Equipo","Tipo","Categoria","Metodo","Descripcion","Ingreso","Egreso","Saldo"].map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row => `<tr><td>${row.fecha}</td><td>${row.equipo}</td><td>${row.tipo}</td><td>${row.categoria}</td><td>${row.metodo || ""}</td><td>${row.descripcion || ""}</td><td class="num">${row.ingreso.toFixed(2)}</td><td class="num">${row.egreso.toFixed(2)}</td><td class="num">${row.saldo.toFixed(2)}</td></tr>`).join("")}</tbody></table>
  </body></html>`;
  const popup = window.open("", "_blank");
  if (!popup) {
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), filename.replace(/\.pdf$/i, ".html"));
    return;
  }
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}

function crc32(input: string) {
  const table = new Uint32Array(256).map((_, index) => {
    let c = index;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  bytes.forEach(byte => { crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8); });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createZip(files: { name: string; content: string }[]) {
  const output: number[] = [];
  const central: number[] = [];
  let offset = 0;
  const encoder = new TextEncoder();
  files.forEach(file => {
    const nameBytes = Array.from(encoder.encode(file.name));
    const contentBytes = Array.from(encoder.encode(file.content));
    const crc = crc32(file.content);
    writeUint32(output, 0x04034b50); writeUint16(output, 20); writeUint16(output, 0); writeUint16(output, 0);
    writeUint16(output, 0); writeUint16(output, 0); writeUint32(output, crc);
    writeUint32(output, contentBytes.length); writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length); writeUint16(output, 0); output.push(...nameBytes, ...contentBytes);

    writeUint32(central, 0x02014b50); writeUint16(central, 20); writeUint16(central, 20); writeUint16(central, 0); writeUint16(central, 0);
    writeUint16(central, 0); writeUint16(central, 0); writeUint32(central, crc); writeUint32(central, contentBytes.length); writeUint32(central, contentBytes.length);
    writeUint16(central, nameBytes.length); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0);
    writeUint32(central, 0); writeUint32(central, offset); central.push(...nameBytes);
    offset = output.length;
  });
  const centralOffset = output.length;
  output.push(...central);
  writeUint32(output, 0x06054b50); writeUint16(output, 0); writeUint16(output, 0); writeUint16(output, files.length); writeUint16(output, files.length);
  writeUint32(output, central.length); writeUint32(output, centralOffset); writeUint16(output, 0);
  return new Uint8Array(output);
}

function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportFinanceXlsx(rows: FinanceExportRow[], filename: string) {
  const headers = ["Fecha", "Equipo", "Tipo", "Categoria", "Metodo", "Descripcion", "Ingreso", "Egreso", "Saldo"];
  const body = [headers, ...rows.map(row => [row.fecha, row.equipo, row.tipo, row.categoria, row.metodo || "", row.descripcion || "", row.ingreso, row.egreso, row.saldo])]
    .map(values => `<row>${values.map(value => typeof value === "number" ? `<c><v>${value}</v></c>` : `<c t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`).join("")}</row>`).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Finanzas" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const zip = createZip([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rels },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/worksheets/sheet1.xml", content: sheet },
  ]);
  downloadBlob(new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
}
