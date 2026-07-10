import { describe, expect, it } from "vitest";
import { ErrorLexico } from "../errores/index.js";
import { Lexer } from "./lexer.js";
import { PALABRAS_RESERVADAS, type Token, type TipoToken } from "./tokens.js";

function soloTipoYLexema(tokens: Token[]): Array<{ tipo: TipoToken; lexema: string }> {
  return tokens.map(({ tipo, lexema }) => ({ tipo, lexema }));
}

describe("palabras reservadas", () => {
  for (const [lexema, tipo] of Object.entries(PALABRAS_RESERVADAS)) {
    it(`reconoce '${lexema}' como ${tipo}`, () => {
      const tokens = new Lexer(lexema).tokenizar();
      expect(tokens[0]).toMatchObject({ tipo, lexema });
    });
  }
});

describe("operadores y símbolos", () => {
  const casos: Array<[string, TipoToken]> = [
    ["+", "MAS"],
    ["-", "MENOS"],
    ["*", "POR"],
    ["/", "DIV"],
    ["^", "POTENCIA"],
    ["==", "IGUAL_IGUAL"],
    ["!=", "DISTINTO"],
    ["<", "MENOR"],
    [">", "MAYOR"],
    ["<=", "MENOR_IGUAL"],
    [">=", "MAYOR_IGUAL"],
    ["=", "IGUAL"],
    ["(", "PARENTESIS_IZQ"],
    [")", "PARENTESIS_DER"],
    ["[", "CORCHETE_IZQ"],
    ["]", "CORCHETE_DER"],
    [",", "COMA"],
  ];

  for (const [lexema, tipo] of casos) {
    it(`reconoce '${lexema}'`, () => {
      const tokens = new Lexer(lexema).tokenizar();
      expect(tokens[0]).toMatchObject({ tipo, lexema });
    });
  }
});

describe("literales", () => {
  it("reconoce números enteros", () => {
    expect(new Lexer("42").tokenizar()[0]).toMatchObject({ tipo: "NUMERO", lexema: "42" });
  });

  it("reconoce números decimales", () => {
    expect(new Lexer("3.14").tokenizar()[0]).toMatchObject({ tipo: "NUMERO", lexema: "3.14" });
  });

  it("reconoce cadenas", () => {
    expect(new Lexer('"hola mundo"').tokenizar()[0]).toMatchObject({
      tipo: "CADENA",
      lexema: "hola mundo",
    });
  });

  it("reconoce cadenas vacías", () => {
    expect(new Lexer('""').tokenizar()[0]).toMatchObject({ tipo: "CADENA", lexema: "" });
  });

  it("reconoce identificadores con dígitos y guion bajo", () => {
    expect(new Lexer("variable_1").tokenizar()[0]).toMatchObject({
      tipo: "IDENTIFICADOR",
      lexema: "variable_1",
    });
  });
});

describe("comentarios", () => {
  it("ignora comentarios de línea y no generan token", () => {
    const tokens = new Lexer("x = 1 // esto es un comentario\nz = 2").tokenizar();
    expect(tokens.map((t) => t.tipo)).toEqual([
      "IDENTIFICADOR",
      "IGUAL",
      "NUMERO",
      "IDENTIFICADOR",
      "IGUAL",
      "NUMERO",
      "EOF",
    ]);
  });
});

describe("posición de tokens", () => {
  it("asigna línea y columna 1-indexadas", () => {
    const tokens = new Lexer("Inicio\n  x = 1\nFin").tokenizar();
    expect(tokens[0]).toMatchObject({ tipo: "Inicio", linea: 1, columna: 1 });
    expect(tokens[1]).toMatchObject({ tipo: "IDENTIFICADOR", lexema: "x", linea: 2, columna: 3 });
    expect(tokens[2]).toMatchObject({ tipo: "IGUAL", linea: 2, columna: 5 });
    expect(tokens[3]).toMatchObject({ tipo: "NUMERO", lexema: "1", linea: 2, columna: 7 });
    expect(tokens[4]).toMatchObject({ tipo: "Fin", linea: 3, columna: 1 });
  });
});

