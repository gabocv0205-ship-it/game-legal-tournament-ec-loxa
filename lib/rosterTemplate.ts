export async function downloadRosterWordTemplate(tournamentName: string, playerSlots: number) {
  const docx: any = await import("docx");
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, HeadingLevel, WidthType } = docx;
  const cell = (text: string) => new TableCell({ children: [new Paragraph(text)] });
  const playerRows = Array.from({ length: Math.max(1, playerSlots) }, (_, index) => new TableRow({
    children: [cell(String(index + 1)), cell(""), cell(""), cell("")],
  }));
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: "GAME LEGAL TOURNAMENT", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "FICHA OFICIAL DE INSCRIPCION", heading: HeadingLevel.HEADING_1 }),
    new Paragraph(`TORNEO: ${tournamentName}`),
    new Paragraph("EQUIPO: ________________________________________________"),
    new Paragraph("DIRIGENTE: ______________________________________________"),
    new Paragraph("CELULAR: _________________________________________________"),
    new Paragraph("Complete todos los campos digitalmente antes de devolver este archivo."),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell("#"), cell("CEDULA / IDENTIFICACION"), cell("NOMBRES COMPLETOS"), cell("DORSAL")] }),
      ...playerRows,
    ] }),
  ] }] });
  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ficha-inscripcion-game-legal.docx";
  anchor.click();
  URL.revokeObjectURL(url);
}
