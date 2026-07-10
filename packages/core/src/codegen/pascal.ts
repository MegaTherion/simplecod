// Generador de Pascal (Free Pascal / Delphi, modo {$mode delphi}).
//
// SimpleCod es de tipado dinámico; Pascal es estáticamente tipado. Para evitar
// una pasada de inferencia de tipos, TODA variable/parámetro se declara como
// `Variant`, y los arreglos se representan como Variants que envuelven un
// array COM-style vía VarArrayCreate (soportado nativamente por la unidad
// Variants). Esto permite indexar con `[]` de forma uniforme sin distinguir
// estáticamente "variable escalar" de "variable arreglo".
//
// A diferencia de JS/Python (arreglos como referencias, requieren clonar
// explícitamente en 'a = b' y al pasar argumentos para lograr semántica por
// valor), los Variant array de Object Pascal se copian al asignar — no hace
// falta un helper de clonado aquí.
//
// NOTA: no hay compilador Free Pascal disponible en este entorno para
// verificar que el resultado compila — a diferencia de JS y Python (que sí
// se ejecutan en los tests), este generador es best-effort y no está
// verificado por ejecución real.
import type {
  AccesoArreglo,
  Condicional,
  DeclaracionFuncion,
  Identificador,
  Nodo,
  Programa,
} from "../ast/index.js";
import { Escritor } from "./escritor.js";

const PREAMBULO_FUNCIONES = `function __fmt(v: Variant): string;
var
  i: Integer;
  resultado: string;
begin
  if VarType(v) = varBoolean then
  begin
    if v then __fmt := 'Verdadero' else __fmt := 'Falso';
    Exit;
  end;
  if VarIsArray(v) then
  begin
    resultado := '[';
    for i := VarArrayLowBound(v, 1) to VarArrayHighBound(v, 1) do
    begin
      if i > VarArrayLowBound(v, 1) then resultado := resultado + ', ';
      resultado := resultado + __fmt(v[i]);
    end;
    __fmt := resultado + ']';
    Exit;
  end;
  __fmt := VarToStr(v);
end;

function __crearArreglo(const tamanos: array of Integer): Variant;
var
  i: Integer;
  sub: array of Integer;
begin
  Result := VarArrayCreate([0, tamanos[0] - 1], varVariant);
  if Length(tamanos) = 1 then
  begin
    for i := 0 to tamanos[0] - 1 do
      Result[i] := 0;
  end
  else
  begin
    sub := Copy(tamanos, 1, Length(tamanos) - 1);
    for i := 0 to tamanos[0] - 1 do
      Result[i] := __crearArreglo(sub);
  end;
end;

function __arregloDeElementos(const elementos: array of Variant): Variant;
var
  i: Integer;
begin
  Result := VarArrayCreate([0, Length(elementos) - 1], varVariant);
  for i := 0 to Length(elementos) - 1 do
    Result[i] := elementos[i];
end;

function __leer: Variant;
var
  texto: string;
  numero: Double;
  codigo: Integer;
begin
  ReadLn(texto);
  texto := Trim(texto);
  Val(texto, numero, codigo);
  if (codigo = 0) and (texto <> '') then
    __leer := numero
  else
    __leer := texto;
end;

procedure __escribir(texto: string);
begin
  Write(texto);
end;`;

const OPERADORES_BINARIOS: Record<string, string> = {
  mod: "mod",
  "==": "=",
  "!=": "<>",
  y: "and",
  o: "or",
};

export function generarPascal(programa: Programa): string {
  const funciones = programa.cuerpo.filter(
    (nodo): nodo is DeclaracionFuncion => nodo.tipo === "DeclaracionFuncion",
  );
  const sentencias = programa.cuerpo.filter((nodo) => nodo.tipo !== "DeclaracionFuncion");

  const escritor = new Escritor();
  escritor.linea("program SimpleCodPrograma;");
  escritor.linea();
  escritor.linea("{$mode delphi}");
  escritor.linea();
  escritor.linea("uses");
  escritor.linea("  SysUtils, Variants, Math;");
  escritor.linea();
  escritor.linea(PREAMBULO_FUNCIONES);
  escritor.linea();

  for (const funcion of funciones) {
    emitirFuncion(funcion, escritor);
    escritor.linea();
  }

  const variablesGlobales = recolectarVariables(sentencias);
  if (variablesGlobales.length > 0) {
    escritor.linea("var");
    escritor.linea(`  ${variablesGlobales.join(", ")}: Variant;`);
  }
  escritor.linea("begin");
  escritor.indentar();
  for (const sentencia of sentencias) {
    emitirSentencia(sentencia, escritor);
  }
  escritor.desindentar();
  escritor.linea("end.");

  return escritor.toString();
}

