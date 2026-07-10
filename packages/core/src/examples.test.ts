// Corre los programas de examples/ (los mismos que docs/gramatica.md §5 y que
// packages/web precarga como demo) para asegurar que el repo publicado
// realmente funciona de punta a punta, no solo que compila.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { construirTraza } from "./depurador/index.js";

const DIR_EXAMPLES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../examples",
);

interface CasoEjemplo {
  archivo: string;
  entradas: string[];
  salidaEsperada: string;
}

const CASOS: CasoEjemplo[] = [
  { archivo: "asteriscos.scc", entradas: ["3"], salidaEsperada: "#\n#*\n#*#\n" },
  { archivo: "es_primo.scc", entradas: ["7"], salidaEsperada: "7 es primo\n" },
  {
    archivo: "promedio_notas.scc",
    entradas: ["10", "20", "30", "40", "50"],
    salidaEsperada: "Promedio: 30\n",
  },
  { archivo: "dias_semana.scc", entradas: [], salidaEsperada: "Lun\nMar\nMie\nJue\nVie\n" },
];

describe("examples/*.scc", () => {
  for (const caso of CASOS) {
    it(`${caso.archivo} corre sin errores y produce la salida esperada`, () => {
      const fuente = readFileSync(path.join(DIR_EXAMPLES, caso.archivo), "utf-8");
      const resultado = construirTraza(fuente, { entradas: caso.entradas });
      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      expect(resultado.salidaFinal).toBe(caso.salidaEsperada);
    });
  }
});
