import { describe, expect, it } from "vitest";
import { ErrorEjecucion } from "../errores/index.js";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { Interprete, type Valor } from "./interprete.js";

function ejecutarPrograma(
  fuente: string,
  entradas: string[] = [],
): { salida: string; variables: Record<string, Valor> } {
  const tokens = new Lexer(fuente).tokenizar();
  const ast = new Parser(tokens).parsear();
  let ultimasVariables: Record<string, Valor> = {};
  const interprete = new Interprete({
    entradas,
    alEjecutarSentencia: (info) => {
      ultimasVariables = info.variables;
    },
  });
  interprete.ejecutar(ast);
  return { salida: interprete.salida, variables: ultimasVariables };
}

describe("ejemplos de docs/gramatica.md §5", () => {
  it("5.1 patrón de asteriscos (n = 3)", () => {
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

    const { salida, variables } = ejecutarPrograma(programa, ["3"]);
    expect(salida).toBe("#\n#*\n#*#\n");
    expect(variables).toMatchObject({ n: 3, i: 3, j: 3, r: 1 });
  });

  it("5.2 función esPrimo (n = 7, primo)", () => {
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

    const { salida, variables } = ejecutarPrograma(programa, ["7"]);
    expect(salida).toBe("7 es primo\n");
    // las variables locales de la función (num, i) no deben filtrarse al entorno global
    expect(variables).toEqual({ n: 7 });
  });

  it("5.2 función esPrimo (n = 8, no primo)", () => {
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

    const { salida } = ejecutarPrograma(programa, ["8"]);
    expect(salida).toBe("8 no es primo\n");
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

    const { salida, variables } = ejecutarPrograma(programa, ["10", "20", "30", "40", "50"]);
    expect(salida).toBe("Promedio: 30\n");
    expect(variables).toMatchObject({
      notas: [10, 20, 30, 40, 50],
      suma: 150,
      promedio: 30,
    });
  });

  it("5.4 literal de arreglo y acceso", () => {
    const programa = `Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin`;

    const { salida } = ejecutarPrograma(programa);
    expect(salida).toBe("Lun\nMar\nMie\nJue\nVie\n");
  });
});

describe("semántica de Escribir / finl", () => {
  it("Escribir no agrega salto de línea automático", () => {
    const { salida } = ejecutarPrograma('Inicio\nEscribir "a"\nEscribir "b"\nFin');
    expect(salida).toBe("ab");
  });

  it("finl agrega un salto de línea explícito", () => {
    const { salida } = ejecutarPrograma('Inicio\nEscribir "a", finl, "b"\nFin');
    expect(salida).toBe("a\nb");
  });
});

describe("arreglos: copia por valor", () => {
  it("asignar un arreglo a otra variable copia el contenido, no la referencia", () => {
    const programa = `Inicio
    Dimension a[3]
    a[0] = 1
    a[1] = 2
    a[2] = 3
    b = a
    b[0] = 99
    Escribir a[0], finl
    Escribir b[0], finl
Fin`;
    const { salida } = ejecutarPrograma(programa);
    expect(salida).toBe("1\n99\n");
  });

  it("pasar un arreglo como argumento copia el contenido", () => {
    const programa = `Inicio
    Funcion modificar(arr)
        arr[0] = 100
        Retornar arr[0]
    FinFuncion
    Dimension x[2]
    x[0] = 5
    resultado = modificar(x)
    Escribir x[0], finl
    Escribir resultado, finl
Fin`;
    const { salida } = ejecutarPrograma(programa);
    expect(salida).toBe("5\n100\n");
  });
});

describe("funciones sin Retornar", () => {
  it("devuelven Falso implícitamente", () => {
    const programa = `Inicio
    Funcion vacia()
    FinFuncion
    x = vacia()
    Si x Entonces
        Escribir "si"
    Sino
        Escribir "no"
    FinSi
Fin`;
    const { salida, variables } = ejecutarPrograma(programa);
    expect(salida).toBe("no");
    expect(variables).toMatchObject({ x: false });
  });
});

describe("errores de ejecución", () => {
  function esperarErrorEjecucion(
    fuente: string,
    linea: number,
    columna: number,
    fragmentoMensaje: string,
    entradas: string[] = [],
  ) {
    try {
      ejecutarPrograma(fuente, entradas);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorEjecucion);
      const errorEjecucion = error as ErrorEjecucion;
      expect(errorEjecucion.linea).toBe(linea);
      expect(errorEjecucion.columna).toBe(columna);
      expect(errorEjecucion.message).toContain(fragmentoMensaje);
    }
  }

  it("variable no definida", () => {
    esperarErrorEjecucion("Inicio\nEscribir x\nFin", 2, 10, "variable 'x' no está definida");
  });

  it("función inexistente", () => {
    esperarErrorEjecucion("Inicio\nEscribir f()\nFin", 2, 10, "la función 'f' no existe");
  });

  it("índice fuera de rango", () => {
    esperarErrorEjecucion(
      "Inicio\nDimension a[3]\nEscribir a[5]\nFin",
      3,
      10,
      "índice 5 fuera de rango para el arreglo 'a' (tamaño 3)",
    );
  });

  it("aridad incorrecta en una llamada a función", () => {
    esperarErrorEjecucion(
      "Inicio\nFuncion f(a, b)\nRetornar a + b\nFinFuncion\nEscribir f(1)\nFin",
      5,
      10,
      "la función 'f' espera 2 argumento(s), pero se pasaron 1",
    );
  });

  it("división por cero", () => {
    esperarErrorEjecucion("Inicio\nEscribir 5 / 0\nFin", 2, 12, "división por cero");
  });

  it("módulo por cero", () => {
    esperarErrorEjecucion("Inicio\nEscribir 5 mod 0\nFin", 2, 12, "división por cero");
  });

  it("'Retornar' fuera de una función", () => {
    esperarErrorEjecucion(
      "Inicio\nRetornar 5\nFin",
      2,
      1,
      "'Retornar' solo puede usarse dentro de una función",
    );
  });

  it("no hay más valores de entrada disponibles", () => {
    esperarErrorEjecucion(
      "Inicio\nLeer x\nFin",
      2,
      1,
      "no hay más valores de entrada disponibles para 'Leer'",
    );
  });
});

describe("límite de sentencias (protección contra bucles infinitos)", () => {
  it("aborta con ErrorEjecucion al superar maxSentencias", () => {
    const programa = "Inicio\nMientras Verdadero Hacer\nx = 1\nFinMientras\nFin";
    const tokens = new Lexer(programa).tokenizar();
    const ast = new Parser(tokens).parsear();
    const interprete = new Interprete({ maxSentencias: 100 });
    try {
      interprete.ejecutar(ast);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorEjecucion);
      expect((error as ErrorEjecucion).message).toContain("límite de 100 sentencias");
    }
  });
});
