interface PanelSalidaProps {
  salida: string;
}

export function PanelSalida({ salida }: PanelSalidaProps) {
  return <pre className="panel-salida">{salida || "(sin salida todavía)"}</pre>;
}
