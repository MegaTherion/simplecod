# SimpleCod — Especificación de gramática

Documento base antes de implementación. Define léxico, gramática formal (EBNF), precedencia de operadores, manejo de errores y mapeo a nodos de AST. Basado en la sintaxis original de SimpleCod (2005-2006) con extensiones necesarias: funciones y arreglos (ninguno llegó a implementarse en la versión original).

**Decisiones de diseño (ver §8 para el detalle):** tipado dinámico con inferencia, arreglos soportados, sin funciones anidadas, errores con línea y columna.

---

## 1. Tokens léxicos

### 1.1 Palabras reservadas

```
Inicio          Fin
Leer            Escribir
Si              Entonces      Sino          FinSi
Mientras        Hacer         FinMientras
Para            Hasta         FinPara
Funcion         FinFuncion    Retornar
Dimension
Verdadero       Falso
finl
```

`finl` (Hito 4): literal de salto de línea, análogo a `endl` en C++. Ver
§6 y §9 — `Escribir` no agrega salto de línea automático; para eso se
escribe `Escribir ..., finl`.

### 1.2 Operadores y símbolos

| Categoría    | Símbolos                    |
| ------------ | --------------------------- |
| Aritméticos  | `+` `-` `*` `/` `mod` `^`   |
| Relacionales | `==` `!=` `<` `>` `<=` `>=` |
| Lógicos      | `y` `o` `no`                |
| Asignación   | `=`                         |
| Agrupación   | `(` `)`                     |
| Indexación   | `[` `]`                     |
| Separadores  | `,`                         |

### 1.3 Literales

```
NUMERO        : dígito+ ('.' dígito+)?
CADENA        : '"' caracter* '"'
IDENTIFICADOR : letra (letra | dígito | '_')*
```

### 1.4 Comentarios

```
// comentario de una línea
```

### 1.5 Posición de tokens

Cada token producido por el lexer lleva su posición de origen:

```typescript
interface Token {
  tipo: TipoToken;
  lexema: string;
  linea: number; // 1-indexado
  columna: number; // 1-indexado, columna del primer carácter del lexema
}
```

Esta información se propaga al AST y es la base del reporte de errores (ver §7).

---

## 2. Gramática (EBNF)

```ebnf
(* Un programa es una secuencia de elementos. Las funciones SOLO      *)
(* pueden aparecer a este nivel: como 'sentencia' no las incluye,     *)
(* el anidamiento de funciones es imposible por construcción.         *)
programa        = "Inicio" , elemento* , "Fin" ;

elemento        = declaracionFuncion
                | sentencia ;

sentencia       = asignacion
                | dimension
                | lectura
                | escritura
                | condicional
                | bucleMientras
                | buclePara
                | llamadaFuncion
                | retorno ;

(* --- Declaraciones y asignaciones --- *)

dimension       = "Dimension" , IDENTIFICADOR , "[" , expresion , "]" ,
                    ("[" , expresion , "]")* ;

asignacion      = objetivo , "=" , expresion ;

objetivo        = IDENTIFICADOR , ("[" , expresion , "]")* ;

(* --- Entrada / salida --- *)

(* Nota de corrección (Hito 3): la regla original solo admitía            *)
(* IDENTIFICADOR suelto, lo cual contradecía §6 ("Leer notas[i] es        *)
(* válido") y el propio ejemplo 5.3. Se reutiliza 'objetivo' para         *)
(* permitir accesos a arreglo como destino de lectura.                    *)
lectura         = "Leer" , objetivo , ("," , objetivo)* ;

escritura       = "Escribir" , expresion , ("," , expresion)* ;

(* --- Control de flujo --- *)

condicional     = "Si" , expresion , "Entonces" ,
                    sentencia* ,
                    ("Sino" , sentencia*)? ,
                  "FinSi" ;

bucleMientras   = "Mientras" , expresion , "Hacer" ,
                    sentencia* ,
                  "FinMientras" ;

buclePara       = "Para" , IDENTIFICADOR , "=" , expresion , "Hasta" , expresion , "Hacer" ,
                    sentencia* ,
                  "FinPara" ;

(* --- Funciones (solo nivel superior; ver 'programa') --- *)

declaracionFuncion = "Funcion" , IDENTIFICADOR , "(" , listaParametros? , ")" ,
                        sentencia* ,
                     "FinFuncion" ;

listaParametros = IDENTIFICADOR , ("," , IDENTIFICADOR)* ;

retorno         = "Retornar" , expresion ;

(* --- Expresiones (ordenadas por precedencia, menor a mayor) --- *)

expresion       = expresionOr ;

expresionOr     = expresionAnd , ("o" , expresionAnd)* ;

expresionAnd    = expresionNot , ("y" , expresionNot)* ;

expresionNot    = "no" , expresionNot
                | expresionRelacional ;

expresionRelacional = expresionAditiva ,
                      (("==" | "!=" | "<" | ">" | "<=" | ">=") , expresionAditiva)? ;

expresionAditiva = expresionMultiplicativa ,
                   (("+" | "-") , expresionMultiplicativa)* ;

expresionMultiplicativa = expresionUnaria ,
                          (("*" | "/" | "mod") , expresionUnaria)* ;

expresionUnaria = ("-" , expresionUnaria)
                | expresionPotencia ;

expresionPotencia = primario , ("^" , expresionUnaria)? ;

primario        = NUMERO
                | CADENA
                | "Verdadero"
                | "Falso"
                | "finl"
                | literalArreglo
                | "(" , expresion , ")"
                | IDENTIFICADOR , sufijo? ;

(* Un identificador puede ser: variable suelta, llamada a función,    *)
(* o acceso a arreglo (una o más dimensiones).                        *)
sufijo          = "(" , listaArgumentos? , ")"          (* llamada     *)
                | ("[" , expresion , "]")+ ;            (* acceso      *)

literalArreglo  = "[" , (expresion , ("," , expresion)*)? , "]" ;

llamadaFuncion  = IDENTIFICADOR , "(" , listaArgumentos? , ")" ;

listaArgumentos = expresion , ("," , expresion)* ;
```

