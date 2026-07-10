import { ErrorSintactico } from "../errores/index.js";
import type { Token, TipoToken } from "../lexer/index.js";
import type {
  AccesoArreglo,
  BuclePara,
  BucleMientras,
  Condicional,
  DeclaracionFuncion,
  Dimension,
  ExpresionBinaria,
  Identificador,
  Lectura,
  LiteralArreglo,
  LlamadaFuncion,
  Nodo,
  Programa,
  Retorno,
} from "../ast/index.js";

const OPERADORES_RELACIONALES: TipoToken[] = [
  "IGUAL_IGUAL",
  "DISTINTO",
  "MENOR",
  "MAYOR",
  "MENOR_IGUAL",
  "MAYOR_IGUAL",
];

export class Parser {
  private readonly tokens: Token[];
  private posicion = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parsear(): Programa {
    return this.programa();
  }

  // --- utilidades de token ---

  private actual(): Token {
    return this.tokens[this.posicion] as Token;
  }

  private revisar(tipo: TipoToken): boolean {
    return this.actual().tipo === tipo;
  }

  private avanzar(): Token {
    const token = this.actual();
    if (token.tipo !== "EOF") this.posicion++;
    return token;
  }

  private coincide(tipo: TipoToken): boolean {
    if (this.revisar(tipo)) {
      this.avanzar();
      return true;
    }
    return false;
  }

  private esperar(tipo: TipoToken, queSeEsperaba: string): Token {
    if (this.revisar(tipo)) return this.avanzar();
    throw this.errorInesperado(queSeEsperaba);
  }

  private errorInesperado(queSeEsperaba: string): ErrorSintactico {
    const token = this.actual();
    const encontrado = token.tipo === "EOF" ? "fin de archivo" : `'${token.lexema}'`;
    return new ErrorSintactico(`se esperaba ${queSeEsperaba}, pero se encontró ${encontrado}`, {
      linea: token.linea,
      columna: token.columna,
    });
  }

  // --- programa y elementos de nivel superior ---

  private programa(): Programa {
    this.esperar("Inicio", "'Inicio' al comienzo del programa");
    const cuerpo: Nodo[] = [];
    while (!this.revisar("Fin") && !this.revisar("EOF")) {
      cuerpo.push(this.elemento());
    }
    this.esperar("Fin", "'Fin' para cerrar el programa");
    if (!this.revisar("EOF")) {
      throw this.errorInesperado("fin de archivo después de 'Fin'");
    }
    return { tipo: "Programa", cuerpo };
  }

  private elemento(): Nodo {
    if (this.revisar("Funcion")) return this.declaracionFuncion();
    return this.sentencia();
  }

  private sentencias(terminadores: TipoToken[]): Nodo[] {
    const nodos: Nodo[] = [];
    while (!terminadores.some((t) => this.revisar(t))) {
      if (this.revisar("EOF")) {
        throw this.errorInesperado(terminadores.map((t) => `'${t}'`).join(" o "));
      }
      nodos.push(this.sentencia());
    }
    return nodos;
  }

  private sentencia(): Nodo {
    switch (this.actual().tipo) {
      case "Dimension":
        return this.dimension();
      case "Leer":
        return this.lectura();
      case "Escribir":
        return this.escritura();
      case "Si":
        return this.condicional();
      case "Mientras":
        return this.bucleMientras();
      case "Para":
        return this.buclePara();
      case "Retornar":
        return this.retorno();
      case "IDENTIFICADOR":
        return this.asignacionOLlamada();
      default:
        throw this.errorInesperado("una sentencia");
    }
  }

