# Auditor de accesibilidad WCAG 2.2 AA - Qubika - v1.0 · 2026-09-25

Plugin de Figma con la identidad de Qubika: base blanco y negro, Be Vietnam Pro,
y los secundarios de la paleta usados **solo** para significar algo — nunca de
decoración. Azul `#2547E7` = orden de foco, turquesa `#35D2C0` = orden de lectura
y "pasa", rojo `#EF4E44` = "falla", amarillo `#FFB800` = "aviso".

Auditoría de accesibilidad que corre **solo sobre las capas visibles**, sugiere el token del design system que sí pasa, e infiere el orden de foco.

## Versión y trazabilidad

Un plugin importado a mano **no se actualiza solo**: cada quien corre la copia
que importó. El menú muestra la versión, la fecha y dónde chequear si hay una más
nueva, para que nadie esté depurando contra una versión vieja sin saberlo.

## Instalación

1. Descomprimí la carpeta en algún lugar estable (no en Descargas: Figma la lee cada vez que abre el plugin).
2. En Figma: **Menú → Plugins → Development → Import plugin from manifest…**
3. Elegí `manifest.json`.
4. Queda en **Plugins → Development → Q-px-accesibility-v1**.

Archivos: `manifest.json`, `code.js`, `ui.html`. Los `test-*.js` no se empaquetan, son para desarrollo.

## Las 7 funcionalidades

| | Qué hace | Criterios |
|---|---|---|
| **Color y contraste** | Cada texto contra su fondo real + matriz de paleta | 1.4.3, 1.4.11 |
| **Tipografía** | Inventario de todos los textos + escala en uso | 1.4.4, 1.4.12 |
| **Orden de foco y lectura** | Qué se recorre con Tab (azul) y qué narra el lector (turquesa) | 2.4.3, 1.3.2 |
| **Etiquetas ARIA** | Nombre, rol y estado; se anotan en canvas + hoja de spec | 4.1.2, 2.5.3 |
| **Auditoría completa** | Las 8 categorías, score, anotaciones y reporte HTML descargable | 8 categorías |
| **Criterios WCAG** | Los 50 criterios A/AA con traducción y buscador | referencia |

**WCAG 2.2 incluido.** 2.2 es la Recomendación del W3C desde octubre de 2023 y suma
6 criterios en A/AA sobre 2.1 (más 3 en AAA), y retira 4.1.1 Parsing. Es
retrocompatible: cumplir 2.2 AA implica cumplir 2.1 AA. La mayoría de las leyes
todavía apuntan a **2.1 AA** — la EAA europea vía EN 301 549 y la regla del DOJ
en EE.UU. — así que el plugin audita contra 2.1 AA y lista los de 2.2 marcados
como el paso siguiente, con filtro propio en la pantalla de criterios.

**Solo AA, sin selector de nivel.** AA es la línea base que exigen la EAA europea
y la ADA; ofrecer AAA como opción invitaba a auditar contra un objetivo que nadie
pidió. Los umbrales quedaron fijos: 4.5:1 texto normal, 3:1 texto grande y UI.

Cada pantalla cierra con un acordeón **cómo funciona**, plegado, al pie — no arriba,
para que no se interponga entre vos y el resultado. Se puede apagar en ⚙.

## Qué cuenta como "capa visible"

Una capa se audita solo si realmente pinta en el canvas:

- `visible !== false` — ojito apagado, **o** una boolean property que la oculta dentro de una instancia (Figma lo resuelve en `node.visible`, no hace falta código aparte)
- `opacity > 0`
- ningún ancestro oculto — la rama entera se poda

Las omitidas **se cuentan y se muestran** ("12 capas ocultas omitidas"), para poder distinguir entre "no encontró nada" y "no miró". Se puede desactivar en ⚙.

## Color y contraste

**Selección** — escucha `selectionchange`, así que el resultado aparece sin apretar nada. Texto suelto: par de colores, ratio, y el token más cercano del DS que pasa. Componente: todos los pares de texto visibles adentro.

**Cuentagotas** — el botón 💧 usa la EyeDropper API del navegador. Está disponible en Figma web sobre Chrome/Edge; en la app de escritorio puede no estarlo, y el panel lo dice en el header del bloque (`cuentagotas ✓` o `solo hex`). Cuando no está, quedan los dos campos de hex, que funcionan siempre.

**Matriz** — seleccionás las muestras de color en el canvas y **Tomar colores de la selección** las extrae (deduplicadas, usando el nombre del paint style cuando existe). Alternativa: **Cargar estilos locales**. La tabla se ve en el panel y **Dibujar matriz** la genera como frame real en el canvas, en el formato de referencia: fila por fondo, columna por color de texto, "Aa" donde pasa y celda tachada donde no.

## Cómo detecta los elementos interactivos

Esta era la razón por la que el orden de foco encontraba casi nada: antes la
detección miraba **solo el nombre de la capa**, y en un archivo real nadie llama
"button" a todas las capas. Ahora mira estructura, en este orden:

1. **Interacciones de prototipo** — un on-click conectado es prueba de intención.
2. **Variantes de estado** — un componente con hover/pressed/focus existe justamente porque es operable.
3. **Propiedades de instancia** — variantes con nombre de estado.
4. **Nombre de la capa** — la heurística vieja, sigue sirviendo.
5. **Forma** — contenedor con relleno, una sola etiqueta corta y proporciones de control; o cuadrado chico sin texto.

Cada elemento detectado dice **por qué** fue detectado, para que puedas juzgar
si el plugin acertó.

## Orden de foco y de lectura

**Orden de foco** (2.4.3) es lo que se recorre con Tab: solo controles.
**Orden de lectura** (1.3.2) es lo que narra un lector de pantalla: además títulos,
párrafos e imágenes. Son preguntas distintas y el panel las separa en dos pestañas.

El algoritmo, en orden de precedencia:

1. Solo interactivos **visibles**.
2. **Auto-layout manda**: si el contenedor tiene `layoutMode`, se respeta el orden de hijos en vez de re-ordenar por geometría, porque el auto-layout ya codifica la intención.
3. Fuera de auto-layout, **banda por filas**: elementos cuyo centro vertical cae dentro de ±12px son la misma fila y van izquierda→derecha. Ordenar por Y y después por X se rompe con cualquier cosa que esté lado a lado.
4. **El interactivo externo gana**: una card que es un link con un botón adentro es una parada, no dos.

El resultado es **arrastrable**: el algoritmo propone, el diseñador corrige, y recién ahí se dibuja.

Avisa cuando el orden inferido coincide con el orden de capas, porque en ese caso el DOM probablemente lo resuelva solo y anotarlo es ruido. Nunca sugiere `tabindex` positivo.

## ARIA

Sugiere nombre accesible, rol y estado, con dos reglas que evitan el ruido típico de los kits de anotación:

- Si ya hay texto visible, **no** sugiere `aria-label` — advierte sobre 2.5.3 (Label in Name).
- Si el rol sería `button`, `link` o `textbox`, lo suprime: con HTML nativo no hace falta.

Lo único que bloquea un handoff es un control sin nombre accesible, y eso se marca aparte.

## Tests

```bash
node test-context.js       # 85 · exenciones WCAG, contexto, criterios de sistema
node test-forms-layout.js  # 106 · espaciado, reflow, formularios, targets, foco, reporte
node test-e2e.js           # 101 · ui.html real + code.js real, con clics simulados
node test-ui-audit.js      # 12 · clases CSS huérfanas, emojis, contraste del propio panel
node test-detection.js     # 52 · detección estructural, contraste, tipografía, lectura
node test-integration.js   # 28 · protocolo de mensajes entre ui.html y code.js
node test-focus-aria.js    # 31 · catálogo WCAG, orden de foco, ARIA
node test-visibility.js    # 19 · poda de ocultas, fondos, sugerencia de color
node test.js               # 75 · suite original
```

## Cómo se comporta la selección

**Color y tipografía se analizan solos.** Al entrar a esas pantallas, y cada vez
que cambiás la selección, el plugin re-analiza sin que aprietes nada. Un frame
entero llena las dos pantallas de una sola pasada. El botón de abajo es para
forzar un refresco, no la única forma de ver algo.

**Cada artefacto va a su lugar.** Los overlays de orden de foco y de ARIA se
dibujan encima del frame que anotan; la matriz de color se parquea a la derecha
de todo lo que hay en la página. Antes todo caía en el origen 0,0 y se apilaba,
que es por qué parecía que un botón hacía lo de otro.

## Criterios WCAG: dos entradas al catálogo

