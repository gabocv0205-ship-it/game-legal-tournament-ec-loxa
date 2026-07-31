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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

export type TeamPlayerPdfRow = {
  index: number;
  fullName: string;
  identification: string;
  jerseyNumber: string;
  status: string;
  goals: number;
  yellowCards: number;
  redCards: number;
  matchesPlayed: number;
};

export type TeamPlayersPdfReport = {
  tournamentName: string;
  tournamentCategory?: string;
  teamName: string;
  teamShieldUrl?: string;
  generatedAt: string;
  rows: TeamPlayerPdfRow[];
};

export type TeamPlayerCardRow = TeamPlayerPdfRow & {
  photoUrl?: string;
  eligibilityReason?: string;
};

export type TeamPlayerCardsReport = {
  tournamentName: string;
  tournamentCategory?: string;
  teamName: string;
  teamShieldUrl?: string;
  generatedAt: string;
  rows: TeamPlayerCardRow[];
  options?: {
    photo?: boolean;
    identification?: boolean;
    jerseyNumber?: boolean;
    status?: boolean;
  };
};

export function exportTeamPlayersPdf(report: TeamPlayersPdfReport, filename: string) {
  const category = report.tournamentCategory ? `<p class="muted">Modalidad/Categoria: ${escapeHtml(report.tournamentCategory)}</p>` : "";
  const shield = report.teamShieldUrl
    ? `<img class="shield" src="${escapeHtml(report.teamShieldUrl)}" alt="Escudo de ${escapeHtml(report.teamName)}" />`
    : `<div class="shield placeholder">GL</div>`;
  const rowsHtml = report.rows.length
    ? report.rows.map(row => `<tr>
        <td class="center">${row.index}</td>
        <td>${escapeHtml(row.fullName)}</td>
        <td>${escapeHtml(row.identification)}</td>
        <td class="center">${escapeHtml(row.jerseyNumber)}</td>
        <td><span class="badge">${escapeHtml(row.status)}</span></td>
        <td class="center">${row.matchesPlayed}</td>
        <td class="center">${row.goals}</td>
        <td class="center">${row.yellowCards}</td>
        <td class="center">${row.redCards}</td>
      </tr>`).join("")
    : `<tr><td colspan="9" class="empty">No existen jugadores registrados para este equipo en el torneo seleccionado.</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.teamName)} - Jugadores</title><style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Arial Nova Light", Inter, "Segoe UI", Arial, sans-serif; color: #172033; background: #f7f8fb; }
    .page { min-height: 100vh; padding: 18px; background: linear-gradient(180deg, #ffffff 0%, #f3f5fa 100%); border: 1px solid #d8dde8; }
    .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; border-radius: 18px; background: #101827; color: #fff; border-bottom: 5px solid #d4a017; }
    h1 { margin: 0; font-size: 20px; letter-spacing: .08em; text-transform: uppercase; }
    h2 { margin: 6px 0 0; font-size: 14px; color: #d4a017; letter-spacing: .12em; text-transform: uppercase; }
    .muted { margin: 4px 0 0; color: #d8dde8; font-size: 11px; }
    .shield { width: 76px; height: 76px; object-fit: contain; border-radius: 18px; background: #fff; padding: 8px; border: 1px solid rgba(212,160,23,.55); }
    .placeholder { display: grid; place-items: center; color: #101827; font-weight: 900; font-size: 18px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
    .card { border: 1px solid #d8dde8; border-radius: 14px; padding: 10px 12px; background: #fff; }
    .label { margin: 0 0 4px; color: #687386; font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    .value { margin: 0; color: #172033; font-size: 13px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; background: #fff; font-size: 10px; border-radius: 14px; overflow: hidden; }
    th { background: #101827; color: #d4a017; padding: 8px 6px; text-align: left; text-transform: uppercase; letter-spacing: .08em; font-size: 8px; }
    td { border-bottom: 1px solid #e4e8f0; padding: 7px 6px; color: #172033; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    .center { text-align: center; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; background: #eef2f7; color: #172033; font-weight: 800; font-size: 9px; }
    .empty { text-align: center; padding: 22px; color: #687386; font-style: italic; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #d8dde8; color: #687386; font-size: 9px; text-align: center; letter-spacing: .1em; text-transform: uppercase; }
    @media print { body { background: #fff; } .page { border: 0; min-height: auto; } table, tr, .card, .header { page-break-inside: avoid; } }
  </style></head><body>
    <main class="page">
      <section class="header">
        <div>
          <h1>${escapeHtml(report.tournamentName)}</h1>
          <h2>${escapeHtml(report.teamName)}</h2>
          ${category}
          <p class="muted">Reporte generado: ${escapeHtml(report.generatedAt)}</p>
        </div>
        ${shield}
      </section>
      <section class="meta">
        <div class="card"><p class="label">Equipo</p><p class="value">${escapeHtml(report.teamName)}</p></div>
        <div class="card"><p class="label">Total jugadores</p><p class="value">${report.rows.length}</p></div>
      </section>
      <table>
        <thead><tr><th>#</th><th>Jugador</th><th>Identificacion</th><th>Nro.</th><th>Estado</th><th>PJ</th><th>Goles</th><th>TA</th><th>TR</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="footer">Game Legal Tournament &middot; Reporte oficial de jugadores por equipo</div>
    </main>
  </body></html>`;

  const popup = window.open("", "_blank");
  if (!popup) {
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), filename.replace(/\.pdf$/i, ".html"));
    return;
  }
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 300);
}

