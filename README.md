# Lean A3 Problem Solver

Herramienta para la resolución estructurada de problemas con el método A3 y el ciclo PDCA (Plan, Do, Check, Act) .


**Documentación:** [Manual de uso](docs/Manual-de-uso.md) · [Especificación funcional](docs/Especificacion-funcional.md)

## Uso (sin instalar nada)

La aplicación es **un único archivo HTML**: `Lean-A3.html`.

1. Copia `Lean-A3.html` a tu PC o a una carpeta compartida.
2. Ábrelo con doble clic en **Google Chrome** o **Microsoft Edge**.
3. Pulsa **Guardar en un archivo** en la barra superior y elige dónde guardar el almacén (`almacen_A3.json`). A partir de ahí, cada cambio se guarda automáticamente en ese archivo.

No necesita internet, servidor ni permisos de instalación. La tipografía (Manrope) va incluida.

### Dónde se guardan los datos

- **Archivo de almacén (recomendado):** con Chrome o Edge, los A3 se guardan en el `.json` que elijas. Si lo pones en una carpeta compartida, todo el equipo puede trabajar sobre el mismo almacén. Al volver a abrir la app, basta con pulsar **Reconectar**.
- **Varias personas a la vez:** si otra persona ha guardado en el archivo, los cambios se fusionan A3 por A3, apartado por apartado y elemento por elemento (cada contramedida, medición o causa por separado). Solo se pregunta cuando dos personas han cambiado lo mismo, y la pregunta dice qué apartados. Nunca se escribe encima de lo que otra persona haya guardado mientras tanto, aunque se tarde en contestar. Los comentarios de revisión nunca se pierden. Al volver a la ventana se recogen los cambios de los demás, también en el A3 que tengas abierto.
- **Autoría:** la app pide tu nombre una vez y registra quién crea y modifica cada A3.
- **Firefox / Safari:** no permiten guardar en archivos desde una página. Los A3 se guardan solo en el navegador y la app recuerda descargar una copia periódicamente.