Los principios POUR agrupan por teoría; un diseñador busca por lo que está
haciendo. Por eso hay dos ejes de filtro: **por principio** (Perceptible,
Operable, Comprensible, Robusto) y **por tema de diseño** (Color, Tipografía,
Navegación, Foco y teclado, Formularios, Imágenes, Interacción, Movimiento,
Estructura, Responsive). Los 56 criterios están etiquetados en al menos un tema.

Quince criterios traen un **ejemplo desplegable** con el "así no / así sí"
renderizado de verdad: el contraste flojo al lado del corregido, el botón sin
foco visible al lado del que lo tiene, el placeholder solo al lado del label.
Solo los que un diseñador puede resolver desde el archivo — inventar un ejemplo
para un criterio que es puro código sería ruido.

## Varias matrices a la vez

El nombre del frame era fijo, así que cada matriz nueva borraba la anterior y no
se podían comparar dos paletas. Ahora **cada paleta es su propia matriz**,
identificada por los colores que contiene:

- Generar de nuevo la **misma** paleta actualiza la matriz que ya está, en su
  posición — no duplica ni la mueve.
- Una paleta **distinta** se agrega al costado de la última, sin pisarla.
- Cada matriz lleva el nombre de su origen (el frame seleccionado, o "Estilos del
  archivo"), y se puede renombrar antes de pegarla.

## Matriz de contraste: tres estados, no dos

"Pasa / no pasa" escondía el caso más útil: un par que no sirve para un helper
de 13px pero sí para un título de 24px. Cada celda ahora dice para qué tamaño
sirve, y el panel y el frame dibujado usan **el mismo modelo**:

| Estado | Ratio | Qué significa |
|---|---|---|
| `Aa` grande + chica | ≥ 4.5:1 | Sirve para cualquier texto |
| solo `Aa` chica | ≥ 3:1 | Únicamente 18px+, o 14px en negrita |
| celda gris | < 3:1 | No usar para texto |

La muestra está **en el tamaño del que habla la celda**: si el par solo sirve
para texto grande, se ve la `Aa` grande y no la chica, porque la chica es
justamente la que no se puede usar. Los pares que fallan nunca se dibujan con
texto ilegible: muestran el número.

## Especificación ARIA para desarrollo

En el canvas cada control lleva **solo un tag numerado**. Todo el detalle vive
en una hoja pegada al costado derecho del frame, con una tarjeta por control:

- **Nombre accesible propuesto.** Si falta, el plugin propone la frase concreta
  a partir del nombre de la capa ("Cerrar", "Abrir el menú", "Ver el carrito").
  Decirle a un diseñador "falta aria-label" en rojo es un callejón sin salida:
  igual tiene que inventar el texto.
- **El código exacto** que hay que escribir, con `aria-hidden` en el ícono y
  `tabindex` cuando el componente es custom.
- **Qué tiene que hacer el dev**, en una frase.

Cierra con los recordatorios que aplican a toda la pantalla: el nombre describe
la acción y no la forma del ícono, y si hay texto visible el nombre accesible
tiene que empezar por ese mismo texto (2.5.3).

## Tipografía y layout: lo que pasa cuando el texto crece

Los tamaños mínimos son el piso. Lo que más rompe en producto real es lo que
pasa cuando el texto crece, y nada de eso se ve en el diseño estático.

- **1.4.12 Espaciado del texto.** La norma define cuatro overrides que el
  contenido tiene que aguantar sin perder nada: interlineado 1.5×, párrafo 2×,
  letra 0.12em, palabra 0.16em. El plugin simula cuánto crece el bloque y lo
  compara con el espacio que tiene. Alto fijo + interlineado corto es fallo;
  con alto automático es aviso.
- **1.4.10 Reflow y 1.4.4 Zoom.** Detecta anchos fijos que no pueden encoger
  —sin auto-layout, sin constraints izquierda-derecha— porque a 320px obligan a
  scroll horizontal. Y textos en contenedores sin lugar para duplicar su alto.
- **Longitud de línea.** Por encima de 80 caracteres cuesta encontrar dónde
  sigue la lectura al saltar de renglón.
- **Mayúsculas sostenidas.** Detecta tanto el contenido en mayúsculas como
  `textCase: UPPER`. La distinción importa: en CSS con `text-transform` el lector
  de pantalla no lo deletrea.
- **Texto justificado.** Único caso donde WCAG desaconseja explícitamente una
  alineación (técnica C19).
- **Placeholder usado como etiqueta.** Si no hay label visible cerca y el texto
  interno es gris flojo o se llama "placeholder", el campo queda sin nombre en
  cuanto alguien escribe.

Estos tres últimos van como **aviso, no como fallo**: no son criterios AA, y
confundirlos con un incumplimiento le quita fuerza a los que sí lo son.

## Formularios

Es donde más se rompe la accesibilidad en producto real, y donde el diseño
decide casi todo.

- **Etiqueta visible y cerca.** Busca el label adentro del campo o afuera —
  arriba a menos de 48px, o a la izquierda alineado. Si está a más de 24px avisa:
  con zoom o lupa los dos no entran en pantalla.
- **Token de `autocomplete` (1.3.5).** Infiere el campo del nombre de capa y de
  la etiqueta, y sugiere el token exacto: `email`, `tel`, `cc-number`,
  `postal-code`, `new-password`. La frase más larga gana, así "nueva contraseña"
  no se confunde con "contraseña".
- **Tipo de input e `inputmode`** para que el teclado móvil sea el correcto.
- **Requerido que no dependa solo del asterisco.** Un lector lo anuncia como
  "asterisco" o lo omite.
- **Mensaje de error pegado al campo**, a menos de 8px.

## Interacción

- **2.5.8 tiene una excepción que el plugin ignoraba**: un objetivo menor a 24px
  cumple si hay 24px de separación al vecino más cercano. Medir solo el tamaño
  reportaba como fallo cosas que la norma acepta. Ahora se mide la distancia y
  se distingue "cumple por excepción" (aviso, porque es frágil) de "no cumple".
- **Objetivos superpuestos.** En el área compartida no se sabe cuál se acciona.
  El anidamiento legítimo —un botón dentro de una card clickeable— no cuenta.
- **2.4.11 Apariencia del foco.** Que exista la variante no alcanza: se mide el
  grosor del anillo (mínimo 2px), su contraste contra el fondo (3:1) y contra el
  borde del estado normal. Un anillo del mismo color y grosor que el borde de
  siempre existe y no se percibe.

## Ruido que el reporte ya no genera

Tres cosas que ensuciaban el resultado y hacían perder confianza en el resto:

**2.5.5 es AAA.** El plugin apunta a AA, pero reportaba un hallazgo por cada
control entre 24 y 44px diciendo *"cumple AA pero no llega a los 44px
recomendados"*. En una pantalla real, cinco de nueve hallazgos moderados eran
eso: cosas que pasan. Ahora es **una sola nota agregada** que aclara que no es
un incumplimiento de AA. Por debajo de 24px sigue siendo un fallo por control.

**Mensajes en inglés.** Quedaban dieciséis del código original, mezclados con
los nuevos en español dentro del mismo reporte. Traducidos.

**Numeración desordenada.** Los números se asignaban por severidad WCAG pero el
reporte agrupa por impacto, así que el primer grupo arrancaba en 3 y el segundo
en 1. Ahora el impacto se calcula antes de numerar: los números siguen el mismo
orden en que se lee.

## Detección estructural, no por nombre

Buena parte de los chequeos dependía de cómo estuvieran nombradas las capas: un
campo se reconocía porque decía "input", un encabezado porque decía "H1". En un
archivo real, donde la mitad de las capas se llama "Frame 214", esas categorías
**no disparaban** — y el reporte salía siempre con los mismos hallazgos
genéricos, los únicos que no dependen del nombre.

La misma pantalla, medida con las dos convenciones:

| | Con nombres descriptivos | Con nombres genéricos |
|---|---|---|
| Antes | 15 hallazgos, 10 categorías | **10 hallazgos, 7 categorías** |
| Ahora | 16 hallazgos, 11 categorías | **14 hallazgos, 10 categorías** |

Lo que ahora se deduce de la forma:

- **Encabezados por escala tipográfica.** Un encabezado no se reconoce porque la
  capa diga "H1": se reconoce porque es notablemente más grande que el texto que
  lo rodea. El tamaño de cuerpo es el más frecuente entre los textos largos, y
  todo lo que lo supera en 15% y es corto es un candidato. Cuando la jerarquía se
  dedujo en vez de leerse, el hallazgo lo aclara.
- **Campos por silueta.** Caja con borde o fondo propio, alto de control, más
  ancha que alta, con un solo texto alineado a la izquierda. Un botón —etiqueta
  centrada, sin borde— no se confunde.
- **Barras flotantes por geometría.** Estar anclado arriba o abajo ocupando casi
  todo el ancho es una propiedad medible, no algo que tenga que decir el nombre.

El nombre sigue contando, pero como una señal más. Si el archivo declara `H1`,
se respeta lo que dice en vez de deducir.

## El inventario dice qué se miró de cada elemento

La pregunta "¿miraste cada elemento?" merece una respuesta verificable. La
cobertura ahora clasifica cada capa visible por lo que **es** —texto, imagen,
control, campo, ícono, contenedor, decorativo— y declara cuántas evaluaciones de
criterio se corrieron sobre ellos.

Lo importante es lo que **no** se pudo clasificar: se nombra, en vez de saltearlo
sin dejar rastro. Ahí es donde el reporte parecía arbitrario — miraba menos de lo
que aparentaba, y no lo decía.

## Elegir qué auditar

Correr todo siempre produce un choclo. Lo de **handoff** —nombres accesibles,
roles, estados— aparece en cualquier archivo, porque nadie lo anota en el diseño:
son hallazgos correctos que no se resuelven en Figma, y ahogan a los que sí.

Antes de auditar se eligen los grupos. Por defecto están todos; *Solo lo visual*
deja únicamente color, tipografía, tamaños y espaciado.

| Grupo | Qué trae |
|---|---|
| **Visual** | Color, tipografía, tamaños, espaciado, reflow |
| **Interacción** | Áreas de toque, separación, foco visible, foco tapado, arrastre |
| **Contenido y estructura** | Encabezados, texto de enlaces, alternativas, lenguaje sensorial |
| **Formularios** | Etiquetas, errores, autocompletado, autenticación |
| **Handoff a desarrollo** | Nombres accesibles, roles, estados, cobertura de estados |

## Nombres repetidos

Un lápiz en cada sección hace que la sugerencia sea "Editar" para todos, y un
lector de pantalla los lista juntos sin poder distinguirlos. Cuando dos o más
controles quedarían con el mismo nombre, se marca y se pide que digan **qué**:
"Editar perfil", "Editar notificaciones", no "Editar".

## Qué ARIA vale la pena anotar

Listar todos los controles producía un choclo donde la mitad de las entradas
decía "con `<button>` alcanza". Correcto e inútil: no hay nada que anotar ni que
implementar distinto.

El criterio es que una anotación **sirve cuando sin ella el control queda mal**.
Eso pasa en cinco casos y solo en cinco:

1. **Sin texto visible** → el lector dice "botón" y nada más
2. **Con estado** que el diseño muestra y el código tiene que sincronizar
3. **Sin equivalente nativo** → el rol se declara a mano
4. **Propiedades obligatorias** del patrón
5. **Región viva** → lo que cambia solo tiene que anunciarse

En una pantalla con doce botones con texto, un botón de ícono, un tab y un
toggle: **15 controles → 3 anotaciones**. Los otros doce se resumen en una línea
que dice que ya están resueltos.

Cada entrada dice **por qué** está ahí, y las más graves —las que no tienen
nombre— van primero.

## Textos alternativos

### Qué cuenta como imagen

Para WCAG, "imagen" es cualquier contenido no textual que comunique algo — no un
tipo de relleno. Detectar solo `fills` de tipo IMAGE dejaba afuera media pantalla.
Ahora se reconocen cuatro clases:

- **Imagen y video** — rellenos de imagen o video
- **Ilustración** — varios vectores agrupados sin texto, de tamaño de contenido.
  Un ícono chico no cuenta: lo cubre el chequeo de íconos.
- **Placeholder** — un marco cuyo nombre dice que ahí va una foto que todavía no
  está. El alt se documenta igual: llega antes que la imagen.

### El plugin no ve la imagen, y lo dice

Se probó conectar una API de visión para que describiera el contenido. Se quitó:
sumaba una clave, una dependencia de red y un permiso al manifest, para un
resultado que igual había que revisar a mano. El alt correcto no depende de qué
se ve sino de **qué aporta** la imagen en ese lugar — la misma foto lleva alt
distinto en un artículo que dentro de un botón, y eso solo lo sabe quien diseñó
la pantalla.

Así que queda el campo para escribirlo, con una sugerencia de arranque sacada del
contexto y el toggle de decorativa.

### La sugerencia sale del contexto

Viene **escrita en el campo**, no como placeholder, para editarla o aceptarla.

El contexto se busca por **cercanía física**: solo texto que solape en el eje
horizontal y esté a menos de ~120px. Antes se subía por los ancestros buscando el
texto más grande, y en una pantalla real eso agarraba el encabezado de otra
sección — a una ilustración de "Club arte" le proponía "Auditor de accesibilidad"
porque era el título más grande de la página.

### Cómo llega a desarrollo

Lo confirmado se guarda en la capa —`setPluginData` y el nombre— así viaja con el
archivo. Y *Pegar en Figma* deja **dos cosas**: una etiqueta con el `Alt= "…"`
sobre cada imagen, y el detalle al costado del frame.

La etiqueta es una píldora chica con cola, **apoyada sobre la imagen**: azul si
tiene texto, verde con `Alt= ""` si es decorativa, roja si falta escribirlo.
Estaba puesta 34px por encima del borde, y en una grilla caía sobre la imagen de
la fila anterior y se veía desfasada. Hay un test que verifica que la etiqueta
caiga dentro del alto de la imagen, y falla si alguien la vuelve a sacar afuera.

## El checklist manual va primero

Lo que hay que verificar a mano estaba al final del análisis, y al final del
documento nadie llega. Ahora abre la sección de cada pantalla, antes de los
hallazgos: es lo que el plugin **no** pudo revisar, y es lo que más se saltea.

## Filtros sobre el resultado

Con muchos hallazgos, poder mirar una categoría a la vez es la diferencia entre
revisar y abandonar. Aparecen cuando hay cuatro problemas distintos o más, con la
cuenta de cada categoría.

## Sugerencias desde la escala, no hex sueltos

Proponer un hex con el mismo tono es técnicamente correcto y **fuera del
sistema**, que es justo lo que un diseñador no puede usar. Ahora:

- La paleta del archivo —estilos de color **y variables**— se carga sola al
  arrancar. Antes había que ir a la pantalla de color y pedirla.
- Se identifica de qué token salió el color actual y se propone **otro escalón de
  la misma familia**: si el flojo es `blue/300`, la sugerencia es `blue/600`, no
  un verde que casualmente esté cerca en RGB.
- Si el color no está en el sistema, se dice: la sugerencia va con la aclaración
  de que conviene sumarla a la escala.

## Cuentagotas

La API de Figma **no permite muestrear un píxel del canvas** — no existe nada
parecido a un color picker. Y la `EyeDropper` del navegador, dentro del iframe
del plugin, solo alcanza al propio panel: por eso el botón no hacía nada útil.

Lo que sí funciona, y para este uso alcanza:

- **Modo cuentagotas.** Se activa el botón y la próxima capa que toques en el
  canvas da su color — el relleno, o el borde si no tiene relleno. Si la capa no
  tiene color sólido lo dice, en vez de fallar en silencio.
- **Resuelve la transparencia.** Un negro al 40% sobre blanco se *ve* gris, y es
  ese gris el que hay que evaluar. Devuelve el color compuesto, y aclara cuál era
  el crudo y con qué opacidad. Tomar el hex a secas daba el negro, que no es lo
  que nadie ve.
- **Grilla de colores del frame.** Todos los colores presentes en la selección,
  ordenados por cuántas veces se usan. Un toque los carga como texto; con Alt,
  como fondo. Es la otra mitad de "elegir cualquier color del frame", sin tener
  que buscar la capa.

Al escribir el test del cuentagotas apareció un bug que estaba desde antes:
`contrastPanel()` **nunca existió**, así que la comparación manual reventaba en
cuanto se cargaba un color. Ahora se arma con el mismo bloque que dibuja el
veredicto en el resto de la pantalla, y propone el tono más cercano que pasa.

## Localizar, en todos lados

Cada par de color, cada hallazgo, cada imagen y cada control con ARIA tiene su
botón. En una pantalla con treinta textos, una lista sin forma de saltar al
elemento no se puede recorrer.

## Longitud de línea: la que se lee, no la caja

Medía la **capacidad del contenedor**. Un título de ancho automático daba "192
caracteres por línea" teniendo ocho palabras en una sola línea — un hallazgo que
no le dice nada a nadie, y de los que hacían dudar del resto del reporte.

Ahora solo cuenta cuando el texto **realmente envuelve**: ancho fijo, dos líneas
o más, y el promedio real de caracteres por línea. Un texto de una sola línea no
tiene dónde perderse al saltar de renglón.

## Instancias: se audita lo visible

Verificado con un caso construido a propósito: un componente con texto negro y
una instancia que lo sobrescribe con gris flojo y oculta una capa. El plugin
reporta el **gris de la instancia**, no el negro del maestro, y no recorre la
capa oculta ni el contenido del componente original. Hay tres tests que lo fijan.

## "Recomendación", no "así pasaría"

El ejemplo del par corregido decía "Así pasaría", que sugiere que el plugin lo
cambia. No cambia nada: propone. Ahora dice **Recomendación**.

## Un problema es un problema, no veinticuatro

En una pantalla real —un dashboard con sidebar, una lista de 24 filas, tabs y
acordeones— la auditoría encontraba **116 hallazgos**. De esos, 56 eran el mismo
interlineado corto repetido en cada fila, y 24 el mismo par de colores. Eso no es
información: es la misma información muchas veces, y ahoga a los hallazgos únicos
que sí merecen atención.

Los hallazgos ahora se agrupan por lo que determina la **corrección**, no por el
nodo: mismo criterio, mismo tipo, y mismos valores concretos —el par de colores,
el tamaño de fuente, el motivo. Si dos hallazgos se arreglan con el mismo cambio,
son uno solo. En esa pantalla: **116 individuales → 9 problemas distintos**.

Cada grupo dice a cuántos elementos afecta y los lista, para poder ir a cada uno.
El diseñador arregla el componente una vez y se resuelven los 24.

Los contadores del score también cuentan problemas distintos, no repeticiones.

## El reporte dice qué falta y cuánto se miró

**Severidad por impacto real, no por nivel WCAG.** Un contraste de 4.4:1 y un
botón sin nombre son los dos "AA" y no se parecen en nada. Cuatro escalas:

| | Qué significa |
|---|---|
| **Bloquea la tarea** | Hay gente que directamente no puede completarla |
| **Serio** | Se puede, pero con esfuerzo desproporcionado o adivinando |
| **Moderado** | Molesta y cansa, sobre todo en uso prolongado |
| **Menor** | Mejora la experiencia, no impide nada |

En contraste, lo que decide es la **distancia al umbral**: 4.4 sobre 4.5 es
moderado, 1.5 sobre 4.5 es bloqueante.

**Cobertura.** "0 hallazgos" sobre 3 capas y sobre 300 no significan lo mismo.
El reporte dice cuántas capas se miraron, cuántas quedaron afuera por ocultas, y
qué porcentaje del estándar puede cubrir un análisis automático. Ningún plugin
llega al 100%, y decirlo evita que el reporte se lea como un certificado.

**Checklist de revisión manual.** Los criterios que no se pueden automatizar
dejan de ser una nota al pie y pasan a ser tareas con instrucción concreta de
cómo verificarlas. Y solo aparecen las que **aplican**: pedir revisar trampas de
foco en una pantalla sin modales es ruido. Se pueden ir marcando.

Las tres salidas —el panel, los dos frames de Figma y el HTML— traen lo mismo.

## El reporte en Figma: dos frames, sin auto-layout

Al auditar, el reporte **se pega solo** al costado del frame auditado, como dos
documentos:

- **[1] Resumen** — título, tablero de impacto en cuatro tarjetas, la grilla de
  las 20 categorías con las que pasan en verde, y la cobertura.
- **[2] Análisis completo** — cada hallazgo con su número, criterio en español,
  mensaje, el ejemplo de cómo se ve corregido, qué cambiar, y el checklist de
  revisión manual. Lo mismo que el HTML.

Los dos quedan **libres**, no bloqueados: son documentos al costado, no tapan
nada y se pueden mover.

### Estructura: auto-layout afuera, absoluto adentro

Un **auto-layout vertical** apila las secciones —portada, tablero, categorías,
cobertura, cada hallazgo, checklist— y cada sección se estira al ancho del
documento. Así se puede reordenar, ocultar o editar cualquier bloque en Figma sin
que el resto se corra.

Por **dentro**, cada sección posiciona su contenido de forma absoluta llevando un
cursor vertical y midiendo la altura real de cada texto. El anidamiento profundo
de auto-layout —que es donde la API falla en silencio— nunca aparece.

Al auditar se pegan **dos documentos, no tres**: la tarjeta oscura de resumen que
generaba el sistema anterior duplicaba el frame [1] y se quitó. Quedan los
marcadores numerados sobre el diseño y los dos documentos al costado.

### Por qué no usa auto-layout anidado

Esta parte se rompió tres veces armada con auto-layout anidado: frame diminuto,
frame desmedidamente ancho, columna infinita. La causa nunca fue una sola — son
varias reglas de orden de la API que **fallan en silencio**:

- `layoutAlign` antes de `appendChild` → se ignora
- `textAutoResize` después de `layoutAlign` → el `STRETCH` se rechaza
- `resize` después de `layoutMode` → el tamaño se descarta

Ninguna tira error, así que cada arreglo destapaba la siguiente. La cuarta
versión abandona el auto-layout: posiciona todo de forma **absoluta** llevando un
cursor vertical, y mide la altura real de cada texto después de fijarle el ancho.
Es más código, pero es determinista: lo que se calcula es lo que se ve.

### No confiar en que la API mida

`resize()` sobre un texto de alto automático puede **fijar** el alto en lo que se
le pase en vez de recalcularlo. El código le pasaba 10, así que el nodo quedaba
midiendo 10px y el cursor avanzaba 10 aunque la línea ocupara 40. Los bloques se
pisaban entre sí — el título de dos líneas encima de su propio subtítulo.

Ahora el documento **no depende de lo que reporte Figma**: estima el alto por su
cuenta —caracteres, ancho de columna, tamaño de fuente e interlineado declarado—
y usa el mayor entre esa estimación y lo que devuelve la API. Si Figma mide bien,
gana la medición; si devuelve algo raro, gana la estimación. En el peor caso
sobra aire; nunca se superpone.

### Las anotaciones van siempre al frente

El contenedor de anotaciones se crea una vez, y cualquier frame dibujado después
queda por encima: los marcadores terminaban tapados por el propio diseño que
estaban anotando. Ahora, cada vez que se dibuja algo, el contenedor se re-agrega
a la página —lo que lo lleva al frente— y dentro de él los overlays se re-agregan
sobre los documentos. Volver a pegarlos los vuelve a subir.

### Un valor inesperado no puede tumbar el documento

Un `NaN` en cualquier cálculo de alto se propaga hasta `resize()`, que lo
rechaza, y la excepción deja el documento a medias sin ninguna explicación —un
frame con el título y nada más.

Tres cambios lo evitan:

- **El ancho viaja explícito**, no se lee de vuelta del frame. Si Figma devuelve
  algo inesperado en `.width`, todo el cálculo se volvía `NaN`.
- **Guardas contra valores no finitos** en la estimación, el cursor y los dos
  `resize`. Figma rechaza alturas menores a 0.01.
- **Cada documento y cada sección se construyen aislados.** Si uno falla, el otro
  se pega igual y el error llega al panel con su mensaje real.

### El harness tenía dos agujeros

Los tests pasaban en verde mientras el reporte se veía mal, y la causa era que el
simulador de Figma era demasiado permisivo:

- **`createRectangle().resize()` era una función vacía.** Los rectángulos quedaban
  sin medidas, así que cualquier comparación geométrica daba `NaN` y las
  aserciones nunca fallaban.
- **No existía `insertChild`.** El `try/catch` del código lo tragaba, los fondos
  se quedaban arriba del texto en el simulador, y ningún test lo notaba.

Y un tercero, más sutil: el test de superposición leía la altura **del mismo nodo
que el código**, así que los dos se equivocaban juntos. Ahora el test calcula por
su cuenta cuánto ocupa cada texto y compara contra eso.

Con los tres arreglados hay verificaciones que sí sirven: que ningún texto se
pise con otro en su columna, que ningún **fondo quede dibujado encima del texto**
—que era el bug real: el fondo de las tarjetas se dibujaba dos veces y la segunda
copia tapaba los números— y que cada sección crezca con su contenido.

Se verificó reintroduciendo el bug a propósito: los tests fallan nombrando la
sección y el texto tapado.

## Auditoría por lotes

Seleccionás uno o varios frames y auditás. El lote se mantiene aunque cambies de
selección, para poder armar un reporte de varias pantallas.

**El panel dice siempre en cuál de los tres casos estás**, porque el batching
sin señales dejaba la sensación de estar trabado:

- Seleccionaste un frame que **no está** en el lote → dos botones: *Auditar solo
  este* (reemplaza el lote) o *Sumarlo a la auditoría*.
- Seleccionaste uno que **ya está** → *Actualizar este frame*.
- **Sin selección** → te dice que selecciones algo.

Y siempre está *Empezar una auditoría nueva*, ahora como botón de ancho completo
al pie del bloque, no como un link chiquito perdido en una barra.

Cada hallazgo de contraste muestra **el arreglo, no solo lo describe**: el par
actual y el corregido, reconstruidos con los colores reales y el tamaño de
fuente real, uno al lado del otro. Ver la corrección decide más rápido que leer
un hex.

## Tipografía y layout: lo que pasa cuando el texto crece

Los tamaños mínimos son el piso. Lo que más rompe en producto real es lo que
pasa cuando el texto crece, y nada de eso se ve en el diseño estático.

- **1.4.12 Espaciado del texto.** La norma define cuatro overrides que el
  contenido tiene que aguantar sin perder nada: interlineado 1.5×, párrafo 2×,
  letra 0.12em, palabra 0.16em. El plugin simula cuánto crece el bloque y lo
  compara con el espacio que tiene. Alto fijo + interlineado corto es fallo;
  con alto automático es aviso.
- **1.4.10 Reflow y 1.4.4 Zoom.** Detecta anchos fijos que no pueden encoger
  —sin auto-layout, sin constraints izquierda-derecha— porque a 320px obligan a
  scroll horizontal. Y textos en contenedores sin lugar para duplicar su alto.
- **Longitud de línea.** Por encima de 80 caracteres cuesta encontrar dónde
  sigue la lectura al saltar de renglón.
- **Mayúsculas sostenidas.** Detecta tanto el contenido en mayúsculas como
  `textCase: UPPER`. La distinción importa: en CSS con `text-transform` el lector
  de pantalla no lo deletrea.
- **Texto justificado.** Único caso donde WCAG desaconseja explícitamente una
  alineación (técnica C19).
- **Placeholder usado como etiqueta.** Si no hay label visible cerca y el texto
  interno es gris flojo o se llama "placeholder", el campo queda sin nombre en
  cuanto alguien escribe.

Estos tres últimos van como **aviso, no como fallo**: no son criterios AA, y
confundirlos con un incumplimiento le quita fuerza a los que sí lo son.

## Formularios

Es donde más se rompe la accesibilidad en producto real, y donde el diseño
decide casi todo.

- **Etiqueta visible y cerca.** Busca el label adentro del campo o afuera —
  arriba a menos de 48px, o a la izquierda alineado. Si está a más de 24px avisa:
  con zoom o lupa los dos no entran en pantalla.
- **Token de `autocomplete` (1.3.5).** Infiere el campo del nombre de capa y de
  la etiqueta, y sugiere el token exacto: `email`, `tel`, `cc-number`,
  `postal-code`, `new-password`. La frase más larga gana, así "nueva contraseña"
  no se confunde con "contraseña".
- **Tipo de input e `inputmode`** para que el teclado móvil sea el correcto.
- **Requerido que no dependa solo del asterisco.** Un lector lo anuncia como
  "asterisco" o lo omite.
- **Mensaje de error pegado al campo**, a menos de 8px.

## Interacción

- **2.5.8 tiene una excepción que el plugin ignoraba**: un objetivo menor a 24px
  cumple si hay 24px de separación al vecino más cercano. Medir solo el tamaño
  reportaba como fallo cosas que la norma acepta. Ahora se mide la distancia y
  se distingue "cumple por excepción" (aviso, porque es frágil) de "no cumple".
- **Objetivos superpuestos.** En el área compartida no se sabe cuál se acciona.
  El anidamiento legítimo —un botón dentro de una card clickeable— no cuenta.
- **2.4.11 Apariencia del foco.** Que exista la variante no alcanza: se mide el
  grosor del anillo (mínimo 2px), su contraste contra el fondo (3:1) y contra el
  borde del estado normal. Un anillo del mismo color y grosor que el borde de
  siempre existe y no se percibe.

## Ruido que el reporte ya no genera

Tres cosas que ensuciaban el resultado y hacían perder confianza en el resto:

**2.5.5 es AAA.** El plugin apunta a AA, pero reportaba un hallazgo por cada
control entre 24 y 44px diciendo *"cumple AA pero no llega a los 44px
recomendados"*. En una pantalla real, cinco de nueve hallazgos moderados eran
eso: cosas que pasan. Ahora es **una sola nota agregada** que aclara que no es
un incumplimiento de AA. Por debajo de 24px sigue siendo un fallo por control.

**Mensajes en inglés.** Quedaban dieciséis del código original, mezclados con
los nuevos en español dentro del mismo reporte. Traducidos.

**Numeración desordenada.** Los números se asignaban por severidad WCAG pero el
reporte agrupa por impacto, así que el primer grupo arrancaba en 3 y el segundo
en 1. Ahora el impacto se calcula antes de numerar: los números siguen el mismo
orden en que se lee.

## Detección estructural, no por nombre

Buena parte de los chequeos dependía de cómo estuvieran nombradas las capas: un
campo se reconocía porque decía "input", un encabezado porque decía "H1". En un
archivo real, donde la mitad de las capas se llama "Frame 214", esas categorías
**no disparaban** — y el reporte salía siempre con los mismos hallazgos
genéricos, los únicos que no dependen del nombre.

La misma pantalla, medida con las dos convenciones:

| | Con nombres descriptivos | Con nombres genéricos |
|---|---|---|
| Antes | 15 hallazgos, 10 categorías | **10 hallazgos, 7 categorías** |
| Ahora | 16 hallazgos, 11 categorías | **14 hallazgos, 10 categorías** |

Lo que ahora se deduce de la forma:

- **Encabezados por escala tipográfica.** Un encabezado no se reconoce porque la
  capa diga "H1": se reconoce porque es notablemente más grande que el texto que
  lo rodea. El tamaño de cuerpo es el más frecuente entre los textos largos, y
  todo lo que lo supera en 15% y es corto es un candidato. Cuando la jerarquía se
  dedujo en vez de leerse, el hallazgo lo aclara.
- **Campos por silueta.** Caja con borde o fondo propio, alto de control, más
  ancha que alta, con un solo texto alineado a la izquierda. Un botón —etiqueta
  centrada, sin borde— no se confunde.
- **Barras flotantes por geometría.** Estar anclado arriba o abajo ocupando casi
  todo el ancho es una propiedad medible, no algo que tenga que decir el nombre.

El nombre sigue contando, pero como una señal más. Si el archivo declara `H1`,
se respeta lo que dice en vez de deducir.

## El inventario dice qué se miró de cada elemento

La pregunta "¿miraste cada elemento?" merece una respuesta verificable. La
cobertura ahora clasifica cada capa visible por lo que **es** —texto, imagen,
control, campo, ícono, contenedor, decorativo— y declara cuántas evaluaciones de
criterio se corrieron sobre ellos.

Lo importante es lo que **no** se pudo clasificar: se nombra, en vez de saltearlo
sin dejar rastro. Ahí es donde el reporte parecía arbitrario — miraba menos de lo
que aparentaba, y no lo decía.

## Elegir qué auditar

Correr todo siempre produce un choclo. Lo de **handoff** —nombres accesibles,
roles, estados— aparece en cualquier archivo, porque nadie lo anota en el diseño:
son hallazgos correctos que no se resuelven en Figma, y ahogan a los que sí.

Antes de auditar se eligen los grupos. Por defecto están todos; *Solo lo visual*
deja únicamente color, tipografía, tamaños y espaciado.

| Grupo | Qué trae |
|---|---|
| **Visual** | Color, tipografía, tamaños, espaciado, reflow |
| **Interacción** | Áreas de toque, separación, foco visible, foco tapado, arrastre |
| **Contenido y estructura** | Encabezados, texto de enlaces, alternativas, lenguaje sensorial |
| **Formularios** | Etiquetas, errores, autocompletado, autenticación |
| **Handoff a desarrollo** | Nombres accesibles, roles, estados, cobertura de estados |

## Nombres repetidos

Un lápiz en cada sección hace que la sugerencia sea "Editar" para todos, y un
lector de pantalla los lista juntos sin poder distinguirlos. Cuando dos o más
controles quedarían con el mismo nombre, se marca y se pide que digan **qué**:
"Editar perfil", "Editar notificaciones", no "Editar".

## Qué ARIA vale la pena anotar

Listar todos los controles producía un choclo donde la mitad de las entradas
decía "con `<button>` alcanza". Correcto e inútil: no hay nada que anotar ni que
implementar distinto.

El criterio es que una anotación **sirve cuando sin ella el control queda mal**.
Eso pasa en cinco casos y solo en cinco:

1. **Sin texto visible** → el lector dice "botón" y nada más
2. **Con estado** que el diseño muestra y el código tiene que sincronizar
3. **Sin equivalente nativo** → el rol se declara a mano
4. **Propiedades obligatorias** del patrón
5. **Región viva** → lo que cambia solo tiene que anunciarse

En una pantalla con doce botones con texto, un botón de ícono, un tab y un
toggle: **15 controles → 3 anotaciones**. Los otros doce se resumen en una línea
que dice que ya están resueltos.

Cada entrada dice **por qué** está ahí, y las más graves —las que no tienen
nombre— van primero.

## Textos alternativos

El plugin encuentra las imágenes; el alt lo escribe una persona, porque depende
de qué aporta la imagen **en ese contexto**. La pantalla las junta todas, propone
un punto de partida según lo que rodea a cada una, y guarda lo escrito **en la
capa** —con `setPluginData` y en el nombre— así viaja con el archivo y se ve sin
el plugin abierto.

Una imagen dentro de un control se marca sola como decorativa: el nombre lo lleva
el control. Una con texto al lado que ya la describe, también. Y se puede
**pegar todo en Figma** como anotaciones al costado del frame, así llega a
desarrollo sin depender de que alguien abra el plugin.

Las decorativas se anotan con `alt=""` y la explicación de por qué: describirlas
sería ruido, y el lector las saltea, que es lo correcto.

## Piezas de anotación para handoff

Nueve bloques que se insertan en el canvas ya con los campos a completar:
etiqueta ARIA, orden de foco, región viva, texto alternativo, estados del
componente, interacción de teclado, movimiento y tiempo, errores y validación, y
nota libre.

Se insertan al costado de lo seleccionado y quedan **libres** para moverlas y
editarlas. Es para todo lo que el plugin no puede deducir: el orden real de
lectura de una tabla, qué anuncia un cambio dinámico, cómo se comporta un
componente al expandirse.

## El checklist manual va primero

Lo que hay que verificar a mano estaba al final del análisis, y al final del
documento nadie llega. Ahora abre la sección de cada pantalla, antes de los
hallazgos: es lo que el plugin **no** pudo revisar, y es lo que más se saltea.

## Filtros sobre el resultado

Con muchos hallazgos, poder mirar una categoría a la vez es la diferencia entre
revisar y abandonar. Aparecen cuando hay cuatro problemas distintos o más, con la
cuenta de cada categoría.

## Sugerencias desde la escala, no hex sueltos

Proponer un hex con el mismo tono es técnicamente correcto y **fuera del
sistema**, que es justo lo que un diseñador no puede usar. Ahora:

- La paleta del archivo —estilos de color **y variables**— se carga sola al
  arrancar. Antes había que ir a la pantalla de color y pedirla.
- Se identifica de qué token salió el color actual y se propone **otro escalón de
  la misma familia**: si el flojo es `blue/300`, la sugerencia es `blue/600`, no
  un verde que casualmente esté cerca en RGB.
- Si el color no está en el sistema, se dice: la sugerencia va con la aclaración
  de que conviene sumarla a la escala.

## Cuentagotas

La API de Figma **no permite muestrear un píxel del canvas** — no existe nada
parecido a un color picker. Y la `EyeDropper` del navegador, dentro del iframe
del plugin, solo alcanza al propio panel: por eso el botón no hacía nada útil.

Lo que sí funciona, y para este uso alcanza:

- **Modo cuentagotas.** Se activa el botón y la próxima capa que toques en el
  canvas da su color — el relleno, o el borde si no tiene relleno. Si la capa no
  tiene color sólido lo dice, en vez de fallar en silencio.
- **Resuelve la transparencia.** Un negro al 40% sobre blanco se *ve* gris, y es
  ese gris el que hay que evaluar. Devuelve el color compuesto, y aclara cuál era
  el crudo y con qué opacidad. Tomar el hex a secas daba el negro, que no es lo
  que nadie ve.
- **Grilla de colores del frame.** Todos los colores presentes en la selección,
  ordenados por cuántas veces se usan. Un toque los carga como texto; con Alt,
  como fondo. Es la otra mitad de "elegir cualquier color del frame", sin tener
  que buscar la capa.

Al escribir el test del cuentagotas apareció un bug que estaba desde antes:
`contrastPanel()` **nunca existió**, así que la comparación manual reventaba en
cuanto se cargaba un color. Ahora se arma con el mismo bloque que dibuja el
veredicto en el resto de la pantalla, y propone el tono más cercano que pasa.

## Localizar, en todos lados

Cada par de color, cada hallazgo, cada imagen y cada control con ARIA tiene su
botón. En una pantalla con treinta textos, una lista sin forma de saltar al
elemento no se puede recorrer.

## Longitud de línea: la que se lee, no la caja

Medía la **capacidad del contenedor**. Un título de ancho automático daba "192
caracteres por línea" teniendo ocho palabras en una sola línea — un hallazgo que
no le dice nada a nadie, y de los que hacían dudar del resto del reporte.

Ahora solo cuenta cuando el texto **realmente envuelve**: ancho fijo, dos líneas
o más, y el promedio real de caracteres por línea. Un texto de una sola línea no
tiene dónde perderse al saltar de renglón.

## Instancias: se audita lo visible

Verificado con un caso construido a propósito: un componente con texto negro y
una instancia que lo sobrescribe con gris flojo y oculta una capa. El plugin
reporta el **gris de la instancia**, no el negro del maestro, y no recorre la
capa oculta ni el contenido del componente original. Hay tres tests que lo fijan.

## "Recomendación", no "así pasaría"

El ejemplo del par corregido decía "Así pasaría", que sugiere que el plugin lo
cambia. No cambia nada: propone. Ahora dice **Recomendación**.

## Un problema es un problema, no veinticuatro

En una pantalla real —un dashboard con sidebar, una lista de 24 filas, tabs y
acordeones— la auditoría encontraba **116 hallazgos**. De esos, 56 eran el mismo
interlineado corto repetido en cada fila, y 24 el mismo par de colores. Eso no es
información: es la misma información muchas veces, y ahoga a los hallazgos únicos
que sí merecen atención.

Los hallazgos ahora se agrupan por lo que determina la **corrección**, no por el
nodo: mismo criterio, mismo tipo, y mismos valores concretos —el par de colores,
el tamaño de fuente, el motivo. Si dos hallazgos se arreglan con el mismo cambio,
son uno solo. En esa pantalla: **116 individuales → 9 problemas distintos**.

Cada grupo dice a cuántos elementos afecta y los lista, para poder ir a cada uno.
El diseñador arregla el componente una vez y se resuelven los 24.

Los contadores del score también cuentan problemas distintos, no repeticiones.

## El reporte dice qué falta y cuánto se miró

**Severidad por impacto real, no por nivel WCAG.** Un contraste de 4.4:1 y un
botón sin nombre son los dos "AA" y no se parecen en nada. Cuatro escalas:

| | Qué significa |
|---|---|
| **Bloquea la tarea** | Hay gente que directamente no puede completarla |
| **Serio** | Se puede, pero con esfuerzo desproporcionado o adivinando |
| **Moderado** | Molesta y cansa, sobre todo en uso prolongado |
| **Menor** | Mejora la experiencia, no impide nada |

En contraste, lo que decide es la **distancia al umbral**: 4.4 sobre 4.5 es
moderado, 1.5 sobre 4.5 es bloqueante.

**Cobertura.** "0 hallazgos" sobre 3 capas y sobre 300 no significan lo mismo.
El reporte dice cuántas capas se miraron, cuántas quedaron afuera por ocultas, y
qué porcentaje del estándar puede cubrir un análisis automático. Ningún plugin
llega al 100%, y decirlo evita que el reporte se lea como un certificado.

**Checklist de revisión manual.** Los criterios que no se pueden automatizar
dejan de ser una nota al pie y pasan a ser tareas con instrucción concreta de
cómo verificarlas. Y solo aparecen las que **aplican**: pedir revisar trampas de
foco en una pantalla sin modales es ruido. Se pueden ir marcando.

Las tres salidas —el panel, los dos frames de Figma y el HTML— traen lo mismo.

## Por qué el reporte no se pega en Figma

Existió y se quitó. El reporte como frame de Figma se rompió de tres formas
distintas —frame diminuto, frame desmedidamente ancho, columna infinita— y cada
arreglo destapaba otra regla de orden del auto-layout que falla en silencio.

El problema de fondo es que **no se puede verificar acá**: el harness simula la
API de Figma, no la renderiza. Cada versión se veía bien en el árbol de nodos y
mal en pantalla. Sin poder ver el resultado, el ciclo era arreglar a ciegas.

El reporte sale como **HTML autocontenido**, que sí se puede verificar: se abre
en cualquier navegador, se manda por mail y se imprime.

Lo que **sí** queda en el archivo de Figma es lo que se pudo verificar y funciona:

- Marcas numeradas sobre cada hallazgo, con el mismo número que el reporte
- Overlay de orden de foco y de lectura
- Etiquetas ARIA y su hoja de especificación
- Matriz de contraste de la paleta

## Auditoría por lotes (detalle anterior)

La auditoría **se acumula**: auditás un frame, seleccionás otro y apretás
*Sumar selección*. Cambiar de selección no borra lo anterior, y volver a auditar
un frame ya incluido lo actualiza en vez de duplicarlo. Hay dos salidas: *Descargar HTML*
saca un archivo autocontenido, y *Pegar en Figma* deja el mismo reporte como un
frame en el archivo, para cuando tiene que vivir donde vive el diseño.

## Qué dibuja el plugin, y por qué no te estorba

Todo lo que el plugin genera vive dentro de una sola capa de la página,
`WCAG Annotations`, colapsada en el panel de capas. Adentro hay dos clases de
artefacto y se comportan distinto a propósito:

**Overlays** — badges numerados, etiquetas ARIA, marcadores de la auditoría.
Van encima del diseño, así que se crean **bloqueados**: los clics pasan de largo
y seguís seleccionando tus capas normalmente. Sin eso, un overlay con cuarenta
badges convierte la pantalla en algo imposible de tocar. Se desbloquean desde
⚙ → *Bloquear las anotaciones* cuando necesitás moverlas o borrarlas.

**Documentos** — la matriz de contraste y la hoja de especificación ARIA. Se
parquean al costado de la página, no tapan nada, y quedan **libres** para que
los muevas donde quieras.

Los badges y sus conectores van agrupados en sub-frames (`Badges`, `Conectores`),
así el overlay se lee como una sola fila en el panel de capas en vez de cincuenta.

## El estándar es WCAG 2.2 nivel AA

2.2 es la versión vigente. Incluye entera la 2.1 y suma seis criterios en A/AA;
el único que se retira es 4.1.1, que ya no aplica. Total: **55 criterios**.

Muchas normativas todavía citan la 2.1 — cumplir 2.2 las cubre igual.

Los seis que suma, y qué hace el plugin con cada uno:

| Criterio | Qué revisa |
|---|---|
| **2.4.11** Foco no oscurecido (AA) | Detecta barras fijas arriba o abajo que pueden tapar el elemento enfocado al navegar con Tab |
| **2.5.7** Movimientos de arrastre (AA) | Sliders, carruseles, listas reordenables y mapas que no ofrecen una alternativa de un solo toque |
| **2.5.8** Tamaño del objetivo (AA) | 24px mínimo, con la excepción de espaciado |
| **3.2.6** Ayuda coherente (A) | Compara la posición relativa del acceso a ayuda entre pantallas |
| **3.3.7** Entrada redundante (A) | Tarea de revisión manual en formularios |
| **3.3.8** Autenticación accesible (AA) | CAPTCHA como fallo; campos de contraseña y de código que tienen que permitir pegar |

### Un error de numeración que corregí

Los chequeos del anillo de foco estaban etiquetados como **2.4.11**, pero en 2.2
ese número es "Foco no oscurecido", que es otra cosa. La apariencia del anillo la
pide **2.4.7** (visible, AA) y su refinamiento de grosor y contraste es **2.4.13**
(AAA). Reetiquetados, y 2.4.11 ahora tiene su propio chequeo.

## La auditoría se adapta a lo que seleccionás

Auditar una librería de componentes y auditar una pantalla son dos trabajos
distintos. El plugin detecta qué tiene delante y corre los criterios que
corresponden — correr los de librería sobre una pantalla produce ruido, no
información.

| Contexto | Cómo se detecta | Criterios que suma |
|---|---|---|
| **Librería** | 3+ component sets, o 1 set y 6+ componentes | Cobertura de estados (foco, inactivo) por control · escalones de la escala por debajo de 12px · exceso de familias tipográficas |
| **Pantalla** | Todo lo demás | Jerarquía de encabezados (H1 único, sin saltos de nivel) · texto de los links (2.4.4) |
| **Flujo** | Varios frames seleccionados | Coherencia entre pantallas: el mismo componente etiquetado distinto (3.2.4) |
| **Paleta** | 8+ muestras de color, poco texto | Deriva a la matriz de contraste, que es la herramienta correcta |

El score dice cuál se detectó, para que no haya que adivinar por qué no se
chequeó algo.

## El motor ARIA

El sistema anterior era "si el nombre contiene X, poné role=Y". Eso trata una
palabra suelta como si fuera evidencia de un patrón de interacción, y produce
roles inventados y nombres accesibles pegoteados.

Ahora la unidad es el **patrón**, no la palabra. El catálogo tiene 29 patrones
del WAI-ARIA Authoring Practices Guide, y cada uno declara:

- **rol** — o `null` cuando el HTML nativo lo resuelve, que es la mayoría
- **elemento nativo** que lo implementa sin ARIA
- **estados** que el JS tiene que sincronizar (`aria-checked`, `aria-expanded`…)
- **propiedades** obligatorias (`aria-controls`, `aria-modal`, `aria-valuemin`…)
- **de dónde sale el nombre accesible**
- **qué teclas** tiene que responder
- **padre e hijos obligatorios** — un `role="tab"` fuera de un `tablist` es un rol inválido
- **los errores típicos** de ese patrón, en palabras del diseñador

Patrones cubiertos: button, link, checkbox, radio, switch, tablist, tab,
tabpanel, disclosure, combobox, listbox, option, menu, menuitem, slider, dialog,
alertdialog, navigation, banner, contentinfo, main, search, alert, status,
progressbar, tooltip, image, icon, heading.

### Las cinco reglas

Sobre el catálogo corren las cinco reglas de "Using ARIA" del W3C, que son las
que deciden si conviene sugerir algo o callarse:

1. **Si hay HTML nativo, usalo.** Un `<button>` ya es `role="button"`, ya recibe
   foco y ya responde Enter y Espacio. Por eso la mayoría de los patrones tiene
   `role: null`: sugerir `role="checkbox"` sobre un `<input type="checkbox">` es
   redundante, y el ARIA redundante rompe más de lo que arregla.
2. **No cambies la semántica nativa.**
3. **Todo control ARIA tiene que funcionar con teclado.** Un `role` custom
   siempre viene con el aviso de `tabindex` y handlers.
4. **No escondas lo que puede recibir foco.**
5. **Todo control necesita nombre accesible.**

### Casos que el catálogo solo no cubría

Un caso de uso real —un catálogo de clases con favoritos y snackbar— destapó
seis huecos. Los seis salían mal y ahora tienen tratamiento propio:

**La card entera es UN control.** Una card con imagen, título y metadatos tiene
UN nombre que junta las partes: "Ir al video de Chair Yoga for Seniors, 45 Min,
Beginner". El motor la rechazaba por tener tres textos — correcto para un
contenedor genérico, equivocado para este patrón.

**Componentes repetidos van como plantilla.** Si la card es instancia de un
componente, el handoff describe el componente y no cada aparición: el nombre sale
como `[Class title], [duration], [level]`. Los placeholders salen del nombre de
la capa, o del contenedor cuando la capa se llama igual que su contenido.

**Instancias agrupadas.** Veinte clases no necesitan veinte specs idénticas.
Las instancias del mismo componente con el mismo patrón se agrupan en una entrada
con la lista de a cuáles aplica — que es lo que un diseñador hace a mano cuando
anota "11, 13, 15" con una sola nota.

**`aria-current` para el ítem activo.** Marcar la sección actual solo con color o
negrita no le llega a un lector de pantalla. Se detecta por variante seleccionada,
por ser el único con fondo propio, o por ser el único en negrita.

**Botones de dos estados.** En un favorito el nombre **no** cambia al accionarlo
—queda "Agregar a favoritos" siempre—; lo que cambia es `aria-pressed`. La
confirmación ("se quitó de favoritos") va en una región viva aparte, no en el
nombre. La precedencia importa: un ítem de navegación llamado "Favorites" es un
enlace, no un toggle.

**Regiones vivas con controles adentro.** Una snackbar tiene botones, pero sigue
siendo una región: se anuncia por su contenido, sin `aria-label`, y el contenedor
tiene que existir en el DOM antes de llenarse o el lector no detecta el cambio.

**Etiquetas vagas.** "UNDO" no dice sobre qué actúa. El texto visible puede
quedar corto; el nombre accesible se amplía, empezando por ese mismo texto (2.5.3).

### Reconocimiento y descartes

El match va de la frase más específica a la más general: `tab button` le gana a
`tab`, y `tabs container` también. Sin ese orden, un contenedor de pestañas se
volvía una pestaña.

Cuatro descartes evitan sugerir de más:

- **Ícono dentro de un control** → decorativo, `aria-hidden="true"`, sin excepción.
- **Contenedor genérico con dos o más controles** → agrupación; los que reciben
  foco son los de adentro. No aplica a patrones composite como `tablist`, que sí
  son un rol.
- **Ni patrón ni interacción** → no es un control.
- **Patrón decorativo por defecto** (ícono, imagen) sin evidencia fuerte. La
  heurística de forma no alcanza: es la evidencia más débil que hay y no puede
  pisar a un patrón que es decorativo por definición.

Lo descartado no desaparece: queda en una lista plegable con el motivo.

## Un solo motor para color y tamaño## Un solo motor para color y tamaño

Había dos lecturas del mismo texto — una miraba `fontWeight`, la otra
`fontName.style` — y ninguna manejaba nodos con tamaños mixtos: caían al default
de 16px. Un título con una palabra en otro tamaño se evaluaba como texto normal
y se le exigía 4.5:1 cuando le correspondía 3:1.

Ahora hay un solo `textMetrics()`. Con mezcla manda el tamaño **más chico** y la
negrita solo cuenta si es de punta a punta: el requisito lo fija la parte más
exigente. Un test verifica que los dos motores dan el mismo veredicto.

## Lo que la norma NO exige

Buena parte de los falsos positivos venían de auditar cosas que WCAG exceptúa
explícitamente. Reportarlas entrena a la gente a ignorar los hallazgos, que es
peor que no reportar nada.

- **Estados inactivos.** 1.4.3 y 1.4.11 no piden contraste a los componentes
  inactivos. Un disabled gris está gris a propósito. Se detecta por nombre de
  capa, por ancestro y por variante de instancia (`State=Disabled`).
- **Logotipos.** La norma los exceptúa: son identidad, no se les puede pedir que
  cambien de color.
- **Texto sobre imagen o degradado.** El contraste depende del píxel, así que
  dar un número es inventarlo. Sale como **revisión manual** con la instrucción
  de qué mirar, no como un fallo medido.

## Contraste no textual: superficie vs glifo

WCAG 1.4.11 pide 3:1 solo para lo que hace falta para **identificar** un
componente o entender su estado: el glifo de un ícono, el borde de un input, el
indicador de foco. No pide nada para superficies decorativas — la norma las
exceptúa explícitamente.

Confundir las dos cosas generaba falsos positivos molestos. Una capa llamada
"Icon container" con fondo celeste sobre blanco se reportaba como que fallaba
1.27:1, cuando ese celeste es el **fondo donde vive el ícono**, no el ícono. Lo
que tiene que contrastar es el glifo contra ese celeste.

Ahora el plugin clasifica antes de medir:

- **Glifo** — vector, o figura chica sin hijos pintados. Se mide contra su fondo.
- **Superficie** — contenedor con hijos que llevan el significado. Su relleno
  **no** se audita; se audita cada glifo de adentro contra ese relleno.
- **Borde** — trazo de un campo o botón. Se mide contra el fondo.

## Un número que sirve para las tres salidas

El canvas dibuja **un marcador por nodo**, no uno por hallazgo. Cuando el panel
numeraba los 24 hallazgos y la pantalla mostraba 15 círculos, los números dejaban
de servir para lo único que existen: ir de uno al otro. La numeración replica
ahora la misma deduplicación y el mismo orden de prioridad que usa el dibujado, y
todos los hallazgos de un mismo elemento comparten su número.

Cada hallazgo lleva un número asignado durante la auditoría, no durante el
dibujado. El círculo sobre el diseño, la tarjeta del panel y la fila del HTML
muestran **el mismo número**, así se puede ir de uno al otro. Antes se asignaba
al construir los marcadores, que carga fuentes y por lo tanto corre después de
que el resultado ya viajó al panel: el canvas decía "10" y el panel no tenía
forma de saber cuál era.

Cada hallazgo tiene además un botón **Localizar** que lo selecciona en el canvas.

Las vistas previas de hallazgos no textuales se dibujan como **forma**, no como
texto: pintar la palabra "Icon container" en el color del ícono hacía parecer
que el problema era de tipografía.

## Las tres reglas de orden del auto-layout

Los frames que el plugin genera se rompían de formas raras — a veces diminutos,
a veces desmedidamente anchos — siempre por lo mismo: la API de Figma tiene
reglas de orden que fallan **en silencio**. Ninguna tira error; simplemente se
ignora lo que pediste.

**1. `layoutAlign` después de `appendChild`.** Solo tiene efecto si el nodo ya
es hijo de un auto-layout. Setearlo antes no hace nada, y los hijos se quedan en
su ancho por defecto de 100px.

**2. `textAutoResize` antes de `layoutAlign`.** Un texto con `WIDTH_AND_HEIGHT`
(el default) abraza su contenido a lo ancho y **rechaza** `STRETCH`. La frase más
larga del reporte se estiraba a ~1300px y arrastraba el ancho del frame entero:
eso era el reporte "pegado rarísimo".

**3. `resize` antes de `layoutMode`.** Activar auto-layout pasa los dos ejes a
`AUTO`, descartando el tamaño previo. Hay que fijar el ancho primero y recuperar
`counterAxisSizingMode = 'FIXED'` después.

Los tres casos tienen test: el harness simula cada regla y falla si alguien
vuelve a invertir el orden. Se verificó reintroduciendo el bug a propósito.

## Bugs encontrados con el harness de DOM

**El dibujado se robaba la selección.** Tras dibujar, el plugin dejaba
seleccionado el overlay. Volver a apretar "Calcular" analizaba ese overlay en
lugar del frame del diseñador. Ahora solo hace scroll: la selección no se toca.

**Controles saltados en el orden de foco.** Un contenedor interactivo con más de
un texto se descartaba entero. Un botón que dice "Pagar $4.200" tiene dos textos
y sigue siendo una parada. Ahora manda la fuerza de la evidencia: con reacción de
prototipo o variantes de estado es una parada sí o sí, y además se sigue bajando
para encontrar controles anidados — una card clickeable con su propio botón son
dos paradas de Tab, no una.

**Badges flotando en el aire.** Nodos sin área o que no pintan nada recibían
número igual. Se filtran con `absoluteRenderBounds`, que Figma deja en `null`
justamente cuando el nodo no renderiza.

**Ocho clases de CSS perdidas.** Al rehacer la hoja de estilos desaparecieron
clases que el JS seguía usando, y nadie lo notó hasta verlo en pantalla. Hay un
test que ahora falla si vuelve a pasar.

## Bugs de dibujado que estaban rompiendo el canvas

**Auto-layout con sizing AUTO.** Al setear `layoutMode`, Figma pasa los dos sizing
modes a AUTO y el frame encoge sobre su contenido, ignorando el `resize()` previo.
Eso apretaba los números de los badges y colapsaba las celdas de la matriz. Ahora
se fijan a `FIXED` y se redimensiona **después**.

**Textos tragados por la heurística de forma.** Un contenedor detectado como
control cortaba el recorrido, así que los textos de adentro desaparecían del orden
de lectura. Ahora un contenedor con dos o más textos se trata como sección: se
anuncia y se sigue bajando.

**Todo en el origen.** Los artefactos caían en 0,0 y se apilaban. Los overlays van
sobre el frame que anotan; la matriz y la hoja de spec ARIA se parquean a la derecha.

## Limitaciones conocidas

- **La API de plugins no ve navegación ni código.** Los 50 criterios están catalogados, pero solo una parte es verificable desde un archivo estático. El filtro Automático / Manual / Código en la pantalla de criterios lo hace explícito.
- **Orden de los fills.** `topSolidFill` asume que Figma pinta el último elemento del array arriba. Verificalo una vez con un rectángulo de dos fills; si es al revés, se da vuelta el loop en esa función y en ningún otro lado.
- **Los badges en canvas** (orden de foco y matriz) están escritos contra la API pero no probados en Figma real. La rotación de `createLine()` es lo primero a mirar si algo sale torcido.
- **Blend modes** distintos de NORMAL no se resuelven en el cálculo de fondo; esos casos salen marcados como "valor aproximado".
