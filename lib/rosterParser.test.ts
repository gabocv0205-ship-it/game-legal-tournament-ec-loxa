import { describe, expect, it } from "vitest";
import { parseRosterText } from "./rosterParser";

describe("parseRosterText", () => {
  it("lee las celdas consecutivas que devuelve la plantilla Word", () => {
    const result = parseRosterText("EQUIPO: Loja FC\n\nDIRIGENTE: Ana Perez\n\nCELULAR: 0991234567\n\n#\n\nCEDULA / IDENTIFICACION\n\nNOMBRES COMPLETOS\n\nDORSAL\n\n1\n\n1101234567\n\nJUAN PEREZ\n\n10\n\n2\n\n1107654321\n\nCARLOS LOPEZ\n\n7\n");
    expect(result.teamName).toBe("Loja FC");
    expect(result.managerName).toBe("Ana Perez");
    expect(result.managerPhone).toBe("0991234567");
    expect(result.players).toEqual([
      { identification: "1101234567", fullName: "JUAN PEREZ", jerseyNumber: 10 },
      { identification: "1107654321", fullName: "CARLOS LOPEZ", jerseyNumber: 7 },
    ]);
  });

  it("ignora filas incompletas o con dorsal fuera de rango", () => {
    const result = parseRosterText("1\n\n1101234567\n\nJUAN PEREZ\n\n100\n");
    expect(result.players).toHaveLength(0);
  });
});