- **Copias de seguridad automáticas:** cada día se guarda una copia del almacén completo en el navegador de cada persona (las últimas 30), y opcionalmente también en una carpeta (por ejemplo, la compartida, en `copias_A3/`). Botón **Copias** para descargarlas o recuperar una.
- **Guardado verificado:** después de cada escritura se vuelve a leer el archivo para comprobar que ha quedado bien; si no, se avisa y se reintenta.
- **Archivo dañado o vacío:** no se sobrescribe ni se interpreta como «todo borrado». Se avisa y se ofrece recuperar una copia o guardar la versión del navegador. Si de golpe faltan 3 o más A3 que no estaban en la papelera, se pregunta antes de quitarlos.
- **Papelera:** un A3 eliminado se puede restaurar durante 30 días (está en el archivo compartido, así cualquiera del equipo puede recuperarlo).
- **Historial:** cada navegador guarda versiones anteriores de los A3 (botón «Historial» del editor) para deshacer cambios.
- **Versión antigua en solo lectura:** si el almacén lo ha guardado una versión más reciente de la app, esta copia pasa a solo lectura: no escribe en el archivo (para no borrar datos que no entiende) y avisa de que hay que usar la versión actual. Funciona a partir de la 1.8.0: conviene que todo el equipo actualice.
- **Datos validados:** al leer el archivo o el navegador, cada A3 se comprueba y se repara (campos que faltan o con tipo incorrecto) sin perder lo que no se reconoce. El archivo lleva un número de formato.
- **Abrir no modifica:** mirar un A3 no lo cambia ni marca a quien lo abre como autor. Las contramedidas se enlazan con su causa raíz por identificador: renombrar o reordenar causas no toca las acciones (el número «[#n]» se calcula al mostrarlo). Las contramedidas para causas sin acción se añaden con «Añadir las que faltan».
- **Opiniones y mejoras:** vista propia para los fallos, mejoras y dudas del equipo, con estados (Nueva, En estudio, Planificada, Hecha, Descartada), versión prevista, versión en que se hizo, respuesta del equipo, lista de lo hecho en cada versión y exportación a Excel.
- **Móvil:** navegación inferior (Almacén, Acciones, A3, Opiniones, Guía) y nada se sale de la pantalla.
- **Móvil (artefacto de Claude):** las descargas (copia del almacén, CSV de acciones, HTML imprimible) piden confirmación en el visor; si se rechaza, la copia no cuenta como hecha.
- **Fallo en pantalla:** si una pantalla falla, se muestra un aviso con opción de descargar una copia de los A3 y volver al almacén, en lugar de una página en blanco.

Además, siempre se mantiene una copia de trabajo en el navegador. **Exportar todo** e **Importar A3** siguen disponibles para enviar A3 a otras personas.

## Características principales
- **Flujo de 7 pasos**:
  1. Contexto y Antecedentes
  2. Situación Actual (herramienta 5W + 1H integrada)
  3. Condición Meta cuantificable
  4. Análisis de Causa Raíz (Árbol de 5 Por Qués y Diagrama de Ishikawa 6M; el diagrama se encuadra solo, con zoom, arrastre y botón «Ajustar»)
  5. Contramedidas (plan 5W2H vinculado a las causas raíz y matriz de priorización 2×2)
  6. Verificación de resultados (Antes, Meta y Después)
  7. Estandarización y Yokoten
- **Guía Sensei por paso**: preguntas clave, regla de oro y ejemplos de qué hacer y qué evitar, más un A3 de ejemplo completo cargable desde el almacén.
- **Revisión:** el autor solicita la revisión a un responsable, que deja comentarios por paso y aprueba o devuelve el A3. Historial de la revisión y aviso si el A3 cambia después de aprobarse. Quien tiene algo pendiente (A3 por revisar o devuelto con comentarios) ve un aviso destacado en todas las pantallas, un contador en la pestaña del navegador y, si lo activa con la campana, notificaciones de Windows. El archivo compartido se comprueba cada minuto. (La autoría se basa en el nombre que cada persona indica; no es una firma con contraseña.)
- **Bienvenida:** la primera vez, la app guía en tres pasos (nombre, almacén y primer A3).
- **Seguimiento de acciones:** vista con todas las contramedidas de todos los A3, filtros por estado, plazo y responsable, acciones vencidas resaltadas y exportación a Excel. Indicadores en el almacén y aviso a cada responsable de sus acciones vencidas.
- **Seguimiento del indicador (paso 6):** indicador con unidad, sentido de mejora, línea base y meta; registro de mediciones por fecha y gráfico de evolución frente a la meta, con estado (meta alcanzada / cuánto falta) y mejora frente a la base. Antes, Meta y Resultado se calculan solos y el gráfico sale en la lámina impresa.
- **Impresión DIN A3 apaisado** (420 × 297 mm) siempre en una sola hoja (se reduce si hace falta) y descarga de un HTML imprimible autónomo.
- **Autoguardado** un segundo después de cada cambio y al salir del editor (Ctrl+S guarda al momento).
- **Avance en dos fases**: primero los pasos rellenos (x/7); con todo relleno, «Falta autoevaluar» hasta confirmar los 18 criterios de rigor y después «Validado».
- **Modo oscuro / claro.**
- **Opiniones del equipo:** botón «Opinión» para avisar de fallos, proponer mejoras o plantear dudas; se guardan en el almacén compartido con su estado (nueva, vista, resuelta, descartada).
- **Glosario:** los términos Lean (Gemba, Poka-Yoke, Yokoten…) se explican al pasar el ratón y en la Guía Metodológica.
- **Teclado:** foco visible, ventanas que retienen el foco y se cierran con Escape, y enlace «Saltar al contenido».

## Desarrollo

Requisitos: [Node.js](https://nodejs.org/) 20.19 o superior (recomendado 22 LTS).

```bash
npm install
npm run dev     # servidor de desarrollo en http://localhost:3000
npm run build   # genera dist/Lean-A3.html (archivo único para distribuir)
npm run lint    # tipos TypeScript + reglas de React (oxlint), sin avisos permitidos
npm run format  # da formato al código (Prettier)
npm test        # compila y ejecuta todas las pruebas automáticas
npm run test:unit  # solo las pruebas rápidas de la lógica (sin navegador, < 1 s)
CPU_LENTA=4 node tests/run.mjs   # todas las pruebas con la CPU 4 veces más lenta
SOLO=matriz node tests/run.mjs   # solo los grupos cuyo nombre coincide
```

Organización del código: la lógica pura está en `src/utils/` (indicador, revisión, acciones, validación de datos, completitud, operaciones sobre A3, causas raíz, glosario) y `src/storage/` (archivo, fusión, diálogos de conflicto, copias, historial); los componentes de presentación en `src/components/` (con subcarpetas por pieza: `ishikawa/`, `print/`, `matrix/`, `editor/`, `dashboard/`) y los hooks de estado en `src/hooks/`. El almacén en archivo se sincroniza con `src/storage/almacen/AlmacenSync.ts`, un motor sin React (leer, fusionar, escribir sin pisar, solo lectura); `useAlmacenArchivo.ts` solo lo une a la interfaz y decide cuándo sincronizar. Sus piezas están en `src/storage/almacen/` (decisión de fusión `planMerge`, opiniones, recordatorio de copias, errores, vigilancia del archivo, base de la fusión); el editor delega el borrador y el autoguardado en `editor/useEditorDraft.ts` y App, en los hooks `useToasts`, `useUserIdentity`, `useOpenEditor` y `useProjectActions`. Los elementos visuales comunes (`Button`, `Badge`, `Modal`, `Segmented`, clases de campos) están en `src/components/ui/`; el diagrama de Ishikawa del editor y el de la lámina impresa comparten la misma geometría (`ishikawa/IshikawaLayout.tsx`).

Las pruebas (`tests/`) abren la app en el Chrome o Edge instalado (sin descargar navegador; ruta personalizable con la variable `CHROME_PATH`) y comprueban la fusión de cambios entre personas, el guardado en archivo, el autoguardado, la reconexión, el editor, los diagramas, el seguimiento de acciones, la revisión, las copias de seguridad y la recuperación de archivos dañados, el teclado, el rendimiento con 200 A3, la impresión en una hoja el contraste de colores en modo claro y oscuro, la matriz de priorización y el trabajo simultáneo (fusión por elementos, conflictos contestados tarde, solo lectura ante versiones nuevas, A3 dañados y pantalla de error). No usan esperas fijas: esperan a que la página se calme o a que se cumpla la condición. Las pruebas unitarias cubren la lógica sin abrir el navegador. GitHub Actions las ejecuta en cada envío (`.github/workflows/pruebas.yml`).

La versión visible en la app sale del campo `version` de `package.json`.
