import { useMemo, useState } from "react";
import { Lexer, Parser, type Programa } from "@simplecod/core";
import { Editor } from "./components/Editor.js";
import { GridVariables } from "./components/GridVariables.js";
import { PanelSalida } from "./components/PanelSalida.js";
import { PanelErrores } from "./components/PanelErrores.js";
import { Controles } from "./components/Controles.js";
import { PanelEntradas } from "./components/PanelEntradas.js";
import { PanelTranspilado } from "./components/PanelTranspilado.js";
import { useDepurador } from "./simplecod/useDepurador.js";
import { obtenerPasoVisible } from "./simplecod/pasoVisible.js";
import { EJEMPLOS } from "./simplecod/ejemplos.js";

export function App() {
  const [codigo, setCodigo] = useState(EJEMPLOS[0]?.codigo ?? "");
  const [entradasTexto, setEntradasTexto] = useState(EJEMPLOS[0]?.entradas ?? "");

  const {
    resultado,
    pasoActual,
    limitePaso,
    reproduciendo,
    ejecutar,
    pasoSiguiente,
    pasoAnterior,
    alternarReproduccion,
    reiniciarPasos,
  } = useDepurador();

  const pasoVisible = useMemo(
    () => obtenerPasoVisible(resultado, pasoActual),
    [resultado, pasoActual],
  );

  // AST independiente de la ejecución: el panel de código transpilado se puede
  // mostrar aunque el programa todavía no se haya ejecutado (o haya fallado en
  // tiempo de ejecución, mientras el parseo en sí sea válido).
  const ast: Programa | null = useMemo(() => {
    try {
      const tokens = new Lexer(codigo).tokenizar();
      return new Parser(tokens).parsear();
    } catch {
      return null;
    }
  }, [codigo]);

  const handleEjecutar = () => {
    const entradas = entradasTexto.split("\n").filter((linea) => linea.trim() !== "");
    ejecutar(codigo, entradas);
  };

  const cargarEjemplo = (indice: number) => {
    const ejemplo = EJEMPLOS[indice];
    if (!ejemplo) return;
    setCodigo(ejemplo.codigo);
    setEntradasTexto(ejemplo.entradas);
    reiniciarPasos();
  };

  return (
    <main className="app">
      <header className="app__header">
        <h1>SimpleCod</h1>
        <select
          aria-label="Cargar ejemplo"
          defaultValue=""
          onChange={(evento) => {
            const indice = Number(evento.target.value);
            if (!Number.isNaN(indice)) cargarEjemplo(indice);
            evento.target.value = "";
          }}
        >
          <option value="" disabled>
            Cargar ejemplo…
          </option>
          {EJEMPLOS.map((ejemplo, indice) => (
            <option key={ejemplo.nombre} value={indice}>
              {ejemplo.nombre}
            </option>
          ))}
        </select>
      </header>

      <Controles
        pasoActual={pasoActual}
        limitePaso={limitePaso}
        reproduciendo={reproduciendo}
        onEjecutar={handleEjecutar}
        onPasoSiguiente={pasoSiguiente}
        onPasoAnterior={pasoAnterior}
        onAlternarReproduccion={alternarReproduccion}
        onReiniciar={reiniciarPasos}
      />

      <PanelErrores resultado={resultado} />

      <div className="app__columnas">
        <div className="app__columna">
          <Editor value={codigo} onChange={setCodigo} resaltado={pasoVisible.lineaResaltada} />
          <PanelEntradas valor={entradasTexto} onChange={setEntradasTexto} />
        </div>

        <div className="app__columna">
          <h2>Variables</h2>
          <GridVariables variables={pasoVisible.variables} />
          <h2>Salida</h2>
          <PanelSalida salida={pasoVisible.salida} />
        </div>
      </div>

      <h2>Código generado</h2>
      <PanelTranspilado ast={ast} />
    </main>
  );
}
