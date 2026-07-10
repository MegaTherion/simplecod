// Arma una traza completa de ejecución de una sola pasada: corre el programa
// entero grabando un snapshot (nodo + variables + salida acumulada) tras cada
// sentencia. El debugger visual (Hito 6, packages/web) navega esta traza
// adelante/atrás en vez de pausar una ejecución en vivo — más simple que
// convertir el intérprete a generators, y da "paso atrás" gratis.
import type { Nodo } from "../ast/index.js";
import { ErrorEjecucion, ErrorLexico, ErrorSintactico } from "../errores/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { Interprete, type Valor } from "../interpreter/index.js";

export interface PasoTraza {
  nodo: Nodo;
  variables: Record<string, Valor>;
  salida: string;
}

export type CategoriaError = "léxico" | "sintáctico" | "de ejecución";

export interface ResultadoDepuracionExito {
  ok: true;
  pasos: PasoTraza[];
  salidaFinal: string;
}

export interface ResultadoDepuracionError {
  ok: false;
  categoria: CategoriaError;
  mensaje: string;
  linea: number;
  columna: number;
  /** Pasos ejecutados con éxito antes de que ocurriera el error (vacío si fue léxico/sintáctico). */
  pasos: PasoTraza[];
}

export type ResultadoDepuracion = ResultadoDepuracionExito | ResultadoDepuracionError;

export interface OpcionesDepurador {
  entradas?: string[];
  maxSentencias?: number;
}

export function construirTraza(
  fuente: string,
  opciones: OpcionesDepurador = {},
): ResultadoDepuracion {
  const pasos: PasoTraza[] = [];
  let salidaActual = "";

  try {
    const tokens = new Lexer(fuente).tokenizar();
    const ast = new Parser(tokens).parsear();
    const interprete = new Interprete({
      entradas: opciones.entradas ?? [],
      ...(opciones.maxSentencias !== undefined ? { maxSentencias: opciones.maxSentencias } : {}),
      alEscribir: (texto) => {
        salidaActual += texto;
      },
      alEjecutarSentencia: (info) => {
        pasos.push({ nodo: info.nodo, variables: info.variables, salida: salidaActual });
      },
    });
    interprete.ejecutar(ast);
    return { ok: true, pasos, salidaFinal: interprete.salida };
  } catch (error) {
    if (
      error instanceof ErrorLexico ||
      error instanceof ErrorSintactico ||
      error instanceof ErrorEjecucion
    ) {
      const categoria: CategoriaError =
        error instanceof ErrorLexico
          ? "léxico"
          : error instanceof ErrorSintactico
            ? "sintáctico"
            : "de ejecución";
      return {
        ok: false,
        categoria,
        mensaje: error.message,
        linea: error.linea,
        columna: error.columna,
        pasos,
      };
    }
    throw error;
  }
}
