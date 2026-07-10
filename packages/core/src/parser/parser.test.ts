import { describe, expect, it } from "vitest";
import { ErrorSintactico } from "../errores/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "./parser.js";

function parsearPrograma(fuente: string) {
  const tokens = new Lexer(fuente).tokenizar();
  return new Parser(tokens).parsear();
}

function quitarPosiciones(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(quitarPosiciones);
  }
  if (valor !== null && typeof valor === "object") {
    const limpio: Record<string, unknown> = {};
    for (const [clave, val] of Object.entries(valor as Record<string, unknown>)) {
      if (clave === "linea" || clave === "columna") continue;
      limpio[clave] = quitarPosiciones(val);
    }
    return limpio;
  }
  return valor;
}

// --- fábricas para armar los AST esperados sin posiciones ---
const num = (valor: number) => ({ tipo: "Literal", valor });
const str = (valor: string) => ({ tipo: "Literal", valor });
const bool = (valor: boolean) => ({ tipo: "Literal", valor });
const id = (nombre: string) => ({ tipo: "Identificador", nombre });
const acceso = (nombre: string, indices: unknown[]) => ({ tipo: "AccesoArreglo", nombre, indices });
const binaria = (operador: string, izquierda: unknown, derecha: unknown) => ({
  tipo: "ExpresionBinaria",
  operador,
  izquierda,
  derecha,
});
const llamada = (nombre: string, argumentos: unknown[]) => ({
  tipo: "LlamadaFuncion",
  nombre,
  argumentos,
});
const arreglo = (elementos: unknown[]) => ({ tipo: "LiteralArreglo", elementos });

describe("ejemplos de docs/gramatica.md §5", () => {
  it("5.1 patrón de asteriscos", () => {
    const programa = `Inicio
    Leer n
    Para i = 1 Hasta n Hacer
        Para j = 1 Hasta i Hacer
            r = j mod 2
            Si r == 0 Entonces
                Escribir "*"
            Sino
                Escribir "#"
            FinSi
        FinPara
        Escribir finl
    FinPara
Fin`;

    const esperado = {
      tipo: "Programa",
      cuerpo: [
        { tipo: "Lectura", objetivos: [id("n")] },
        {
          tipo: "BuclePara",
          variable: "i",
          desde: num(1),
          hasta: id("n"),
          cuerpo: [
            {
              tipo: "BuclePara",
              variable: "j",
              desde: num(1),
              hasta: id("i"),
              cuerpo: [
                {
                  tipo: "Asignacion",
                  objetivo: id("r"),
                  valor: binaria("mod", id("j"), num(2)),
                },
                {
                  tipo: "Condicional",
                  condicion: binaria("==", id("r"), num(0)),
                  bloqueSi: [{ tipo: "Escritura", expresiones: [str("*")] }],
                  bloqueSino: [{ tipo: "Escritura", expresiones: [str("#")] }],
                },
              ],
            },
            { tipo: "Escritura", expresiones: [str("\n")] },
          ],
        },
      ],
    };

    expect(quitarPosiciones(parsearPrograma(programa))).toEqual(esperado);
  });

  it("5.2 función esPrimo", () => {
    const programa = `Inicio
    Funcion esPrimo(num)
        Si num < 2 Entonces
            Retornar Falso
        FinSi
        Para i = 2 Hasta num - 1 Hacer
            Si num mod i == 0 Entonces
                Retornar Falso
            FinSi
        FinPara
        Retornar Verdadero
    FinFuncion

    Leer n
    Si esPrimo(n) Entonces
        Escribir n, " es primo", finl
    Sino
        Escribir n, " no es primo", finl
    FinSi
Fin`;

    const esperado = {
      tipo: "Programa",
      cuerpo: [
        {
          tipo: "DeclaracionFuncion",
          nombre: "esPrimo",
          parametros: ["num"],
          cuerpo: [
            {
              tipo: "Condicional",
              condicion: binaria("<", id("num"), num(2)),
              bloqueSi: [{ tipo: "Retorno", valor: bool(false) }],
              bloqueSino: null,
            },
            {
              tipo: "BuclePara",
              variable: "i",
              desde: num(2),
              hasta: binaria("-", id("num"), num(1)),
              cuerpo: [
                {
                  tipo: "Condicional",
                  condicion: binaria("==", binaria("mod", id("num"), id("i")), num(0)),
                  bloqueSi: [{ tipo: "Retorno", valor: bool(false) }],
                  bloqueSino: null,
                },
              ],
            },
            { tipo: "Retorno", valor: bool(true) },
          ],
        },
        { tipo: "Lectura", objetivos: [id("n")] },
        {
          tipo: "Condicional",
          condicion: llamada("esPrimo", [id("n")]),
          bloqueSi: [{ tipo: "Escritura", expresiones: [id("n"), str(" es primo"), str("\n")] }],
          bloqueSino: [
            { tipo: "Escritura", expresiones: [id("n"), str(" no es primo"), str("\n")] },
          ],
        },
      ],
    };

    expect(quitarPosiciones(parsearPrograma(programa))).toEqual(esperado);
  });

  it("5.3 arreglo de notas", () => {
    const programa = `Inicio
    Dimension notas[5]
    suma = 0
    Para i = 0 Hasta 4 Hacer
        Leer notas[i]
        suma = suma + notas[i]
    FinPara
    promedio = suma / 5
    Escribir "Promedio: ", promedio, finl
Fin`;

    const esperado = {
      tipo: "Programa",
      cuerpo: [
        { tipo: "Dimension", nombre: "notas", dimensiones: [num(5)] },
        { tipo: "Asignacion", objetivo: id("suma"), valor: num(0) },
        {
          tipo: "BuclePara",
          variable: "i",
          desde: num(0),
          hasta: num(4),
          cuerpo: [
            { tipo: "Lectura", objetivos: [acceso("notas", [id("i")])] },
            {
              tipo: "Asignacion",
              objetivo: id("suma"),
              valor: binaria("+", id("suma"), acceso("notas", [id("i")])),
            },
          ],
        },
        {
          tipo: "Asignacion",
          objetivo: id("promedio"),
          valor: binaria("/", id("suma"), num(5)),
        },
        { tipo: "Escritura", expresiones: [str("Promedio: "), id("promedio"), str("\n")] },
      ],
    };

    expect(quitarPosiciones(parsearPrograma(programa))).toEqual(esperado);
  });

  it("5.4 literal de arreglo y acceso", () => {
    const programa = `Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin`;

    const esperado = {
      tipo: "Programa",
      cuerpo: [
        {
          tipo: "Asignacion",
          objetivo: id("dias"),
          valor: arreglo([str("Lun"), str("Mar"), str("Mie"), str("Jue"), str("Vie")]),
        },
        {
          tipo: "BuclePara",
          variable: "i",
          desde: num(0),
          hasta: num(4),
          cuerpo: [{ tipo: "Escritura", expresiones: [acceso("dias", [id("i")]), str("\n")] }],
        },
      ],
    };

    expect(quitarPosiciones(parsearPrograma(programa))).toEqual(esperado);
  });
});

