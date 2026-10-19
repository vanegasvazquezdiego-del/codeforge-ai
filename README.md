# CodeForge AI

[![Deploy en GitHub Pages](https://github.com/vanegasvazquezdiego-del/codeforge-ai/actions/workflows/deploy.yml/badge.svg)](https://vanegasvazquezdiego-del.github.io/codeforge-ai/)

**🚀 Ábrelo ya:** <https://vanegasvazquezdiego-del.github.io/codeforge-ai/>

IDE de practica en el navegador para aprender lenguajes de programacion: editor Monaco,
ejecucion real en un contenedor aislado, catalogo de ejercicios que se validan de verdad y
un copiloto de IA que ya sabe que estas escribiendo.

**Todo ocurre en tu navegador.** No hay cuentas, ni backend, ni servidor de datos. El codigo
se compila en un motor publico de ejecucion (Judge0, Wandbox o tu propia instancia de Piston)
y las consultas de IA van directamente al proveedor que configures.

---

## 0. Abrirlo sin instalar nada

La aplicacion esta desplegada en GitHub Pages. Abre la URL de arriba y funciona: el editor,
la ejecucion de codigo y los ejercicios no necesitan nada de tu parte.

Lo unico que hay que configurar es el asistente de IA (seccion 4), porque cada persona tiene
su propia clave y, por diseño, esa clave **nunca** se guarda en el servidor: vive solo en tu
navegador. Puedes usar Gemini, OpenAI o un Ollama en tu equipo.

---

## 1. Requisitos

| | |
|---|---|
| Node.js | 20.19 o superior (probado con 24.19) |
| npm | 10 o superior |
| Navegador | Cualquier navegador moderno (Chrome, Edge, Firefox, Safari 17+) |
| Red | Necesaria solo para ejecutar codigo y para hablar con el modelo de IA |

Comprueba tu version:

```powershell
node -v
npm -v
```

## 2. Instalacion

```powershell
cd "C:\Users\vaneg\OneDrive\Documentos\Proyecto predeterminado\codeforge-ai"
npm install
```

## 3. Levantar la aplicacion

```powershell
npm run dev
```

Abre **http://localhost:5173**. Para usar otro puerto: `npm run dev -- --port 3000`.

Otros comandos:

```powershell
npm run build      # comprueba tipos (tsc --noEmit) y genera dist/
npm run preview    # sirve dist/ para revisar el build de produccion
npm run typecheck  # solo la comprobacion de tipos
```

## 4. Conectar el asistente de IA

Sin este paso la app funciona entera: editor, ejecucion, ejercicios y perfil. El copiloto es la
unica parte que necesita un modelo.

**Ajustes → Asistente IA** y elige proveedor:

### Opcion A — Ollama (gratis, local, sin clave)

```powershell
ollama serve
ollama pull qwen2.5-coder:7b
```

En la app: proveedor `Ollama`, modelo `qwen2.5-coder:7b`, URL base `http://localhost:11434`.
Pulsa **Probar conexion con el modelo**.

### Opcion B — Google Gemini

1. Crea una clave en <https://aistudio.google.com/apikey>.
2. Proveedor `Gemini`, pega la clave, modelo `gemini-3.8-flash`.
3. **Probar conexion con el modelo**.

### Opcion C — OpenAI o cualquier gateway compatible

Proveedor `OpenAI`, clave `sk-…`, y ajusta la **URL base** si usas otro servicio compatible
(Groq, OpenRouter, LM Studio, vLLM…). El cliente habla el endpoint `/chat/completions`
estandar.

### Sobre la seguridad de la clave

La clave se guarda **solo en este navegador**. Dos modos:

- **Recordar en este navegador** → `localStorage`. Se recordara al cerrar y abrir la app.
- **Solo esta sesion** → `sessionStorage`. Se borra al cerrar la pestana. Recomendado si
  compartes equipo.

El respaldo JSON que exportas desde el perfil **nunca** incluye la clave.

## 5. Motores de ejecucion

CodeForge habla con tres motores y **rota entre ellos automaticamente**. Si el primero se
satura o falla la red, cae al siguiente sin que te enteres.

| Motor | Cubre | Notas |
|---|---|---|
| **Judge0 CE** | Los 10 lenguajes con versiones recientes (Python 3.13, Node 20, C++ GCC 14, Java 17, Rust 1.85, Go 1.23, TypeScript 5.6) | Un solo archivo. Es el que se usa por defecto. |
| **Wandbox** | Los mismos salvo **Java** | A veces mas rapido. Un solo archivo. |
| **Piston** | Todos, **y varios archivos a la vez** | Desde 2026-02-15 la instancia publica exige lista blanca. Solo si configuras la tuya. |

Para comprobar cada uno por separado: **Ajustes → Motor de ejecucion → Probar**. El boton
ejecuta una prueba real de humo, no un ping.

Si necesitas trabajar con varios archivos en el mismo proyecto, levanta tu propia
instancia de [Piston](https://github.com/engineer-man/piston) y pega su URL en Ajustes.

## 6. Rutas clave para probar

| Ruta | Que compruebas |
|---|---|
| `#/editor` | Editor Monaco, ejecutar (`Ctrl/Cmd + Enter`), consola con stdout/stderr |
| `#/exercises` | Catalogo, filtros, `Cargar en el editor` y `Validar` caso a caso |
| `#/profile` | Estadisticas reales derivadas de tu actividad, exporte/importe de datos |
| `#/settings` | Temas, editor, proveedor de IA, motor de ejecucion |

Atajos: `1`-`4` cambian de vista, `Ctrl/Cmd + K` abre la paleta de comandos,
`Ctrl/Cmd + I` muestra u oculta el copiloto, `Ctrl/Cmd + B` abre el menu lateral.

## 7. Lenguajes y como se ejecutan

| Lenguaje | Como se ejecuta |
|---|---|
| Python, JavaScript, TypeScript, C++, Java, Rust, Go | Judge0 / Wandbox / Piston (contenedor efimero, ~5 s de CPU, 256 MB) |
| SQL | Se envia como un programa Python que ejecuta la consulta sobre **SQLite en memoria** con un esquema de ejemplo (departamentos, empleados, proyectos, asignaciones). El esquema, la semilla y tu consulta viajan en base64, asi que no hay escapados que romper nada. La salida lista cabeceras con ` | ` y filas con `-+-`. |
| HTML, CSS | No se ejecutan: se renderizan en un `iframe` con `sandbox` y sin `allow-same-origin`, de modo que no pueden tocar esta pagina. Los `.css` del proyecto se inyectan solos en el `<head>`. |

Archivos multiples: el explorador de la barra lateral funciona como en VS Code. Puedes crear
archivos y carpetas (tambien escribiendo una ruta como `src/utiles.py`, que crea las carpetas
intermedias), renombrar con F2, duplicar y borrar con clic derecho. El archivo marcado con
estrella es el de entrada y es el que se compila. Java exige que se llame `Main.java` en la
raiz; la app te lo dice si intentas otra cosa.

Judge0 y Wandbox solo aceptan **un** archivo. Los proyectos con varias piezas necesitan tu
propia instancia de Piston (Ajustes → Motor de ejecucion → URL base).

## 8. Atajos dentro del editor

| Atajo | Accion |
|---|---|
| `Ctrl/Cmd + Enter` | Ejecutar |
| `Ctrl/Cmd + I` | Mostrar u ocultar el copiloto |
| `Ctrl/Cmd + /` | Comentar linea |
| `Alt + ↑ / ↓` | Mover la linea |
| `F2` (en el explorador o en una pestana) | Renombrar archivo |
| `Enter` (en el explorador) | Abrir archivo |
| Clic derecho (en el explorador) | Renombrar, duplicar, marcar como entrada, copiar ruta, eliminar |

## 9. Estructura del proyecto

```
codeforge-ai/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ .env.example            # opcional: sobreescribe URLs por defecto
└─ src/
   ├─ main.tsx             # arranque, tema inicial, sincronizacion entre pestanas
   ├─ App.tsx              # shell, router por hash, paleta de comandos
   ├─ styles/index.css     # tokens OKLCH, 4 temas, animaciones, base
   ├─ lib/
   │  ├─ types.ts          # contratos del dominio
   │  ├─ languages.ts      # registro de lenguajes + plantillas + esquema SQLite
   │  ├─ engine.ts         # Judge0 / Wandbox / Piston, failover y errores tipados
   │  ├─ ai.ts             # adaptadores Gemini / OpenAI-compatible / Ollama
   │  ├─ ai-urls.ts        # endpoints por defecto del proveedor
   │  ├─ prompts.ts        # persona del copiloto y plantilla de ejercicios
   │  ├─ exercises.ts      # catalogo inicial (17 retos con casos reales)
   │  ├─ markdown.tsx      # renderer de Markdown seguro (sin HTML crudo)
   │  ├─ monaco.ts         # workers y 5 temas del editor
   │  ├─ stats.ts          # rachas y agregados
   │  ├─ storage.ts        # persistencia versionada, exporte e importacion
   │  ├─ sound.ts          # aviso sonoro de ejecucion
   │  ├─ useMediaQuery.ts  # copiloto docked en escritorio, overlay en movil
   │  └─ router.ts         # router por hash, sin dependencias
   ├─ store/               # Zustand: settings, workspace, assistant, exercises,
   │                       #            profile, activity, toasts
   └─ components/
      ├─ layout/Shell.tsx  # barra superior + menu lateral
      ├─ editor/           # CodeEditor, FileExplorer, FileTabs, LanguagePicker, PreviewPane
      ├─ console/          # RunConsole
      ├─ assistant/        # AssistantPanel, MessageItem, ExerciseGeneratorModal
      ├─ views/            # EditorView, ExercisesView, ProfileView, SettingsView
      └─ ui/               # Button, Form, Modal, Popover, Primitives, Toaster, Logo
```

## 10. Variables de entorno (opcional)

Ninguna es obligatoria. Si quieres cambiar una URL por defecto, copia `.env.example` a
`.env.local` y edita lo que necesites. **No pongas claves reales en un `.env`**: la app las
pide en Ajustes y las guarda solo en tu navegador.

## 11. Problemas frecuentes

**El editor no carga.** Monaco se empaqueta localmente; si sigue en blanco, revisa la
consola del navegador. Un proxy corporativo que bloquee `.ttf` puede affectar al icono del
editor, no al funcionamiento.

**El motor dice "ningún motor pudo ejecutar el programa".** Los tres motores son públicos y
se saturan. Vuelve a intentarlo en unos segundos; si persiste, cambia el motor preferido en
Ajustes o levanta tu propia instancia de Piston.

**El ejercicio falla todos los casos.** Revisa que el editor este en el mismo lenguaje del
reto (la app te avisa con una banda amarilla) y que la salida no tenga espacios extra al
final: la comparacion normaliza saltos de linea y espacios, pero no distingue mayusculas.

**El copiloto responde que no.** Revisa proveedor, URL base y nombre del modelo con el boton
**Probar conexion**. En Ollama, confirma que el modelo esta descargado.

**Quiero empezar de cero.** Perfil → Borrar todo. O solo el catalogo: Perfil → Reiniciar
catalogo.

## 12. Publicar tu propia version

El repositorio trae un workflow que compila y publica en GitHub Pages en cada `push` a
`main`. Para desplegarlo en tu cuenta:

1. Crea el repositorio y sube el codigo:

   ```powershell
   git init -b main
   git add .
   git commit -m "CodeForge AI"
   gh repo create codeforge-ai --public --source=. --remote=origin --push
   ```

2. Activa Pages desde la API (una sola vez):

   ```powershell
   gh api -X POST repos/TU_USUARIO/codeforge-ai/pages `
     -f "build_type=workflow" -f "source[branch]=main" -f "source[path]=/"
   ```

3. Cuando termine el workflow, tu URL sera `https://TU_USUARIO.github.io/codeforge-ai/`.

El `base` de Vite sale de `VITE_BASE_PATH`, que el workflow fija a `/<nombre-del-repo>/`.
Por eso la app usa rutas con hash (`#/editor`): funciona en cualquier subcarpeta sin reglas
de reescritura en el servidor.

Para desplegar en otro sitio (Vercel, Netlify, Cloudflare Pages) basta con
`npm run build` y publicar la carpeta `dist/`.

---

## 13. Licencia y creditos

- Editor: [Monaco](https://microsoft.github.io/monaco-editor/) (MIT).
- Ejecucion: [Judge0 CE](https://judge0.com), [Wandbox](https://wandbox.org) y
  [Piston](https://github.com/engineer-man/piston). Los tres son servicios gratuitos con
  limites de uso.
- Iconos: [Lucide](https://lucide.dev/) (ISC).
- Tipografias: Space Grotesk y JetBrains Mono (SIL Open Font License).