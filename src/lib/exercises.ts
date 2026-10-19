import type { Exercise } from './types';
import { getLanguage } from './languages';

function ex(partial: Omit<Exercise, 'origin' | 'createdAt' | 'solvedAt'>): Exercise {
  return { ...partial, origin: 'seed', createdAt: Date.UTC(2026, 0, 1), solvedAt: null };
}

const t = (label: string, stdin: string, expected: string) => ({ id: `seed_${label}`, label, stdin, expected });

/* =========================================================================
   Banco inicial. Cada ejercicio tiene enunciado, arranque y casos de prueba
   cuya salida esperada se puede comprobar de verdad contra el motor.
   ========================================================================= */

export const SEED_EXERCISES: Exercise[] = [
  /* ---------------------------------------------------------------- Python */
  ex({
    id: 'py_01',
    title: 'Suma de digitos',
    languageId: 'python',
    level: 'Principiante',
    statement:
      'Lee un entero por linea de la entrada estandar y escribe la suma de sus digitos.\n\n- Si el numero es negativo, imprime el signo `negativo` en una linea propia antes de la suma.\n- Constraints: `1 <= n <= 10^18`.',
    concepts: ['entrada por stdin', 'división entera', 'bucle'],
    starter: `n = int(input())\n\n# TODO: si n es negativo, imprime "negativo"\n# TODO: calcula e imprime la suma de sus digitos\nprint("pon aqui tu resultado")\n`,
    hint: 'Convierte n a cadena y suma cada caracter convertido con int().',
    tests: [
      t('Una cifra', '7', '7'),
      t('Varias cifras', '1234', '10'),
      t('Negativo', '-508', 'negativo\n13'),
    ],
  }),
  ex({
    id: 'py_02',
    title: 'Frecuencias',
    languageId: 'python',
    level: 'Intermedio',
    statement:
      'Llega una palabra por linea (minusculas, sin acentos). Imprime cada palabra distinta con su cantidad de apariciones, una por linea, en **orden alfabetico ascendente** y separada por un espacio.\n\n- Si no hay entrada, no imprimas nada.',
    concepts: ['diccionarios', 'ordenamiento'],
    starter: `from collections import Counter\n\npalabras = [linea.strip() for linea in open(0) if linea.strip()]\ncontador = Counter(palabras)\n\n# TODO: imprime "palabra cantidad" en orden alfabetico\n`,
    hint: 'Counter ya te da el diccionario. Usa sorted() sobre las claves.',
    tests: [
      t('Repetidas', 'b\na\nb', 'a 2\nb 2'),
      t('Una sola', 'z', 'z 1'),
      t('Tres iguales', 'a\na\na', 'a 3'),
    ],
  }),
  ex({
    id: 'py_03',
    title: 'Ceros en binario',
    languageId: 'python',
    level: 'Intermedio',
    statement:
      'Lee un entero no negativo por linea y escribe cuantos ceros tiene su representacion **binaria sin ceros a la izquierda**.\n\n- El numero `0` se representa como `"0"`, asi que su respuesta es `0`.',
    concepts: ['bases numéricas', 'bit manipulation'],
    starter: `n = int(input())\n\n# TODO: imprime cuantos ceros tiene bin(n)[2:]\nprint("pon aqui tu resultado")\n`,
    hint: 'bin(n)[2:] te da la cadena binaria sin el prefijo 0b.',
    tests: [
      t('Cero', '0', '0'),
      t('Uno', '1', '0'),
      t('Veinte', '20', '10100'),
    ],
  }),

  /* ----------------------------------------------------------- JavaScript */
  ex({
    id: 'js_01',
    title: 'Fibonacci sin recursión',
    languageId: 'javascript',
    level: 'Principiante',
    statement:
      'Lee un entero `n` por linea e imprime el valor `n` de la sucesion de Fibonacci usando `F(0)=0` y `F(1)=1`.\n\n- Restriccion: `0 <= n <= 45` (por encima, `Number` pierde precision).',
    concepts: ['iteración', 'BigInt vs Number'],
    starter: `const fs = require('fs');\n\nconst entrada = fs.readFileSync(0, 'utf8').trim();\nconst n = entrada ? Number(entrada) : 0;\n\n// TODO: calcula Fibonacci(n) de forma iterativa\nconsole.log('pon aqui tu resultado');\n`,
    hint: 'Guarda los dos ultimos valores y desplazalos en cada vuelta.',
    tests: [
      t('n = 10', '10', '55'),
      t('n = 0', '0', '0'),
      t('n = 1', '1', '1'),
    ],
  }),
  ex({
    id: 'js_02',
    title: 'Anagramas',
    languageId: 'javascript',
    level: 'Intermedio',
    statement:
      'Cada linea trae dos palabras separadas por un espacio. Imprime `SI` si son anagramas (mismas letras, mismas cantidades) y `NO` en caso contrario.\n\n- Ignora mayusculas y minusculas.',
    concepts: ['Map/Set', 'normalización'],
    starter: `const fs = require('fs');\nconst lineas = fs.readFileSync(0, 'utf8').split(/\\r?\\n/).filter((l) => l.trim());\n\nfor (const linea of lineas) {\n  // TODO: imprime SI o NO para esta linea\n  console.log('pon aqui tu resultado');\n}\n`,
    hint: 'Ordena las letras de ambas palabras y comparalas.',
    tests: [
      t('roma / amor', 'roma amor', 'SI'),
      t('hola / olla', 'hola olla', 'NO'),
      t('abc / cba', 'abc cba', 'SI'),
    ],
  }),

  /* ------------------------------------------------------------ TypeScript */
  ex({
    id: 'ts_01',
    title: 'Title Case',
    languageId: 'typescript',
    level: 'Principiante',
    statement:
      'Lee una linea de texto e imprímela con cada palabra en mayuscula inicial y el resto en minuscula.\n\n- Conserva los espacios entre palabras.\n- Las palabras ya en mayuscula deben bajar a minuscula (`"HOLA MUNDO"` -> `"Hola Mundo"`).',
    concepts: ['tipos', 'transformacion de strings'],
    starter: `const linea: string = (process.argv[2] ?? '');\n\n// TODO: imprime la linea en title case\nconsole.log(linea);\n`,
    hint: 'split(" "), transforma cada parte con slice, y vuelve a unir.',
    tests: [t('Simple', 'hola mundo cruel', 'Hola Mundo Cruel'), t('Ya mayusculas', 'HOLA MUNDO', 'Hola Mundo')],
  }),

  /* ------------------------------------------------------------------ C++ */
  ex({
    id: 'cpp_01',
    title: 'Invertir una cadena',
    languageId: 'cpp',
    level: 'Principiante',
    statement:
      'Lee una linea de la entrada estandar e imprimala al reves. Si la linea esta vacia, imprime una linea en blanco.',
    concepts: ['std::string', 'índices'],
    starter: `#include <iostream>\n#include <string>\n#include <algorithm>\n\nint main() {\n    std::string s;\n    std::getline(std::cin, s);\n\n    // TODO: imprime s al reves\n    return 0;\n}\n`,
    hint: 'std::reverse y despues imprime, o recorre del final al principio.',
    tests: [t('hola', 'hola', 'aloh'), t('una letra', 'a', 'a'), t('codeforge', 'codeforge', 'egrofedoC')],
  }),
  ex({
    id: 'cpp_02',
    title: 'Primos hasta N',
    languageId: 'cpp',
    level: 'Intermedio',
    statement:
      'Lee un entero `n` e imprime todos los primos menores o iguales que `n`, separados por un espacio. Si no hay ninguno, imprime `0`.\n\n- Restriccion: `1 <= n <= 100000`.',
    concepts: ['criba de Eratóstenes', '√n'],
    starter: `#include <iostream>\n\nint main() {\n    int n = 0;\n    std::cin >> n;\n\n    // TODO: imprime los primos <= n separados por un espacio\n    return 0;\n}\n`,
    hint: 'Marca los multiplos de cada primo en un vector<bool> de tamano n+1.',
    tests: [t('20', '20', '2 3 5 7 11 13 17 19'), t('5', '5', '2 3 5'), t('1', '1', '0')],
  }),

  /* ----------------------------------------------------------------- Java */
  ex({
    id: 'java_01',
    title: 'Contar vocales',
    languageId: 'java',
    level: 'Principiante',
    statement:
      'Lee una linea de texto e imprime cuantas vocales (`a e i o u`, mayusculas o minusculas) contiene.',
    concepts: ['String', 'switch'],
    starter: `import java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        String linea = br.readLine();\n\n        // TODO: cuenta las vocales e imprime el total\n    }\n}\n`,
    hint: 'Recorre la cadena y compara en minuscula con toLowerCase().',
    tests: [t('hola', 'hola', '2'), t('sin vocales', 'xyz', '0'), t('todas', 'AEIOUaeiou', '10')],
  }),

  /* ----------------------------------------------------------------- Rust */
  ex({
    id: 'rs_01',
    title: 'Contar palabras',
    languageId: 'rust',
    level: 'Principiante',
    statement:
      'Lee un texto completo (puede ocupar varias lineas) e imprime cuantas palabras contiene. Las palabras son secuencias separadas por uno o mas espacios.',
    concepts: ['ownership', 'split_whitespace'],
    starter: `use std::io::{self, Read};\n\nfn main() {\n    let mut entrada = String::new();\n    io::stdin().read_to_string(&mut entrada).unwrap();\n\n    // TODO: cuenta las palabras e imprime el total\n}\n`,
    hint: 'split_whitespace() ya descarta los espacios repetidos.',
    tests: [
      t('Una palabra', 'una sola', '1'),
      t('Cuatro', 'a b c d', '4'),
      t('Espacios de sobra', '  muchos   espacios  aqui ', '3'),
    ],
  }),
  ex({
    id: 'rs_02',
    title: 'FizzBuzz',
    languageId: 'rust',
    level: 'Intermedio',
    statement:
      'Lee un entero `n` e imprime los casos del `1` al `n`, uno por linea: `Fizz` si es multiplo de 3, `Buzz` si es multiplo de 5, `FizzBuzz` si es multiplo de ambos, y el numero si no cumple ninguna.',
    concepts: ['módulos', 'rangos'],
    starter: `use std::io::{self, Read};\n\nfn main() {\n    let mut entrada = String::new();\n    io::stdin().read_to_string(&mut entrada).unwrap();\n    let n: i64 = entrada.trim().parse().unwrap_or(0);\n\n    // TODO: imprime la secuencia\n}\n`,
    hint: 'Empieza por el caso "ambos" (i % 15 == 0) para no duplicar trabajo.',
    tests: [t('n=9', '9', '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz'), t('n=15 (cola)', '15', 'FizzBuzz'), t('n=7', '7', '1\n2\nFizz\n4\nBuzz\nFizz\n7')],
  }),

  /* ------------------------------------------------------------------- Go */
  ex({
    id: 'go_01',
    title: 'Maximo y minimo',
    languageId: 'go',
    level: 'Principiante',
    statement:
      'Lee enteros, uno por linea, hasta el final de la entrada, e imprime `maximo minimo` separados por un espacio.\n\n- Si no hay ningun numero, imprime `vacio`.',
    concepts: ['slices', 'range'],
    starter: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\t// TODO: lee los numeros e imprime "maximo minimo"\n\tfmt.Println("pon aqui tu resultado")\n}\n`,
    hint: 'scanner.Scan() devuelve ok=false al llegar al final. Acumula en un []int64.',
    tests: [t('Tres numeros', '3\n9\n4', '9 3'), t('Uno solo', '5', '5 5'), t('Con negativos', '-2\n7\n0\n1', '7 -2')],
  }),
  ex({
    id: 'go_02',
    title: 'Parentesis balanceados',
    languageId: 'go',
    level: 'Intermedio',
    statement:
      'Lee una expresion por linea e imprime `SI` si los parentesis y corchetes estan balanceados y bien anidados, `NO` en caso contrario.\n\n- `(]` es `NO`.',
    concepts: ['stack como slice', 'bucle-range'],
    starter: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tfor scanner.Scan() {\n\t\t// TODO: imprime SI o NO\n\t\tfmt.Println("SI")\n\t}\n}\n`,
    hint: 'Usa una pila: abre con ( o [, y cierra exigiendo el mismo simbolo.',
    tests: [t('Anidado', '(())', 'SI'), t('Sin cerrar', '(()', 'NO'), t('Dos pares', '()()', 'SI')],
  }),

  /* ------------------------------------------------------------------ SQL */
  ex({
    id: 'sql_01',
    title: 'Por encima de la media',
    languageId: 'sql',
    level: 'Principiante',
    statement:
      'Devuelve los empleados que cobran mas que el salario medio de toda la empresa, ordenados de mayor a menor salario.\n\nProyecta `nombre` y `salario`.',
    concepts: ['JOIN', 'subconsulta escalar', 'ORDER BY'],
    starter: `-- Esquema: empleados(id, nombre, dept_id, salario, hired_at)\n--           departamentos(id, nombre, presupuesto)\n\nSELECT 'pon aqui tu consulta';\n`,
    hint: 'Usa una subconsulta escalar con AVG(salario) dentro del WHERE.',
    tests: [
      t('Todas las filas', '', 'nombre | salario\n------ | -------\nInvestigacion | 84000\nInvestigacion | 79000\nIngenieria | 72000'),
    ],
  }),
  ex({
    id: 'sql_02',
    title: 'Horas por proyecto',
    languageId: 'sql',
    level: 'Intermedio',
    statement:
      'Para cada proyecto suma las horas asignadas de su equipo e imprime `nombre` y el total como `horas`, de mayor a menor.\n\nEn caso de empate, ordena por nombre de proyecto ascendente.',
    concepts: ['GROUP BY', 'JOIN multiple', 'desempate explícito'],
    starter: `-- Esquema: proyectos(id, nombre, dept_id, activo)\n--           asignaciones(empleado_id, proyecto_id, horas)\n\nSELECT 'pon aqui tu consulta';\n`,
    hint: 'GROUP BY p.id con SUM(a.horas) y un segundo criterio en ORDER BY.',
    tests: [
      t(
        'Todas las filas',
        '',
        'nombre | horas\n------ | -----\nForge | 81\nAuditoria | 30\nPulso | 30\nLegacy | 14',
      ),
    ],
  }),

  /* ----------------------------------------------------------- HTML / CSS */
  ex({
    id: 'html_01',
    title: 'Tarjeta de perfil semantica',
    languageId: 'html',
    level: 'Principiante',
    statement:
      'Construye una tarjeta de perfil con `<article>`, un encabezado `<h2>` con el nombre, una imagen con `alt` descriptivo y una definicion de datos con `<dl>` que muestre rol y experiencia.\n\nEl estilo va en un `<style>` dentro del `<head>`. No uses `<div>` como sustituto de etiquetas semanticas.',
    concepts: ['semántica', 'atributos alt', 'dl/dt/dd'],
    starter: `<!doctype html>\n<html lang="es">\n  <head>\n    <meta charset="utf-8" />\n    <title>Perfil</title>\n    <style>\n      /* TODO: estilo minimo */\n    </style>\n  </head>\n  <body>\n    <!-- TODO: aqui va la tarjeta -->\n  </body>\n</html>\n`,
    hint: 'Una <dl> con pares <dt>etiqueta</dt> <dd>valor</dd>.',
    tests: [],
  }),
  ex({
    id: 'css_01',
    title: 'Rejilla responsive sin media queries',
    languageId: 'css',
    level: 'Intermedio',
    statement:
      'Convierte una lista de 8 bloques en una rejilla que se adapta sola al ancho disponible usando `repeat(auto-fit, minmax(...))`. Centra el contenedor y limita el ancho maximo a `70rem`.\n\nNo uses `@media`: el objetivo es que la rejilla decida sola.',
    concepts: ['CSS Grid', 'auto-fit', 'clamp()'],
    starter: `/* TODO: reescribe esto con auto-fit */\n.malla {\n  display: block;\n}\n.tarjeta {\n  padding: 1rem;\n  border: 1px solid currentColor;\n}\n`,
    hint: 'grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr))',
    tests: [],
  }),
];

/** Ejercicios que tienen motor de ejecución y por tanto se pueden validar. */
export function isRunnable(exercise: Pick<Exercise, 'languageId'>): boolean {
  return getLanguage(exercise.languageId).kind !== 'preview';
}

/** Detecta si un reto generado repetiría título y lenguaje ya presentes. */
export function isDuplicate(list: Exercise[], title: string, languageId: string): boolean {
  const needle = title.trim().toLowerCase();
  return list.some((e) => e.languageId === languageId && e.title.trim().toLowerCase() === needle);
}