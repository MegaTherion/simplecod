import { describe, expect, it } from "vitest";
import { construirTraza } from "./depurador.js";

describe("construirTraza", () => {
  it("arma una traza completa para un programa que corre sin errores", () => {
    const resultado = construirTraza("Inicio\nx = 1\nx = x + 1\nEscribir x\nFin");
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.salidaFinal).toBe("2");
    expect(resultado.pasos).toHaveLength(3);
    expect(resultado.pasos[0]).toMatchObject({ variables: { x: 1 }, salida: "" });
    expect(resultado.pasos[1]).toMatchObject({ variables: { x: 2 }, salida: "" });
    expect(resultado.pasos[2]).toMatchObject({ variables: { x: 2 }, salida: "2" });
  });

  it("consume las entradas provistas para las sentencias Leer", () => {
    const resultado = construirTraza("Inicio\nLeer n\nEscribir n\nFin", { entradas: ["42"] });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.salidaFinal).toBe("42");
  });

  it("reporta un error léxico con posición y sin pasos previos", () => {
    const resultado = construirTraza("Inicio\n@\nFin");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.categoria).toBe("léxico");
    expect(resultado.linea).toBe(2);
    expect(resultado.columna).toBe(1);
    expect(resultado.pasos).toEqual([]);
  });

  it("reporta un error sintáctico con posición y sin pasos previos", () => {
    const resultado = construirTraza("Inicio\nSi Verdadero Hacer\nFinSi\nFin");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.categoria).toBe("sintáctico");
    expect(resultado.pasos).toEqual([]);
  });

  it("reporta un error de ejecución junto con los pasos ejecutados antes de fallar", () => {
    const resultado = construirTraza("Inicio\nx = 1\nEscribir zzz\nFin");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.categoria).toBe("de ejecución");
    expect(resultado.mensaje).toContain("variable 'zzz' no está definida");
    expect(resultado.pasos).toHaveLength(1);
    expect(resultado.pasos[0]).toMatchObject({ variables: { x: 1 } });
  });

  it("respeta el límite de sentencias para evitar colgar el navegador con un bucle infinito", () => {
    const resultado = construirTraza("Inicio\nMientras Verdadero Hacer\nx = 1\nFinMientras\nFin", {
      maxSentencias: 50,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.categoria).toBe("de ejecución");
    expect(resultado.mensaje).toContain("límite de 50 sentencias");
    expect(resultado.pasos.length).toBeGreaterThan(0);
  });
});
