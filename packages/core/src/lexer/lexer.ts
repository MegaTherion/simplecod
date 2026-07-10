import { ErrorLexico } from "../errores/index.js";
import { PALABRAS_RESERVADAS, type Token } from "./tokens.js";

const ES_DIGITO = (c: string): boolean => c >= "0" && c <= "9";
const ES_LETRA = (c: string): boolean => /[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ]/.test(c);
const ES_CONTINUACION_IDENTIFICADOR = (c: string): boolean =>
  ES_LETRA(c) || ES_DIGITO(c) || c === "_";

export class Lexer {
  private readonly fuente: string;
  private posicion = 0;
  private linea = 1;
  private columna = 1;

  constructor(fuente: string) {
    this.fuente = fuente;
  }

  tokenizar(): Token[] {
    const tokens: Token[] = [];
    for (;;) {
      this.saltarEspaciosYComentarios();
      if (this.finDeArchivo()) {
        tokens.push({ tipo: "EOF", lexema: "", linea: this.linea, columna: this.columna });
        break;
      }
      tokens.push(this.siguienteToken());
    }
    return tokens;
  }

  private finDeArchivo(): boolean {
    return this.posicion >= this.fuente.length;
  }

  private verActual(): string {
    return this.fuente[this.posicion] ?? "";
  }

  private verSiguiente(): string {
    return this.fuente[this.posicion + 1] ?? "";
  }

  private avanzar(): string {
    const c = this.fuente[this.posicion] as string;
    this.posicion++;
    if (c === "\n") {
      this.linea++;
      this.columna = 1;
    } else {
      this.columna++;
    }
    return c;
  }

  private saltarEspaciosYComentarios(): void {
    for (;;) {
      const c = this.verActual();
      if (c === " " || c === "\t" || c === "\r" || c === "\n") {
        this.avanzar();
      } else if (c === "/" && this.verSiguiente() === "/") {
        while (!this.finDeArchivo() && this.verActual() !== "\n") {
          this.avanzar();
        }
      } else {
        break;
      }
    }
  }

  private siguienteToken(): Token {
    const linea = this.linea;
    const columna = this.columna;
    const c = this.verActual();

    if (ES_DIGITO(c)) return this.leerNumero(linea, columna);
    if (c === '"') return this.leerCadena(linea, columna);
    if (ES_LETRA(c)) return this.leerIdentificador(linea, columna);
    return this.leerSimbolo(linea, columna);
  }

  private leerNumero(linea: number, columna: number): Token {
    let lexema = "";
    while (ES_DIGITO(this.verActual())) {
      lexema += this.avanzar();
    }
    if (this.verActual() === ".") {
      if (!ES_DIGITO(this.verSiguiente())) {
        throw new ErrorLexico(
          `número mal formado '${lexema}.': se esperaba un dígito después del punto`,
          { linea, columna },
        );
      }
      lexema += this.avanzar(); // '.'
      while (ES_DIGITO(this.verActual())) {
        lexema += this.avanzar();
      }
    }
    return { tipo: "NUMERO", lexema, linea, columna };
  }

  private leerCadena(linea: number, columna: number): Token {
    this.avanzar(); // comilla de apertura
    let lexema = "";
    while (!this.finDeArchivo() && this.verActual() !== '"' && this.verActual() !== "\n") {
      lexema += this.avanzar();
    }
    if (this.finDeArchivo() || this.verActual() === "\n") {
      throw new ErrorLexico("cadena sin cerrar", { linea, columna });
    }
    this.avanzar(); // comilla de cierre
    return { tipo: "CADENA", lexema, linea, columna };
  }

  private leerIdentificador(linea: number, columna: number): Token {
    let lexema = "";
    while (ES_CONTINUACION_IDENTIFICADOR(this.verActual())) {
      lexema += this.avanzar();
    }
    const tipo = PALABRAS_RESERVADAS[lexema] ?? "IDENTIFICADOR";
    return { tipo, lexema, linea, columna };
  }

  private leerSimbolo(linea: number, columna: number): Token {
    const c = this.avanzar();
    switch (c) {
      case "+":
        return { tipo: "MAS", lexema: c, linea, columna };
      case "-":
        return { tipo: "MENOS", lexema: c, linea, columna };
      case "*":
        return { tipo: "POR", lexema: c, linea, columna };
      case "/":
        return { tipo: "DIV", lexema: c, linea, columna };
      case "^":
        return { tipo: "POTENCIA", lexema: c, linea, columna };
      case "(":
        return { tipo: "PARENTESIS_IZQ", lexema: c, linea, columna };
      case ")":
        return { tipo: "PARENTESIS_DER", lexema: c, linea, columna };
      case "[":
        return { tipo: "CORCHETE_IZQ", lexema: c, linea, columna };
      case "]":
        return { tipo: "CORCHETE_DER", lexema: c, linea, columna };
      case ",":
        return { tipo: "COMA", lexema: c, linea, columna };
      case "=":
        if (this.verActual() === "=") {
          this.avanzar();
          return { tipo: "IGUAL_IGUAL", lexema: "==", linea, columna };
        }
        return { tipo: "IGUAL", lexema: c, linea, columna };
      case "!":
        if (this.verActual() === "=") {
          this.avanzar();
          return { tipo: "DISTINTO", lexema: "!=", linea, columna };
        }
        throw new ErrorLexico(`carácter inesperado '${c}'`, { linea, columna });
      case "<":
        if (this.verActual() === "=") {
          this.avanzar();
          return { tipo: "MENOR_IGUAL", lexema: "<=", linea, columna };
        }
        return { tipo: "MENOR", lexema: c, linea, columna };
      case ">":
        if (this.verActual() === "=") {
          this.avanzar();
          return { tipo: "MAYOR_IGUAL", lexema: ">=", linea, columna };
        }
        return { tipo: "MAYOR", lexema: c, linea, columna };
      default:
        throw new ErrorLexico(`carácter inesperado '${c}'`, { linea, columna });
    }
  }
}