**Nota sobre ambigüedad `asignacion` vs `llamadaFuncion` a nivel de sentencia:** ambas empiezan con `IDENTIFICADOR`. El parser resuelve con lookahead: si tras el identificador (y sus posibles `[índices]`) viene `=`, es asignación; si viene `(`, es llamada. Con un solo token de anticipación alcanza.

---

## 3. Precedencia de operadores (de menor a mayor)

| Nivel | Operadores                  | Asociatividad    |
| ----- | --------------------------- | ---------------- |
| 1     | `o`                         | izquierda        |
| 2     | `y`                         | izquierda        |
| 3     | `no`                        | derecha (unario) |
| 4     | `==` `!=` `<` `>` `<=` `>=` | no asociativo    |
| 5     | `+` `-`                     | izquierda        |
| 6     | `*` `/` `mod`               | izquierda        |
| 7     | `-` (unario)                | derecha          |
| 8     | `^`                         | derecha          |

Nota: los relacionales son **no asociativos** a propósito — `a < b < c` no es válido gramaticalmente. Evita la ambigüedad de si significa `(a<b) < c` o el encadenamiento estilo Python. Se fuerza a escribir `a < b y b < c`.

---

## 4. Nodos de AST (tipos TypeScript)

Todos los nodos con posición guardan `linea` y `columna` del token con que inician, para el reporte de errores en tiempo de ejecución.

```typescript
type Nodo =
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

interface Posicion {
  linea: number;
  columna: number;
}

interface Programa {
  tipo: "Programa";
  cuerpo: Nodo[]; // mezcla de DeclaracionFuncion y sentencias
}

interface Dimension extends Posicion {
  tipo: "Dimension";
  nombre: string;
  dimensiones: Nodo[]; // una entrada por cada [expresion]
}

interface Asignacion extends Posicion {
  tipo: "Asignacion";
  objetivo: Identificador | AccesoArreglo; // lvalue
  valor: Nodo;
}

interface Lectura extends Posicion {
  tipo: "Lectura";
  // Corrección Hito 3: antes era `variables: string[]`, pero eso no permitía
  // `Leer notas[i]` (válido según §6 y usado en el ejemplo 5.3).
  objetivos: (Identificador | AccesoArreglo)[];
}

interface Escritura extends Posicion {
  tipo: "Escritura";
  expresiones: Nodo[];
}

interface Condicional extends Posicion {
  tipo: "Condicional";
  condicion: Nodo;
  bloqueSi: Nodo[];
  bloqueSino: Nodo[] | null;
}

interface BucleMientras extends Posicion {
  tipo: "BucleMientras";
  condicion: Nodo;
  cuerpo: Nodo[];
}

interface BuclePara extends Posicion {
  tipo: "BuclePara";
  variable: string;
  desde: Nodo;
  hasta: Nodo;
  cuerpo: Nodo[];
}

interface DeclaracionFuncion extends Posicion {
  tipo: "DeclaracionFuncion";
  nombre: string;
  parametros: string[];
  cuerpo: Nodo[];
}

interface LlamadaFuncion extends Posicion {
  tipo: "LlamadaFuncion";
  nombre: string;
  argumentos: Nodo[];
}

interface Retorno extends Posicion {
  tipo: "Retorno";
  valor: Nodo;
}

interface ExpresionBinaria extends Posicion {
  tipo: "ExpresionBinaria";
  operador: string;
  izquierda: Nodo;
  derecha: Nodo;
}

interface ExpresionUnaria extends Posicion {
  tipo: "ExpresionUnaria";
  operador: string;
  operando: Nodo;
}

interface AccesoArreglo extends Posicion {
  tipo: "AccesoArreglo";
  nombre: string;
  indices: Nodo[]; // una entrada por cada [expresion]
}

interface LiteralArreglo extends Posicion {
  tipo: "LiteralArreglo";
  elementos: Nodo[];
}

interface Literal {
  tipo: "Literal";
  valor: number | string | boolean;
}

interface Identificador extends Posicion {
  tipo: "Identificador";
  nombre: string;
}
```

---

## 5. Ejemplos base