describe("posiciones en el AST", () => {
  it("Lectura y su objetivo", () => {
    const programa = parsearPrograma("Inicio\nLeer n\nFin");
    const lectura = programa.cuerpo[0] as unknown as {
      linea: number;
      columna: number;
      objetivos: Array<{ linea: number; columna: number }>;
    };
    expect(lectura).toMatchObject({ linea: 2, columna: 1 });
    expect(lectura.objetivos[0]).toMatchObject({ linea: 2, columna: 6 });
  });

  it("Escritura", () => {
    const programa = parsearPrograma("Inicio\nEscribir 5\nFin");
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "Escritura", linea: 2, columna: 1 });
  });

  it("Asignacion con identificador simple", () => {
    const programa = parsearPrograma("Inicio\nx = 1\nFin");
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "Asignacion", linea: 2, columna: 1 });
  });

  it("Asignacion con AccesoArreglo como objetivo", () => {
    const programa = parsearPrograma("Inicio\nm[0] = 9\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      objetivo: { tipo: string; nombre: string; linea: number; columna: number };
    };
    expect(asignacion.objetivo).toMatchObject({
      tipo: "AccesoArreglo",
      nombre: "m",
      linea: 2,
      columna: 1,
    });
  });

  it("Dimension", () => {
    const programa = parsearPrograma("Inicio\nDimension m[3]\nFin");
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "Dimension", linea: 2, columna: 1 });
  });

  it("Condicional", () => {
    const programa = parsearPrograma("Inicio\nSi Verdadero Entonces\nEscribir 1\nFinSi\nFin");
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "Condicional", linea: 2, columna: 1 });
  });

  it("BucleMientras", () => {
    const programa = parsearPrograma(
      "Inicio\nMientras Verdadero Hacer\nEscribir 1\nFinMientras\nFin",
    );
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "BucleMientras", linea: 2, columna: 1 });
  });

  it("BuclePara", () => {
    const programa = parsearPrograma("Inicio\nPara i = 1 Hasta 2 Hacer\nEscribir i\nFinPara\nFin");
    expect(programa.cuerpo[0]).toMatchObject({ tipo: "BuclePara", linea: 2, columna: 1 });
  });

  it("DeclaracionFuncion y Retorno", () => {
    const programa = parsearPrograma("Inicio\nFuncion f(a)\nRetornar a\nFinFuncion\nFin");
    const funcion = programa.cuerpo[0] as unknown as {
      linea: number;
      columna: number;
      cuerpo: Array<{ tipo: string; linea: number; columna: number }>;
    };
    expect(funcion).toMatchObject({ tipo: "DeclaracionFuncion", linea: 2, columna: 1 });
    expect(funcion.cuerpo[0]).toMatchObject({ tipo: "Retorno", linea: 3, columna: 1 });
  });

  it("LlamadaFuncion como sentencia", () => {
    const programa = parsearPrograma("Inicio\nf()\nFin");
    expect(programa.cuerpo[0]).toMatchObject({
      tipo: "LlamadaFuncion",
      nombre: "f",
      linea: 2,
      columna: 1,
    });
  });

  it("ExpresionBinaria usa la posición del operador", () => {
    const programa = parsearPrograma("Inicio\nx = 1 + 2\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({ tipo: "ExpresionBinaria", linea: 2, columna: 7 });
  });

  it("ExpresionUnaria (menos unario)", () => {
    const programa = parsearPrograma("Inicio\nx = -5\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({
      tipo: "ExpresionUnaria",
      operador: "-",
      linea: 2,
      columna: 5,
    });
  });

  it("ExpresionUnaria (no)", () => {
    const programa = parsearPrograma("Inicio\nx = no Verdadero\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({
      tipo: "ExpresionUnaria",
      operador: "no",
      linea: 2,
      columna: 5,
    });
  });

  it("AccesoArreglo dentro de una expresión", () => {
    const programa = parsearPrograma("Inicio\nx = m[0]\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({
      tipo: "AccesoArreglo",
      nombre: "m",
      linea: 2,
      columna: 5,
    });
  });

  it("LlamadaFuncion dentro de una expresión", () => {
    const programa = parsearPrograma("Inicio\nx = f(1)\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({
      tipo: "LlamadaFuncion",
      nombre: "f",
      linea: 2,
      columna: 5,
    });
  });

  it("LiteralArreglo", () => {
    const programa = parsearPrograma("Inicio\nx = [1, 2]\nFin");
    const asignacion = programa.cuerpo[0] as unknown as {
      valor: { linea: number; columna: number };
    };
    expect(asignacion.valor).toMatchObject({ tipo: "LiteralArreglo", linea: 2, columna: 5 });
  });
});

