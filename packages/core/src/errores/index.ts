export interface Posicion {
  linea: number;
  columna: number;
}

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