describe("errores léxicos", () => {
  it("lanza ErrorLexico ante un carácter no reconocido", () => {
    const lexer = new Lexer("Inicio\n@\nFin");
    expect(() => lexer.tokenizar()).toThrow(ErrorLexico);
    try {
      lexer.tokenizar();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorLexico);
      const errorLexico = error as ErrorLexico;
      expect(errorLexico.linea).toBe(2);
      expect(errorLexico.columna).toBe(1);
      expect(errorLexico.message).toContain("carácter inesperado '@'");
    }
  });

  it("lanza ErrorLexico ante una cadena sin cerrar", () => {
    const lexer = new Lexer('Inicio\n"abc\nFin');
    try {
      lexer.tokenizar();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorLexico);
      const errorLexico = error as ErrorLexico;
      expect(errorLexico.linea).toBe(2);
      expect(errorLexico.columna).toBe(1);
      expect(errorLexico.message).toContain("cadena sin cerrar");
    }
  });

  it("lanza ErrorLexico ante un número mal formado", () => {
    const lexer = new Lexer("Inicio\n3.\nFin");
    try {
      lexer.tokenizar();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorLexico);
      const errorLexico = error as ErrorLexico;
      expect(errorLexico.linea).toBe(2);
      expect(errorLexico.columna).toBe(1);
      expect(errorLexico.message).toContain("número mal formado");
    }
  });
});

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

    const esperado: Array<{ tipo: TipoToken; lexema: string }> = [
      { tipo: "Inicio", lexema: "Inicio" },
      { tipo: "Leer", lexema: "Leer" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "Para", lexema: "Para" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "1" },
      { tipo: "Hasta", lexema: "Hasta" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "Hacer", lexema: "Hacer" },
      { tipo: "Para", lexema: "Para" },
      { tipo: "IDENTIFICADOR", lexema: "j" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "1" },
      { tipo: "Hasta", lexema: "Hasta" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "Hacer", lexema: "Hacer" },
      { tipo: "IDENTIFICADOR", lexema: "r" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "IDENTIFICADOR", lexema: "j" },
      { tipo: "MOD", lexema: "mod" },
      { tipo: "NUMERO", lexema: "2" },
      { tipo: "Si", lexema: "Si" },
      { tipo: "IDENTIFICADOR", lexema: "r" },
      { tipo: "IGUAL_IGUAL", lexema: "==" },
      { tipo: "NUMERO", lexema: "0" },
      { tipo: "Entonces", lexema: "Entonces" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "CADENA", lexema: "*" },
      { tipo: "Sino", lexema: "Sino" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "CADENA", lexema: "#" },
      { tipo: "FinSi", lexema: "FinSi" },
      { tipo: "FinPara", lexema: "FinPara" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "FinL", lexema: "finl" },
      { tipo: "FinPara", lexema: "FinPara" },
      { tipo: "Fin", lexema: "Fin" },
      { tipo: "EOF", lexema: "" },
    ];

    expect(soloTipoYLexema(new Lexer(programa).tokenizar())).toEqual(esperado);
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

    const esperado: Array<{ tipo: TipoToken; lexema: string }> = [
      { tipo: "Inicio", lexema: "Inicio" },
      { tipo: "Funcion", lexema: "Funcion" },
      { tipo: "IDENTIFICADOR", lexema: "esPrimo" },
      { tipo: "PARENTESIS_IZQ", lexema: "(" },
      { tipo: "IDENTIFICADOR", lexema: "num" },
      { tipo: "PARENTESIS_DER", lexema: ")" },
      { tipo: "Si", lexema: "Si" },
      { tipo: "IDENTIFICADOR", lexema: "num" },
      { tipo: "MENOR", lexema: "<" },
      { tipo: "NUMERO", lexema: "2" },
      { tipo: "Entonces", lexema: "Entonces" },
      { tipo: "Retornar", lexema: "Retornar" },
      { tipo: "Falso", lexema: "Falso" },
      { tipo: "FinSi", lexema: "FinSi" },
      { tipo: "Para", lexema: "Para" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "2" },
      { tipo: "Hasta", lexema: "Hasta" },
      { tipo: "IDENTIFICADOR", lexema: "num" },
      { tipo: "MENOS", lexema: "-" },
      { tipo: "NUMERO", lexema: "1" },
      { tipo: "Hacer", lexema: "Hacer" },
      { tipo: "Si", lexema: "Si" },
      { tipo: "IDENTIFICADOR", lexema: "num" },
      { tipo: "MOD", lexema: "mod" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "IGUAL_IGUAL", lexema: "==" },
      { tipo: "NUMERO", lexema: "0" },
      { tipo: "Entonces", lexema: "Entonces" },
      { tipo: "Retornar", lexema: "Retornar" },
      { tipo: "Falso", lexema: "Falso" },
      { tipo: "FinSi", lexema: "FinSi" },
      { tipo: "FinPara", lexema: "FinPara" },
      { tipo: "Retornar", lexema: "Retornar" },
      { tipo: "Verdadero", lexema: "Verdadero" },
      { tipo: "FinFuncion", lexema: "FinFuncion" },
      { tipo: "Leer", lexema: "Leer" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "Si", lexema: "Si" },
      { tipo: "IDENTIFICADOR", lexema: "esPrimo" },
      { tipo: "PARENTESIS_IZQ", lexema: "(" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "PARENTESIS_DER", lexema: ")" },
      { tipo: "Entonces", lexema: "Entonces" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: " es primo" },
      { tipo: "COMA", lexema: "," },
      { tipo: "FinL", lexema: "finl" },
      { tipo: "Sino", lexema: "Sino" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "IDENTIFICADOR", lexema: "n" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: " no es primo" },
      { tipo: "COMA", lexema: "," },
      { tipo: "FinL", lexema: "finl" },
      { tipo: "FinSi", lexema: "FinSi" },
      { tipo: "Fin", lexema: "Fin" },
      { tipo: "EOF", lexema: "" },
    ];

    expect(soloTipoYLexema(new Lexer(programa).tokenizar())).toEqual(esperado);
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

    const esperado: Array<{ tipo: TipoToken; lexema: string }> = [
      { tipo: "Inicio", lexema: "Inicio" },
      { tipo: "Dimension", lexema: "Dimension" },
      { tipo: "IDENTIFICADOR", lexema: "notas" },
      { tipo: "CORCHETE_IZQ", lexema: "[" },
      { tipo: "NUMERO", lexema: "5" },
      { tipo: "CORCHETE_DER", lexema: "]" },
      { tipo: "IDENTIFICADOR", lexema: "suma" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "0" },
      { tipo: "Para", lexema: "Para" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "0" },
      { tipo: "Hasta", lexema: "Hasta" },
      { tipo: "NUMERO", lexema: "4" },
      { tipo: "Hacer", lexema: "Hacer" },
      { tipo: "Leer", lexema: "Leer" },
      { tipo: "IDENTIFICADOR", lexema: "notas" },
      { tipo: "CORCHETE_IZQ", lexema: "[" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "CORCHETE_DER", lexema: "]" },
      { tipo: "IDENTIFICADOR", lexema: "suma" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "IDENTIFICADOR", lexema: "suma" },
      { tipo: "MAS", lexema: "+" },
      { tipo: "IDENTIFICADOR", lexema: "notas" },
      { tipo: "CORCHETE_IZQ", lexema: "[" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "CORCHETE_DER", lexema: "]" },
      { tipo: "FinPara", lexema: "FinPara" },
      { tipo: "IDENTIFICADOR", lexema: "promedio" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "IDENTIFICADOR", lexema: "suma" },
      { tipo: "DIV", lexema: "/" },
      { tipo: "NUMERO", lexema: "5" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "CADENA", lexema: "Promedio: " },
      { tipo: "COMA", lexema: "," },
      { tipo: "IDENTIFICADOR", lexema: "promedio" },
      { tipo: "COMA", lexema: "," },
      { tipo: "FinL", lexema: "finl" },
      { tipo: "Fin", lexema: "Fin" },
      { tipo: "EOF", lexema: "" },
    ];

    expect(soloTipoYLexema(new Lexer(programa).tokenizar())).toEqual(esperado);
  });

  it("5.4 literal de arreglo y acceso", () => {
    const programa = `Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin`;

    const esperado: Array<{ tipo: TipoToken; lexema: string }> = [
      { tipo: "Inicio", lexema: "Inicio" },
      { tipo: "IDENTIFICADOR", lexema: "dias" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "CORCHETE_IZQ", lexema: "[" },
      { tipo: "CADENA", lexema: "Lun" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: "Mar" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: "Mie" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: "Jue" },
      { tipo: "COMA", lexema: "," },
      { tipo: "CADENA", lexema: "Vie" },
      { tipo: "CORCHETE_DER", lexema: "]" },
      { tipo: "Para", lexema: "Para" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "IGUAL", lexema: "=" },
      { tipo: "NUMERO", lexema: "0" },
      { tipo: "Hasta", lexema: "Hasta" },
      { tipo: "NUMERO", lexema: "4" },
      { tipo: "Hacer", lexema: "Hacer" },
      { tipo: "Escribir", lexema: "Escribir" },
      { tipo: "IDENTIFICADOR", lexema: "dias" },
      { tipo: "CORCHETE_IZQ", lexema: "[" },
      { tipo: "IDENTIFICADOR", lexema: "i" },
      { tipo: "CORCHETE_DER", lexema: "]" },
      { tipo: "COMA", lexema: "," },
      { tipo: "FinL", lexema: "finl" },
      { tipo: "FinPara", lexema: "FinPara" },
      { tipo: "Fin", lexema: "Fin" },
      { tipo: "EOF", lexema: "" },
    ];

    expect(soloTipoYLexema(new Lexer(programa).tokenizar())).toEqual(esperado);
  });
});
