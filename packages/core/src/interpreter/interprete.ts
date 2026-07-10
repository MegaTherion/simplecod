import { ErrorEjecucion } from "../errores/index.js";
import type {
  AccesoArreglo,
  Asignacion,
  BuclePara,
  BucleMientras,
  Condicional,
  DeclaracionFuncion,
  Dimension,
  Escritura,
  ExpresionBinaria,
  ExpresionUnaria,
  Identificador,
  Lectura,
  LlamadaFuncion,
  Nodo,
  Posicion,
  Programa,
  Retorno,
} from "../ast/index.js";

export type Valor = number | string | boolean | Valor[];

export interface InfoSentenciaEjecutada {
  nodo: Nodo;
  variables: Record<string, Valor>;
}

const MAX_SENTENCIAS_POR_DEFECTO = 200_000;

export interface OpcionesInterprete {
  /** Valores de entrada (como texto crudo) que van consumiendo las sentencias `Leer`, en orden. */
  entradas?: string[];
  /** Se invoca con cada fragmento de texto que produce `Escribir`. */
  alEscribir?: (texto: string) => void;
  /** Se invoca tras ejecutar cada sentencia, con el estado actual de variables (para el debugger). */
  alEjecutarSentencia?: (info: InfoSentenciaEjecutada) => void;
  /** Límite de sentencias ejecutadas antes de abortar con ErrorEjecucion (protege contra bucles infinitos). */
  maxSentencias?: number;
}

/** Señal interna (no es un error) para propagar el valor de `Retornar` hasta la llamada a función. */
class SenalRetorno {
  constructor(readonly valor: Valor) {}
}

export class Interprete {
  private entorno = new Map<string, Valor>();
  private readonly funciones = new Map<string, DeclaracionFuncion>();
  private readonly entradas: string[];
  private indiceEntrada = 0;
  private salidaAcumulada = "";
  private dentroDeFuncion = false;
  private contadorSentencias = 0;
  private readonly maxSentencias: number;

  private readonly alEscribir: OpcionesInterprete["alEscribir"];
  private readonly alEjecutarSentencia: OpcionesInterprete["alEjecutarSentencia"];

  constructor(opciones: OpcionesInterprete = {}) {
    this.entradas = opciones.entradas ?? [];
    this.alEscribir = opciones.alEscribir;
    this.alEjecutarSentencia = opciones.alEjecutarSentencia;
    this.maxSentencias = opciones.maxSentencias ?? MAX_SENTENCIAS_POR_DEFECTO;
  }

  get salida(): string {
    return this.salidaAcumulada;
  }

  ejecutar(programa: Programa): void {
    this.entorno = new Map();
    this.funciones.clear();
    this.indiceEntrada = 0;
    this.salidaAcumulada = "";
    this.dentroDeFuncion = false;
    this.contadorSentencias = 0;

    for (const nodo of programa.cuerpo) {
      if (nodo.tipo === "DeclaracionFuncion") {
        this.funciones.set(nodo.nombre, nodo);
      }
    }
    for (const nodo of programa.cuerpo) {
      if (nodo.tipo !== "DeclaracionFuncion") {
        this.ejecutarSentencia(nodo);
      }
    }
  }

  // --- sentencias ---

  private ejecutarSentencia(nodo: Nodo): void {
    this.contadorSentencias++;
    if (this.contadorSentencias > this.maxSentencias) {
      const posicion: Posicion = "linea" in nodo ? nodo : { linea: 0, columna: 0 };
      throw new ErrorEjecucion(
        `se superó el límite de ${this.maxSentencias} sentencias ejecutadas (¿posible bucle infinito?)`,
        posicion,
      );
    }
    switch (nodo.tipo) {
      case "Dimension":
        this.ejecutarDimension(nodo);
        break;
      case "Asignacion":
        this.ejecutarAsignacion(nodo);
        break;
      case "Lectura":
        this.ejecutarLectura(nodo);
        break;
      case "Escritura":
        this.ejecutarEscritura(nodo);
        break;
      case "Condicional":
        this.ejecutarCondicional(nodo);
        break;
      case "BucleMientras":
        this.ejecutarBucleMientras(nodo);
        break;
      case "BuclePara":
        this.ejecutarBuclePara(nodo);
        break;
      case "Retorno":
        this.ejecutarRetorno(nodo);
        break;
      case "LlamadaFuncion":
        this.evaluarLlamadaFuncion(nodo);
        break;
      default:
        throw new Error(`nodo no es una sentencia ejecutable: ${nodo.tipo}`);
    }
    this.alEjecutarSentencia?.({ nodo, variables: Object.fromEntries(this.entorno) });
  }

