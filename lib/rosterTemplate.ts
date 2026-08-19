export async function createRosterWordTemplateBlob(tournamentName: string, playerSlots: number) {
  const docx: any = await import("docx");
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType, BorderStyle, AlignmentType } = docx;
  const cell = (text: string, width: number) => new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: "27364A" }, bottom: { style: BorderStyle.SINGLE, size: 8, color: "27364A" }, left: { style: BorderStyle.SINGLE, size: 8, color: "27364A" }, right: { style: BorderStyle.SINGLE, size: 8, color: "27364A" } },
    children: [new Paragraph({ text, alignment: AlignmentType.CENTER })],
  });
  const playerRows = Array.from({ length: Math.max(1, playerSlots) }, (_, index) => new TableRow({
    children: [cell(String(index + 1), 6), cell("", 28), cell("", 54), cell("", 12)],
  }));
  const wordDocument = new Document({ sections: [{ children: [
    new Paragraph({ text: "GAME LEGAL TOURNAMENT", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "FICHA OFICIAL DE INSCRIPCION", heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`TORNEO: ${tournamentName}`),
    new Paragraph("EQUIPO: ________________________________________________"),
    new Paragraph("DIRIGENTE: ______________________________________________"),
    new Paragraph("CELULAR: _________________________________________________"),
    new Paragraph("Complete todos los campos digitalmente antes de devolver este archivo."),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell("#", 6), cell("CEDULA / IDENTIFICACION", 28), cell("NOMBRES COMPLETOS", 54), cell("DORSAL", 12)] }),
      ...playerRows,
    ] }),
  ] }] });
  return Packer.toBlob(wordDocument) as Promise<Blob>;
}

export async function downloadRosterWordTemplate(tournamentName: string, playerSlots: number) {
  const blob = await createRosterWordTemplateBlob(tournamentName, playerSlots);
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement("a");
  anchor.href = url;
  anchor.download = "ficha-inscripcion-game-legal.docx";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
