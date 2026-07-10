interface ControlesProps {
  pasoActual: number;
  limitePaso: number;
  reproduciendo: boolean;
  onEjecutar: () => void;
  onPasoSiguiente: () => void;
  onPasoAnterior: () => void;
  onAlternarReproduccion: () => void;
  onReiniciar: () => void;
}

export function Controles({
  pasoActual,
  limitePaso,
  reproduciendo,
  onEjecutar,
  onPasoSiguiente,
  onPasoAnterior,
  onAlternarReproduccion,
  onReiniciar,
}: ControlesProps) {
  const hayTraza = limitePaso >= 0;

  return (
    <div className="controles">
      <button type="button" onClick={onEjecutar}>
        Ejecutar
      </button>
      <button type="button" onClick={onPasoAnterior} disabled={!hayTraza || pasoActual <= -1}>
        ◀ Paso anterior
      </button>
      <button
        type="button"
        onClick={onPasoSiguiente}
        disabled={!hayTraza || pasoActual >= limitePaso}
      >
        Paso siguiente ▶
      </button>
      <button
        type="button"
        onClick={onAlternarReproduccion}
        disabled={!hayTraza || pasoActual >= limitePaso}
      >
        {reproduciendo ? "⏸ Pausa" : "⏵ Reproducir"}
      </button>
      <button type="button" onClick={onReiniciar} disabled={!hayTraza}>
        ⟲ Reiniciar
      </button>
      {hayTraza && (
        <span className="controles__contador">
          Paso {pasoActual + 1} / {limitePaso + 1}
        </span>
      )}
    </div>
  );
}
