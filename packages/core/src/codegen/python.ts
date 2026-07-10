import type {
  AccesoArreglo,
  Condicional,
  DeclaracionFuncion,
  Identificador,
  Nodo,
  Programa,
} from "../ast/index.js";
import { Escritor } from "./escritor.js";

const PREAMBULO = `import re
import sys

# evita que Python traduzca '\\n' a '\\r\\n' al escribir en Windows
sys.stdout.reconfigure(newline="")

def __fmt(v):
    if isinstance(v, bool):
        return "Verdadero" if v else "Falso"
    if isinstance(v, list):
        return "[" + ", ".join(__fmt(x) for x in v) + "]"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)

def __clonar(v):
    if isinstance(v, list):
        return [__clonar(x) for x in v]
    return v

def __crear_arreglo(tamanos):
    primero, resto = tamanos[0], tamanos[1:]
    if not resto:
        return [0] * primero
    return [__crear_arreglo(resto) for _ in range(primero)]

def __leer():
    texto = input()
    texto_limpio = texto.strip()
    if re.match(r"^\\d+(\\.\\d+)?$", texto_limpio):
        return float(texto_limpio) if "." in texto_limpio else int(texto_limpio)
    return texto

def __escribir(texto):
    print(texto, end="")`;

const OPERADORES_BINARIOS: Record<string, string> = {
  mod: "%",
  "^": "**",
  y: "and",
  o: "or",
  "==": "==",
  "!=": "!=",
};

export function generarPython(programa: Programa): string {
  const funciones = programa.cuerpo.filter(
    (nodo): nodo is DeclaracionFuncion => nodo.tipo === "DeclaracionFuncion",
  );
  const sentencias = programa.cuerpo.filter((nodo) => nodo.tipo !== "DeclaracionFuncion");

  const escritor = new Escritor();
  escritor.linea(PREAMBULO);
  escritor.linea();

  for (const funcion of funciones) {
    emitirFuncion(funcion, escritor);
    escritor.linea();
  }

  emitirBloque(sentencias, escritor, false);

  return escritor.toString();
}

function emitirFuncion(nodo: DeclaracionFuncion, escritor: Escritor): void {
  escritor.linea(`def ${nodo.nombre}(${nodo.parametros.join(", ")}):`);
  escritor.indentar();
  for (const sentencia of nodo.cuerpo) {
    emitirSentencia(sentencia, escritor);
  }
  escritor.linea("return False  # sin 'Retornar' explícito: valor implícito Falso");
  escritor.desindentar();
}

// conIndentacion=false se usa para el bloque top-level (ya está en columna 0) y para
// BuclePara (que maneja su propia indentación manualmente por la línea de incremento).
function emitirBloque(sentencias: Nodo[], escritor: Escritor, conIndentacion = true): void {
  if (conIndentacion) escritor.indentar();
  if (sentencias.length === 0) {
    escritor.linea("pass");
  } else {
    for (const sentencia of sentencias) {
      emitirSentencia(sentencia, escritor);
    }
  }
  if (conIndentacion) escritor.desindentar();
}

function emitirSentencia(nodo: Nodo, escritor: Escritor): void {
  switch (nodo.tipo) {
    case "Dimension": {
      const tamanos = nodo.dimensiones.map(generarExpresion).join(", ");
      escritor.linea(`${nodo.nombre} = __crear_arreglo([${tamanos}])`);
      break;
    }
    case "Asignacion":
      escritor.linea(
        `${generarObjetivo(nodo.objetivo)} = __clonar(${generarExpresion(nodo.valor)})`,
      );
      break;
    case "Lectura":
      for (const objetivo of nodo.objetivos) {
        escritor.linea(`${generarObjetivo(objetivo)} = __leer()`);
      }
      break;
    case "Escritura": {
      const texto = nodo.expresiones.map((e) => `__fmt(${generarExpresion(e)})`).join(" + ");
      escritor.linea(`__escribir(${texto})`);
      break;
    }
    case "Condicional":
      emitirCondicional(nodo, escritor);
      break;
    case "BucleMientras":
      escritor.linea(`while ${generarExpresion(nodo.condicion)}:`);
      emitirBloque(nodo.cuerpo, escritor);
      break;
    case "BuclePara":
      // se usa un while (no range()) para admitir límites no enteros, igual que el intérprete
      escritor.linea(`${nodo.variable} = ${generarExpresion(nodo.desde)}`);
      escritor.linea(`while ${nodo.variable} <= ${generarExpresion(nodo.hasta)}:`);
      escritor.indentar();
      emitirBloque(nodo.cuerpo, escritor, false);
      escritor.linea(`${nodo.variable} = ${nodo.variable} + 1`);
      escritor.desindentar();
      break;
    case "Retorno":
      escritor.linea(`return ${generarExpresion(nodo.valor)}`);
      break;
    case "LlamadaFuncion":
      escritor.linea(generarExpresion(nodo));
      break;
    default:
      throw new Error(`nodo no es una sentencia traducible: ${nodo.tipo}`);
  }
}

function emitirCondicional(nodo: Condicional, escritor: Escritor): void {
  escritor.linea(`if ${generarExpresion(nodo.condicion)}:`);
  emitirBloque(nodo.bloqueSi, escritor);
  if (nodo.bloqueSino) {
    escritor.linea("else:");
    emitirBloque(nodo.bloqueSino, escritor);
  }
}

function generarObjetivo(objetivo: Identificador | AccesoArreglo): string {
  if (objetivo.tipo === "Identificador") return objetivo.nombre;
  return objetivo.nombre + objetivo.indices.map((i) => `[${generarExpresion(i)}]`).join("");
}

function literalCadenaPython(texto: string): string {
  return JSON.stringify(texto);
}

function generarExpresion(nodo: Nodo): string {
  switch (nodo.tipo) {
    case "Literal":
      if (typeof nodo.valor === "string") return literalCadenaPython(nodo.valor);
      if (typeof nodo.valor === "boolean") return nodo.valor ? "True" : "False";
      return String(nodo.valor);
    case "Identificador":
      return nodo.nombre;
    case "AccesoArreglo":
      return nodo.nombre + nodo.indices.map((i) => `[${generarExpresion(i)}]`).join("");
    case "LiteralArreglo":
      return `[${nodo.elementos.map(generarExpresion).join(", ")}]`;
    case "ExpresionBinaria": {
      const operador = OPERADORES_BINARIOS[nodo.operador] ?? nodo.operador;
      return `(${generarExpresion(nodo.izquierda)} ${operador} ${generarExpresion(nodo.derecha)})`;
    }
    case "ExpresionUnaria": {
      const operador = nodo.operador === "no" ? "not " : nodo.operador;
      return `(${operador}${generarExpresion(nodo.operando)})`;
    }
    case "LlamadaFuncion":
      return `${nodo.nombre}(${nodo.argumentos.map((a) => `__clonar(${generarExpresion(a)})`).join(", ")})`;
    default:
      throw new Error(`nodo no es una expresión traducible: ${nodo.tipo}`);
  }
}
