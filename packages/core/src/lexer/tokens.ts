export type TipoToken =
  // Palabras reservadas
  | "Inicio"
  | "Fin"
  | "Leer"
  | "Escribir"
  | "Si"
  | "Entonces"
  | "Sino"
  | "FinSi"
  | "Mientras"
  | "Hacer"
  | "FinMientras"
  | "Para"
  | "Hasta"
  | "FinPara"
  | "Funcion"
  | "FinFuncion"
  | "Retornar"
  | "Dimension"
  | "Verdadero"
  | "Falso"
  | "FinL"
  // Operadores lógicos y aritmético de palabra
  | "Y"
  | "O"
  | "NO"
  | "MOD"
  // Literales e identificador
  | "NUMERO"
  | "CADENA"
  | "IDENTIFICADOR"
  // Operadores aritméticos
  | "MAS"
  | "MENOS"
  | "POR"
  | "DIV"
  | "POTENCIA"
  // Operadores relacionales
  | "IGUAL_IGUAL"
  | "DISTINTO"
  | "MENOR"
  | "MAYOR"
  | "MENOR_IGUAL"
  | "MAYOR_IGUAL"
  // Asignación
  | "IGUAL"
  // Agrupación e indexación
  | "PARENTESIS_IZQ"
  | "PARENTESIS_DER"
  | "CORCHETE_IZQ"
  | "CORCHETE_DER"
  // Separador
  | "COMA"
  // Fin de archivo
  | "EOF";

export interface Token {
  tipo: TipoToken;
  lexema: string;
  linea: number;
  columna: number;
}

export const PALABRAS_RESERVADAS: Record<string, TipoToken> = {
  Inicio: "Inicio",
  Fin: "Fin",
  Leer: "Leer",
  Escribir: "Escribir",
  Si: "Si",
  Entonces: "Entonces",
  Sino: "Sino",
  FinSi: "FinSi",
  Mientras: "Mientras",
  Hacer: "Hacer",
  FinMientras: "FinMientras",
  Para: "Para",
  Hasta: "Hasta",
  FinPara: "FinPara",
  Funcion: "Funcion",
  FinFuncion: "FinFuncion",
  Retornar: "Retornar",
  Dimension: "Dimension",
  Verdadero: "Verdadero",
  Falso: "Falso",
  finl: "FinL",
  y: "Y",
  o: "O",
  no: "NO",
  mod: "MOD",
};
