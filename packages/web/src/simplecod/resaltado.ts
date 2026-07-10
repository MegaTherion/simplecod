import { StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

export interface ResaltadoLinea {
  /** Línea 1-indexada, igual que `linea` en los nodos del AST. `null` = sin resaltado. */
  linea: number | null;
  tipo: "ejecucion" | "error" | null;
}

const SIN_RESALTADO: ResaltadoLinea = { linea: null, tipo: null };

export const establecerResaltado = StateEffect.define<ResaltadoLinea>();

const decoracionEjecucion = Decoration.line({ class: "cm-linea-ejecucion" });
const decoracionError = Decoration.line({ class: "cm-linea-error" });

function construirDecoraciones(state: EditorState, resaltado: ResaltadoLinea): DecorationSet {
  if (resaltado.linea === null || resaltado.tipo === null) return Decoration.none;
  if (resaltado.linea < 1 || resaltado.linea > state.doc.lines) return Decoration.none;
  const linea = state.doc.line(resaltado.linea);
  const decoracion = resaltado.tipo === "ejecucion" ? decoracionEjecucion : decoracionError;
  return Decoration.set([decoracion.range(linea.from)]);
}

interface CampoResaltado {
  resaltado: ResaltadoLinea;
  decoraciones: DecorationSet;
}

const campoResaltado = StateField.define<CampoResaltado>({
  create() {
    return { resaltado: SIN_RESALTADO, decoraciones: Decoration.none };
  },
  update(valor, tr) {
    let resaltado = valor.resaltado;
    for (const efecto of tr.effects) {
      if (efecto.is(establecerResaltado)) resaltado = efecto.value;
    }
    if (resaltado === valor.resaltado && !tr.docChanged) return valor;
    return { resaltado, decoraciones: construirDecoraciones(tr.state, resaltado) };
  },
  provide: (campo) => EditorView.decorations.from(campo, (valor) => valor.decoraciones),
});

export function extensionResaltado(): Extension {
  return campoResaltado;
}

export function despacharResaltado(view: EditorView, resaltado: ResaltadoLinea): void {
  view.dispatch({ effects: establecerResaltado.of(resaltado) });
}