describe("errores sintácticos", () => {
  function esperarErrorSintactico(
    fuente: string,
    linea: number,
    columna: number,
    fragmentoMensaje: string,
  ) {
    try {
      parsearPrograma(fuente);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorSintactico);
      const errorSintactico = error as ErrorSintactico;
      expect(errorSintactico.linea).toBe(linea);
      expect(errorSintactico.columna).toBe(columna);
      expect(errorSintactico.message).toContain(fragmentoMensaje);
    }
  }

  it("falta 'Fin' al cerrar el programa", () => {
    esperarErrorSintactico("Inicio\nEscribir 1", 2, 11, "se esperaba 'Fin'");
  });

  it("falta 'Entonces' después de la condición del 'Si'", () => {
    esperarErrorSintactico(
      "Inicio\nSi Verdadero Hacer\nFinSi\nFin",
      2,
      14,
      "se esperaba 'Entonces'",
    );
  });

  it("falta ')' al cerrar los argumentos de una llamada", () => {
    esperarErrorSintactico("Inicio\nEscribir f(1\nFin", 3, 1, "se esperaba ')'");
  });

  it("token inesperado al inicio de una sentencia", () => {
    esperarErrorSintactico("Inicio\n123\nFin", 2, 1, "se esperaba una sentencia");
  });

  it("falta '=' en una asignación", () => {
    esperarErrorSintactico("Inicio\nx 5\nFin", 2, 3, "se esperaba '='");
  });
});