  private declaracionFuncion(): DeclaracionFuncion {
    const inicio = this.esperar("Funcion", "'Funcion'");
    const nombre = this.esperar("IDENTIFICADOR", "el nombre de la función").lexema;
    this.esperar("PARENTESIS_IZQ", "'(' después del nombre de la función");
    const parametros: string[] = [];
    if (!this.revisar("PARENTESIS_DER")) {
      parametros.push(this.esperar("IDENTIFICADOR", "un parámetro").lexema);
      while (this.coincide("COMA")) {
        parametros.push(this.esperar("IDENTIFICADOR", "un parámetro").lexema);
      }
    }
    this.esperar("PARENTESIS_DER", "')' para cerrar los parámetros");
    const cuerpo = this.sentencias(["FinFuncion"]);
    this.esperar("FinFuncion", "'FinFuncion' para cerrar la función");
    return {
      tipo: "DeclaracionFuncion",
      nombre,
      parametros,
      cuerpo,
      linea: inicio.linea,
      columna: inicio.columna,
    };
  }

  // --- declaraciones y asignaciones ---

  private dimension(): Dimension {
    const inicio = this.esperar("Dimension", "'Dimension'");
    const nombre = this.esperar("IDENTIFICADOR", "el nombre del arreglo").lexema;
    const dimensiones: Nodo[] = [];
    this.esperar("CORCHETE_IZQ", "'[' para indicar el tamaño del arreglo");
    dimensiones.push(this.expresion());
    this.esperar("CORCHETE_DER", "']' para cerrar la dimensión");
    while (this.revisar("CORCHETE_IZQ")) {
      this.avanzar();
      dimensiones.push(this.expresion());
      this.esperar("CORCHETE_DER", "']' para cerrar la dimensión");
    }
    return {
      tipo: "Dimension",
      nombre,
      dimensiones,
      linea: inicio.linea,
      columna: inicio.columna,
    };
  }

  private leerIndices(): Nodo[] {
    const indices: Nodo[] = [];
    while (this.revisar("CORCHETE_IZQ")) {
      this.avanzar();
      indices.push(this.expresion());
      this.esperar("CORCHETE_DER", "']' para cerrar el índice");
    }
    return indices;
  }

  private objetivo(): Identificador | AccesoArreglo {
    const token = this.esperar("IDENTIFICADOR", "un identificador");
    const indices = this.leerIndices();
    if (indices.length === 0) {
      return {
        tipo: "Identificador",
        nombre: token.lexema,
        linea: token.linea,
        columna: token.columna,
      };
    }
    return {
      tipo: "AccesoArreglo",
      nombre: token.lexema,
      indices,
      linea: token.linea,
      columna: token.columna,
    };
  }

  private asignacionOLlamada(): Nodo {
    const siguiente = this.tokens[this.posicion + 1];
    if (siguiente?.tipo === "PARENTESIS_IZQ") {
      return this.llamadaFuncion();
    }
    const objetivoNodo = this.objetivo();
    this.esperar("IGUAL", "'=' para la asignación");
    const valor = this.expresion();
    return {
      tipo: "Asignacion",
      objetivo: objetivoNodo,
      valor,
      linea: objetivoNodo.linea,
      columna: objetivoNodo.columna,
    };
  }

  private llamadaFuncion(): LlamadaFuncion {
    const token = this.esperar("IDENTIFICADOR", "el nombre de la función");
    this.esperar("PARENTESIS_IZQ", "'(' para los argumentos");
    const argumentos = this.listaArgumentos();
    this.esperar("PARENTESIS_DER", "')' para cerrar los argumentos");
    return {
      tipo: "LlamadaFuncion",
      nombre: token.lexema,
      argumentos,
      linea: token.linea,
      columna: token.columna,
    };
  }

  private listaArgumentos(): Nodo[] {
    const argumentos: Nodo[] = [];
    if (this.revisar("PARENTESIS_DER")) return argumentos;
    argumentos.push(this.expresion());
    while (this.coincide("COMA")) {
      argumentos.push(this.expresion());
    }
    return argumentos;
  }

  // --- entrada / salida ---

  private lectura(): Lectura {
    const inicio = this.esperar("Leer", "'Leer'");
    const objetivos: (Identificador | AccesoArreglo)[] = [this.objetivo()];
    while (this.coincide("COMA")) {
      objetivos.push(this.objetivo());
    }
    return { tipo: "Lectura", objetivos, linea: inicio.linea, columna: inicio.columna };
  }