Actualizados en el Hito 4: `Escribir` ya no agrega salto de línea automático
(ver §6), así que los saltos de línea explícitos se escriben con `finl`.

### 5.1 Patrón de asteriscos (el caso de tu captura, ya formalizado)

```
Inicio
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
Fin
```

### 5.2 Función (caso nuevo, no existía en la versión original)

```
Inicio
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
Fin
```

### 5.3 Arreglos (caso nuevo)

```
Inicio
    Dimension notas[5]
    suma = 0
    Para i = 0 Hasta 4 Hacer
        Leer notas[i]
        suma = suma + notas[i]
    FinPara
    promedio = suma / 5
    Escribir "Promedio: ", promedio, finl
Fin
```

### 5.4 Literal de arreglo + acceso

```
Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin
```

---

## 6. Semántica de arreglos y tipado

- **Tipado dinámico:** las variables no se declaran con tipo. El valor se infiere en tiempo de ejecución (número, cadena, booleano o arreglo). Leer un valor numérico produce un número; una cadena entre comillas produce una cadena.
- **`Dimension`** reserva un arreglo del tamaño indicado, inicializado en cero. Soporta múltiples dimensiones (`Dimension m[3][3]` para una matriz).
- **Índices base 0.** Un acceso fuera de rango es un error de ejecución con posición (ver §7).
- Los arreglos son valores de primera clase: se pueden asignar y pasar como argumento a funciones. **Decisión (Hito 4): copia por valor** — `a = b` copia el contenido del arreglo, no la referencia. Simplifica el modelo mental para quien está aprendiendo (evita que modificar `b` cambie `a` por sorpresa).
- `Leer` solo acepta identificadores o accesos a arreglo como destino (`Leer notas[i]` es válido; `Leer 3` no).
- **`Escribir` NO agrega salto de línea automático** (decisión, Hito 4). Para saltar de línea se usa el literal reservado `finl`, análogo a `endl` en C++: `Escribir "hola", finl`. Ver §5 — los ejemplos base se actualizaron para reflejar esto (sin esta corrección, el patrón de asteriscos de 5.1 imprimiría cada símbolo en su propia línea en vez de formar el triángulo).

---

## 7. Manejo de errores

Tres categorías, todas con posición `linea:columna`:

### 7.1 Errores léxicos

Carácter no reconocido, cadena sin cerrar, número mal formado.

```
Error léxico [línea 4, columna 12]: carácter inesperado '@'
```

### 7.2 Errores sintácticos

Token inesperado según la gramática. El mensaje indica qué se esperaba.

```
Error sintáctico [línea 7, columna 5]: se esperaba 'Entonces' después de la condición del 'Si', pero se encontró 'Hacer'
```

### 7.3 Errores semánticos / de ejecución

Variable no definida, función inexistente, índice fuera de rango, número incorrecto de argumentos, división por cero, uso de `Retornar` fuera de una función.

```
Error de ejecución [línea 9, columna 8]: índice 5 fuera de rango para el arreglo 'notas' (tamaño 5)
Error de ejecución [línea 3, columna 1]: 'Retornar' solo puede usarse dentro de una función
```

### 7.4 Formato general

```
Error <categoría> [línea L, columna C]: <mensaje descriptivo>
```

Para la demo visual (el grid de variables), los errores se resaltan sobre la línea correspondiente del editor, no solo en consola.

---

## 8. Decisiones tomadas

| Tema                   | Decisión                                                        | Motivo                                                                                                |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Arreglos**           | Incluidos (`Dimension`, literales, indexación multidimensional) | Suben el nivel técnico del portafolio y habilitan ejercicios clásicos (ordenamiento, matrices)        |
| **Tipado**             | Dinámico con inferencia                                         | Simplicidad pedagógica; mantiene el espíritu de la versión original que infería `float` al leer       |
| **Funciones anidadas** | No permitidas                                                   | Se fuerza por gramática (`sentencia` no incluye `declaracionFuncion`); simplifica el manejo de scopes |
| **Errores**            | Con línea y columna, en 3 categorías                            | Estilo compilador moderno; se ve muy bien en la demo y en el README                                   |

## 9. Pendientes menores para implementación (no bloqueantes)

- [x] Copia de arreglos: **por valor** (decisión, Hito 4). `a = b` y el paso como argumento copian el contenido, no la referencia. Motivo: simplicidad de comprensión para quien está aprendiendo.
- [x] `Escribir`: **no agrega salto de línea automático** (decisión, Hito 4). Se usa el literal reservado `finl` (análogo a `endl` de C++) para saltar de línea explícitamente. Ver §1.1, §2 y §6.
- [x] Funciones sin `Retornar`: **devuelven `Falso` implícitamente** (decisión, Hito 4), sin error. Se eligió `Falso` en vez de introducir un quinto tipo "nulo/vacío" en el sistema de tipos (§6 solo define número, cadena, booleano y arreglo), lo que habría complicado el intérprete y los 3 generadores de código del Hito 5. Usar el resultado en una expresión no falla — se comporta como cualquier booleano.
- [x] Alcance de variables: **solo parámetros + locales** (decisión tomada en el prompt inicial del proyecto, Hito 4). Las funciones no ven variables globales.
