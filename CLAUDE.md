# SimpleCod

## Qué es

Intérprete web de pseudocódigo en español, con debugger visual que muestra las
variables cambiando paso a paso, y transpilación del mismo AST a JS, Python y
Pascal. Reconstrucción moderna de un proyecto de 2010 (originalmente en Borland
C++ Builder 6). Objetivo: pieza de portafolio que demuestra fundamentos de
compiladores (lexer, parser, AST, interpretación, generación de código).

## Stack

- TypeScript (estricto) para todo el core, sin dependencias de parsing externas
  (el lexer y parser se escriben a mano, es parte del valor del proyecto)
- React 18 + Vite para la UI web
- CodeMirror 6 para el editor de código
- Vitest para tests
- Monorepo con workspaces de npm: `packages/core` (sin dependencias de UI) y
  `packages/web` (depende de core)
- Deploy estático: GitHub Pages o Vercel (sin backend, todo corre en el browser)

## Comandos

- Desarrollo: `npm run dev` (levanta la app web con Vite)
- Tests: `npm run test` (Vitest, corre sobre packages/core)
- Build: `npm run build`
- Lint/format: `npm run lint` / `npm run format`

## Estructura

- `packages/core/` — lexer, parser, AST, intérprete, codegen (TypeScript puro, testeable en aislamiento, cero imports de React)
- `packages/web/` — app React (editor, grid de variables, panel de salida)
- `docs/` — `gramatica.md` es la especificación normativa del lenguaje
- `examples/` — programas `.scc` de ejemplo

## Convenciones

- Todo el código, tipos y comentarios en español (nombres de nodos AST tal cual
  el documento: `BuclePara`, `Condicional`, `AccesoArreglo`, etc.)
- La UI está en español (es el idioma del lenguaje que interpreta)
- Los tipos del AST viven en `packages/core/ast/` y son la fuente de verdad;
  parser e intérprete importan de ahí, nunca redefinen
- Manejo de errores: clases de error propias (`ErrorLexico`, `ErrorSintactico`,
  `ErrorEjecucion`) que siempre cargan `{ linea, columna, mensaje }`
- Los tokens llevan `{ tipo, lexema, linea, columna }` desde el lexer

## Reglas duras

- `packages/core` NO importa nada de React ni del DOM — debe poder correr en Node
  puro y testearse sin navegador
- No usar librerías de parser generators (nada de PEG.js, nearley, ANTLR): el
  parser recursivo descendente escrito a mano es el punto del proyecto
- La gramática en `docs/gramatica.md` es normativa: si el código se desvía de
  ella, se corrige el código o se actualiza el documento con nota explícita
- No commitear `node_modules` ni artefactos de build

## Referencias

- Especificación completa del lenguaje: `docs/gramatica.md`