  private escritura(): Nodo {
    const inicio = this.esperar("Escribir", "'Escribir'");
    const expresiones: Nodo[] = [this.expresion()];
    while (this.coincide("COMA")) {
      expresiones.push(this.expresion());
    }
    return { tipo: "Escritura", expresiones, linea: inicio.linea, columna: inicio.columna };
  }

  // --- control de flujo ---

  private condicional(): Condicional {
    const inicio = this.esperar("Si", "'Si'");
    const condicion = this.expresion();
    this.esperar("Entonces", "'Entonces' después de la condición del 'Si'");
    const bloqueSi = this.sentencias(["Sino", "FinSi"]);
    let bloqueSino: Nodo[] | null = null;
    if (this.coincide("Sino")) {
      bloqueSino = this.sentencias(["FinSi"]);
    }
    this.esperar("FinSi", "'FinSi' para cerrar el 'Si'");
    return {
      tipo: "Condicional",
      condicion,
      bloqueSi,
      bloqueSino,
      linea: inicio.linea,
      columna: inicio.columna,
    };
  }

  private bucleMientras(): BucleMientras {
    const inicio = this.esperar("Mientras", "'Mientras'");
    const condicion = this.expresion();
    this.esperar("Hacer", "'Hacer' después de la condición del 'Mientras'");
    const cuerpo = this.sentencias(["FinMientras"]);
    this.esperar("FinMientras", "'FinMientras' para cerrar el 'Mientras'");
    return {
      tipo: "BucleMientras",
      condicion,
      cuerpo,
      linea: inicio.linea,
      columna: inicio.columna,
    };
  }

  private buclePara(): BuclePara {
    const inicio = this.esperar("Para", "'Para'");
    const variable = this.esperar("IDENTIFICADOR", "la variable del 'Para'").lexema;
    this.esperar("IGUAL", "'=' después de la variable del 'Para'");
    const desde = this.expresion();
    this.esperar("Hasta", "'Hasta' después del valor inicial del 'Para'");
    const hasta = this.expresion();
    this.esperar("Hacer", "'Hacer' después del rango del 'Para'");
    const cuerpo = this.sentencias(["FinPara"]);
    this.esperar("FinPara", "'FinPara' para cerrar el 'Para'");
    return {
      tipo: "BuclePara",
      variable,
      desde,
      hasta,
      cuerpo,
      linea: inicio.linea,
      columna: inicio.columna,
    };
  }

  private retorno(): Retorno {
    const inicio = this.esperar("Retornar", "'Retornar'");
    const valor = this.expresion();
    return { tipo: "Retorno", valor, linea: inicio.linea, columna: inicio.columna };
  }

  // --- expresiones, ordenadas por precedencia (menor a mayor) ---

  private expresion(): Nodo {
    return this.expresionOr();
  }

  private expresionOr(): Nodo {
    let izquierda = this.expresionAnd();
    while (this.revisar("O")) {
      const operador = this.avanzar();
      izquierda = this.crearBinaria(operador, izquierda, this.expresionAnd());
    }
    return izquierda;
  }

  private expresionAnd(): Nodo {
    let izquierda = this.expresionNot();
    while (this.revisar("Y")) {
      const operador = this.avanzar();
      izquierda = this.crearBinaria(operador, izquierda, this.expresionNot());
    }
    return izquierda;
  }

  private expresionNot(): Nodo {
    if (this.revisar("NO")) {
      const operador = this.avanzar();
      const operando = this.expresionNot();
      return {
        tipo: "ExpresionUnaria",
        operador: operador.lexema,
        operando,
        linea: operador.linea,
        columna: operador.columna,
      };
    }
    return this.expresionRelacional();
  }

  private expresionRelacional(): Nodo {
    const izquierda = this.expresionAditiva();
    if (OPERADORES_RELACIONALES.includes(this.actual().tipo)) {
      const operador = this.avanzar();
      return this.crearBinaria(operador, izquierda, this.expresionAditiva());
    }
    return izquierda;
  }