function emitirFuncion(nodo: DeclaracionFuncion, escritor: Escritor): void {
  escritor.linea(
    `function ${nodo.nombre}(${nodo.parametros.map((p) => `${p}: Variant`).join("; ")}): Variant;`,
  );
  const locales = recolectarVariables(nodo.cuerpo).filter((v) => !nodo.parametros.includes(v));
  if (locales.length > 0) {
    escritor.linea("var");
    escritor.linea(`  ${locales.join(", ")}: Variant;`);
  }
  escritor.linea("begin");
  escritor.indentar();
  // sin 'Retornar' explícito: valor implícito Falso (se sobreescribe si hay un Retorno)
  escritor.linea(`${nodo.nombre} := False;`);
  for (const sentencia of nodo.cuerpo) {
    emitirSentencia(sentencia, escritor, nodo.nombre);
  }
  escritor.desindentar();
  escritor.linea("end;");
}

function emitirBloque(
  sentencias: Nodo[],
  escritor: Escritor,
  funcionActual?: string,
  sufijo = "",
): void {
  escritor.linea("begin");
  escritor.indentar();
  if (sentencias.length === 0) {
    escritor.linea("// (bloque vacío)");
  } else {
    for (const sentencia of sentencias) {
      emitirSentencia(sentencia, escritor, funcionActual);
    }
  }
  escritor.desindentar();
  escritor.linea(`end${sufijo}`);
}

function emitirSentencia(nodo: Nodo, escritor: Escritor, funcionActual?: string): void {
  switch (nodo.tipo) {
    case "Dimension": {
      const tamanos = nodo.dimensiones.map((d) => `Integer(${generarExpresion(d)})`).join(", ");
      escritor.linea(`${nodo.nombre} := __crearArreglo([${tamanos}]);`);
      break;
    }
    case "Asignacion":
      escritor.linea(`${generarObjetivo(nodo.objetivo)} := ${generarExpresion(nodo.valor)};`);
      break;
    case "Lectura":
      for (const objetivo of nodo.objetivos) {
        escritor.linea(`${generarObjetivo(objetivo)} := __leer;`);
      }
      break;
    case "Escritura": {
      const texto = nodo.expresiones.map((e) => `__fmt(${generarExpresion(e)})`).join(" + ");
      escritor.linea(`__escribir(${texto});`);
      break;
    }
    case "Condicional":
      emitirCondicional(nodo, escritor, funcionActual);
      break;
    case "BucleMientras":
      escritor.linea(`while ${generarExpresion(nodo.condicion)} do`);
      emitirBloque(nodo.cuerpo, escritor, funcionActual, ";");
      break;
    case "BuclePara":
      // se usa un while (no 'for') para admitir límites no enteros, igual que el intérprete
      escritor.linea(`${nodo.variable} := ${generarExpresion(nodo.desde)};`);
      escritor.linea(`while ${nodo.variable} <= ${generarExpresion(nodo.hasta)} do`);
      escritor.indentar();
      escritor.linea("begin");
      escritor.indentar();
      for (const sentencia of nodo.cuerpo) {
        emitirSentencia(sentencia, escritor, funcionActual);
      }
      escritor.linea(`${nodo.variable} := ${nodo.variable} + 1;`);
      escritor.desindentar();
      escritor.linea("end;");
      escritor.desindentar();
      break;
    case "Retorno":
      if (!funcionActual) {
        throw new Error("Retorno fuera de una función durante la generación de código");
      }
      escritor.linea(`${funcionActual} := ${generarExpresion(nodo.valor)};`);
      escritor.linea("Exit;");
      break;
    case "LlamadaFuncion":
      escritor.linea(`${generarExpresion(nodo)};`);
      break;
    default:
      throw new Error(`nodo no es una sentencia traducible: ${nodo.tipo}`);
  }
}

