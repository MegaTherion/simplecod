import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { Lexer } from "../lexer/index.js";
import { Parser } from "../parser/index.js";
import { generarJavaScript } from "./javascript.js";
import { generarPascal } from "./pascal.js";
import { generarPython } from "./python.js";

function parsear(fuente: string) {
  const tokens = new Lexer(fuente).tokenizar();
  return new Parser(tokens).parsear();
}

function correrJS(fuente: string, entradas: string[] = []): string {
  const codigo = generarJavaScript(parsear(fuente));
  const global = globalThis as unknown as Record<string, unknown>;
  global.__simplecodEntradas = [...entradas];
  global.__simplecodSalida = "";
  try {
    eval(codigo);
    return global.__simplecodSalida as string;
  } finally {
    delete global.__simplecodEntradas;
    delete global.__simplecodSalida;
  }
}

function correrPython(fuente: string, entradas: string[] = []): string {
  const codigo = generarPython(parsear(fuente));
  return execFileSync("python", ["-c", codigo], {
    input: entradas.length > 0 ? entradas.join("\n") + "\n" : "",
    encoding: "utf-8",
  });
}

const EJEMPLO_ASTERISCOS = `Inicio
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

const EJEMPLO_ESPRIMO = `Inicio
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

const EJEMPLO_NOTAS = `Inicio
    Dimension notas[5]
    suma = 0
    Para i = 0 Hasta 4 Hacer
        Leer notas[i]
        suma = suma + notas[i]
    FinPara
    promedio = suma / 5
    Escribir "Promedio: ", promedio, finl
Fin`;

const EJEMPLO_DIAS = `Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin`;

describe("generador de JavaScript", () => {
  it("5.1 patrón de asteriscos", () => {
    expect(correrJS(EJEMPLO_ASTERISCOS, ["3"])).toBe("#\n#*\n#*#\n");
  });

  it("5.2 función esPrimo (primo)", () => {
    expect(correrJS(EJEMPLO_ESPRIMO, ["7"])).toBe("7 es primo\n");
  });

  it("5.2 función esPrimo (no primo)", () => {
    expect(correrJS(EJEMPLO_ESPRIMO, ["8"])).toBe("8 no es primo\n");
  });

  it("5.3 arreglo de notas", () => {
    expect(correrJS(EJEMPLO_NOTAS, ["10", "20", "30", "40", "50"])).toBe("Promedio: 30\n");
  });

  it("5.4 literal de arreglo y acceso", () => {
    expect(correrJS(EJEMPLO_DIAS)).toBe("Lun\nMar\nMie\nJue\nVie\n");
  });

  it("copia arreglos por valor, igual que el intérprete", () => {
    const programa = `Inicio
    Dimension a[3]
    a[0] = 1
    b = a
    b[0] = 99
    Escribir a[0], finl
    Escribir b[0], finl
Fin`;
    expect(correrJS(programa)).toBe("1\n99\n");
  });
});

describe("generador de Python", () => {
  it("5.1 patrón de asteriscos", () => {
    expect(correrPython(EJEMPLO_ASTERISCOS, ["3"])).toBe("#\n#*\n#*#\n");
  });

  it("5.2 función esPrimo (primo)", () => {
    expect(correrPython(EJEMPLO_ESPRIMO, ["7"])).toBe("7 es primo\n");
  });

  it("5.2 función esPrimo (no primo)", () => {
    expect(correrPython(EJEMPLO_ESPRIMO, ["8"])).toBe("8 no es primo\n");
  });

  it("5.3 arreglo de notas", () => {
    expect(correrPython(EJEMPLO_NOTAS, ["10", "20", "30", "40", "50"])).toBe("Promedio: 30\n");
  });

  it("5.4 literal de arreglo y acceso", () => {
    expect(correrPython(EJEMPLO_DIAS)).toBe("Lun\nMar\nMie\nJue\nVie\n");
  });

  it("copia arreglos por valor, igual que el intérprete", () => {
    const programa = `Inicio
    Dimension a[3]
    a[0] = 1
    b = a
    b[0] = 99
    Escribir a[0], finl
    Escribir b[0], finl
Fin`;
    // Python copia listas por referencia por defecto; el generador debe copiar
    // explícitamente para preservar la semántica "por valor" de SimpleCod.
    expect(correrPython(programa)).toBe("1\n99\n");
  });
});

describe("generador de Pascal (verificación estructural, sin compilador disponible)", () => {
  it("genera un programa con la estructura esperada para los 4 ejemplos", () => {
    for (const fuente of [EJEMPLO_ASTERISCOS, EJEMPLO_ESPRIMO, EJEMPLO_NOTAS, EJEMPLO_DIAS]) {
      const codigo = generarPascal(parsear(fuente));
      expect(codigo).toContain("program SimpleCodPrograma;");
      expect(codigo.trim().endsWith("end.")).toBe(true);
      const abiertos = (codigo.match(/\bbegin\b/g) ?? []).length;
      const cerrados = (codigo.match(/\bend\b/g) ?? []).length;
      expect(cerrados).toBe(abiertos);
    }
  });

  it("traduce la función esPrimo con parámetros y tipo Variant", () => {
    const codigo = generarPascal(parsear(EJEMPLO_ESPRIMO));
    expect(codigo).toContain("function esPrimo(num: Variant): Variant;");
    expect(codigo).toContain("esPrimo := False;");
    expect(codigo).toContain("Exit;");
  });

  it("traduce Dimension y el acceso a arreglos", () => {
    const codigo = generarPascal(parsear(EJEMPLO_NOTAS));
    expect(codigo).toContain("notas := __crearArreglo([Integer(5)]);");
    expect(codigo).toContain("notas[i]");
  });

  it("traduce el literal de arreglo", () => {
    const codigo = generarPascal(parsear(EJEMPLO_DIAS));
    expect(codigo).toContain("__arregloDeElementos([");
    expect(codigo).toContain("dias[i]");
  });

  it("traduce finl como salto de línea Pascal (#10)", () => {
    const codigo = generarPascal(parsear(EJEMPLO_ASTERISCOS));
    expect(codigo).toContain("#10");
  });
});
