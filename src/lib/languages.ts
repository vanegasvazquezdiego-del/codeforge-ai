import type { EngineId, LanguageId, EngineKind } from './types';

export interface LanguageDef {
  id: LanguageId;
  label: string;
  /** Dialecto de sintaxis en Monaco. */
  monaco: LanguageId;
  /** Clave de runtime por motor. `remote` = se ejecuta en un motor externo. */
  engines: Partial<Record<EngineId, string>>;
  /** `preview` = se renderiza en iframe; `sql` = se ejecuta sobre SQLite. */
  kind: EngineKind;
  ext: string;
  /** Si el lenguaje puede leer datos por stdin de forma estándar. */
  stdin: boolean;
  /** Si el motor exige una clase/método concreto para el punto de entrada. */
  entryHint?: string;
  /** Extensión obligatoria para el archivo de entrada (Java). */
  entryName?: string;
  /** Color de marca para el punto del selector (identidad, no UI). */
  tint: string;
  blurb: string;
}

export const LANGUAGES: LanguageDef[] = [
  {
    id: 'python',
    label: 'Python',
    monaco: 'python',
    engines: { judge0: '109', wandbox: 'cpython-3.13.8', piston: 'python' },
    kind: 'remote',
    ext: 'py',
    stdin: true,
    tint: '#ffd343',
    blurb: 'Lectura rapida, enorme biblioteca estandar.',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    engines: { judge0: '97', wandbox: 'nodejs-20.17.0', piston: 'javascript' },
    kind: 'remote',
    ext: 'js',
    stdin: true,
    tint: '#f7df1e',
    blurb: 'El lenguaje de la web y de casi todo lo demas.',
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    monaco: 'typescript',
    engines: { judge0: '101', wandbox: 'typescript-5.6.2', piston: 'typescript' },
    kind: 'remote',
    ext: 'ts',
    stdin: true,
    tint: '#3178c6',
    blurb: 'JavaScript con tipos estaticos.',
  },
  {
    id: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    engines: { judge0: '105', wandbox: 'gcc-13.2.0', piston: 'c++' },
    kind: 'remote',
    ext: 'cpp',
    stdin: true,
    entryHint: 'int main()',
    tint: '#00599c',
    blurb: 'Rendimiento y control de memoria.',
  },
  {
    id: 'java',
    label: 'Java',
    monaco: 'java',
    engines: { judge0: '91', piston: 'java' },
    kind: 'remote',
    ext: 'java',
    stdin: true,
    entryHint: 'public static void main(String[] args)',
    entryName: 'Main.java',
    tint: '#f89820',
    blurb: 'Tipado estatico y orientacion a objetos.',
  },
  {
    id: 'rust',
    label: 'Rust',
    monaco: 'rust',
    engines: { judge0: '108', wandbox: 'rust-1.82.0', piston: 'rust' },
    kind: 'remote',
    ext: 'rs',
    stdin: true,
    tint: '#dea584',
    blurb: 'Sin recolector de basura y sin errores de memoria.',
  },
  {
    id: 'go',
    label: 'Go',
    monaco: 'go',
    engines: { judge0: '107', wandbox: 'go-1.23.2', piston: 'go' },
    kind: 'remote',
    ext: 'go',
    stdin: true,
    tint: '#00add8',
    blurb: 'Concurrencia ligera y compilacion instantanea.',
  },
  {
    id: 'html',
    label: 'HTML',
    monaco: 'html',
    engines: {},
    kind: 'preview',
    ext: 'html',
    stdin: false,
    tint: '#e34c26',
    blurb: 'Estructura semantica. Se renderiza en vivo.',
  },
  {
    id: 'css',
    label: 'CSS',
    monaco: 'css',
    engines: {},
    kind: 'preview',
    ext: 'css',
    stdin: false,
    tint: '#1572b6',
    blurb: 'Layout, cascada y variables. Se renderiza en vivo.',
  },
  {
    id: 'sql',
    label: 'SQL',
    monaco: 'sql',
    // Se ejecuta sobre SQLite en memoria: el runtime real es Python.
    engines: { judge0: '109', wandbox: 'cpython-3.13.8', piston: 'python' },
    kind: 'sql',
    ext: 'sql',
    stdin: false,
    tint: '#e38c00',
    blurb: 'Consultas sobre una base SQLite en memoria.',
  },
];

const BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));