function emitirCondicional(nodo: Condicional, escritor: Escritor, funcionActual?: string): void {
  escritor.linea(`if ${generarExpresion(nodo.condicion)} then`);
  if (nodo.bloqueSino) {
    emitirBloque(nodo.bloqueSi, escritor, funcionActual);
    escritor.linea("else");
    emitirBloque(nodo.bloqueSino, escritor, funcionActual, ";");
  } else {
    emitirBloque(nodo.bloqueSi, escritor, funcionActual, ";");
  }
}

// Recolecta, en orden de aparición, los nombres de variables asignadas dentro de un
// cuerpo (Asignacion/Lectura/Dimension/variable de BuclePara), recorriendo bloques
// anidados (Si/Mientras/Para) pero sin cruzar a funciones anidadas (no existen en
// SimpleCod). Necesario porque Pascal exige declarar todas las variables por
// adelantado en una sección `var`.
function recolectarVariables(sentencias: Nodo[]): string[] {
  const vistas = new Set<string>();
  const recorrer = (nodos: Nodo[]): void => {
    for (const nodo of nodos) {
      switch (nodo.tipo) {
        case "Dimension":
          vistas.add(nodo.nombre);
          break;
        case "Asignacion":
          if (nodo.objetivo.tipo === "Identificador") vistas.add(nodo.objetivo.nombre);
          break;
        case "Lectura":
          for (const objetivo of nodo.objetivos) {
            if (objetivo.tipo === "Identificador") vistas.add(objetivo.nombre);
          }
          break;
        case "BuclePara":
          vistas.add(nodo.variable);
          recorrer(nodo.cuerpo);
          break;
        case "Condicional":
          recorrer(nodo.bloqueSi);
          if (nodo.bloqueSino) recorrer(nodo.bloqueSino);
          break;
        case "BucleMientras":
          recorrer(nodo.cuerpo);
          break;
        default:
          break;
      }
    }
  };
  recorrer(sentencias);
  return [...vistas];
}

function generarObjetivo(objetivo: Identificador | AccesoArreglo): string {
  if (objetivo.tipo === "Identificador") return objetivo.nombre;
  return objetivo.nombre + objetivo.indices.map((i) => `[${generarExpresion(i)}]`).join("");
}

function literalCadenaPascal(texto: string): string {
  if (texto === "") return "''";
  const partes: string[] = [];
  let actual = "";
  for (const caracter of texto) {
    if (caracter === "\n") {
      if (actual !== "") {
        partes.push(`'${actual.replace(/'/g, "''")}'`);
        actual = "";
      }
      partes.push("#10");
    } else {
      actual += caracter;
    }
  }
  if (actual !== "") partes.push(`'${actual.replace(/'/g, "''")}'`);
  return partes.join(" + ");
}

function generarExpresion(nodo: Nodo): string {
  switch (nodo.tipo) {
    case "Literal":
      if (typeof nodo.valor === "string") return literalCadenaPascal(nodo.valor);
      if (typeof nodo.valor === "boolean") return nodo.valor ? "True" : "False";
      return String(nodo.valor);
    case "Identificador":
      return nodo.nombre;
    case "AccesoArreglo":
      return nodo.nombre + nodo.indices.map((i) => `[${generarExpresion(i)}]`).join("");
    case "LiteralArreglo":
      return `__arregloDeElementos([${nodo.elementos.map(generarExpresion).join(", ")}])`;
    case "ExpresionBinaria": {
      if (nodo.operador === "^") {
        return `Power(${generarExpresion(nodo.izquierda)}, ${generarExpresion(nodo.derecha)})`;
      }
      const operador = OPERADORES_BINARIOS[nodo.operador] ?? nodo.operador;
      return `(${generarExpresion(nodo.izquierda)} ${operador} ${generarExpresion(nodo.derecha)})`;
    }
    case "ExpresionUnaria": {
      const operador = nodo.operador === "no" ? "not " : nodo.operador;
      return `(${operador}${generarExpresion(nodo.operando)})`;
    }
    case "LlamadaFuncion":
      return `${nodo.nombre}(${nodo.argumentos.map(generarExpresion).join(", ")})`;
    default:
      throw new Error(`nodo no es una expresión traducible: ${nodo.tipo}`);
  }
}
