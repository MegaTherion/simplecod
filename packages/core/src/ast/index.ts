// Tipos del AST — fuente de verdad, ver docs/gramatica.md §4.

export type Nodo =
  | Programa
  | Dimension
  | Asignacion
  | Lectura
  | Escritura
  | Condicional
  | BucleMientras
  | BuclePara
  | DeclaracionFuncion
  | LlamadaFuncion
  | Retorno
  | ExpresionBinaria
  | ExpresionUnaria
  | AccesoArreglo
  | LiteralArreglo
  | Literal
  | Identificador;

export interface Posicion {
  linea: number;
  columna: number;
}

export interface Programa {
  tipo: "Programa";
  cuerpo: Nodo[]; // mezcla de DeclaracionFuncion y sentencias
}

export interface Dimension extends Posicion {
  tipo: "Dimension";
  nombre: string;
  dimensiones: Nodo[]; // una entrada por cada [expresion]
}

export interface Asignacion extends Posicion {
  tipo: "Asignacion";
  objetivo: Identificador | AccesoArreglo; // lvalue
  valor: Nodo;
}

export interface Lectura extends Posicion {
  tipo: "Lectura";
  // Ver docs/gramatica.md §2, nota de corrección del Hito 3: admite
  // accesos a arreglo como destino (`Leer notas[i]`), no solo identificadores.
  objetivos: (Identificador | AccesoArreglo)[];
}

export interface Escritura extends Posicion {
  tipo: "Escritura";
  expresiones: Nodo[];
}

export interface Condicional extends Posicion {
  tipo: "Condicional";
  condicion: Nodo;
  bloqueSi: Nodo[];
  bloqueSino: Nodo[] | null;
}

export interface BucleMientras extends Posicion {
  tipo: "BucleMientras";
  condicion: Nodo;
  cuerpo: Nodo[];
}

export interface BuclePara extends Posicion {
  tipo: "BuclePara";
  variable: string;
  desde: Nodo;
  hasta: Nodo;
  cuerpo: Nodo[];
}

export interface DeclaracionFuncion extends Posicion {
  tipo: "DeclaracionFuncion";
  nombre: string;
  parametros: string[];
  cuerpo: Nodo[];
}

export interface LlamadaFuncion extends Posicion {
  tipo: "LlamadaFuncion";
  nombre: string;
  argumentos: Nodo[];
}

export interface Retorno extends Posicion {
  tipo: "Retorno";
  valor: Nodo;
}

export interface ExpresionBinaria extends Posicion {
  tipo: "ExpresionBinaria";
  operador: string;
  izquierda: Nodo;
  derecha: Nodo;
}

export interface ExpresionUnaria extends Posicion {
  tipo: "ExpresionUnaria";
  operador: string;
  operando: Nodo;
}

export interface AccesoArreglo extends Posicion {
  tipo: "AccesoArreglo";
  nombre: string;
  indices: Nodo[]; // una entrada por cada [expresion]
}

export interface LiteralArreglo extends Posicion {
  tipo: "LiteralArreglo";
  elementos: Nodo[];
}

export interface Literal {
  tipo: "Literal";
  valor: number | string | boolean;
}

export interface Identificador extends Posicion {
  tipo: "Identificador";
  nombre: string;
}