function playerCardsHtml(report: TeamPlayerCardsReport) {
  const options = {
    photo: true,
    identification: true,
    jerseyNumber: true,
    status: true,
    ...report.options,
  };
  const cards = report.rows.length
    ? report.rows.map(row => {
      const photo = options.photo && row.photoUrl
        ? `<img class="player-photo" src="${escapeHtml(row.photoUrl)}" alt="Foto de ${escapeHtml(row.fullName)}" />`
        : `<div class="player-photo placeholder">${escapeHtml(row.fullName.slice(0, 1).toUpperCase() || "J")}</div>`;
      const identification = options.identification ? `<p><strong>Identificacion:</strong> ${escapeHtml(row.identification)}</p>` : "";
      const jersey = options.jerseyNumber ? `<p><strong>Dorsal:</strong> ${escapeHtml(row.jerseyNumber)}</p>` : "";
      const status = options.status ? `<span class="status">${escapeHtml(row.status)}</span>` : "";
      return `<article class="card">
        <div class="card-top"><div class="team-mark">${report.teamShieldUrl ? `<img src="${escapeHtml(report.teamShieldUrl)}" alt="Escudo" />` : "GL"}</div><span class="card-label">GAME LEGAL<br/>CARNET OFICIAL</span></div>
        <div class="player-main">${photo}<div class="player-copy"><h2>${escapeHtml(row.fullName)}</h2>${identification}${jersey}${status}</div></div>
        ${row.eligibilityReason ? `<p class="reason">${escapeHtml(row.eligibilityReason)}</p>` : ""}
        <div class="card-footer"><span>${escapeHtml(report.teamName)}</span><span>${escapeHtml(report.tournamentName)}</span></div>
      </article>`;
    }).join("")
    : `<p class="empty">No existen jugadores registrados para este equipo en el torneo seleccionado.</p>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Carnets - ${escapeHtml(report.teamName)}</title><style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f5; color: #132033; font-family: Arial, "Helvetica Neue", sans-serif; }
    .page { max-width: 794px; margin: 0 auto; padding: 18px; background: #fff; }
    .heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #d4a017; }
    .heading h1 { margin: 0; font-size: 19px; text-transform: uppercase; letter-spacing: .08em; }
    .heading p { margin: 4px 0 0; color: #5b6878; font-size: 10px; }
    .heading .date { color: #7b5a00; font-size: 9px; text-align: right; }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { min-height: 214px; page-break-inside: avoid; break-inside: avoid; overflow: hidden; border: 1px solid #d4a017; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f4f7fb); box-shadow: 0 3px 10px rgba(16, 24, 39, .1); }
    .card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; background: #101827; color: #fff; border-bottom: 3px solid #d4a017; }
    .team-mark { width: 34px; height: 34px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; background: #fff; color: #101827; font-weight: 900; font-size: 10px; }
    .team-mark img { width: 100%; height: 100%; object-fit: contain; }
    .card-label { color: #f5c842; font-size: 7px; font-weight: 900; letter-spacing: .12em; line-height: 1.35; text-align: right; }
    .player-main { display: flex; align-items: center; gap: 10px; padding: 12px 12px 7px; }
    .player-photo { width: 68px; height: 78px; flex: 0 0 68px; object-fit: cover; border: 2px solid #d4a017; border-radius: 8px; background: #e6ebf1; }
    .placeholder { display: grid; place-items: center; color: #8b6700; font-size: 26px; font-weight: 900; }
    .player-copy { min-width: 0; }
    .player-copy h2 { margin: 0 0 5px; overflow-wrap: anywhere; color: #101827; font-size: 14px; line-height: 1.1; text-transform: uppercase; }
    .player-copy p { margin: 2px 0; color: #536274; font-size: 9px; }
    .player-copy strong { color: #1b2a3b; }
    .status { display: inline-block; margin-top: 4px; padding: 3px 7px; border-radius: 999px; background: #e8f6ed; color: #146c37; font-size: 8px; font-weight: 900; text-transform: uppercase; }
    .reason { margin: 0 12px 8px; color: #8a3a24; font-size: 8px; }
    .card-footer { display: flex; justify-content: space-between; gap: 8px; margin: 0 12px; padding: 7px 0 8px; border-top: 1px solid #dce3eb; color: #6a7786; font-size: 7px; text-transform: uppercase; }
    .empty { padding: 30px; color: #64748b; text-align: center; }
    .footer { margin-top: 18px; color: #64748b; font-size: 8px; text-align: center; text-transform: uppercase; letter-spacing: .1em; }
    @media print { body { background: #fff; } .page { max-width: none; padding: 0; } .card { box-shadow: none; } }
  </style></head><body><main class="page">
    <header class="heading"><div><h1>${escapeHtml(report.tournamentName)}</h1><p>${escapeHtml(report.teamName)}${report.tournamentCategory ? ` · ${escapeHtml(report.tournamentCategory)}` : ""}</p></div><div class="date">CARNETS DE JUGADORES<br/>${escapeHtml(report.generatedAt)}</div></header>
    <section class="cards">${cards}</section>
    <footer class="footer">Game Legal Tournament · Documento oficial</footer>
  </main></body></html>`;
}

export function exportTeamPlayerCardsPdf(report: TeamPlayerCardsReport, filename: string) {
  const html = playerCardsHtml(report);
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

export function exportTeamPlayerCardsZip(report: TeamPlayerCardsReport, filename: string) {
  const html = playerCardsHtml(report);
  const csv = [
    ["#", "Jugador", "Identificacion", "Dorsal", "Estado"],
    ...report.rows.map(row => [row.index, row.fullName, row.identification, row.jerseyNumber, row.status]),
  ].map(row => row.map(escapeCsv).join(",")).join("\r\n");
  const zip = createZip([
    { name: "carnets.html", content: html },
    { name: "jugadores.csv", content: `\ufeff${csv}` },
    { name: "LEEME.txt", content: "Abra carnets.html para visualizar e imprimir los carnets del equipo." },
  ]);
  downloadBlob(new Blob([zip], { type: "application/zip" }), filename);
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