  private ejecutarBloque(sentencias: Nodo[]): void {
    for (const sentencia of sentencias) {
      this.ejecutarSentencia(sentencia);
    }
  }

  private ejecutarDimension(nodo: Dimension): void {
    const tamanos = nodo.dimensiones.map((expresion) => this.evaluarComoTamano(expresion, nodo));
    this.entorno.set(nodo.nombre, this.crearArregloVacio(tamanos));
  }

  private crearArregloVacio(tamanos: number[]): Valor {
    const [primero, ...resto] = tamanos;
    if (primero === undefined) return 0;
    if (resto.length === 0) return new Array(primero).fill(0);
    return Array.from({ length: primero }, () => this.crearArregloVacio(resto));
  }

  private evaluarComoTamano(expresion: Nodo, nodo: Posicion): number {
    const valor = this.evaluar(expresion);
    if (typeof valor !== "number" || valor < 0 || !Number.isInteger(valor)) {
      throw new ErrorEjecucion("el tamaño de un arreglo debe ser un número entero no negativo", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    return valor;
  }

  private ejecutarAsignacion(nodo: Asignacion): void {
    const valor = this.clonar(this.evaluar(nodo.valor));
    this.asignarA(nodo.objetivo, valor);
  }

  private asignarA(objetivo: Identificador | AccesoArreglo, valor: Valor): void {
    if (objetivo.tipo === "Identificador") {
      this.entorno.set(objetivo.nombre, valor);
      return;
    }
    const { contenedor, indiceFinal } = this.resolverIndices(
      objetivo.nombre,
      objetivo.indices,
      objetivo,
    );
    contenedor[indiceFinal] = valor;
  }

  private ejecutarLectura(nodo: Lectura): void {
    for (const objetivo of nodo.objetivos) {
      this.asignarA(objetivo, this.leerSiguienteEntrada(nodo));
    }
  }

  private leerSiguienteEntrada(nodo: Posicion): Valor {
    const texto = this.entradas[this.indiceEntrada];
    if (texto === undefined) {
      throw new ErrorEjecucion("no hay más valores de entrada disponibles para 'Leer'", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    this.indiceEntrada++;
    const textoLimpio = texto.trim();
    if (/^\d+(\.\d+)?$/.test(textoLimpio)) {
      return Number(textoLimpio);
    }
    return texto;
  }

  private ejecutarEscritura(nodo: Escritura): void {
    const texto = nodo.expresiones
      .map((expresion) => this.formatear(this.evaluar(expresion)))
      .join("");
    this.salidaAcumulada += texto;
    this.alEscribir?.(texto);
  }

  private formatear(valor: Valor): string {
    if (typeof valor === "boolean") return valor ? "Verdadero" : "Falso";
    if (Array.isArray(valor)) return `[${valor.map((v) => this.formatear(v)).join(", ")}]`;
    return String(valor);
  }

  private ejecutarCondicional(nodo: Condicional): void {
    if (this.comoBooleano(this.evaluar(nodo.condicion), nodo)) {
      this.ejecutarBloque(nodo.bloqueSi);
    } else if (nodo.bloqueSino) {
      this.ejecutarBloque(nodo.bloqueSino);
    }
  }

  private ejecutarBucleMientras(nodo: BucleMientras): void {
    while (this.comoBooleano(this.evaluar(nodo.condicion), nodo)) {
      this.ejecutarBloque(nodo.cuerpo);
    }
  }

  private ejecutarBuclePara(nodo: BuclePara): void {
    const desde = this.comoNumero(this.evaluar(nodo.desde), nodo);
    const hasta = this.comoNumero(this.evaluar(nodo.hasta), nodo);
    for (let i = desde; i <= hasta; i++) {
      this.entorno.set(nodo.variable, i);
      this.ejecutarBloque(nodo.cuerpo);
    }
  }

  private ejecutarRetorno(nodo: Retorno): void {
    if (!this.dentroDeFuncion) {
      throw new ErrorEjecucion("'Retornar' solo puede usarse dentro de una función", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    throw new SenalRetorno(this.evaluar(nodo.valor));
  }

  // --- expresiones ---

  private evaluar(nodo: Nodo): Valor {
    switch (nodo.tipo) {
      case "Literal":
        return nodo.valor;
      case "Identificador":
        return this.obtenerVariable(nodo.nombre, nodo);
      case "AccesoArreglo": {
        const { contenedor, indiceFinal } = this.resolverIndices(nodo.nombre, nodo.indices, nodo);
        return contenedor[indiceFinal] as Valor;
      }
      case "LiteralArreglo":
        return nodo.elementos.map((elemento) => this.evaluar(elemento));
      case "ExpresionBinaria":
        return this.evaluarBinaria(nodo);
      case "ExpresionUnaria":
        return this.evaluarUnaria(nodo);
      case "LlamadaFuncion":
        return this.evaluarLlamadaFuncion(nodo);
      default:
        throw new Error(`nodo no es una expresión evaluable: ${nodo.tipo}`);
    }
  }

  private evaluarBinaria(nodo: ExpresionBinaria): Valor {
    const posicion: Posicion = { linea: nodo.linea, columna: nodo.columna };

    if (nodo.operador === "y" || nodo.operador === "o") {
      const izquierda = this.comoBooleano(this.evaluar(nodo.izquierda), posicion);
      const derecha = this.comoBooleano(this.evaluar(nodo.derecha), posicion);
      return nodo.operador === "y" ? izquierda && derecha : izquierda || derecha;
    }

    const izquierda = this.evaluar(nodo.izquierda);
    const derecha = this.evaluar(nodo.derecha);

    switch (nodo.operador) {
      case "+":
        return this.comoNumero(izquierda, posicion) + this.comoNumero(derecha, posicion);
      case "-":
        return this.comoNumero(izquierda, posicion) - this.comoNumero(derecha, posicion);
      case "*":
        return this.comoNumero(izquierda, posicion) * this.comoNumero(derecha, posicion);
      case "/": {
        const divisor = this.comoNumero(derecha, posicion);
        if (divisor === 0) throw new ErrorEjecucion("división por cero", posicion);
        return this.comoNumero(izquierda, posicion) / divisor;
      }
      case "mod": {
        const divisor = this.comoNumero(derecha, posicion);
        if (divisor === 0) throw new ErrorEjecucion("división por cero", posicion);
        return this.comoNumero(izquierda, posicion) % divisor;
      }
      case "^":
        return this.comoNumero(izquierda, posicion) ** this.comoNumero(derecha, posicion);
      case "==":
        return this.sonIguales(izquierda, derecha);
      case "!=":
        return !this.sonIguales(izquierda, derecha);
      case "<":
        return this.comparar(izquierda, derecha, posicion) < 0;
      case ">":
        return this.comparar(izquierda, derecha, posicion) > 0;
      case "<=":
        return this.comparar(izquierda, derecha, posicion) <= 0;
      case ">=":
        return this.comparar(izquierda, derecha, posicion) >= 0;
      default:
        throw new Error(`operador binario desconocido: ${nodo.operador}`);
    }
  }

  private evaluarUnaria(nodo: ExpresionUnaria): Valor {
    const posicion: Posicion = { linea: nodo.linea, columna: nodo.columna };
    const operando = this.evaluar(nodo.operando);
    if (nodo.operador === "-") return -this.comoNumero(operando, posicion);
    if (nodo.operador === "no") return !this.comoBooleano(operando, posicion);
    throw new Error(`operador unario desconocido: ${nodo.operador}`);
  }

  private evaluarLlamadaFuncion(nodo: LlamadaFuncion): Valor {
    const declaracion = this.funciones.get(nodo.nombre);
    if (!declaracion) {
      throw new ErrorEjecucion(`la función '${nodo.nombre}' no existe`, {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    if (declaracion.parametros.length !== nodo.argumentos.length) {
      throw new ErrorEjecucion(
        `la función '${nodo.nombre}' espera ${declaracion.parametros.length} argumento(s), pero se pasaron ${nodo.argumentos.length}`,
        { linea: nodo.linea, columna: nodo.columna },
      );
    }

    const argumentos = nodo.argumentos.map((expresion) => this.clonar(this.evaluar(expresion)));

    const entornoAnterior = this.entorno;
    const dentroDeFuncionAnterior = this.dentroDeFuncion;
    this.entorno = new Map();
    this.dentroDeFuncion = true;
    declaracion.parametros.forEach((nombre, indice) => {
      this.entorno.set(nombre, argumentos[indice] as Valor);
    });

    try {
      this.ejecutarBloque(declaracion.cuerpo);
      return false; // sin 'Retornar' explícito: valor implícito Falso (ver docs/gramatica.md §9)
    } catch (error) {
      if (error instanceof SenalRetorno) return error.valor;
      throw error;
    } finally {
      this.entorno = entornoAnterior;
      this.dentroDeFuncion = dentroDeFuncionAnterior;
    }
  }

  // --- utilidades de arreglos y variables ---

  private obtenerVariable(nombre: string, nodo: Posicion): Valor {
    if (!this.entorno.has(nombre)) {
      throw new ErrorEjecucion(`variable '${nombre}' no está definida`, {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    return this.entorno.get(nombre) as Valor;
  }

  private resolverIndices(
    nombre: string,
    indices: Nodo[],
    nodo: Posicion,
  ): { contenedor: Valor[]; indiceFinal: number } {
    const base = this.obtenerVariable(nombre, nodo);
    if (!Array.isArray(base)) {
      throw new ErrorEjecucion(`'${nombre}' no es un arreglo`, {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }

    let actual: Valor[] = base;
    for (let i = 0; i < indices.length; i++) {
      const indice = this.comoIndice(this.evaluar(indices[i] as Nodo), nodo);
      if (indice < 0 || indice >= actual.length) {
        throw new ErrorEjecucion(
          `índice ${indice} fuera de rango para el arreglo '${nombre}' (tamaño ${actual.length})`,
          { linea: nodo.linea, columna: nodo.columna },
        );
      }
      if (i === indices.length - 1) {
        return { contenedor: actual, indiceFinal: indice };
      }
      const siguiente = actual[indice];
      if (!Array.isArray(siguiente)) {
        throw new ErrorEjecucion(`'${nombre}' no tiene esa cantidad de dimensiones`, {
          linea: nodo.linea,
          columna: nodo.columna,
        });
      }
      actual = siguiente;
    }
    throw new ErrorEjecucion(`acceso a arreglo sin índices`, {
      linea: nodo.linea,
      columna: nodo.columna,
    });
  }

  private clonar(valor: Valor): Valor {
    if (Array.isArray(valor)) return valor.map((elemento) => this.clonar(elemento));
    return valor;
  }

  // --- coerciones con chequeo de tipo ---

  private comoNumero(valor: Valor, nodo: Posicion): number {
    if (typeof valor !== "number") {
      throw new ErrorEjecucion("se esperaba un número", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    return valor;
  }

  private comoIndice(valor: Valor, nodo: Posicion): number {
    if (typeof valor !== "number" || !Number.isInteger(valor)) {
      throw new ErrorEjecucion("el índice debe ser un número entero", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    return valor;
  }

  private comoBooleano(valor: Valor, nodo: Posicion): boolean {
    if (typeof valor !== "boolean") {
      throw new ErrorEjecucion("se esperaba un valor booleano", {
        linea: nodo.linea,
        columna: nodo.columna,
      });
    }
    return valor;
  }

  private comparar(a: Valor, b: Valor, nodo: Posicion): number {
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
    throw new ErrorEjecucion("no se pueden comparar valores de distinto tipo", {
      linea: nodo.linea,
      columna: nodo.columna,
    });
  }

  private sonIguales(a: Valor, b: Valor): boolean {
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      return a.every((elemento, i) => this.sonIguales(elemento, b[i] as Valor));
    }
    return a === b;
  }
}
