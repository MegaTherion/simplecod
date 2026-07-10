export interface Ejemplo {
  nombre: string;
  codigo: string;
  entradas: string;
}

export const EJEMPLOS: Ejemplo[] = [
  {
    nombre: "Patrón de asteriscos",
    entradas: "5",
    codigo: `Inicio
    Leer n
    Para i = 1 Hasta n Hacer
        Para j = 1 Hasta i Hacer
            r = j mod 2
            Si r == 0 Entonces
                Escribir "*"
            Sino
                Escribir "#"
            FinSi
        FinPara
        Escribir finl
    FinPara
Fin`,
  },
  {
    nombre: "¿Es primo?",
    entradas: "7",
    codigo: `Inicio
    Funcion esPrimo(num)
        Si num < 2 Entonces
            Retornar Falso
        FinSi
        Para i = 2 Hasta num - 1 Hacer
            Si num mod i == 0 Entonces
                Retornar Falso
            FinSi
        FinPara
        Retornar Verdadero
    FinFuncion

    Leer n
    Si esPrimo(n) Entonces
        Escribir n, " es primo", finl
    Sino
        Escribir n, " no es primo", finl
    FinSi
Fin`,
  },
  {
    nombre: "Promedio de notas",
    entradas: "8\n7.5\n9\n6\n10",
    codigo: `Inicio
    Dimension notas[5]
    suma = 0
    Para i = 0 Hasta 4 Hacer
        Leer notas[i]
        suma = suma + notas[i]
    FinPara
    promedio = suma / 5
    Escribir "Promedio: ", promedio, finl
Fin`,
  },
  {
    nombre: "Días de la semana",
    entradas: "",
    codigo: `Inicio
    dias = ["Lun", "Mar", "Mie", "Jue", "Vie"]
    Para i = 0 Hasta 4 Hacer
        Escribir dias[i], finl
    FinPara
Fin`,
  },
];
