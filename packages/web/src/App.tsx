import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";

const PROGRAMA_INICIAL = "";

export function App() {
  const [codigo, setCodigo] = useState(PROGRAMA_INICIAL);

  const ejecutar = () => {
    // Se conecta al intérprete en el Hito 6.
  };

  return (
    <main className="app">
      <header className="app__header">
        <h1>SimpleCod</h1>
        <button type="button" onClick={ejecutar}>
          Ejecutar
        </button>
      </header>
      <CodeMirror value={codigo} height="70vh" onChange={setCodigo} className="app__editor" />
    </main>
  );
}
