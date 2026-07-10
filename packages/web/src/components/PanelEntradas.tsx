interface PanelEntradasProps {
  valor: string;
  onChange: (valor: string) => void;
}

export function PanelEntradas({ valor, onChange }: PanelEntradasProps) {
  return (
    <div className="panel-entradas">
      <label htmlFor="entradas">Entradas para &quot;Leer&quot; (una por línea)</label>
      <textarea
        id="entradas"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        rows={4}
        placeholder={"5\n10\n..."}
      />
    </div>
  );
}