  private expresionAditiva(): Nodo {
    let izquierda = this.expresionMultiplicativa();
    while (this.revisar("MAS") || this.revisar("MENOS")) {
      const operador = this.avanzar();
      izquierda = this.crearBinaria(operador, izquierda, this.expresionMultiplicativa());
    }
    return izquierda;
  }

  private expresionMultiplicativa(): Nodo {
    let izquierda = this.expresionUnaria();
    while (this.revisar("POR") || this.revisar("DIV") || this.revisar("MOD")) {
      const operador = this.avanzar();
      izquierda = this.crearBinaria(operador, izquierda, this.expresionUnaria());
    }
    return izquierda;
  }

  private expresionUnaria(): Nodo {
    if (this.revisar("MENOS")) {
      const operador = this.avanzar();
      const operando = this.expresionUnaria();
      return {
        tipo: "ExpresionUnaria",
        operador: operador.lexema,
        operando,
        linea: operador.linea,
        columna: operador.columna,
      };
    }
    return this.expresionPotencia();
  }

  private expresionPotencia(): Nodo {
    const base = this.primario();
    if (this.revisar("POTENCIA")) {
      const operador = this.avanzar();
      return this.crearBinaria(operador, base, this.expresionUnaria());
    }
    return base;
  }

  private crearBinaria(operador: Token, izquierda: Nodo, derecha: Nodo): ExpresionBinaria {
    return {
      tipo: "ExpresionBinaria",
      operador: operador.lexema,
      izquierda,
      derecha,
      linea: operador.linea,
      columna: operador.columna,
    };
  }

  private primario(): Nodo {
    const token = this.actual();
    switch (token.tipo) {
      case "NUMERO":
        this.avanzar();
        return { tipo: "Literal", valor: Number(token.lexema) };
      case "CADENA":
        this.avanzar();
        return { tipo: "Literal", valor: token.lexema };
      case "Verdadero":
        this.avanzar();
        return { tipo: "Literal", valor: true };
      case "Falso":
        this.avanzar();
        return { tipo: "Literal", valor: false };
      case "CORCHETE_IZQ":
        return this.literalArreglo();
      case "PARENTESIS_IZQ": {
        this.avanzar();
        const interior = this.expresion();
        this.esperar("PARENTESIS_DER", "')' para cerrar la expresión");
        return interior;
      }
      case "IDENTIFICADOR":
        return this.identificadorOSufijo();
      default:
        throw this.errorInesperado("una expresión");
    }
  }

  private literalArreglo(): LiteralArreglo {
    const inicio = this.esperar("CORCHETE_IZQ", "'['");
    const elementos: Nodo[] = [];
    if (!this.revisar("CORCHETE_DER")) {
      elementos.push(this.expresion());
      while (this.coincide("COMA")) {
        elementos.push(this.expresion());
      }
    }
    this.esperar("CORCHETE_DER", "']' para cerrar el literal de arreglo");
    return { tipo: "LiteralArreglo", elementos, linea: inicio.linea, columna: inicio.columna };
  }

  private identificadorOSufijo(): Identificador | LlamadaFuncion | AccesoArreglo {
    const token = this.esperar("IDENTIFICADOR", "un identificador");
    if (this.coincide("PARENTESIS_IZQ")) {
      const argumentos = this.listaArgumentos();
      this.esperar("PARENTESIS_DER", "')' para cerrar los argumentos");
      return {
        tipo: "LlamadaFuncion",
        nombre: token.lexema,
        argumentos,
        linea: token.linea,
        columna: token.columna,
      };
    }
    const indices = this.leerIndices();
    if (indices.length === 0) {
      return {
        tipo: "Identificador",
        nombre: token.lexema,
        linea: token.linea,
        columna: token.columna,
      };
    }
    return {
      tipo: "AccesoArreglo",
      nombre: token.lexema,
      indices,
      linea: token.linea,
      columna: token.columna,
    };
  }
}
