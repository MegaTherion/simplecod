/** Acumula líneas de código generado con manejo de indentación por niveles. */
export class Escritor {
  private readonly lineas: string[] = [];
  private nivel = 0;

  constructor(private readonly unidad: string = "  ") {}

  linea(texto = ""): void {
    this.lineas.push(texto === "" ? "" : this.unidad.repeat(this.nivel) + texto);
  }

  indentar(): void {
    this.nivel++;
  }

  desindentar(): void {
    this.nivel--;
  }

  toString(): string {
    return this.lineas.join("\n");
  }
}
