export function parseRosterText(text: string) {
  const field = (label: string) => text.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "im"))?.[1]?.replace(/_+/g, "").trim() || "";
  const lines = text.replace(/\r/g, "").split("\n").map(line => line.trim()).filter(Boolean);
  const players: { identification: string; fullName: string; jerseyNumber: number }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const inline = lines[index].match(/^(\d{1,2})\s*[|;,-]\s*([A-Za-z0-9-]{6,20})\s*[|;,-]\s*(.{3,}?)\s*[|;,-]\s*(\d{1,2})$/)?.slice(1);
    const sequential = /^\d{1,2}$/.test(lines[index]) && index + 3 < lines.length
      ? [lines[index], lines[index + 1], lines[index + 2], lines[index + 3]]
      : undefined;
    const match = inline || sequential;
    if (!match || !/^[A-Za-z0-9-]{6,20}$/.test(match[1]) || !/^\d{1,2}$/.test(match[3])) continue;
    const jerseyNumber = Number(match[3]);
    if (jerseyNumber < 1 || jerseyNumber > 99 || match[2].length < 3) continue;
    players.push({ identification: match[1], fullName: match[2].replace(/\s+/g, " ").trim(), jerseyNumber });
    if (sequential) index += 3;
  }
  return { teamName: field("EQUIPO"), managerName: field("DIRIGENTE"), managerPhone: field("CELULAR"), players };
}
