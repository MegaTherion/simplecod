import type { ResultadoDepuracion } from "@simplecod/core";

interface PanelErroresProps {
  resultado: ResultadoDepuracion | null;
}

export function PanelErrores({ resultado }: PanelErroresProps) {
  if (!resultado || resultado.ok) return null;

  // resultado.mensaje ya viene formateado como "Error <categoría> [línea L, columna C]: ..."
  // (ver ErrorSimpleCod en packages/core/src/errores) — no hay que volver a armar el prefijo.
  return (
    <div className="panel-errores" role="alert">
      {resultado.mensaje}
    </div>
  );
}
