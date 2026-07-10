import type { Posicion } from "../ast/index.js";

export abstract class ErrorSimpleCod extends Error {
  readonly linea: number;
  readonly columna: number;

  constructor(categoria: string, mensaje: string, posicion: Posicion) {
    super(`Error ${categoria} [línea ${posicion.linea}, columna ${posicion.columna}]: ${mensaje}`);
    this.linea = posicion.linea;
    this.columna = posicion.columna;
  }
}

export class ErrorLexico extends ErrorSimpleCod {
  constructor(mensaje: string, posicion: Posicion) {
    super("léxico", mensaje, posicion);
    this.name = "ErrorLexico";
  }
}

export class ErrorSintactico extends ErrorSimpleCod {
  constructor(mensaje: string, posicion: Posicion) {
    super("sintáctico", mensaje, posicion);
    this.name = "ErrorSintactico";
  }
}
