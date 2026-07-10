import type { Nodo, ResultadoDepuracion, Valor } from "@simplecod/core";
import type { ResaltadoLinea } from "./resaltado.js";

export interface PasoVisible {
  variables: Record<string, Valor>;
  salida: string;
  lineaResaltada: ResaltadoLinea;
}

const VACIO: PasoVisible = {
  variables: {},
  salida: "",
  lineaResaltada: { linea: null, tipo: null },
};

function lineaDe(nodo: Nodo): number | null {
  return "linea" in nodo ? nodo.linea : null;
}

export function obtenerPasoVisible(
  resultado: ResultadoDepuracion | null,
  pasoActual: number,
): PasoVisible {
  if (!resultado) return VACIO;

  const pasos = resultado.pasos;
  const paradoEnError = !resultado.ok && pasoActual >= pasos.length;

  if (paradoEnError && !resultado.ok) {
    const ultimo = pasos.at(-1);
    return {
      variables: ultimo?.variables ?? {},
      salida: ultimo?.salida ?? "",
      lineaResaltada: { linea: resultado.linea, tipo: "error" },
    };
  }

  const paso = pasoActual >= 0 ? pasos[pasoActual] : undefined;
  if (!paso) return VACIO;

  return {
    variables: paso.variables,
    salida: paso.salida,
    lineaResaltada: { linea: lineaDe(paso.nodo), tipo: "ejecucion" },
  };
}
