import type { Valor } from "@simplecod/core";

export function formatearValor(valor: Valor): string {
  if (typeof valor === "boolean") return valor ? "Verdadero" : "Falso";
  if (Array.isArray(valor)) return `[${valor.map(formatearValor).join(", ")}]`;
  return String(valor);
}

export function tipoDeValor(valor: Valor): string {
  if (Array.isArray(valor)) return "arreglo";
  if (typeof valor === "boolean") return "booleano";
  if (typeof valor === "number") return "número";
  return "cadena";
}
