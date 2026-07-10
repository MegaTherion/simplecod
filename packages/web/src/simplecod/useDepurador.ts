import { useCallback, useEffect, useRef, useState } from "react";
import { construirTraza, type ResultadoDepuracion } from "@simplecod/core";

const INTERVALO_REPRODUCCION_MS = 450;

export interface EstadoDepurador {
  resultado: ResultadoDepuracion | null;
  /** -1 = todavía no se ejecutó ningún paso. Si el resultado tiene error, el
   * índice `pasos.length` representa "parado en el error" (paso virtual final). */
  pasoActual: number;
  reproduciendo: boolean;
}

export function useDepurador() {
  const [estado, setEstado] = useState<EstadoDepurador>({
    resultado: null,
    pasoActual: -1,
    reproduciendo: false,
  });

  const ejecutar = useCallback((fuente: string, entradas: string[]) => {
    const resultado = construirTraza(fuente, { entradas });
    setEstado({ resultado, pasoActual: -1, reproduciendo: false });
  }, []);

  const limiteDePaso = useCallback((resultado: ResultadoDepuracion | null): number => {
    if (!resultado) return -1;
    return resultado.ok ? resultado.pasos.length - 1 : resultado.pasos.length;
  }, []);

  const pasoSiguiente = useCallback(() => {
    setEstado((anterior) => {
      const limite = limiteDePaso(anterior.resultado);
      if (anterior.pasoActual >= limite) return { ...anterior, reproduciendo: false };
      return { ...anterior, pasoActual: anterior.pasoActual + 1 };
    });
  }, [limiteDePaso]);

  const pasoAnterior = useCallback(() => {
    setEstado((anterior) => ({
      ...anterior,
      reproduciendo: false,
      pasoActual: Math.max(-1, anterior.pasoActual - 1),
    }));
  }, []);

  const irAlFinal = useCallback(() => {
    setEstado((anterior) => ({
      ...anterior,
      reproduciendo: false,
      pasoActual: limiteDePaso(anterior.resultado),
    }));
  }, [limiteDePaso]);

  const reiniciarPasos = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, pasoActual: -1, reproduciendo: false }));
  }, []);

  const alternarReproduccion = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, reproduciendo: !anterior.reproduciendo }));
  }, []);

  // referencias para que el intervalo siempre vea el estado más reciente sin reiniciarse
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => {
    if (!estado.reproduciendo) return;
    const id = setInterval(() => {
      const actual = estadoRef.current;
      const limite = limiteDePaso(actual.resultado);
      if (actual.pasoActual >= limite) {
        setEstado((anterior) => ({ ...anterior, reproduciendo: false }));
        return;
      }
      setEstado((anterior) => ({ ...anterior, pasoActual: anterior.pasoActual + 1 }));
    }, INTERVALO_REPRODUCCION_MS);
    return () => clearInterval(id);
  }, [estado.reproduciendo, limiteDePaso]);

  return {
    ...estado,
    limitePaso: limiteDePaso(estado.resultado),
    ejecutar,
    pasoSiguiente,
    pasoAnterior,
    irAlFinal,
    reiniciarPasos,
    alternarReproduccion,
  };
}
