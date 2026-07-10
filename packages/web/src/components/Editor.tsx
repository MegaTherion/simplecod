import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { EditorView } from "@codemirror/view";
import {
  despacharResaltado,
  extensionResaltado,
  type ResaltadoLinea,
} from "../simplecod/resaltado.js";

interface EditorProps {
  value: string;
  onChange?: (valor: string) => void;
  resaltado?: ResaltadoLinea;
  soloLectura?: boolean;
  altura?: string;
}

const SIN_RESALTADO: ResaltadoLinea = { linea: null, tipo: null };

export function Editor({
  value,
  onChange = () => {},
  resaltado = SIN_RESALTADO,
  soloLectura = false,
  altura = "50vh",
}: EditorProps) {
  const vistaRef = useRef<EditorView | null>(null);
  const extensiones = useMemo(() => [extensionResaltado()], []);

  useEffect(() => {
    if (vistaRef.current) despacharResaltado(vistaRef.current, resaltado);
  }, [resaltado]);

  return (
    <CodeMirror
      value={value}
      height={altura}
      editable={!soloLectura}
      onChange={onChange}
      extensions={extensiones}
      onCreateEditor={(vista) => {
        vistaRef.current = vista;
        despacharResaltado(vista, resaltado);
      }}
      className="app__editor"
    />
  );
}
