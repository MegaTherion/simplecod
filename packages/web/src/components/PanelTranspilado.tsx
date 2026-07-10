import { useMemo, useState } from "react";
import { generarJavaScript, generarPascal, generarPython, type Programa } from "@simplecod/core";

type Lenguaje = "javascript" | "python" | "pascal";

interface PanelTranspiladoProps {
  ast: Programa | null;
}

const GENERADORES: Record<Lenguaje, (ast: Programa) => string> = {
  javascript: generarJavaScript,
  python: generarPython,
  pascal: generarPascal,
};

const ETIQUETAS: Record<Lenguaje, string> = {
  javascript: "JavaScript",
  python: "Python",
  pascal: "Pascal",
};

export function PanelTranspilado({ ast }: PanelTranspiladoProps) {
  const [lenguaje, setLenguaje] = useState<Lenguaje>("javascript");

  const codigo = useMemo(() => {
    if (!ast) return "";
    try {
      return GENERADORES[lenguaje](ast);
    } catch (error) {
      return `// no se pudo generar código: ${(error as Error).message}`;
    }
  }, [ast, lenguaje]);

  return (
    <div className="panel-transpilado">
      <div className="panel-transpilado__selector">
        {(Object.keys(ETIQUETAS) as Lenguaje[]).map((clave) => (
          <button
            key={clave}
            type="button"
            className={clave === lenguaje ? "activo" : ""}
            onClick={() => setLenguaje(clave)}
          >
            {ETIQUETAS[clave]}
          </button>
        ))}
      </div>
      <pre className="panel-transpilado__codigo">
        {codigo || "(escribí un programa válido para ver el código generado)"}
      </pre>
    </div>
  );
}
