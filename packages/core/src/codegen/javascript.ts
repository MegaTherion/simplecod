import type {
  AccesoArreglo,
  Condicional,
  DeclaracionFuncion,
  Identificador,
  Nodo,
  Programa,
} from "../ast/index.js";
import { Escritor } from "./escritor.js";

// Preámbulo con los helpers de runtime que necesita todo programa generado:
// __fmt (formato de Escribir), __crearArreglo (Dimension), leer/escribir (I/O).
// leer()/escribir() son sobreescribibles vía globalThis.__simplecodEntradas /
// globalThis.__simplecodSalida — así se puede correr el código generado tanto
// en un <script> de browser (usa prompt()/console) como en un test headless.
const PREAMBULO = `function __fmt(v) {
  if (typeof v === "boolean") return v ? "Verdadero" : "Falso";
  if (Array.isArray(v)) return "[" + v.map(__fmt).join(", ") + "]";
  return String(v);
}
function __clonar(v) {
  if (Array.isArray(v)) return v.map(__clonar);
  return v;
}
function __crearArreglo(tamanos) {
  var primero = tamanos[0];
  var resto = tamanos.slice(1);
  if (primero === undefined) return 0;
  if (resto.length === 0) return new Array(primero).fill(0);
  return Array.from({ length: primero }, function () {
    return __crearArreglo(resto);
  });
}
function leer() {
  var texto;
  if (typeof globalThis !== "undefined" && Array.isArray(globalThis.__simplecodEntradas)) {
    texto = globalThis.__simplecodEntradas.shift();
  } else {
    texto = prompt("Entrada:");
  }
  var textoLimpio = texto === null || texto === undefined ? "" : String(texto).trim();
  if (/^\\d+(\\.\\d+)?$/.test(textoLimpio)) return Number(textoLimpio);
  return texto;
}
function escribir(texto) {
  if (typeof globalThis !== "undefined" && typeof globalThis.__simplecodSalida === "string") {
    globalThis.__simplecodSalida += texto;
    return;
  }
  if (typeof console !== "undefined") console.log(texto);
}`;

const OPERADORES_BINARIOS: Record<string, string> = {
  mod: "%",
  "^": "**",
  y: "&&",
  o: "||",
  "==": "===",
  "!=": "!==",
};

export function generarJavaScript(programa: Programa): string {
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

  for (const sentencia of sentencias) {
    emitirSentencia(sentencia, escritor);
  }

  return escritor.toString();
}

function emitirFuncion(nodo: DeclaracionFuncion, escritor: Escritor): void {
  escritor.linea(`function ${nodo.nombre}(${nodo.parametros.join(", ")}) {`);
  escritor.indentar();
  for (const sentencia of nodo.cuerpo) {
    emitirSentencia(sentencia, escritor);
  }
  escritor.linea("return false; // sin 'Retornar' explícito: valor implícito Falso");
  escritor.desindentar();
  escritor.linea("}");
}

function emitirBloque(sentencias: Nodo[], escritor: Escritor): void {
  escritor.indentar();
  for (const sentencia of sentencias) {
    emitirSentencia(sentencia, escritor);
  }
  escritor.desindentar();
}

function emitirSentencia(nodo: Nodo, escritor: Escritor): void {
  switch (nodo.tipo) {
    case "Dimension": {
      const tamanos = nodo.dimensiones.map(generarExpresion).join(", ");
      escritor.linea(`var ${nodo.nombre} = __crearArreglo([${tamanos}]);`);
      break;
    }
    case "Asignacion": {
      const valor = `__clonar(${generarExpresion(nodo.valor)})`;
      escritor.linea(
        `${prefijoDeclaracion(nodo.objetivo)}${generarObjetivo(nodo.objetivo)} = ${valor};`,
      );
      break;
    }
    case "Lectura": {
      for (const objetivo of nodo.objetivos) {
        escritor.linea(`${prefijoDeclaracion(objetivo)}${generarObjetivo(objetivo)} = leer();`);
      }
      break;
    }
    case "Escritura": {
      const texto = nodo.expresiones.map((e) => `__fmt(${generarExpresion(e)})`).join(" + ");
      escritor.linea(`escribir(${texto});`);
      break;
    }
    case "Condicional":
      emitirCondicional(nodo, escritor);
      break;
    case "BucleMientras":
      escritor.linea(`while (${generarExpresion(nodo.condicion)}) {`);
      emitirBloque(nodo.cuerpo, escritor);
      escritor.linea("}");
      break;
    case "BuclePara":
      escritor.linea(
        `for (var ${nodo.variable} = ${generarExpresion(nodo.desde)}; ${nodo.variable} <= ${generarExpresion(
          nodo.hasta,
        )}; ${nodo.variable}++) {`,
      );
      emitirBloque(nodo.cuerpo, escritor);
      escritor.linea("}");
      break;
    case "Retorno":
      escritor.linea(`return ${generarExpresion(nodo.valor)};`);
      break;
    case "LlamadaFuncion":
      escritor.linea(`${generarExpresion(nodo)};`);
      break;
    default:
      throw new Error(`nodo no es una sentencia traducible: ${nodo.tipo}`);
  }
}

function emitirCondicional(nodo: Condicional, escritor: Escritor): void {
  escritor.linea(`if (${generarExpresion(nodo.condicion)}) {`);
  emitirBloque(nodo.bloqueSi, escritor);
  if (nodo.bloqueSino) {
    escritor.linea("} else {");
    emitirBloque(nodo.bloqueSino, escritor);
  }
  escritor.linea("}");
}

// El 'var' solo aplica al declarar un identificador suelto; un acceso a
// arreglo (`a[0] = x`) no es una declaración válida en JS.
function prefijoDeclaracion(objetivo: Identificador | AccesoArreglo): string {
  return objetivo.tipo === "Identificador" ? "var " : "";
}

function generarObjetivo(objetivo: Identificador | AccesoArreglo): string {
  if (objetivo.tipo === "Identificador") return objetivo.nombre;
  return objetivo.nombre + objetivo.indices.map((i) => `[${generarExpresion(i)}]`).join("");
}

function generarExpresion(nodo: Nodo): string {
  switch (nodo.tipo) {
    case "Literal":
      if (typeof nodo.valor === "string") return JSON.stringify(nodo.valor);
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
      const operador = nodo.operador === "no" ? "!" : nodo.operador;
      return `(${operador}${generarExpresion(nodo.operando)})`;
    }
    case "LlamadaFuncion":
      return `${nodo.nombre}(${nodo.argumentos.map((a) => `__clonar(${generarExpresion(a)})`).join(", ")})`;
    default:
      throw new Error(`nodo no es una expresión traducible: ${nodo.tipo}`);
  }
}
