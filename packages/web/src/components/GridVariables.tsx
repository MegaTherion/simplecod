import type { Valor } from "@simplecod/core";
import { formatearValor, tipoDeValor } from "../simplecod/formatearValor.js";

interface GridVariablesProps {
  variables: Record<string, Valor>;
}

export function GridVariables({ variables }: GridVariablesProps) {
  const entradas = Object.entries(variables);

  return (
    <table className="grid-variables">
      <thead>
        <tr>
          <th>Variable</th>
          <th>Valor</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
        {entradas.length === 0 ? (
          <tr>
            <td colSpan={3} className="grid-variables__vacio">
              (sin variables todavía)
            </td>
          </tr>
        ) : (
          entradas.map(([nombre, valor]) => (
            <tr key={nombre}>
              <td>{nombre}</td>
              <td>{formatearValor(valor)}</td>
              <td>{tipoDeValor(valor)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