export function getLanguage(id: LanguageId): LanguageDef {
  return BY_ID.get(id) ?? LANGUAGES[0];
}

export function isLanguageId(value: string): value is LanguageId {
  return BY_ID.has(value as LanguageId);
}

/* -------------------------------------------------------------------------
   Plantillas iniciales: son código real y ejecutable, no texto de relleno.
   ------------------------------------------------------------------------- */

export const STARTERS: Record<LanguageId, string> = {
  python: `# CodeForge — Python 3
# Lee datos por stdin: linea = input().strip()
import sys


def main() -> None:
    lineas = [l.strip() for l in sys.stdin if l.strip()]
    if not lineas:
        print("Hola, CodeForge!")
        return

    numeros = [int(x) for x in lineas]
    print(f"n={len(numeros)} suma={sum(numeros)} maximo={max(numeros)}")


if __name__ == "__main__":
    main()
`,
  javascript: `// CodeForge — JavaScript (Node 18)
const fs = require('fs');

const entrada = fs.readFileSync(0, 'utf8').trim();
const lineas = entrada ? entrada.split(/\\r?\\n/).map((l) => l.trim()) : [];

if (lineas.length === 0) {
  console.log('Hola, CodeForge!');
} else {
  const numeros = lineas.map(Number);
  const suma = numeros.reduce((a, b) => a + b, 0);
  console.log(\`n=\${numeros.length} suma=\${suma} maximo=\${Math.max(...numeros)}\`);
}
`,
  typescript: `// CodeForge — TypeScript 5
const nums: number[] = (process.argv[2] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(Number)
  .filter((n) => Number.isFinite(n));

const suma: number = nums.reduce((a, b) => a + b, 0);

if (nums.length === 0) {
  console.log('Hola, CodeForge!');
} else {
  console.log(\`n=\${nums.length} suma=\${suma} maximo=\${Math.max(...nums)}\`);
}
`,
  cpp: `// CodeForge — C++17
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <numeric>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::vector<long long> nums;
    long long x;
    while (std::cin >> x) nums.push_back(x);

    if (nums.empty()) {
        std::cout << "Hola, CodeForge!\\n";
        return 0;
    }

    long long suma = std::accumulate(nums.begin(), nums.end(), 0LL);
    auto maximo = *std::max_element(nums.begin(), nums.end());

    std::cout << "n=" << nums.size()
              << " suma=" << suma
              << " maximo=" << maximo << '\\n';
    return 0;
}
`,
  java: `// CodeForge — Java 15 · el archivo de entrada DEBE llamarse Main.java
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        List<Long> nums = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null) {
            line = line.trim();
            if (!line.isEmpty()) nums.add(Long.parseLong(line));
        }

        if (nums.isEmpty()) {
            System.out.println("Hola, CodeForge!");
            return;
        }

        long suma = 0;
        long maximo = Long.MIN_VALUE;
        for (long n : nums) {
            suma += n;
            maximo = Math.max(maximo, n);
        }
        System.out.println("n=" + nums.size() + " suma=" + suma + " maximo=" + maximo);
    }
}
`,
  rust: `// CodeForge — Rust 1.68
use std::io::{self, Read};

fn main() {
    let mut entrada = String::new();
    if io::stdin().read_to_string(&mut entrada).is_err() {
        eprintln!("No se pudo leer stdin");
        std::process::exit(1);
    }

    let nums: Vec<i64> = entrada
        .split_whitespace()
        .filter_map(|t| t.parse::<i64>().ok())
        .collect();

    if nums.is_empty() {
        println!("Hola, CodeForge!");
        return;
    }

    let suma: i64 = nums.iter().sum();
    let maximo = nums.iter().copied().max().unwrap_or(0);
    println!("n={} suma={} maximo={}", nums.len(), suma, maximo);
}
`,
  go: `// CodeForge — Go 1.16
package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
)

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	var nums []int64
	for scanner.Scan() {
		var n int64
		if _, err := fmt.Sscanf(scanner.Text(), "%d", &n); err == nil {
			nums = append(nums, n)
		}
	}

	if len(nums) == 0 {
		fmt.Println("Hola, CodeForge!")
		return
	}

	var suma int64
	maximo := nums[0]
	for _, n := range nums {
		suma += n
		if n > maximo {
			maximo = n
		}
	}
	fmt.Printf("n=%d suma=%d maximo=%d\\n", len(nums), suma, maximo)
}
`,
  html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <style>
      body {
        margin: 0;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        font: 16px/1.6 system-ui, sans-serif;
        background: #101318;
        color: #e9eef5;
      }
      .card {
        padding: 2rem 2.5rem;
        border: 1px solid #2a313c;
        border-radius: 1rem;
        background: #171c24;
      }
      h1 { margin: 0 0 .25rem; font-size: 1.6rem; }
      p { margin: 0; color: #9aa6b6; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Hola, CodeForge</h1>
      <p>Edita el HTML o el CSS y el preview se actualiza al instante.</p>
    </div>
  </body>
</html>
`,
  css: `/* CodeForge — CSS puro.
   Se renderiza sobre un documento de muestra, en vivo. */

:root {
  --brand: #4ade9b;
  --bg: #101318;
  --card: #171c24;
  --line: #2a313c;
  --ink: #e9eef5;
  --muted: #9aa6b6;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: var(--bg);
  color: var(--ink);
  font: 16px/1.6 system-ui, sans-serif;
}

.card {
  width: min(30rem, calc(100% - 3rem));
  padding: 2rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--card);
}

.card h1 {
  margin: 0 0 .5rem;
  font-size: 1.6rem;
  color: var(--brand);
}

.card p { margin: 0; color: var(--muted); }
`,
  sql: `-- CodeForge — SQL sobre una base SQLite en memoria.
-- Esquema disponible:
--   empleados(id, nombre, dept_id, salario, hired_at)
--   departamentos(id, nombre, presupuesto)
--   proyectos(id, nombre, dept_id, activo)
--   asignaciones(empleado_id, proyecto_id, horas)

-- Ejemplo:
SELECT d.nombre              AS departamento,
       COUNT(e.id)            AS personas,
       printf('%.2f', AVG(e.salario)) AS salario_medio
FROM departamentos d
LEFT JOIN empleados e ON e.dept_id = d.id
GROUP BY d.id
ORDER BY personas DESC;
`,
};

/** Esquema de la base SQLite en memoria usada por el modo SQL. */
export const SQLITE_SCHEMA = `
CREATE TABLE departamentos (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT NOT NULL,
  presupuesto INTEGER NOT NULL
);
CREATE TABLE empleados (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT NOT NULL,
  dept_id   INTEGER REFERENCES departamentos(id),
  salario   INTEGER NOT NULL,
  hired_at  TEXT NOT NULL
);
CREATE TABLE proyectos (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT NOT NULL,
  dept_id   INTEGER REFERENCES departamentos(id),
  activo    INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE asignaciones (
  empleado_id INTEGER REFERENCES empleados(id),
  proyecto_id INTEGER REFERENCES proyectos(id),
  horas       INTEGER NOT NULL
);
`;

export const SQLITE_SEED = `
INSERT INTO departamentos (id, nombre, presupuesto) VALUES
  (1, 'Ingenieria', 480000),
  (2, 'Producto',    260000),
  (3, 'Soporte',     150000),
  (4, 'Investigacion', 310000);

INSERT INTO empleados (id, nombre, dept_id, salario, hired_at) VALUES
  (1, 'Ana Reyes',    1, 72000, '2021-03-01'),
  (2, 'Luis Ortega',  1, 65000, '2022-07-15'),
  (3, 'Marta Gil',    2, 58000, '2020-11-30'),
  (4, 'Diego Paz',    2, 61000, '2023-01-09'),
  (5, 'Nora Salas',   3, 41000, '2019-05-20'),
  (6, 'Ivan Castro',  4, 84000, '2018-09-03'),
  (7, 'Ruth Molina',  4, 79000, '2024-02-12'),
  (8, 'Pablo Nieto',  1, 53000, '2025-06-01');

INSERT INTO proyectos (id, nombre, dept_id, activo) VALUES
  (1, 'Forge',      1, 1),
  (2, 'Pulso',      2, 1),
  (3, 'Legacy',     1, 0),
  (4, 'Auditoria',  3, 1);

INSERT INTO asignaciones (empleado_id, proyecto_id, horas) VALUES
  (1, 1, 12), (1, 2, 6), (2, 1, 20), (2, 3, 4),
  (3, 2, 15), (4, 2, 9), (4, 1, 8),
  (5, 4, 30), (6, 1, 24), (6, 3, 10), (7, 1, 18), (8, 1, 7);
`;