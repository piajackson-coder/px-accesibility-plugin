// Q-px-accesibility — auditor WCAG 2.2 AA para Figma
// Runs inside Figma's sandbox (no DOM, no network)

figma.showUI(__html__, { width: 580, height: 660, title: "Q-px-accesibility · WCAG 2.2 AA" });

// ─── Color Utilities ──────────────────────────────────────────────────────────

function toLinear(c) {
  var s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1, l2) {
  var lighter = Math.max(l1, l2);
  var darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexFromRGB(r, g, b) {
  return '#' + [r, g, b].map(function(v) {
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

// Blend fg over bg accounting for opacity (straight alpha compositing, 0-255 values)
function blendOver(fgR, fgG, fgB, alpha, bgR, bgG, bgB) {
  return {
    r: fgR * alpha + bgR * (1 - alpha),
    g: fgG * alpha + bgG * (1 - alpha),
    b: fgB * alpha + bgB * (1 - alpha)
  };
}

// ─── WCAG Criteria Catalogue ─────────────────────────────────────────────────
// WCAG 2.2 A/AA (50 criteria) plus the 6 new A/AA criteria of WCAG 2.2, which
// has been the W3C Recommendation since October 2023. 2.2 is backwards
// compatible: meeting 2.2 AA means meeting 2.1 AA.
//
// Why both are listed: 2.2 is the current standard, but most legislation still
// points at 2.1 AA (the EU EAA harmonised standard EN 301 549 and the US DOJ
// rule both name 2.1). Each criterion carries `since`, so the panel can show
// which ones are the extra mile.
// Every issue the plugin emits carries a `wcag` id that resolves here, so the
// panel, the canvas annotations and the PDF all speak the same language.
//
// Fields:
//   id     · official criterion number
//   level  · 'A' or 'AA'  (the plugin targets AA, which includes all of A)
//   en     · official English name — normative, never translated in reports
//   es     · Spanish name in common use. Note: W3C only has an *authorised*
//            Spanish translation of WCAG 2.0 (Fundación Sidar, 2009); for 2.1
//            translations are unofficial, so these follow the wording used by
//            Olga Carreras / Olga Revilla, the de-facto reference in Spanish.
//   plain  · plain-language explanation for the designer, in Spanish
//   scope  · how far this plugin can go on a static Figma file:
//              'auto'   → checked automatically
//              'manual' → the designer has to judge it; the plugin can prompt
//              'code'   → implementation-only, not evaluable in a design file
//   auto   · true when this plugin actually implements a check for it today

var WCAG = {
  // ── 1. Perceivable ──────────────────────────────────────────────────────────
  '1.1.1':  { level:'A',  en:'Non-text Content', es:'Contenido no textual', scope:'manual', auto:true,
              plain:'Toda imagen, ícono o gráfico necesita un texto alternativo. Si es decorativo, marcalo como tal para que el lector de pantalla lo saltee.' },
  '1.2.1':  { level:'A',  en:'Audio-only and Video-only (Prerecorded)', es:'Solo audio y solo vídeo (grabado)', scope:'code', auto:false,
              plain:'Un audio sin vídeo necesita transcripción; un vídeo sin audio, una descripción.' },
  '1.2.2':  { level:'A',  en:'Captions (Prerecorded)', es:'Subtítulos (grabados)', scope:'code', auto:false,
              plain:'Todo vídeo con sonido necesita subtítulos.' },
  '1.2.3':  { level:'A',  en:'Audio Description or Media Alternative (Prerecorded)', es:'Audiodescripción o alternativa (grabado)', scope:'code', auto:false,
              plain:'El vídeo necesita audiodescripción o una alternativa en texto.' },
  '1.2.4':  { level:'AA', en:'Captions (Live)', es:'Subtítulos (en directo)', scope:'code', auto:false,
              plain:'El contenido en vivo con audio necesita subtítulos en tiempo real.' },
  '1.2.5':  { level:'AA', en:'Audio Description (Prerecorded)', es:'Audiodescripción (grabado)', scope:'code', auto:false,
              plain:'El vídeo grabado necesita audiodescripción de lo que pasa en pantalla.' },
  '1.3.1':  { level:'A',  en:'Info and Relationships', es:'Información y relaciones', scope:'manual', auto:true,
              plain:'Lo que se entiende mirando (títulos, listas, tablas, agrupaciones) tiene que estar también en la estructura, no solo en el estilo visual.' },
  '1.3.2':  { level:'A',  en:'Meaningful Sequence', es:'Secuencia significativa', scope:'auto', auto:true,
              plain:'El orden en que se lee el contenido tiene que tener sentido, no depender solo de dónde está ubicado visualmente.' },
  '1.3.3':  { level:'A',  en:'Sensory Characteristics', es:'Características sensoriales', scope:'auto', auto:true,
              plain:'No des instrucciones que dependan solo de la forma, el tamaño o la posición: "hacé clic en el botón redondo de la derecha" no sirve.' },
  '1.3.4':  { level:'AA', en:'Orientation', es:'Orientación', scope:'manual', auto:false,
              plain:'La pantalla tiene que funcionar tanto en vertical como en horizontal.' },
  '1.3.5':  { level:'AA', en:'Identify Input Purpose', es:'Identificar el propósito de la entrada', scope:'manual', auto:false,
              plain:'Los campos que piden datos personales (nombre, mail, teléfono) tienen que declarar qué piden, para que el navegador pueda autocompletarlos.' },
  '1.4.1':  { level:'A',  en:'Use of Color', es:'Uso del color', scope:'manual', auto:false,
              plain:'El color no puede ser la única forma de transmitir algo. Un error en rojo también necesita ícono o texto.' },
  '1.4.2':  { level:'A',  en:'Audio Control', es:'Control del audio', scope:'code', auto:false,
              plain:'Si algo suena solo por más de 3 segundos, tiene que poder pausarse.' },
  '1.4.3':  { level:'AA', en:'Contrast (Minimum)', es:'Contraste (mínimo)', scope:'auto', auto:true,
              plain:'El texto necesita 4.5:1 contra su fondo. Si es de 18px o más (o 14px en negrita), alcanza con 3:1.' },
  '1.4.4':  { level:'AA', en:'Resize Text', es:'Cambio de tamaño del texto', scope:'auto', auto:true,
              plain:'Al ampliar el texto al 200% nada se puede cortar ni superponer. Ojo con los contenedores de alto fijo.' },
  '1.4.5':  { level:'AA', en:'Images of Text', es:'Imágenes de texto', scope:'auto', auto:false,
              plain:'Usá texto real, no imágenes de texto, salvo que sea un logo.' },
  '1.4.10': { level:'AA', en:'Reflow', es:'Reajuste (reflow)', scope:'manual', auto:false,
              plain:'A 320px de ancho el contenido se tiene que reacomodar sin scroll horizontal.' },
  '1.4.11': { level:'AA', en:'Non-text Contrast', es:'Contraste no textual', scope:'auto', auto:true,
              plain:'Bordes de inputs, íconos, y el indicador de foco necesitan 3:1 contra lo que los rodea.' },
  '1.4.12': { level:'AA', en:'Text Spacing', es:'Espaciado del texto', scope:'auto', auto:true,
              plain:'Si el usuario agranda interlineado y espaciado, nada se puede romper. Interlineado mínimo 1.5.' },
  '1.4.13': { level:'AA', en:'Content on Hover or Focus', es:'Contenido al pasar el cursor o al enfocar', scope:'manual', auto:false,
              plain:'Los tooltips tienen que poder cerrarse con Escape, poder recorrerse con el mouse, y no desaparecer solos.' },

  // ── 2. Operable ─────────────────────────────────────────────────────────────
  '2.1.1':  { level:'A',  en:'Keyboard', es:'Teclado', scope:'code', auto:false,
              plain:'Todo se tiene que poder hacer solo con el teclado.' },
  '2.1.2':  { level:'A',  en:'No Keyboard Trap', es:'Sin trampas para el foco del teclado', scope:'manual', auto:false,
              plain:'Si el foco entra a un modal, tiene que poder salir. Nunca queda atrapado.' },
  '2.1.4':  { level:'A',  en:'Character Key Shortcuts', es:'Atajos de teclado de un carácter', scope:'code', auto:false,
              plain:'Los atajos de una sola tecla se tienen que poder desactivar o remapear.' },
  '2.2.1':  { level:'A',  en:'Timing Adjustable', es:'Tiempo ajustable', scope:'manual', auto:false,
              plain:'Si hay un límite de tiempo, se tiene que poder extender o desactivar.' },
  '2.2.2':  { level:'A',  en:'Pause, Stop, Hide', es:'Pausar, detener, ocultar', scope:'manual', auto:false,
              plain:'Carruseles, animaciones y cualquier cosa que se mueva sola necesita botón de pausa.' },
  '2.3.1':  { level:'A',  en:'Three Flashes or Below Threshold', es:'Tres destellos o por debajo del umbral', scope:'manual', auto:false,
              plain:'Nada puede parpadear más de 3 veces por segundo: puede provocar convulsiones.' },
  '2.4.1':  { level:'A',  en:'Bypass Blocks', es:'Evitar bloques', scope:'code', auto:false,
              plain:'Tiene que haber un "saltar al contenido" para no recorrer el menú en cada pantalla.' },
  '2.4.2':  { level:'A',  en:'Page Titled', es:'Página titulada', scope:'code', auto:false,
              plain:'Cada pantalla necesita un título propio y descriptivo.' },
  '2.4.3':  { level:'A',  en:'Focus Order', es:'Orden del foco', scope:'auto', auto:true,
              plain:'Al recorrer con Tab, el orden tiene que seguir la lógica visual: no saltar de un lado a otro.' },
  '2.4.4':  { level:'A',  en:'Link Purpose (In Context)', es:'Propósito del enlace (en contexto)', scope:'manual', auto:false,
              plain:'Se tiene que entender adónde lleva un link. "Hacé clic acá" no dice nada.' },
  '2.4.5':  { level:'AA', en:'Multiple Ways', es:'Múltiples vías', scope:'manual', auto:false,
              plain:'Tiene que haber más de una forma de llegar a cada pantalla: menú, buscador, mapa del sitio.' },
  '2.4.6':  { level:'AA', en:'Headings and Labels', es:'Encabezados y etiquetas', scope:'manual', auto:true,
              plain:'Títulos y etiquetas tienen que describir de qué se trata lo que sigue.' },
  '2.4.7':  { level:'AA', en:'Focus Visible', es:'Foco visible', scope:'auto', auto:true,
              plain:'Cuando algo recibe el foco por teclado, se tiene que ver claramente cuál es.' },
  '2.5.1':  { level:'A',  en:'Pointer Gestures', es:'Gestos del puntero', scope:'manual', auto:false,
              plain:'Todo gesto complejo (pinch, swipe con dos dedos) necesita una alternativa simple.' },
  '2.5.2':  { level:'A',  en:'Pointer Cancellation', es:'Cancelación del puntero', scope:'code', auto:false,
              plain:'La acción se dispara al soltar, no al presionar, para poder arrepentirse.' },
  '2.5.8':  { level:'AA', en:'Target Size (Minimum)', es:'Tamaño del objetivo (mínimo)', scope:'auto', auto:true, since:'2.2',
              plain:'Los elementos interactivos necesitan al menos 24×24 px, o suficiente separación entre ellos. El padding del contenedor cuenta.' },
  '2.5.3':  { level:'A',  en:'Label in Name', es:'Etiqueta en el nombre', scope:'auto', auto:false,
              plain:'El nombre accesible tiene que incluir el texto que se ve. Si el botón dice "Enviar", su aria-label no puede ser "Confirmar".' },
  '2.5.4':  { level:'A',  en:'Motion Actuation', es:'Actuación por movimiento', scope:'code', auto:false,
              plain:'Si algo se activa sacudiendo o inclinando el dispositivo, tiene que haber otra forma.' },

  // ── 3. Understandable ───────────────────────────────────────────────────────
  '3.1.1':  { level:'A',  en:'Language of Page', es:'Idioma de la página', scope:'code', auto:false,
              plain:'La pantalla tiene que declarar en qué idioma está.' },
  '3.1.2':  { level:'AA', en:'Language of Parts', es:'Idioma de las partes', scope:'code', auto:false,
              plain:'Si hay un párrafo en otro idioma, hay que marcarlo para que se lea con la pronunciación correcta.' },
  '3.2.1':  { level:'A',  en:'On Focus', es:'Al recibir el foco', scope:'manual', auto:false,
              plain:'Que algo reciba el foco no puede cambiar la pantalla ni abrir nada de golpe.' },
  '3.2.2':  { level:'A',  en:'On Input', es:'Al recibir entradas', scope:'manual', auto:false,
              plain:'Elegir una opción no puede enviar el formulario ni navegar sin avisar.' },
  '3.2.3':  { level:'AA', en:'Consistent Navigation', es:'Navegación coherente', scope:'manual', auto:false,
              plain:'El menú y los elementos repetidos van siempre en el mismo lugar y en el mismo orden.' },
  '3.2.4':  { level:'AA', en:'Consistent Identification', es:'Identificación coherente', scope:'manual', auto:false,
              plain:'El mismo ícono o botón se llama igual en todas las pantallas.' },
  '3.3.1':  { level:'A',  en:'Error Identification', es:'Identificación de errores', scope:'manual', auto:false,
              plain:'El error se describe en texto, no solo pintando el campo de rojo.' },
  '3.3.2':  { level:'A',  en:'Labels or Instructions', es:'Etiquetas o instrucciones', scope:'manual', auto:false,
              plain:'Cada campo necesita label visible. El placeholder solo no alcanza: desaparece al escribir.' },
  '3.3.3':  { level:'AA', en:'Error Suggestion', es:'Sugerencia ante errores', scope:'manual', auto:false,
              plain:'Además de decir que hay un error, decí cómo arreglarlo.' },
  '3.3.4':  { level:'AA', en:'Error Prevention (Legal, Financial, Data)', es:'Prevención de errores (legales, financieros, de datos)', scope:'manual', auto:false,
              plain:'En pagos y datos legales tiene que haber confirmación, revisión o forma de deshacer.' },

  // ── 4. Robust ───────────────────────────────────────────────────────────────
  '4.1.1':  { level:'A',  en:'Parsing', es:'Análisis sintáctico', scope:'code', auto:false, obsolete:true,
              plain:'HTML bien formado. RETIRADO en WCAG 2.2: los navegadores modernos manejan solos los errores de parseo. Se deja listado para archivos auditados contra 2.1.' },
  // ── Nuevos en WCAG 2.2 (Recomendación del W3C desde octubre de 2023) ──────
  // 2.2 suma 9 criterios: 2 en A, 4 en AA y 3 en AAA. Acá van los 6 de A/AA.
  // Es retrocompatible: cumplir 2.2 AA implica cumplir 2.1 AA.
  '2.4.11': { level:'AA', en:'Focus Not Obscured (Minimum)', es:'Foco no oscurecido (mínimo)', scope:'manual', auto:false, since:'2.2',
              plain:'Cuando algo recibe el foco, no puede quedar tapado del todo por un header fijo, un banner de cookies o un chat flotante.' },
  '2.5.7':  { level:'AA', en:'Dragging Movements', es:'Movimientos de arrastre', scope:'manual', auto:false, since:'2.2',
              plain:'Todo lo que se hace arrastrando necesita una alternativa con un solo clic: reordenar listas, sliders, mover el mapa.' },
  '3.2.6':  { level:'A',  en:'Consistent Help', es:'Ayuda coherente', scope:'manual', auto:false, since:'2.2',
              plain:'Si hay contacto, chat o ayuda, va siempre en el mismo lugar y en el mismo orden en todas las pantallas.' },
  '3.3.7':  { level:'A',  en:'Redundant Entry', es:'Entrada redundante', scope:'manual', auto:false, since:'2.2',
              plain:'No pidas dos veces el mismo dato en un mismo flujo: autocompletalo o dejá elegirlo de lo ya cargado.' },
  '3.3.8':  { level:'AA', en:'Accessible Authentication (Minimum)', es:'Autenticación accesible (mínimo)', scope:'manual', auto:false, since:'2.2',
              plain:'El login no puede depender de resolver un acertijo cognitivo: nada de recordar y transcribir, ni CAPTCHA sin alternativa. Permitir pegar la contraseña.' },

  '4.1.2':  { level:'A',  en:'Name, Role, Value', es:'Nombre, función, valor', scope:'auto', auto:true,
              plain:'Cada control tiene que decirle al lector de pantalla cómo se llama, qué es y en qué estado está.' },
  '4.1.3':  { level:'AA', en:'Status Messages', es:'Mensajes de estado', scope:'code', auto:false,
              plain:'Los avisos que aparecen sin mover el foco ("Guardado", "3 resultados") se tienen que anunciar solos.' }
};


// ─── Design-facing tags ──────────────────────────────────────────────────────
// Los principios POUR agrupan por teoría; un diseñador busca por lo que está
// haciendo. Estos tags son la segunda entrada al catálogo: "estoy con colores",
// "estoy con un formulario".

var CRITERIO_TAGS = {
  color:      ['1.4.1','1.4.3','1.4.11','1.4.12'],
  tipografia: ['1.4.4','1.4.5','1.4.8','1.4.12','1.4.10'],
  navegacion: ['2.4.1','2.4.2','2.4.3','2.4.5','2.4.6','3.2.3','3.2.4','3.2.6','2.4.4'],
  foco:       ['2.4.3','2.4.7','2.4.11','2.1.1','2.1.2','3.2.1'],
  formularios:['1.3.5','3.3.1','3.3.2','3.3.3','3.3.4','3.3.7','3.3.8','4.1.2','2.5.3','3.2.2'],
  imagenes:   ['1.1.1','1.4.5','1.2.1','1.2.2','1.2.3','1.2.4','1.2.5'],
  interaccion:['2.5.1','2.5.2','2.5.4','2.5.5','2.5.7','2.5.8','2.1.4','1.4.13'],
  movimiento: ['2.2.1','2.2.2','2.3.1','1.4.2'],
  estructura: ['1.3.1','1.3.2','1.3.3','2.4.6','4.1.2','4.1.3','4.1.1','3.1.1','3.1.2'],
  responsive: ['1.3.4','1.4.10','1.4.4','1.4.12']
};

var TAG_LABEL = {
  color:'Color', tipografia:'Tipografía', navegacion:'Navegación', foco:'Foco y teclado',
  formularios:'Formularios', imagenes:'Imágenes y media', interaccion:'Interacción',
  movimiento:'Movimiento', estructura:'Estructura', responsive:'Responsive'
};

function tagsDe(id) {
  var out = [];
  Object.keys(CRITERIO_TAGS).forEach(function(k) {
    if (CRITERIO_TAGS[k].indexOf(id) !== -1) out.push(k);
  });
  return out;
}

// Convenience accessor — never throws, so the UI can render an unknown id safely
function wcagInfo(id) {
  return WCAG[id] || { level:'AA', en:'Unknown criterion', es:'Criterio desconocido',
                       plain:'', scope:'manual', auto:false };
}

function wcagLabel(id) {
  var c = wcagInfo(id);
  return id + ' ' + c.es + ' (' + c.level + ')';
}

// Everything the UI needs to render the full criteria reference screen
function wcagCatalogue() {
  var out = [];
  Object.keys(WCAG).forEach(function(id) {
    var c = WCAG[id];
    out.push({ id:id, level:c.level, en:c.en, es:c.es, plain:c.plain, scope:c.scope,
                auto:c.auto, since:c.since || '2.1', obsolete: !!c.obsolete,
                principio: id.split('.')[0], tags: tagsDe(id),
                ejemplo: c.ejemplo || null });
  });
  out.sort(function(a, b) {
    var pa = a.id.split('.').map(Number), pb = b.id.split('.').map(Number);
    return pa[0]-pb[0] || pa[1]-pb[1] || pa[2]-pb[2];
  });
  return out;
}

// ─── Visibility ───────────────────────────────────────────────────────────────
// A layer is audited only if it actually paints on the canvas. Three ways a layer
// can be invisible, all of them checked here:
//   1. visible === false  → eye toggled off in the layers panel, OR a boolean
//                           property inside an INSTANCE that hides the layer.
//                           This is the "variable de componente" case: Figma
//                           resolves the boolean prop into node.visible for us,
//                           so no special handling is needed for instances.
//   2. opacity === 0      → renders nothing even though the eye is on.
//   3. a hidden ancestor  → handled by pruning the branch top-down, so a visible
//                           child inside a hidden frame is never reached.
// Hidden layers are COUNTED, not audited, so the UI can tell the designer exactly
// how much was skipped instead of silently under-reporting.

var VISIBILITY_MIN_OPACITY = 0.001;

function isLayerVisible(node) {
  if (!node) return false;
  if (node.removed) return false;
  if (node.visible === false) return false;
  if (typeof node.opacity === 'number' && node.opacity <= VISIBILITY_MIN_OPACITY) return false;
  return true;
}

// True only if the node AND every ancestor up to (and including) stopAt is visible.
// Used by helpers that receive a node without the traversal context.
function isEffectivelyVisible(node, stopAt) {
  var current = node;
  while (current) {
    if (!isLayerVisible(current)) return false;
    if (stopAt && current.id === stopAt.id) return true;
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') return true;
    current = current.parent;
  }
  return true;
}

function countSubtree(node) {
  var total = 1;
  if ('children' in node) {
    node.children.forEach(function(child) { total += countSubtree(child); });
  }
  return total;
}

// Reset at the start of every audit run — see runAudit()
var skippedHiddenLayers = 0;
var skippedHiddenNames  = [];

// ─── Node Traversal ───────────────────────────────────────────────────────────
// The root is ALWAYS included (the designer selected it on purpose); only its
// descendants are pruned. Pass { includeHidden: true } to opt out of pruning.

function getAllNodes(node, opts) {
  var includeHidden = !!(opts && opts.includeHidden);
  var results = [];

  function walk(n, isRoot, ancestorVisible) {
    var selfVisible = ancestorVisible && isLayerVisible(n);

    // The root is always kept — the designer selected it deliberately, and
    // runAudit() flags it separately via visibility.rootHidden. Its descendants
    // are still pruned, because a visible child of a hidden parent does not render.
    if (!isRoot && !includeHidden && !selfVisible) {
      skippedHiddenLayers += countSubtree(n);
      if (skippedHiddenNames.length < 40) skippedHiddenNames.push(n.name || n.type);
      return;
    }
    results.push(n);
    if ('children' in n) {
      n.children.forEach(function(child) { walk(child, false, includeHidden ? true : selfVisible); });
    }
  }

  walk(node, true, true);
  return results;
}

function getTextNodes(node, opts) {
  return getAllNodes(node, opts).filter(function(n) { return n.type === 'TEXT'; });
}

function getFrameAndComponentNodes(node, opts) {
  return getAllNodes(node, opts).filter(function(n) {
    return n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'RECTANGLE';
  });
}

// ─── Background Color Resolution ─────────────────────────────────────────────
// Walks up the parent chain to find the first solid fill.
// Known limitation: gradients and images default to white (see article learnings).

// Returns the top-most painting solid fill of a node, or null.
// NOTE: Figma paints fills in array order with the LAST entry on top. Verify this
// once with a two-fill rectangle before trusting it in production — if it turns
// out to be the opposite, flip the loop direction here and nowhere else.
function topSolidFill(fills) {
  if (!Array.isArray(fills)) return null;
  for (var i = fills.length - 1; i >= 0; i--) {
    var f = fills[i];
    if (f.type !== 'SOLID') continue;
    if (f.visible === false) continue;
    if (typeof f.opacity === 'number' && f.opacity <= VISIBILITY_MIN_OPACITY) continue;
    return f;
  }
  return null;
}

function resolveBackground(node) {
  var current = node.parent;
  var stack = [];   // semi-transparent backgrounds found on the way up, nearest first

  while (current) {
    // A hidden ancestor paints nothing — skip its fill and keep walking up.
    // Without this, text sitting on a hidden white card gets compared against
    // white while it actually renders on whatever is behind the card.
    if (!isLayerVisible(current)) { current = current.parent; continue; }

    if ('fills' in current) {
      var solid = topSolidFill(current.fills);
      if (solid) {
        var fillAlpha = typeof solid.opacity === 'number' ? solid.opacity : 1;
        var nodeAlpha = typeof current.opacity === 'number' ? current.opacity : 1;
        var alpha = fillAlpha * nodeAlpha;

        var layer = {
          r: solid.color.r * 255,
          g: solid.color.g * 255,
          b: solid.color.b * 255,
          alpha: alpha,
          source: current.name
        };

        if (alpha >= 0.999) {
          // Opaque: this layer stops the search. Composite everything stacked on top of it.
          return compositeStack(stack, layer);
        }
        // Semi-transparent: remember it and keep looking for what is behind
        stack.push(layer);
      }
    }
    current = current.parent;
  }

  // Nothing opaque found — composite over white (Figma canvas default)
  return compositeStack(stack, { r: 255, g: 255, b: 255, alpha: 1, source: 'canvas (white)' });
}

// Flattens semi-transparent background layers (nearest-first) onto an opaque base.
function compositeStack(stack, base) {
  var r = base.r, g = base.g, b = base.b;
  for (var i = stack.length - 1; i >= 0; i--) {
    var l = stack[i];
    var out = blendOver(l.r, l.g, l.b, l.alpha, r, g, b);
    r = out.r; g = out.g; b = out.b;
  }
  var approximate = stack.length > 0;
  return {
    r: r, g: g, b: b,
    hex: hexFromRGB(r / 255, g / 255, b / 255),
    source: stack.length ? (stack[0].source + ' over ' + base.source) : base.source,
    approximate: approximate,
    isDefault: base.source === 'canvas (white)'
  };
}

// ─── Accessible Color Suggestion ─────────────────────────────────────────────
// Instead of only reporting a failure, propose the closest color that passes:
// keep hue and saturation, walk lightness in the direction that gains contrast.
// This is the fallback. When a design system palette is loaded (see
// setDesignSystemPalette below), the nearest PASSING TOKEN is preferred, so the
// designer gets a real token name and not an arbitrary hex.

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h = 0, s = 0, l = (max + min) / 2;
  var d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else                h = ((r - g) / d + 4);
    h /= 6;
  }
  return { h: h, s: s, l: l };
}

function hslToRgb(h, s, l) {
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255
  };
}

// Design system palette, injected from the UI: [{ name, hex, r, g, b }]
var dsPalette = [];


// Carga los estilos de color del archivo sin que nadie los pida. Sin esto, las
// sugerencias eran un hex cualquiera con el mismo tono — técnicamente correcto
// y fuera del sistema, que es justo lo que un diseñador no puede usar.
// Colores del sistema que salen del archivo: estilos, variables locales y las
// variables de librería que usa la selección. Va aparte de dsPalette, que es
// la paleta que se arma a mano para la matriz: una no pisa a la otra.
var paletaArchivo = [];

// Cómo se sugiere un color que no pasa:
//   'sistema'  → solo tokens existentes (el siguiente escalón de la escala)
//   'explorar' → un hex nuevo del mismo tono, aunque no exista en el sistema
var modoSugerencia = 'sistema';

// Un token semántico casi siempre apunta a un primitivo ("text/muted" →
// "gray/500"). Se sigue el alias hasta llegar a un color concreto.
function valorDeVariable(v, profundidad) {
  if (!v || (profundidad || 0) > 6) return null;
  var modoId = null;
  try {
    var col = figma.variables.getVariableCollectionById(v.variableCollectionId);
    if (col) modoId = col.defaultModeId;
  } catch (e) {}
  var modos = Object.keys(v.valuesByMode || {});
  var val = v.valuesByMode[modoId] || v.valuesByMode[modos[0]];
  if (!val) return null;
  if (val.type === 'VARIABLE_ALIAS') {
    var dest = null;
    try { dest = figma.variables.getVariableById(val.id); } catch (e) {}
    return valorDeVariable(dest, (profundidad || 0) + 1);
  }
  return typeof val.r === 'number' ? val : null;
}

function agregarVariable(lista, vistos, v) {
  if (!v || v.resolvedType !== 'COLOR' || vistos[v.id]) return;
  vistos[v.id] = true;
  var val = valorDeVariable(v, 0);
  if (!val) return;
  lista.push({
    name: v.name,
    hex: hexFromRGB(val.r, val.g, val.b),
    r: val.r * 255, g: val.g * 255, b: val.b * 255
  });
}

// Las variables de librería no aparecen en getLocalVariables: solo se llega a
// ellas desde lo que la selección tiene enlazado. Y de cada una se toma la
// colección entera, porque lo que se quiere sugerir es OTRO escalón de la
// misma escala, que casi nunca está usado en la pantalla.
function variablesDeLaSeleccion(roots, lista, vistos) {
  var colecciones = {};
  var nodos = [];
  (roots || []).forEach(function(r) {
    try { nodos = nodos.concat(getAllNodes(r).slice(0, 4000)); } catch (e) {}
  });
  nodos.forEach(function(n) {
    ['fills', 'strokes'].forEach(function(prop) {
      var paints;
      try { paints = n[prop]; } catch (e) { return; }
      if (!Array.isArray(paints)) return;
      paints.forEach(function(p) {
        var ref = p && p.boundVariables && p.boundVariables.color;
        if (!ref || !ref.id) return;
        var v = null;
        try { v = figma.variables.getVariableById(ref.id); } catch (e) {}
        if (!v) return;
        agregarVariable(lista, vistos, v);
        if (v.variableCollectionId) colecciones[v.variableCollectionId] = true;
      });
    });
  });
  Object.keys(colecciones).forEach(function(cid) {
    var col = null;
    try { col = figma.variables.getVariableCollectionById(cid); } catch (e) {}
    ((col && col.variableIds) || []).forEach(function(id) {
      var v = null;
      try { v = figma.variables.getVariableById(id); } catch (e) {}
      agregarVariable(lista, vistos, v);
    });
  });
}

// Devuelve cuántos colores del sistema quedaron disponibles para sugerir.
function cargarPaletaDelArchivo(roots) {
  var lista = [], vistos = {};
  try {
    figma.getLocalPaintStyles().forEach(function(style) {
      var p = (style.paints || []).filter(function(x) {
        return x.type === 'SOLID' && x.visible !== false; })[0];
      if (!p) return;
      lista.push({
        name: style.name,
        hex: hexFromRGB(p.color.r, p.color.g, p.color.b),
        r: p.color.r * 255, g: p.color.g * 255, b: p.color.b * 255
      });
    });
  } catch (e) {}

  // Y las variables de color, que es donde vive la escala en los archivos nuevos
  try {
    if (figma.variables && figma.variables.getLocalVariables) {
      figma.variables.getLocalVariables('COLOR').forEach(function(v) {
        agregarVariable(lista, vistos, v);
      });
    }
  } catch (e) {}

  try { if (figma.variables) variablesDeLaSeleccion(roots, lista, vistos); } catch (e) {}

  paletaArchivo = lista.map(function(c) {
    return { name: c.name, hex: c.hex, r: c.r, g: c.g, b: c.b, l: relativeLuminance(c.r, c.g, c.b) };
  });
  return paletaArchivo.length;
}

// El token de origen de un texto: primero la variable que tiene enlazada, que
// es la fuente de verdad; si no hay, el color crudo del relleno, antes de
// mezclarlo con la opacidad (mezclado ya no coincide con ningún token).
function tokenDeNodo(node, crudo) {
  try {
    var f = topSolidFill(node.fills);
    var ref = f && f.boundVariables && f.boundVariables.color;
    if (ref && ref.id && figma.variables) {
      var v = figma.variables.getVariableById(ref.id);
      if (v) {
        var enPool = paletaParaSugerir().filter(function(c) { return c.name === v.name; })[0];
        if (enPool) return enPool;
      }
    }
  } catch (e) {}
  return crudo ? tokenDe(crudo) : null;
}

// Lo que se ofrece al sugerir: lo del archivo más lo que se cargó a mano.
function paletaParaSugerir() {
  if (!paletaArchivo.length) return dsPalette;
  if (!dsPalette.length) return paletaArchivo;
  var hex = {};
  var out = [];
  paletaArchivo.concat(dsPalette).forEach(function(c) {
    var k = c.name + c.hex;
    if (hex[k]) return;
    hex[k] = true; out.push(c);
  });
  return out;
}

function setDesignSystemPalette(list) {
  dsPalette = (list || []).map(function(c) {
    return { name: c.name, hex: c.hex, r: c.r, g: c.g, b: c.b, l: relativeLuminance(c.r, c.g, c.b) };
  });
}


// ¿Este color coincide con algún token del sistema? Sirve para saber de dónde
// salió y poder proponer otro escalón de la MISMA familia.
function tokenDe(rgb) {
  var exacto = null;
  paletaParaSugerir().forEach(function(c) {
    if (exacto) return;
    if (Math.abs(c.r - rgb.r) < 2 && Math.abs(c.g - rgb.g) < 2 && Math.abs(c.b - rgb.b) < 2) {
      exacto = c;
    }
  });
  return exacto;
}

// "Primitives/blue/400" → "blue". La familia es lo que queda al sacarle el
// escalón numérico y la carpeta contenedora.
function familiaDeToken(nombre) {
  if (!nombre) return null;
  var partes = String(nombre).split('/').map(function(p) { return p.trim(); });
  // Se descarta el último si es un número o un peso conocido
  var ultimo = partes[partes.length - 1] || '';
  if (/^\d{2,3}$/.test(ultimo) || /^(light|dark|base|default|lighter|darker)$/i.test(ultimo)) {
    partes.pop();
  }
  var fam = partes[partes.length - 1] || '';
  return fam ? fam.toLowerCase() : null;
}

function colorDistance(a, b) {
  var dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Distancia como la ve el ojo (CIELAB), no en RGB: en RGB un gris medio queda
// "cerca" de un violeta apagado, y la sugerencia salía de otro color.
function aLab(c) {
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  var r = lin(c.r), g = lin(c.g), b = lin(c.b);
  var x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  var y =  r * 0.2126 + g * 0.7152 + b * 0.0722;
  var z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  function f(t) { return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116; }
  var fx = f(x), fy = f(y), fz = f(z);
  var L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
  return { L: L, a: A, b: B, C: Math.sqrt(A * A + B * B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

function deltaE(c1, c2) {
  var p = aLab(c1), q = aLab(c2);
  var dL = p.L - q.L, da = p.a - q.a, db = p.b - q.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// ¿Es "el mismo color, más oscuro o más claro"? Un gris solo se reemplaza por
// otro gris; un color, por uno de tono parecido. Lo demás es cambiar de color.
var CROMA_NEUTRO = 12, TONO_MAX = 35;
function mismoColor(orig, cand) {
  var p = aLab(orig), q = aLab(cand);
  if (p.C < CROMA_NEUTRO) return q.C < CROMA_NEUTRO + 6;
  if (q.C < CROMA_NEUTRO * 0.7) return false;
  var dh = Math.abs(p.h - q.h); if (dh > 180) dh = 360 - dh;
  return dh <= TONO_MAX;
}

// Los tokens de fondo, borde o superficie se pueden usar, pero para un texto
// va primero uno pensado para texto.
function penalidadPorRol(nombre) {
  var n = String(nombre || '').toLowerCase();
  if (/(^|[\/\s._-])(text|fg|foreground|content|on)([\/\s._-]|$)/.test(n)) return -4;
  if (/(^|[\/\s._-])(bg|background|surface|fill|border|stroke|divider|overlay)([\/\s._-]|$)/.test(n)) return 12;
  return 0;
}

// Returns { hex, ratio, token, modo } or null if nothing reaches the required ratio.
// `modo` pisa a modoSugerencia para una llamada puntual.
function suggestAccessibleColor(fg, bg, required, modo, origenForzado) {
  modo = modo || modoSugerencia;
  var bgL = relativeLuminance(bg.r, bg.g, bg.b);
  var pool = paletaParaSugerir();

  function redondeo(c) { return Math.round(contrastRatio(c.l, bgL) * 100) / 100; }

  // 1. La escala del sistema, no un hex arbitrario. Y dentro de la escala, el
  // mismo FAMILIAR: si el color flojo es blue/400, lo que corresponde es
  // blue/500 o blue/600, no un verde que casualmente esté más cerca en RGB.
  if (modo !== 'explorar' && pool.length) {
    // ¿De qué token salió el color actual? Si quien llama ya lo sabe (la
    // variable enlazada, o el color antes de la opacidad), manda eso.
    var origen = origenForzado || tokenDe(fg);
    var familia = origen ? familiaDeToken(origen.name) : null;

    // Primero, dentro de su propia familia y subiendo de escalón
    if (familia) {
      var mismaFamilia = pool.filter(function(c) {
        return familiaDeToken(c.name) === familia && contrastRatio(c.l, bgL) >= required;
      });
      if (mismaFamilia.length) {
        // El escalón más cercano al original: cambiar lo mínimo
        var elegido = mismaFamilia.sort(function(a, b) {
          return deltaE(a, fg) - deltaE(b, fg); })[0];
        return {
          hex: elegido.hex, token: elegido.name, ratio: redondeo(elegido),
          mismaFamilia: true, desde: origen.name, modo: 'sistema'
        };
      }
    }

    // Si no hay en su familia, un token que pase y sea EL MISMO COLOR (mismo
    // tono, o gris si era gris). El más cercano a ojo, con los de texto primero.
    var best = null, algunoPasa = false;
    pool.forEach(function(c) {
      if (contrastRatio(c.l, bgL) < required) return;
      algunoPasa = true;
      if (!mismoColor(fg, c)) return;
      var d = deltaE(c, fg) + penalidadPorRol(c.name);
      if (!best || d < best.d) best = { d: d, c: c };
    });
    if (best) {
      return {
        hex: best.c.hex, token: best.c.name, ratio: redondeo(best.c),
        desde: origen ? origen.name : null, modo: 'sistema'
      };
    }
    // Hay colores de librería que pasan, pero ninguno se parece: proponer un
    // violeta para un texto gris es cambiar el diseño. Se inventa un tono nuevo
    // del mismo color y se avisa que la librería no lo tiene.
    if (algunoPasa) {
      var nuevo = suggestAccessibleColor(fg, bg, required, 'explorar');
      if (nuevo) { nuevo.sinParecido = true; return nuevo; }
    }
    // En modo estricto, si ningún color del sistema alcanza, se dice así en
    // vez de inventar uno: es una decisión de sistema, no de esta pantalla.
    return null;
  }

  // 2. Un hex nuevo del mismo tono, moviendo solo la luminosidad. Es lo que se
  // usa en modo explorar, o cuando el archivo no tiene ningún token cargado.
  var hsl = rgbToHsl(fg.r, fg.g, fg.b);
  var goDarker = bgL > 0.18;                       // light background → darken the text
  var step = goDarker ? -0.01 : 0.01;
  for (var i = 1; i <= 100; i++) {
    var l = hsl.l + step * i;
    if (l < 0 || l > 1) break;
    var c = hslToRgb(hsl.h, hsl.s, l);
    var ratio = contrastRatio(relativeLuminance(c.r, c.g, c.b), bgL);
    if (ratio >= required) {
      return {
        hex: hexFromRGB(c.r / 255, c.g / 255, c.b / 255),
        token: null,
        ratio: Math.round(ratio * 100) / 100,
        modo: 'explorar',
        // Sin tokens en el archivo no hay modo estricto posible: se avisa
        fueraDelSistema: modo !== 'explorar'
      };
    }
  }
  return null;
}

// ─── Focus Order (WCAG 2.4.3 + 1.3.2) ────────────────────────────────────────
// Every competing plugin (Stark, Include, A11y-Focus Order, Deque) makes the
// designer add interactive elements to the sequence one by one. This infers the
// order and lets the designer correct it, which is the whole point.
//
// Algorithm, in order of precedence:
//   1. Only VISIBLE interactive nodes — reuses the same pruning as the audit.
//   2. Group into sections. Auto-layout frames are authoritative: their own
//      layoutMode already encodes the intended reading direction, so children
//      are taken in child order rather than re-sorted by geometry.
//   3. Outside auto-layout, sort by rows: band elements whose vertical centres
//      are within ROW_TOLERANCE into the same row, then left-to-right inside it.
//      Plain Y-then-X sorting breaks on anything side-by-side, which is why the
//      banding step exists.
//   4. Nested interactive elements: the outermost wins. A card that is itself a
//      link containing a button is one stop, not two — deduplicated below.
//
// This is a SUGGESTION. Eric Bailey's argument against annotating focus order
// is worth respecting: semantic HTML in source order usually gets it right on
// its own, and annotation is only warranted when the visual order diverges from
// a sensible DOM order, or for genuinely custom widgets. So the output warns
// when the inferred order matches plain document order (annotation unnecessary)
// and never suggests positive tabindex.

var ROW_TOLERANCE = 12;   // px — vertical slack for "same row"

// A node with no area cannot receive focus and cannot carry a badge: drawing
// one produced the markers that looked like they were floating in mid-air.
function hasArea(node) {
  var b = node.absoluteBoundingBox;
  if (!b) return false;
  return b.width >= 2 && b.height >= 2;
}

// Figma sets absoluteRenderBounds to null when a node paints nothing at all —
// fully clipped, zero-alpha, empty group. That is a far better "is it really on
// screen" test than comparing rectangles, which wrongly discarded children that
// legitimately overflow a non-clipping frame.
function rendersOnScreen(node) {
  if (!hasArea(node)) return false;
  try {
    if ('absoluteRenderBounds' in node && node.absoluteRenderBounds === null) return false;
  } catch (e) {}
  return true;
}

function isFocusable(node) {
  if (!hasArea(node)) return false;
  if (!isInteractive(node)) return false;
  if (node.type === 'TEXT') {
    // Text is only a focus stop if its name marks it as a link or control
    var n = (node.name || '').toLowerCase();
    return n.indexOf('link') !== -1 || n.indexOf('button') !== -1;
  }
  return true;
}

function absBox(node) {
  var b = node.absoluteBoundingBox;
  return b ? b : { x: node.x || 0, y: node.y || 0, width: node.width || 0, height: node.height || 0 };
}

// Sorts a set of siblings into reading order using row banding.
function sortReadingOrder(nodes) {
  var items = nodes.map(function(n) {
    var b = absBox(n);
    return { node: n, x: b.x, y: b.y, cy: b.y + b.height / 2 };
  });
  items.sort(function(a, b) { return a.cy - b.cy || a.x - b.x; });

  // Band into rows, then sort each row left-to-right
  var rows = [], current = [];
  items.forEach(function(it) {
    if (current.length === 0) { current.push(it); return; }
    var ref = current[0];
    if (Math.abs(it.cy - ref.cy) <= ROW_TOLERANCE) current.push(it);
    else { rows.push(current); current = [it]; }
  });
  if (current.length) rows.push(current);

  var out = [];
  rows.forEach(function(row) {
    row.sort(function(a, b) { return a.x - b.x; });
    row.forEach(function(it) { out.push(it.node); });
  });
  return out;
}

// Walks the tree collecting focus stops in inferred order.
function collectFocusStops(node, stops, depth) {
  stops = stops || [];
  depth = depth || 0;
  if (depth > 60) return stops;

  // Outermost interactive wins — do not descend into an element that is itself
  // a stop. Exception: a container with two or more texts is a section, not a
  // single control, so descend into it and look for the real controls inside.
  if (depth > 0) {
    var det = detectInteractive(node);
    if (det.is && !(node.type === 'TEXT' && !isFocusable(node))) {
      var texts = ('children' in node) ? directTextChildren(node) : [];
      // Strong evidence (prototype reaction, state variants, explicit name) means
      // this IS the control, however much text it holds — a button reading
      // "Pagar   $4.200" has two texts and is still one Tab stop.
      // Only the weak shape heuristic defers to its children, because that is
      // the one that mistakes a card for a button. Previously ANY multi-text
      // container was dropped entirely, which is what silently skipped controls.
      var strong = det.confidence >= 0.7;

      // Strong evidence: this container really is a control, so it IS a stop —
      // a button reading "Pagar   $4.200" has two texts and is still one stop.
      if (strong) stops.push(node);

      // Either way, keep looking inside for nested controls. A clickable card
      // containing its own button is two Tab stops, not one: stopping here was
      // exactly what made the plugin skip visible controls.
      var before = stops.length;
      if ('children' in node) {
        var kids0 = node.children.filter(isLayerVisible);
        var ord0 = (node.layoutMode && node.layoutMode !== 'NONE') ? kids0 : sortReadingOrder(kids0);
        ord0.forEach(function(c) { collectFocusStops(c, stops, depth + 1); });
      }
      // Weak evidence and nothing real inside: fall back to the container, so a
      // heuristic hit is never silently dropped.
      if (!strong && stops.length === before) stops.push(node);
      return stops;
    }
  }
  if (!('children' in node)) return stops;

  var kids = node.children.filter(function(c) { return isLayerVisible(c); });
  if (kids.length === 0) return stops;

  // Auto-layout already encodes intent: trust child order instead of geometry
  var ordered = (node.layoutMode && node.layoutMode !== 'NONE')
    ? kids
    : sortReadingOrder(kids);

  ordered.forEach(function(child) { collectFocusStops(child, stops, depth + 1); });
  return stops;
}

function buildFocusOrder(rootNodes) {
  skippedHiddenLayers = 0;
  skippedHiddenNames  = [];

  var roots = Array.isArray(rootNodes) ? rootNodes : [rootNodes];
  var visible = roots.filter(isLayerVisible);
  if (!visible.length) {
    return { stops: [], rootHidden: true, warnings: [], matchesDocumentOrder: false };
  }

  var stops = [];
  sortReadingOrder(visible).forEach(function(r) { collectFocusStops(r, stops, 0); });

  stops = stops.filter(rendersOnScreen);

  // Document order = the order the nodes appear in the layer tree, unsorted.
  // If the inferred order matches it, the DOM will very likely get this right
  // on its own and annotating is probably unnecessary noise.
  var docOrder = [];
  visible.forEach(function(r) {
    getAllNodes(r).filter(isFocusable).forEach(function(n) { docOrder.push(n); });
  });
  var matchesDoc = docOrder.length === stops.length && docOrder.every(function(n, i) {
    return stops[i] && stops[i].id === n.id;
  });

  var warnings = [];
  if (stops.length === 0) warnings.push('No se encontraron elementos interactivos visibles en esta selección.');
  if (stops.length > 40)  warnings.push('Más de 40 paradas de foco. Conviene dividir la pantalla en regiones y anotar por región.');

  // Flag horizontal back-jumps: an element that sits above and to the left of
  // the previous one usually means the visual layout and the reading order disagree.
  for (var i = 1; i < stops.length; i++) {
    var prev = absBox(stops[i-1]), cur = absBox(stops[i]);
    if (cur.y + cur.height < prev.y) {
      warnings.push('"' + (stops[i].name || stops[i].type) + '" queda por encima del elemento anterior. Revisá si el orden visual y el orden lógico coinciden.');
      break;
    }
  }

  return {
    stops: stops.map(function(n, i) {
      var b = absBox(n);
      return {
        index: i + 1, nodeId: n.id, name: n.name || n.type, type: n.type,
        x: b.x, y: b.y, width: b.width, height: b.height,
        detected: detectInteractive(n),
        aria: suggestAria(n)
      };
    }),
    rootHidden: false,
    matchesDocumentOrder: matchesDoc,
    hiddenSkipped: skippedHiddenLayers,
    warnings: warnings
  };
}



// Aggregates ARIA suggestions across a selection
function auditAria(rootNode) {
  var issues = [], passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    if (!isFocusable(node)) return;
    var aria = suggestAria(node);
    if (aria.skip) { passed++; return; }

    if (aria.needsLabel) {
      issues.push({
        type: 'aria', severity: 'fail', nodeId: node.id, nodeName: node.name || node.type,
        message: '"' + (node.name || node.type) + '" no tiene texto visible, así que no tiene nombre accesible.',
        detail: { aria: aria }, wcag: '4.1.2',
        fix: 'Escribí un aria-label que describa la acción, no la forma del ícono. Ejemplo: "Cerrar el menú" en vez de "equis".'
      });
    } else if (aria.state) {
      issues.push({
        type: 'aria', severity: 'warning', nodeId: node.id, nodeName: node.name || node.type,
        message: '"' + (node.name || node.type) + '" tiene estado y necesita ' + aria.state + '.',
        detail: { aria: aria }, wcag: '4.1.2',
        fix: 'Documentá qué variante corresponde a cada valor de ' + aria.state + ' para que el dev lo conecte.'
      });
    } else {
      passed++;
    }
  });

  return { issues: issues, passed: passed };
}

// ─── Reading order (WCAG 1.3.2) ──────────────────────────────────────────────
// Focus order covers only what you can Tab to. Reading order covers everything
// a screen reader narrates — headings, paragraphs, labels, images with alt.
// They are different questions and the panel exposes both.

function collectReadingStops(node, stops, depth) {
  stops = stops || []; depth = depth || 0;
  if (depth > 60) return stops;

  if (depth > 0) {
    // A text node is always a stop in the narration
    if (node.type === 'TEXT') {
      var t = '';
      try { t = (node.characters || '').trim(); } catch (e) {}
      if (t) { stops.push({ node: node, kind: 'text' }); return stops; }
    }
    // A control is a stop AND a leaf — but only when it really is a single
    // control. The shape heuristic happily flags a card as "button-ish", and
    // treating that as a leaf silently swallowed every visible text inside it.
    // A container holding two or more texts is a section, so keep descending.
    if (isInteractive(node)) {
      var inner = directTextChildren(node);
      if (inner.length <= 1) { stops.push({ node: node, kind: 'control' }); return stops; }
      // Announce the container, then keep going into its content
      stops.push({ node: node, kind: 'control' });
    }
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      try {
        if (Array.isArray(node.fills) && node.fills.some(function(f) {
          return f.type === 'IMAGE' && f.visible !== false; })) {
          stops.push({ node: node, kind: 'image' }); return stops;
        }
      } catch (e) {}
    }
  }

  if (!('children' in node)) return stops;
  var kids = node.children.filter(function(c) { return isLayerVisible(c); });
  if (!kids.length) return stops;

  var ordered = (node.layoutMode && node.layoutMode !== 'NONE') ? kids : sortReadingOrder(kids);
  ordered.forEach(function(c) { collectReadingStops(c, stops, depth + 1); });
  return stops;
}

function buildReadingOrder(rootNodes) {
  skippedHiddenLayers = 0; skippedHiddenNames = [];
  var roots = Array.isArray(rootNodes) ? rootNodes : [rootNodes];
  var visible = roots.filter(isLayerVisible);
  if (!visible.length) return { stops: [], rootHidden: true, warnings: [] };

  // Multiple frames selected: narrate them in reading order too, not in
  // whatever order they happened to be clicked.
  var raw = [];
  sortReadingOrder(visible).forEach(function(r) { collectReadingStops(r, raw, 0); });

  raw = raw.filter(function(it) { return rendersOnScreen(it.node); });
  return {
    rootHidden: false,
    hiddenSkipped: skippedHiddenLayers,
    stops: raw.map(function(r, i) {
      var b = absBox(r.node);
      var label = '';
      try { label = r.kind === 'text' ? (r.node.characters || '').replace(/\s+/g,' ').trim().slice(0,44) : ''; } catch (e) {}
      return {
        index: i + 1, nodeId: r.node.id, name: r.node.name || r.node.type,
        kind: r.kind, text: label, type: r.node.type,
        x: b.x, y: b.y, width: b.width, height: b.height
      };
    }),
    warnings: raw.length === 0 ? ['No se encontró contenido visible que narrar.'] : []
  };
}


// ─── Suggested accessible names ──────────────────────────────────────────────
// Telling a designer "falta aria-label" in red is a dead end: they still have to
// invent the wording. This proposes the actual sentence from what the layer name
// says, so the handoff carries a decision instead of a complaint.
// The name must describe the ACTION, never the shape of the icon.

var ACTION_HINTS = [
  { kw: ['close', 'cerrar', 'dismiss', 'x-mark'],   label: 'Cerrar' },
  { kw: ['back', 'atras', 'atrás', 'volver', 'prev'], label: 'Volver' },
  { kw: ['next', 'siguiente', 'forward'],           label: 'Siguiente' },
  { kw: ['menu', 'hamburger', 'burger'],            label: 'Abrir el menú' },
  { kw: ['search', 'buscar', 'magnif'],             label: 'Buscar' },
  { kw: ['filter', 'filtro'],                       label: 'Filtrar resultados' },
  { kw: ['settings', 'config', 'gear', 'ajuste'],   label: 'Abrir ajustes' },
  { kw: ['delete', 'trash', 'borrar', 'eliminar'],  label: 'Eliminar' },
  { kw: ['edit', 'pencil', 'editar'],               label: 'Editar' },
  { kw: ['add', 'plus', 'agregar', 'nuevo'],        label: 'Agregar' },
  { kw: ['share', 'compartir'],                     label: 'Compartir' },
  { kw: ['download', 'descargar'],                  label: 'Descargar' },
  { kw: ['upload', 'subir'],                        label: 'Subir un archivo' },
  { kw: ['favorite', 'heart', 'like', 'favorito'],  label: 'Agregar a favoritos' },
  { kw: ['info', 'help', 'ayuda', 'question'],      label: 'Ver más información' },
  { kw: ['user', 'avatar', 'profile', 'perfil'],    label: 'Abrir tu perfil' },
  { kw: ['cart', 'carrito', 'bag'],                 label: 'Ver el carrito' },
  { kw: ['notification', 'bell', 'campana'],        label: 'Ver notificaciones' },
  { kw: ['play'],                                   label: 'Reproducir' },
  { kw: ['pause'],                                  label: 'Pausar' },
  { kw: ['copy', 'copiar'],                         label: 'Copiar' },
  { kw: ['calendar', 'date', 'fecha'],              label: 'Elegir una fecha' },
  { kw: ['chevron', 'arrow', 'caret', 'expand'],    label: 'Mostrar más' }
];

function suggestActionLabel(node) {
  var name = (node.name || '').toLowerCase();
  for (var i = 0; i < ACTION_HINTS.length; i++) {
    for (var k = 0; k < ACTION_HINTS[i].kw.length; k++) {
      if (name.indexOf(ACTION_HINTS[i].kw[k]) !== -1) {
        return { label: ACTION_HINTS[i].label, confident: true };
      }
    }
  }
  // Nothing recognisable: propose a placeholder shaped like a real answer, so
  // it is obvious what kind of sentence goes there.
  return { label: 'Describí acá qué pasa al activarlo', confident: false };
}


// ═════════════════════════════════════════════════════════════════════════════
// MOTOR ARIA
//
// Reemplaza el sistema de "si el nombre contiene X, poné role=Y". Ese enfoque
// producía roles inventados y nombres accesibles pegoteados, porque trataba una
// palabra suelta como si fuera evidencia de un patrón de interacción.
//
// Acá la unidad es el PATRÓN, no la palabra. Cada patrón trae lo que el WAI-ARIA
// Authoring Practices Guide define para él: el rol, qué propiedades y estados
// son obligatorios, de dónde sale el nombre accesible, qué teclas tiene que
// responder, qué HTML nativo lo resuelve sin ARIA, y en qué se equivoca la gente.
//
// Sobre todo eso corren las CINCO REGLAS del uso de ARIA, que son las que
// deciden si conviene sugerir algo o callarse.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Las cinco reglas ────────────────────────────────────────────────────────
// Están en "Using ARIA" del W3C. La primera es la más importante y la más
// ignorada: si un elemento HTML nativo hace el trabajo, usar ARIA lo empeora.

var ARIA_RULES = {
  1: { titulo: 'Si hay HTML nativo, usalo',
       texto: 'Un <button> ya es role="button", ya recibe foco y ya responde Enter y Espacio. ' +
              'Reimplementarlo con <div role="button"> obliga a agregar tabindex y manejar teclado a mano, ' +
              'y siempre se olvida algo.' },
  2: { titulo: 'No cambies la semántica nativa',
       texto: 'Poner role="button" sobre un <h2> le saca el encabezado a quien navega por encabezados. ' +
              'Si necesitás las dos cosas, anidá: <h2><button>…</button></h2>.' },
  3: { titulo: 'Todo control ARIA tiene que funcionar con teclado',
       texto: 'Un role="button" sin tabindex="0" y sin handler de Enter y Espacio es un botón que ' +
              'nadie puede accionar sin mouse. El rol promete algo que el código no cumple.' },
  4: { titulo: 'No escondas lo que puede recibir foco',
       texto: 'aria-hidden="true" o role="presentation" sobre algo focusable crea un agujero: el foco ' +
              'entra en un elemento que para el lector no existe.' },
  5: { titulo: 'Todo control necesita nombre accesible',
       texto: 'Sin nombre, el lector anuncia "botón" y nada más. El nombre describe la ACCIÓN, ' +
              'no la forma del ícono.' }
};

// ─── Catálogo de patrones ────────────────────────────────────────────────────
// Cada entrada responde: cómo se reconoce, qué necesita, y en qué se falla.
//
//   match      · palabras de capa que nombran ESTE patrón (no contenido)
//   role       · rol ARIA. null cuando el HTML nativo alcanza.
//   nativo     · el elemento HTML que lo resuelve sin ARIA
//   estados    · propiedades que cambian en runtime y el JS tiene que sincronizar
//   props      · propiedades estáticas obligatorias
//   nombre     · de dónde sale el nombre accesible
//   teclado    · qué teclas tiene que responder
//   padre      · rol que DEBE contenerlo (restricción estructural de ARIA)
//   hijos      · roles que DEBE contener
//   errores    · las equivocaciones típicas, en palabras del diseñador
//   focusable  · si recibe foco por sí mismo

var ARIA_PATTERNS = {

  // ── Controles simples ──────────────────────────────────────────────────────
  button: {
    label: 'Botón',
    match: ['button', 'btn', 'cta', 'boton', 'botón', 'submit', 'fab'],
    role: null, nativo: '<button>',
    nombre: 'texto visible; si es solo ícono, aria-label escrito a mano',
    teclado: 'Enter y Espacio lo activan',
    focusable: true,
    errores: [
      'Usar <div> con onClick en vez de <button>: pierde foco y teclado.',
      'Poner aria-label distinto del texto visible: rompe el control por voz (2.5.3).'
    ]
  },

  link: {
    label: 'Enlace',
    match: ['link', 'enlace', 'anchor'],
    role: null, nativo: '<a href="…">',
    nombre: 'el texto del enlace, que tiene que decir adónde lleva',
    teclado: 'Enter lo activa. Espacio NO: eso es de botones.',
    focusable: true,
    errores: [
      '"Hacé clic acá" no dice nada cuando el lector lista los enlaces sueltos (2.4.4).',
      'Un <a> sin href no recibe foco: si no navega a ningún lado, es un botón.'
    ]
  },

  checkbox: {
    label: 'Casilla de verificación',
    match: ['checkbox', 'check box', 'casilla'],
    role: null, nativo: '<input type="checkbox">',
    estados: ['aria-checked'],
    nombre: 'su <label> asociado, no un texto suelto al lado',
    teclado: 'Espacio la marca y desmarca',
    focusable: true,
    errores: [
      'Dibujar la casilla con un ícono y olvidar el input real.',
      'Si existe estado indeterminado, es aria-checked="mixed", no false.'
    ]
  },

  radio: {
    label: 'Opción de radio',
    match: ['radio'],
    role: null, nativo: '<input type="radio">',
    estados: ['aria-checked'],
    padre: 'radiogroup',
    nombre: 'su <label>; el grupo entero necesita su propio nombre',
    teclado: 'Flechas mueven entre opciones. Tab entra y sale del grupo, no recorre las opciones.',
    focusable: true,
    errores: [
      'Que Tab recorra cada opción: el grupo es UNA parada de tabulación.',
      'Un grupo de radios sin nombre propio: el lector no dice de qué es la elección.'
    ]
  },

  switch: {
    label: 'Interruptor',
    match: ['switch', 'toggle', 'interruptor'],
    role: 'switch', nativo: '<button role="switch">',
    estados: ['aria-checked'],
    nombre: 'lo que enciende o apaga, no "on/off"',
    teclado: 'Espacio y Enter lo alternan',
    focusable: true,
    errores: [
      'Usar aria-pressed en vez de aria-checked: eso es para botones de dos estados, no interruptores.',
      'Que el nombre cambie al alternar: el nombre es fijo, lo que cambia es el estado.'
    ]
  },

  // ── Composites: patrones con estructura obligatoria ────────────────────────
  tablist: {
    label: 'Lista de pestañas',
    match: ['tablist', 'tabs container', 'tab bar', 'tabs'],
    role: 'tablist',
    hijos: ['tab'],
    nombre: 'aria-label que diga de qué son las pestañas',
    teclado: 'Flechas mueven entre pestañas. El contenedor no recibe foco.',
    focusable: false,
    esContenedor: true,
    errores: [
      'Nombrar el contenedor con el texto de todas las pestañas juntas.',
      'Que Tab recorra cada pestaña: el conjunto es una sola parada.'
    ]
  },

  tab: {
    label: 'Pestaña',
    match: ['tab button', 'tab item', 'tab /', 'pestaña'],
    role: 'tab',
    estados: ['aria-selected'],
    props: ['aria-controls'],
    padre: 'tablist',
    nombre: 'su propia etiqueta, solo la suya',
    teclado: 'Flechas mueven el foco. Enter o Espacio activan si no es automática.',
    focusable: true,
    errores: [
      'Marcar la seleccionada solo con color: aria-selected es lo que lo comunica.',
      'Olvidar aria-controls apuntando al panel que abre.'
    ]
  },

  tabpanel: {
    label: 'Panel de pestaña',
    match: ['tabpanel', 'tab panel', 'tab content'],
    role: 'tabpanel',
    props: ['aria-labelledby'],
    nombre: 'aria-labelledby apuntando a su pestaña',
    focusable: false,
    errores: ['Panel sin aria-labelledby: el lector no sabe a qué pestaña pertenece.']
  },

  disclosure: {
    label: 'Acordeón',
    match: ['accordion', 'acordeon', 'acordeón', 'disclosure', 'expander', 'collapse'],
    role: null, nativo: '<button aria-expanded>',
    estados: ['aria-expanded'],
    props: ['aria-controls'],
    nombre: 'el título de la sección que abre',
    teclado: 'Enter y Espacio lo abren y cierran',
    focusable: true,
    errores: [
      'Poner aria-expanded en el panel en vez del botón: va en el que se acciona.',
      'Rotar la flecha sin cambiar aria-expanded: el estado visual no llega al lector.'
    ]
  },

  combobox: {
    label: 'Combo / Select',
    match: ['combobox', 'combo', 'dropdown', 'select', 'desplegable'],
    role: null, nativo: '<select> cuando la lista es simple',
    estados: ['aria-expanded'],
    props: ['aria-controls', 'aria-haspopup'],
    nombre: 'su <label>, no el placeholder',
    teclado: 'Flechas abren y recorren. Escape cierra. Enter elige.',
    focusable: true,
    errores: [
      'Reimplementar <select> con divs y perder todo el teclado.',
      'Usar el placeholder como nombre: desaparece al elegir.'
    ]
  },

  listbox: {
    label: 'Lista de opciones',
    match: ['listbox', 'option list', 'lista de opciones'],
    role: 'listbox',
    hijos: ['option'],
    nombre: 'aria-label o aria-labelledby',
    teclado: 'Flechas recorren. Home y End van a los extremos.',
    focusable: true,
    errores: ['Opciones sin role="option": el lector no sabe cuántas hay ni en cuál está.']
  },

  option: {
    label: 'Opción',
    match: ['option', 'opcion', 'opción', 'list option'],
    role: 'option',
    estados: ['aria-selected'],
    padre: 'listbox',
    nombre: 'su texto',
    focusable: false,
    errores: ['Marcar la elegida solo con fondo: aria-selected es lo que lo dice.']
  },

  menu: {
    label: 'Menú',
    match: ['menu /', 'dropdown menu', 'context menu'],
    role: 'menu',
    hijos: ['menuitem'],
    nombre: 'aria-label del menú',
    teclado: 'Flechas recorren. Escape cierra y devuelve el foco al disparador.',
    focusable: false,
    esContenedor: true,
    errores: [
      'Usar role="menu" para un menú de navegación: eso es <nav> con una lista.',
      'role="menu" es para acciones tipo aplicación, no para links.'
    ]
  },

  menuitem: {
    label: 'Ítem de menú',
    match: ['menu item', 'menuitem'],
    role: 'menuitem',
    padre: 'menu',
    nombre: 'su texto',
    teclado: 'Flechas mueven entre ítems. Enter lo activa. Escape cierra el menú.',
    focusable: true,
    errores: [
      'menuitem fuera de un menu: rol inválido, el lector lo ignora.',
      'Que Tab recorra cada ítem: el menú abierto se recorre con flechas, no con Tab.'
    ]
  },

  slider: {
    label: 'Deslizador',
    match: ['slider', 'range', 'deslizador'],
    role: null, nativo: '<input type="range">',
    estados: ['aria-valuenow'],
    props: ['aria-valuemin', 'aria-valuemax', 'aria-valuetext'],
    nombre: 'su <label>',
    teclado: 'Flechas mueven de a un paso. Home y End van a los extremos.',
    focusable: true,
    errores: [
      'Dar solo aria-valuenow: sin min y max, el número no significa nada.',
      'Cuando el valor no es un número puro (fechas, tallas), falta aria-valuetext.'
    ]
  },

  // ── Contenedores y regiones ────────────────────────────────────────────────
  dialog: {
    label: 'Diálogo / Modal',
    match: ['modal', 'dialog', 'dialogo', 'diálogo', 'popup'],
    role: 'dialog',
    props: ['aria-modal', 'aria-labelledby'],
    nombre: 'aria-labelledby apuntando a su título',
    teclado: 'Escape lo cierra. El foco queda atrapado adentro mientras está abierto.',
    focusable: false,
    esContenedor: true,
    errores: [
      'No atrapar el foco: se puede tabular a la página de atrás sin verla.',
      'No devolver el foco al elemento que lo abrió al cerrarlo.',
      'Fondo sin aria-hidden: el lector sigue leyendo lo de atrás.'
    ]
  },

  alertdialog: {
    label: 'Diálogo de confirmación',
    match: ['alert dialog', 'confirm dialog', 'confirmacion', 'confirmación'],
    role: 'alertdialog',
    props: ['aria-modal', 'aria-labelledby', 'aria-describedby'],
    nombre: 'aria-labelledby al título, aria-describedby al mensaje',
    teclado: 'Escape cancela. El foco arranca en el botón menos destructivo.',
    focusable: false,
    esContenedor: true,
    errores: ['Poner el foco inicial en "Eliminar": arranca en la salida segura.']
  },

  navigation: {
    label: 'Navegación',
    match: ['nav bar', 'navbar', 'navigation', 'main nav', 'sidebar nav'],
    role: null, nativo: '<nav>',
    props: ['aria-label'],
    nombre: 'aria-label si hay más de una navegación en la pantalla',
    focusable: false,
    esContenedor: true,
    errores: ['Dos <nav> sin aria-label: el lector dice "navegación" dos veces y no distingue.']
  },

  banner:      { label: 'Encabezado de página', match: ['header', 'page header', 'app bar', 'topbar'],
                 role: null, nativo: '<header>', focusable: false, esContenedor: true,
                 errores: ['Solo cuenta como banner si es el header de la página, no el de una card.'] },
  contentinfo: { label: 'Pie de página', match: ['footer', 'page footer'],
                 role: null, nativo: '<footer>', focusable: false, esContenedor: true, errores: [] },
  main:        { label: 'Contenido principal', match: ['main content', 'main /', 'contenido principal'],
                 role: null, nativo: '<main>', focusable: false, esContenedor: true,
                 errores: ['Un solo <main> por pantalla.'] },
  search:      { label: 'Búsqueda', match: ['search bar', 'searchbar', 'buscador'],
                 role: 'search', props: ['aria-label'], focusable: false, esContenedor: true,
                 errores: ['El campo interno va con type="search" y su propio label.'] },

  // ── Estado y feedback ──────────────────────────────────────────────────────
  alert: {
    label: 'Alerta',
    match: ['alert', 'error message', 'mensaje de error', 'toast', 'snackbar'],
    role: 'alert',
    nombre: 'su propio texto, que se anuncia solo al aparecer',
    focusable: false,
    errores: [
      'role="alert" interrumpe: para avisos no urgentes usá role="status".',
      'Si el nodo existe vacío y se llena después, el lector no lo anuncia: tiene que existir antes.'
    ]
  },

  status: {
    label: 'Mensaje de estado',
    match: ['status', 'toast info', 'notification', 'badge count', 'contador'],
    role: 'status',
    props: ['aria-live'],
    nombre: 'su texto',
    focusable: false,
    errores: ['Un contador que cambia sin región viva: nadie se entera del cambio (4.1.3).']
  },

  progressbar: {
    label: 'Barra de progreso',
    match: ['progress', 'progreso', 'loader', 'loading bar'],
    role: null, nativo: '<progress>',
    estados: ['aria-valuenow'],
    props: ['aria-valuemin', 'aria-valuemax'],
    nombre: 'aria-label que diga de qué es el progreso',
    focusable: false,
    errores: ['Progreso indeterminado: se omite aria-valuenow, no se pone 0.']
  },

  tooltip: {
    label: 'Tooltip',
    match: ['tooltip'],
    role: 'tooltip',
    props: ['aria-describedby'],
    nombre: 'se referencia desde el control con aria-describedby',
    focusable: false,
    errores: [
      'Tooltip que solo aparece con hover: tiene que aparecer también con foco (1.4.13).',
      'Si la información es imprescindible, no va en un tooltip.'
    ]
  },

  // ── Contenido ──────────────────────────────────────────────────────────────
  image: {
    label: 'Imagen',
    match: ['image', 'imagen', 'photo', 'foto', 'ilustracion', 'ilustración'],
    role: null, nativo: '<img alt="…">',
    nombre: 'alt que describa la información que aporta',
    focusable: false,
    errores: [
      'alt vacío en una imagen que informa: se pierde el contenido.',
      'alt puesto en una imagen decorativa: se lee ruido. Ahí va alt="".'
    ]
  },

  icon: {
    label: 'Ícono',
    match: ['icon', 'icono', 'ico', 'glyph'],
    role: null, nativo: '<svg aria-hidden="true">',
    nombre: 'ninguno: el nombre lo lleva el control que lo contiene',
    focusable: false,
    decorativoPorDefecto: true,
    errores: [
      'Ícono dentro de un botón sin aria-hidden: el lector lo nombra dos veces.',
      'Ícono suelto que comunica algo (un check de "listo") necesita texto alternativo.'
    ]
  },

  heading: {
    label: 'Encabezado',
    match: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'heading', 'titulo', 'título'],
    role: null, nativo: '<h1> a <h6>',
    nombre: 'su texto',
    focusable: false,
    errores: [
      'Texto grande en negrita que no es un encabezado en el código: no se puede navegar por encabezados.',
      'Saltar de H2 a H4.'
    ]
  }
};


// ¿Este nodo contiene OTROS controles? Entonces es una agrupación, no un control:
// los que reciben foco y nombre son los de adentro.
function contieneControles(node, excluir) {
  if (!('children' in node)) return 0;
  var n = 0;
  (function walk(x, d) {
    if (d > 4) return;
    (x.children || []).forEach(function(c) {
      if (!isLayerVisible(c)) return;
      if (c.id !== (excluir && excluir.id) && detectInteractive(c).is) { n++; return; }
      if ('children' in c) walk(c, d + 1);
    });
  })(node, 0);
  return n;
}


// ─── Nombre compuesto de tarjetas ────────────────────────────────────────────
// Una card de contenido —imagen, título y metadatos— es UN control con UN
// nombre, y ese nombre legítimamente junta varias partes: "Ir al video de Chair
// Yoga for Seniors, 45 minutos, principiante". Rechazarla por tener tres textos
// era correcto para un contenedor genérico y equivocado para este patrón.
//
// Cuando la card es instancia de un componente repetido, lo que corresponde no
// es el texto literal de ESTA card sino la PLANTILLA, porque el handoff describe
// el componente y no cada aparición.

var CARD_WORDS = ['card', 'tarjeta', 'tile', 'item', 'cell', 'celda', 'row', 'entry',
                  'result', 'resultado', 'producto', 'product', 'class', 'clase',
                  'course', 'curso', 'video', 'article', 'post', 'listing'];

function esCard(node) {
  var n = (node.name || '').toLowerCase();
  if (!CARD_WORDS.some(function(k) { return n.indexOf(k) !== -1; })) return false;
  // Tiene que tener contenido variado: un título más algo más
  return directTextChildren(node).length >= 1 || getAllNodes(node).length > 3;
}

// Reparte los textos en título y metadatos según jerarquía tipográfica.
function partesDeCard(node) {
  var textos = [];
  getAllNodes(node).forEach(function(t) {
    if (t.type !== 'TEXT' || !isLayerVisible(t)) return;
    var chars = '';
    try { chars = (t.characters || '').trim(); } catch (e) {}
    if (!chars) return;
    var met = textMetrics(t);
    textos.push({ node: t, texto: chars, size: met.fontSize, bold: met.bold,
                  nombre: (t.name || '').toLowerCase() });
  });
  if (!textos.length) return null;

  // El título es el de mayor tamaño; con empate, el que esté más arriba
  var titulo = textos.slice().sort(function(a, b) {
    if (b.size !== a.size) return b.size - a.size;
    return (a.node.y || 0) - (b.node.y || 0);
  })[0];

  var meta = textos.filter(function(t) { return t !== titulo; });
  return { titulo: titulo, meta: meta, todos: textos };
}

// ¿Es una de varias instancias del mismo componente? Entonces el handoff
// describe la plantilla, no esta card en particular.
function claveDeComponente(node) {
  try {
    if (node.type === 'INSTANCE' && node.mainComponent) return node.mainComponent.id;
  } catch (e) {}
  return null;
}

function nombreDeCard(node, esPlantilla) {
  var p = partesDeCard(node);
  if (!p) return null;

  function nombrarParte(t) {
    if (!esPlantilla) return t.texto;
    // El placeholder describe QUÉ dato va ahí. Sale del nombre de la capa; si
    // la capa se llama igual que su contenido —que es lo que hace Figma por
    // defecto— se usa el del contenedor, que sí lo describe:
    // "Chip / level" → [level].
    var base = (t.node.name || '').trim();
    if (!base || base === t.texto) {
      var p = t.node.parent;
      var pn = p ? (p.name || '').trim() : '';
      if (pn) base = pn.split('/').pop().trim();
    }
    if (!base || base === t.texto) base = 'dato';
    return '[' + base + ']';
  }

  var partes = [nombrarParte(p.titulo)].concat(p.meta.slice(0, 3).map(nombrarParte));
  return {
    nombre: partes.join(', '),
    titulo: nombrarParte(p.titulo),
    meta: p.meta.map(nombrarParte),
    plantilla: !!esPlantilla,
    cantidadTextos: p.todos.length
  };
}

// ─── aria-current: dónde estoy parado ────────────────────────────────────────
// Un ítem de navegación marcado como activo solo con color o negrita no le dice
// nada a un lector de pantalla. aria-current="page" es lo que lo comunica, y es
// de las cosas que más se olvidan.

var NAV_ITEM_WORDS = ['nav item', 'navitem', 'menu item', 'tab', 'breadcrumb',
                      'step', 'paso', 'pagination', 'nav /', 'sidebar item'];

function pareceItemDeNavegacion(node) {
  var n = (node.name || '').toLowerCase();
  if (NAV_ITEM_WORDS.some(function(k) { return n.indexOf(k) !== -1; })) return true;
  // O está dentro de una navegación reconocida
  var p = node.parent, g = 0;
  while (p && g++ < 4) {
    var pn = (p.name || '').toLowerCase();
    if (pn.indexOf('nav') !== -1 || pn.indexOf('sidebar') !== -1 ||
        pn.indexOf('menu') !== -1 || pn.indexOf('breadcrumb') !== -1) return true;
    p = p.parent;
  }
  return false;
}

// ¿Este ítem se ve como el activo? Fondo propio, variante seleccionada, o negrita
// cuando sus hermanos no la tienen.
function pareceActivo(node) {
  var estados = nodeVariantStates(node);
  if (estados.indexOf('selected') !== -1 || estados.indexOf('active') !== -1 ||
      estados.indexOf('current') !== -1) return 'variante seleccionada';

  var n = (node.name || '').toLowerCase();
  if (/\b(selected|active|current|activo|actual)\b/.test(n)) return 'el nombre dice que está activo';

  if (!node.parent || !('children' in node.parent)) return null;
  var hermanos = node.parent.children.filter(function(h) {
    return h.id !== node.id && isLayerVisible(h); });
  if (!hermanos.length) return null;

  // Fondo propio que ninguno de los hermanos tiene
  try {
    var propio = topSolidFill(node.fills);
    if (propio) {
      var conFondo = hermanos.filter(function(h) {
        return ('fills' in h) && topSolidFill(h.fills); });
      if (conFondo.length === 0) return 'es el único con fondo propio';
    }
  } catch (e) {}

  // Texto en negrita mientras los hermanos no la tienen
  try {
    var miTexto = directTextChildren(node)[0] ||
      getAllNodes(node).filter(function(t) { return t.type === 'TEXT'; })[0];
    if (miTexto && textMetrics(miTexto).bold) {
      var hermanosBold = hermanos.filter(function(h) {
        var t = getAllNodes(h).filter(function(x) { return x.type === 'TEXT'; })[0];
        return t && textMetrics(t).bold; });
      if (hermanosBold.length === 0) return 'es el único con el texto en negrita';
    }
  } catch (e) {}

  return null;
}

// ─── Botones de dos estados ──────────────────────────────────────────────────
// Un favorito, un "me gusta" o un "seguir" cambian de estado al accionarse.
// El nombre NO cambia: lo que cambia es aria-pressed. Y el mensaje que se anuncia
// después del cambio es otra cosa más, que va en una región viva.

// Ojo con estas: un toggle es un botón que queda MARCADO. "Guardar cambios" no
// lo es —es una acción que se ejecuta y termina—, y tratarlo como toggle le
// agregaba un aria-pressed que no corresponde. Se piden las formas que solo
// aparecen en toggles reales.
var TOGGLE_WORDS = ['favorite', 'favorito', 'like', 'me gusta', 'bookmark',
                    'follow', 'seguir', 'subscribe', 'suscribir', 'star',
                    'pin ', 'fijar', 'mute', 'silenciar', 'wishlist',
                    'guardar para', 'save for', 'saved', 'guardado'];

function esBotonDeDosEstados(node) {
  // Solo el nombre propio y el de lo que tiene ADENTRO. Subir por los ancestros
  // hacía que una pantalla llamada "My Favorites" convirtiera todos sus
  // controles en botones de dos estados.
  var propios = [(node.name || '').toLowerCase()];
  if ('children' in node) {
    getAllNodes(node).forEach(function(c) {
      if (c.id !== node.id) propios.push((c.name || '').toLowerCase());
    });
  }
  var texto = propios.join(' | ');
  return TOGGLE_WORDS.some(function(k) { return texto.indexOf(k) !== -1; });
}

// ─── Etiquetas vagas en controles ────────────────────────────────────────────
// "UNDO" solo no dice qué se deshace. En una lista de acciones anunciadas fuera
// de contexto —que es como las recorre un lector de pantalla— no significa nada.

var LABEL_VAGO = ['ok', 'aceptar', 'undo', 'deshacer', 'ver', 'ver más', 'ver mas',
                  'más', 'mas', 'more', 'ir', 'go', 'abrir', 'open', 'aplicar',
                  'apply', 'listo', 'done', 'sí', 'si', 'no', 'continuar', 'siguiente'];

function etiquetaEsVaga(texto) {
  if (!texto) return false;
  var t = texto.trim().toLowerCase();
  if (t.length > 18) return false;
  return LABEL_VAGO.indexOf(t) !== -1;
}

// ─── Reconocimiento de patrón ────────────────────────────────────────────────
// Se busca de la frase más específica a la más general: "tab button" antes que
// "button", "tabs container" antes que "tab". Sin eso, un contenedor de tabs
// matcheaba "tab" y se volvía una pestaña.

function _frasesOrdenadas() {
  var out = [];
  Object.keys(ARIA_PATTERNS).forEach(function(id) {
    (ARIA_PATTERNS[id].match || []).forEach(function(frase) {
      out.push({ id: id, frase: frase });
    });
  });
  out.sort(function(a, b) { return b.frase.length - a.frase.length; });
  return out;
}
var _FRASES = null;

function reconocerPatron(node) {
  if (!_FRASES) _FRASES = _frasesOrdenadas();
  var nombre = ' ' + (node.name || '').toLowerCase() + ' ';

  for (var i = 0; i < _FRASES.length; i++) {
    if (nombre.indexOf(_FRASES[i].frase) !== -1) {
      return { id: _FRASES[i].id, pattern: ARIA_PATTERNS[_FRASES[i].id],
               why: 'la capa se llama "' + _FRASES[i].frase.trim() + '"' };
    }
  }
  return null;
}

// ─── Nombre accesible ────────────────────────────────────────────────────────
// Un nombre accesible es UNA etiqueta. Cuando hace falta concatenar tres textos,
// lo que se está mirando es un bloque, no un control.

function nombreAccesible(node) {
  var textos = directTextChildren(node)
    .map(function(t) { try { return (t.characters || '').trim(); } catch (e) { return ''; } })
    .filter(function(t) { return t.length > 0; });

  if (node.type === 'TEXT') {
    var propio = '';
    try { propio = (node.characters || '').trim(); } catch (e) {}
    if (propio) return { nombre: propio.slice(0, 80), fuente: 'texto propio' };
  }

  if (textos.length === 0) return { nombre: null, fuente: null };
  if (textos.length === 1) return { nombre: textos[0].slice(0, 80), fuente: 'texto visible' };
  if (textos.length === 2 && textos[0].length <= 45) {
    return { nombre: textos[0].slice(0, 80), fuente: 'texto visible principal',
             secundario: textos[1] };
  }
  return { nombre: null, fuente: null, demasiados: textos.length };
}

// ─── Validación de las cinco reglas ──────────────────────────────────────────

function validarReglas(node, patron, spec) {
  var avisos = [];

  // Regla 1 — HTML nativo primero
  if (patron && patron.nativo && !spec.role) {
    avisos.push({
      regla: 1, severity: 'info', wcag: '4.1.2',
      text: ARIA_RULES[1].titulo + ': con ' + patron.nativo + ' alcanza. ' +
            'No agregues role, ya lo trae.'
    });
  }

  // Regla 3 — un rol custom promete teclado
  if (spec.role && patron && patron.focusable) {
    avisos.push({
      regla: 3, severity: 'warning', wcag: '2.1.1',
      text: ARIA_RULES[3].titulo + ': role="' + spec.role + '" necesita tabindex="0" y ' +
            'handlers de teclado. ' + (patron.teclado || '')
    });
  }

  // Regla 5 — sin nombre no hay control
  if (patron && patron.focusable && !spec.accessibleName) {
    avisos.push({
      regla: 5, severity: 'fail', wcag: '4.1.2',
      text: ARIA_RULES[5].titulo + ': este control no tiene texto visible, así que el nombre ' +
            'hay que escribirlo. ' + (patron.nombre ? 'Sale de: ' + patron.nombre + '.' : '')
    });
  }

  // Regla 4 — no esconder lo focusable
  if (spec.decorativo && patron && patron.focusable) {
    avisos.push({
      regla: 4, severity: 'fail', wcag: '4.1.2',
      text: ARIA_RULES[4].titulo + ': esto recibe foco, así que no puede ir con aria-hidden.'
    });
  }

  return avisos;
}

// ─── Restricciones estructurales ─────────────────────────────────────────────
// ARIA define padres e hijos obligatorios. Un role="tab" fuera de un tablist es
// un rol inválido: el lector lo ignora o lo anuncia mal.

function validarEstructura(node, patronId) {
  var p = ARIA_PATTERNS[patronId];
  if (!p) return [];
  var out = [];

  if (p.padre) {
    var encontrado = false, cur = node.parent, guard = 0;
    while (cur && guard++ < 8) {
      var r = reconocerPatron(cur);
      if (r && r.id === p.padre) { encontrado = true; break; }
      cur = cur.parent;
    }
    if (!encontrado) {
      out.push({
        severity: 'warning', wcag: '4.1.2',
        text: 'role="' + p.role + '" tiene que estar dentro de un role="' + p.padre + '". ' +
              'No encontré ese contenedor: si existe en el código, ignorá este aviso; ' +
              'si no, el rol queda inválido y el lector lo anuncia mal.'
      });
    }
  }

  if (p.hijos && p.hijos.length) {
    var hay = false;
    if ('children' in node) {
      getAllNodes(node).forEach(function(c) {
        if (c.id === node.id || hay) return;
        var r = reconocerPatron(c);
        if (r && p.hijos.indexOf(r.id) !== -1) hay = true;
      });
    }
    if (!hay) {
      out.push({
        severity: 'warning', wcag: '4.1.2',
        text: 'role="' + p.role + '" espera hijos con role="' + p.hijos.join('" o "') + '". ' +
              'Nombrá las capas de adentro para que se reconozcan.'
      });
    }
  }

  return out;
}

// ─── Snippet de código ───────────────────────────────────────────────────────

function snippetPara(spec, patron) {
  var nombre = spec.accessibleName;
  var placeholder = spec.nombreSugerido || 'describí acá qué pasa al activarlo';

  if (spec.decorativo) {
    return '<svg aria-hidden="true" focusable="false">…</svg>';
  }

  if (spec.regionViva) {
    return '<div role="' + (spec.role || 'status') + '" aria-live="polite" aria-atomic="true">\n' +
           '  <!-- el mensaje se inyecta acá -->\n</div>';
  }

  if (spec.esCard) {
    // Toda la card es un solo control. El nombre arranca por la acción.
    return '<a href="/destino" aria-label="Ir a ' + (nombre || placeholder) + '">\n' +
           '  <img src="…" alt="">\n' +
           '  <h3>…</h3>\n' +
           '  <span>…</span>\n' +
           '</a>';
  }

  if (spec.ariaCurrent) {
    return '<a href="/destino" aria-current="page">' + (nombre || placeholder) + '</a>';
  }

  if (!patron) {
    if (spec.estados && spec.estados.indexOf('aria-pressed') !== -1) {
      return '<button aria-pressed="false" aria-label="' + (nombre || placeholder) + '">\n' +
             '  <svg aria-hidden="true">…</svg>\n</button>';
    }
    return nombre
      ? '<button>' + nombre + '</button>'
      : '<button aria-label="' + placeholder + '">…</button>';
  }

  // Nativo, que es lo que casi siempre corresponde
  if (!spec.role && patron.nativo) {
    var tag = patron.nativo;
    if (patron.nativo === '<button>') {
      var pressed = (spec.estados && spec.estados.indexOf('aria-pressed') !== -1)
        ? ' aria-pressed="false"' : '';
      return nombre
        ? '<button' + pressed + '>' + nombre + '</button>'
        : '<button' + pressed + ' aria-label="' + placeholder + '">\n' +
          '  <svg aria-hidden="true">…</svg>\n</button>';
    }
    if (patron.nativo.indexOf('<a ') === 0) {
      return '<a href="/destino">' + (nombre || placeholder) + '</a>';
    }
    if (patron.nativo.indexOf('<input') === 0) {
      var tipo = patron.nativo.match(/type="([a-z]+)"/);
      return '<label for="campo">' + (nombre || placeholder) + '</label>\n' +
             '<input id="campo" type="' + (tipo ? tipo[1] : 'text') + '">';
    }
    if (patron.nativo === '<nav>' || patron.nativo === '<header>' ||
        patron.nativo === '<footer>' || patron.nativo === '<main>') {
      var t = patron.nativo.replace(/[<>]/g, '');
      return '<' + t + (nombre ? ' aria-label="' + nombre + '"' : '') + '>…</' + t + '>';
    }
    if (patron.nativo.indexOf('aria-expanded') !== -1) {
      return '<button aria-expanded="false" aria-controls="panel-1">' +
             (nombre || placeholder) + '</button>\n<div id="panel-1" hidden>…</div>';
    }
    if (patron.nativo.indexOf('aria-hidden') !== -1) {
      return '<svg aria-hidden="true" focusable="false">…</svg>';
    }
    return tag.replace('…', nombre || placeholder);
  }

  // Rol custom
  var attrs = ['role="' + spec.role + '"'];
  (spec.props || []).forEach(function(p) {
    if (p === 'aria-modal')       attrs.push('aria-modal="true"');
    else if (p === 'aria-labelledby') attrs.push('aria-labelledby="titulo-1"');
    else if (p === 'aria-describedby') attrs.push('aria-describedby="desc-1"');
    else if (p === 'aria-controls')   attrs.push('aria-controls="panel-1"');
    else if (p === 'aria-haspopup')   attrs.push('aria-haspopup="listbox"');
    else if (p === 'aria-live')       attrs.push('aria-live="polite"');
    else attrs.push(p + '="…"');
  });
  (spec.estados || []).forEach(function(e) {
    if (e === 'aria-checked' || e === 'aria-selected' || e === 'aria-expanded') attrs.push(e + '="false"');
    else if (e === 'aria-valuenow') attrs.push(e + '="50"');
    else attrs.push(e + '="…"');
  });
  if (patron.focusable) attrs.push('tabindex="0"');
  if (nombre) attrs.push('aria-label="' + nombre + '"');
  else if (patron.focusable) attrs.push('aria-label="' + placeholder + '"');

  return '<div ' + attrs.join(' ') + '>…</div>';
}

// ─── Punto de entrada ────────────────────────────────────────────────────────
// Devuelve la especificación completa de un nodo, o el motivo por el que no
// corresponde proponer nada.

function ariaSpec(node) {
  var patronMatch = reconocerPatron(node);
  var patron = patronMatch ? patronMatch.pattern : null;
  var patronId = patronMatch ? patronMatch.id : null;
  var interactivo = detectInteractive(node);
  var tieneReaccion = false;
  try { tieneReaccion = Array.isArray(node.reactions) && node.reactions.length > 0; } catch (e) {}

  // ── Descarte 1: ícono dentro de un control. Es decorativo, sin excepción.
  var padre = node.parent, guard = 0;
  while (padre && guard++ < 6) {
    if (detectInteractive(padre).is) {
      var esGlifo = GLYPH_TYPES.indexOf(node.type) !== -1 ||
                    (patronId === 'icon') || (patronId === 'image');
      if (esGlifo && !tieneReaccion) {
        return {
          skip: true, skipMotivo: 'decorativo', patronId: 'icon',
          patronLabel: 'Ícono decorativo',
          role: null, state: null, accessibleName: null, needsLabel: false,
          decorativo: true,
          snippet: '<svg aria-hidden="true" focusable="false">…</svg>',
          instruccion: 'Es el ícono de "' + (padre.name || 'un control') + '". El nombre lo lleva ' +
                       'el control; el ícono va con aria-hidden="true" para que el lector no lo ' +
                       'nombre dos veces.',
          notes: [{ wcag: '4.1.2', severity: 'info',
                    text: ARIA_RULES[4].titulo + '. ' + ARIA_RULES[4].texto }]
        };
      }
      break;
    }
    padre = padre.parent;
  }

  // ── Descarte 2: contenedor que agrupa controles y no es un patrón composite
  var controlesAdentro = contieneControles(node, node);
  var esComposite = patron && (patron.esContenedor || patron.hijos);
  // Una región viva (snackbar, toast, alerta) sigue siendo una región aunque
  // tenga botones adentro: el contenido se anuncia, los botones se accionan.
  var esRegionViva = patronId === 'alert' || patronId === 'status';
  if (!tieneReaccion && controlesAdentro >= 2 && !esComposite && !esRegionViva) {
    return {
      skip: true, skipMotivo: 'agrupación',
      role: null, state: null, accessibleName: null, needsLabel: false,
      instruccion: 'Contiene ' + controlesAdentro + ' controles: es una agrupación, no un control. ' +
                   'Los que reciben foco y nombre son los de adentro.',
      notes: [{ wcag: '4.1.2', severity: 'info',
                text: 'Si el grupo necesita semántica propia (tablist, toolbar, nav), nombrá la capa ' +
                      'con ese patrón para que el plugin lo reconozca.' }]
    };
  }

  // ── Descarte 3: ni patrón, ni interacción, ni estados
  if (!patron && !interactivo.is) {
    return {
      skip: true, skipMotivo: 'no es un control',
      role: null, state: null, accessibleName: null, needsLabel: false,
      instruccion: 'No es accionable ni corresponde a ningún patrón ARIA. Si es contenido que ' +
                   'informa, va con texto alternativo; si es decorativo, con aria-hidden="true".',
      notes: []
    };
  }

  // ── Descarte 4: patrón decorativo por defecto y sin señal de interacción
  var evidenciaFuerte = tieneReaccion || (interactivo.is && interactivo.confidence >= 0.7);
  if (patron && patron.decorativoPorDefecto && !evidenciaFuerte) {
    return {
      skip: true, skipMotivo: 'decorativo', patronId: patronId,
      patronLabel: patron.label,
      role: null, state: null, accessibleName: null, needsLabel: false, decorativo: true,
      snippet: '<svg aria-hidden="true" focusable="false">…</svg>',
      instruccion: 'Es un ícono sin acción propia. Va con aria-hidden="true". Si comunica algo por ' +
                   'sí mismo (un check de "listo", un ícono de error), necesita texto alternativo.',
      notes: []
    };
  }

  // ── Sí corresponde: se arma la especificación
  var nom = nombreAccesible(node);

  // Una card es UN control con UN nombre compuesto. Si es instancia de un
  // componente repetido, el handoff describe la plantilla, no esta aparición.
  var infoCard = null;
  if ((nom.demasiados || (tieneReaccion && directTextChildren(node).length >= 2)) && esCard(node)) {
    var clave = claveDeComponente(node);
    infoCard = nombreDeCard(node, !!clave);
    if (infoCard) {
      nom = { nombre: infoCard.nombre, fuente: infoCard.plantilla
        ? 'plantilla del componente' : 'texto visible de la card' };
    }
  }

  var spec = {
    skip: false,
    patronId: patronId,
    patronLabel: patron ? patron.label : 'Control',
    role: patron ? patron.role : null,
    estados: patron && patron.estados ? patron.estados.slice() : [],
    props: patron && patron.props ? patron.props.slice() : [],
    state: patron && patron.estados && patron.estados.length ? patron.estados[0] : null,
    accessibleName: nom.nombre,
    nombreFuente: nom.fuente,
    needsLabel: !nom.nombre,
    nativo: patron ? patron.nativo : null,
    teclado: patron ? patron.teclado : null,
    detectadoPor: patronMatch ? patronMatch.why : interactivo.why,
    notes: []
  };

  if (nom.demasiados) {
    spec.notes.push({
      wcag: '4.1.2', severity: 'warning',
      text: 'Contiene ' + nom.demasiados + ' textos distintos. Un nombre accesible es UNA etiqueta ' +
            'corta, no la suma de todo lo que hay adentro. Si es un control, escribí vos la etiqueta.'
    });
  }

  if (spec.needsLabel) {
    var sug = suggestActionLabel(node);
    spec.nombreSugerido = sug.label;
    spec.nombreConfiable = sug.confident;
  }

  // Una región viva se anuncia por su contenido: no lleva aria-label ni estados.
  if (patronId === 'alert' || patronId === 'status') {
    spec.accessibleName = null;
    spec.needsLabel = false;
    spec.estados = [];
    spec.regionViva = true;
    spec.props = (spec.props || []);
    if (spec.props.indexOf('aria-live') === -1 && patronId === 'status') spec.props.push('aria-live');
    spec.notes.push({
      wcag: '4.1.3', severity: 'warning',
      text: 'El mensaje se anuncia solo cuando aparece: el nombre es su propio texto, no un ' +
            'aria-label. El contenedor tiene que existir en el DOM ANTES de llenarse, o el lector ' +
            'no detecta el cambio. Para avisos que no interrumpen usá role="status".'
    });
  }

  if (infoCard) {
    spec.esCard = true;
    spec.claveComponente = claveDeComponente(node);
    spec.notes.push({
      wcag: '2.4.4', severity: 'info',
      text: 'Es una card completa: todo el bloque es UN solo control con UN nombre, no varios ' +
            'controles sueltos. El nombre junta el título y los metadatos, y conviene que empiece ' +
            'por la acción: "Ir al video de …".' +
            (infoCard.plantilla
              ? ' Como es instancia de un componente repetido, el nombre va como plantilla y el ' +
                'código completa los valores.'
              : '')
    });
    if (spec.role === null && !spec.nativo) {
      spec.nativo = '<a href="…">';
    }
  }

  // aria-current: dónde estoy parado. Marcar el ítem activo solo con color o
  // negrita no le llega a un lector de pantalla.
  if (pareceItemDeNavegacion(node)) {
    var activo = pareceActivo(node);
    if (activo) {
      spec.props = (spec.props || []).concat(['aria-current']);
      spec.ariaCurrent = true;
      spec.notes.push({
        wcag: '4.1.2', severity: 'warning',
        text: 'Se ve como el ítem activo de la navegación (' + activo + '), pero eso hoy solo se ' +
              'comunica visualmente. Agregá aria-current="page" —o "step", "date", "true" según el ' +
              'caso— para que el lector diga en cuál está parado.'
      });
    } else {
      spec.notes.push({
        wcag: '4.1.2', severity: 'info',
        text: 'Ítem de navegación: el que corresponda al lugar actual necesita aria-current. ' +
              'Solo uno del grupo lo lleva.'
      });
    }
  }

  // Botón de dos estados. La precedencia importa: un ítem de navegación llamado
  // "Favorites" no es un toggle, es un link a la sección de favoritos. Y una
  // región viva que MENCIONA favoritos tampoco.
  if (!spec.regionViva && !spec.ariaCurrent && !pareceItemDeNavegacion(node) &&
      esBotonDeDosEstados(node)) {
    if (spec.estados.indexOf('aria-pressed') === -1) spec.estados.push('aria-pressed');
    spec.dosEstados = true;
    spec.notes.push({
      wcag: '4.1.2', severity: 'warning',
      text: 'Es un botón de dos estados. El nombre NO cambia al accionarlo —queda "Agregar a ' +
            'favoritos" siempre—; lo que cambia es aria-pressed. Si además querés confirmar la ' +
            'acción ("se quitó de favoritos"), eso va en una región viva aparte, no en el nombre.'
    });
  }

  // Etiqueta vaga: fuera de contexto no dice nada
  if (nom.nombre && etiquetaEsVaga(nom.nombre)) {
    spec.etiquetaVaga = true;
    spec.notes.push({
      wcag: '2.4.4', severity: 'warning',
      text: '"' + nom.nombre + '" no dice sobre qué actúa. Un lector de pantalla puede listar los ' +
            'controles fuera de contexto. Dejá el texto visible corto y ampliá el nombre accesible: ' +
            'aria-label="' + nom.nombre + ' [qué cosa]". Tiene que EMPEZAR por el texto visible (2.5.3).'
    });
  }

  // 2.5.3 Label in Name
  if (nom.nombre && nom.fuente !== 'texto propio') {
    spec.notes.push({
      // No es informativo: es un requisito de AA. Si se rompe, el control deja
      // de funcionar por voz.
      wcag: '2.5.3', severity: 'warning',
      text: 'Ya hay texto visible ("' + nom.nombre + '"). Si agregás aria-label, tiene que empezar ' +
            'por ese mismo texto o se rompe el control por voz.'
    });
  }

  validarReglas(node, patron, spec).forEach(function(a) { spec.notes.push(a); });
  if (patronId) validarEstructura(node, patronId).forEach(function(a) { spec.notes.push(a); });

  if (patron && patron.errores) {
    spec.errores = patron.errores;
  }

  spec.snippet = snippetPara(spec, patron);
  spec.instruccion = instruccionPara(spec, patron);

  // Al panel solo van las notas que piden una acción. Las informativas —"con el
  // nativo alcanza", "si agregás aria-label tiene que empezar por…"— ya están
  // dichas en la instrucción y en el snippet, y enterraban lo accionable.
  spec.notes = (spec.notes || []).filter(function(n) { return n.severity !== 'info'; });

  return spec;
}

function instruccionPara(spec, patron) {
  if (!patron) {
    return spec.needsLabel
      ? 'Control sin texto visible: escribí un aria-label que describa la acción.'
      : 'Con HTML nativo alcanza: el texto visible ya es el nombre accesible.';
  }

  var partes = [];

  if (spec.needsLabel) {
    partes.push(spec.nombreConfiable
      ? 'Escribí aria-label="' + spec.nombreSugerido + '".'
      : 'Necesita un aria-label que describa la acción. La sugerencia es un punto de partida: ' +
        'cambiala por lo que el control realmente hace.');
  }

  if (!spec.role && patron.nativo) {
    partes.push('Implementalo con ' + patron.nativo + ': ya trae rol, foco y teclado.');
  } else if (spec.role) {
    partes.push('Componente custom: role="' + spec.role + '" más tabindex="0", y el teclado a mano.');
  }

  if (spec.estados && spec.estados.length) {
    partes.push('El JS tiene que mantener ' + spec.estados.join(' y ') + ' sincronizado con lo que se ve.');
  }
  if (spec.props && spec.props.length) {
    partes.push('Propiedades obligatorias: ' + spec.props.join(', ') + '.');
  }
  if (patron.teclado) partes.push('Teclado: ' + patron.teclado.toLowerCase() + '.');

  return partes.join(' ');
}

// ─── Compatibilidad con el resto del plugin ──────────────────────────────────
// El resto del código espera la forma vieja. Se traduce acá en vez de tocar
// cinco lugares distintos.


// Agrupa instancias del mismo componente que además comparten patrón y forma de
// nombre. Es lo que un diseñador hace a mano cuando anota "11, 13, 15" con una
// sola nota: el handoff describe el componente, no cada aparición.
function agruparRepetidos(items) {
  var porClave = {};
  items.forEach(function(it, idx) {
    var a = it.aria || {};
    var clave = a.claveComponente;
    if (!clave) return;
    var k = clave + '|' + (a.patronId || '') + '|' + (a.role || '') + '|' + (a.accessibleName || '');
    if (!porClave[k]) {
      porClave[k] = { clave: k, patronLabel: a.patronLabel, role: a.role,
                      nativo: a.nativo, accessibleName: a.accessibleName,
                      snippet: a.snippet, instruccion: a.instruccion,
                      esPlantilla: a.nombreFuente === 'plantilla del componente',
                      marcadores: [], nombres: [], nodeIds: [] };
    }
    porClave[k].marcadores.push(idx + 1);
    porClave[k].nombres.push(it.name);
    porClave[k].nodeIds.push(it.nodeId);
  });

  // Solo interesan los que se repiten de verdad
  return Object.keys(porClave)
    .map(function(k) { return porClave[k]; })
    .filter(function(g) { return g.marcadores.length >= 2; });
}


// ─── ¿Esta anotación ARIA vale la pena? ──────────────────────────────────────
// Listar todos los controles produce un choclo donde la mitad de las entradas
// dice "con <button> alcanza". Eso es correcto y es inútil: no hay nada que
// anotar ni que implementar distinto.
//
// El criterio es simple: una anotación sirve cuando SIN ELLA el control queda
// mal. Eso pasa en cinco casos, y solo en cinco.

function ariaVale(a) {
  if (!a || a.skip) return null;

  // 1. Sin texto visible no hay nombre accesible: el lector dice "botón" y nada más
  if (a.needsLabel) return { motivo: 'sin nombre', prioridad: 0,
    razon: 'No tiene texto visible: sin aria-label, un lector de pantalla lo anuncia como ' +
           '"botón" y nada más.' };

  // 2. Estados que el diseño muestra y el código tiene que sincronizar
  if (a.estados && a.estados.length) return { motivo: 'estado', prioridad: 1,
    razon: 'El diseño muestra las variantes, pero el valor lo actualiza el código. Sin ' +
           a.estados.join(' y ') + ', el cambio de estado no le llega a nadie.' };

  // 3. Patrón sin equivalente nativo: el rol hay que declararlo
  if (a.role) return { motivo: 'rol', prioridad: 2,
    razon: 'No existe un elemento HTML que haga esto: el rol y su estructura se declaran a mano.' };

  // 4. Propiedades obligatorias del patrón
  if (a.props && a.props.length) return { motivo: 'propiedades', prioridad: 3,
    razon: 'Este patrón exige ' + a.props.join(', ') + ' para funcionar.' };

  // 5. Región viva: lo que cambia solo tiene que anunciarse
  if (a.regionViva) return { motivo: 'región viva', prioridad: 1,
    razon: 'El contenido cambia solo y tiene que anunciarse sin robar el foco.' };

  // El resto: texto visible, sin estado, con nativo. No hay nada que anotar.
  return null;
}

function suggestAria(node) {
  var spec = ariaSpec(node);
  return {
    role: spec.role,
    state: spec.state,
    estados: spec.estados || [],
    props: spec.props || [],
    accessibleName: spec.accessibleName,
    nombreSugerido: spec.nombreSugerido,
    needsLabel: !!spec.needsLabel,
    skip: !!spec.skip,
    skipMotivo: spec.skipMotivo,
    decorativo: !!spec.decorativo,
    patronId: spec.patronId,
    patronLabel: spec.patronLabel,
    nativo: spec.nativo,
    teclado: spec.teclado,
    snippet: spec.snippet,
    instruccion: spec.instruccion,
    errores: spec.errores || [],
    detectadoPor: spec.detectadoPor,
    nombreFuente: spec.nombreFuente,
    // Campos del caso real: card compuesta, componente repetido, toggle,
    // ítem activo de navegación y etiqueta vaga.
    esCard: !!spec.esCard,
    claveComponente: spec.claveComponente || null,
    dosEstados: !!spec.dosEstados,
    ariaCurrent: !!spec.ariaCurrent,
    regionViva: !!spec.regionViva,
    etiquetaVaga: !!spec.etiquetaVaga,
    notes: spec.notes || []
  };
}

function descartarAria(node) {
  var spec = ariaSpec(node);
  if (!spec.skip) return null;
  return { motivo: spec.skipMotivo, texto: spec.instruccion };
}

// Si la persona corrigió el nombre en el panel, ese manda: se reemplaza en el
// código y en la instrucción, para que la hoja no diga dos nombres distintos.
function nombreFinal(item) {
  var a = (item && item.aria) || {};
  return a.nombreEditado || a.accessibleName || suggestActionLabel(item).label;
}

function conNombreEditado(texto, item) {
  var a = (item && item.aria) || {};
  if (!texto || !a.nombreEditado) return texto;
  var previo = a.accessibleName || a.nombreSugerido || '';
  var out = texto;
  if (previo) out = out.split('"' + previo + '"').join('"' + a.nombreEditado + '"');
  return out;
}

function ariaSnippetFor(item) {
  if (item && item.aria && item.aria.snippet) return conNombreEditado(item.aria.snippet, item);
  return suggestAria(item).snippet;
}

function ariaInstruction(item) {
  if (item && item.aria && item.aria.instruccion) return conNombreEditado(item.aria.instruccion, item);
  return suggestAria(item).instruccion;
}

// ─── ARIA annotations drawn on the canvas ────────────────────────────────────
// Little tags placed beside each control, in the numbered-badge + legend style
// the annotation kits use, so the developer reads it in the file, not in a doc.

function buildAriaOverlay(rootNode, items, agrupar) {
  var container = getOrCreateAnnotContainer();
  var name = 'WCAG ▸ [ARIA] ' + rootNode.name;

  for (var i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i].name === name) container.children[i].remove();
  }

  var overlay = figma.createFrame();
  overlay.name = name;
  overlay.fills = []; overlay.clipsContent = false;
  overlay.resize(1, 1);
  var ab = rootNode.absoluteBoundingBox;
  overlay.x = ab ? ab.x : 0;
  overlay.y = ab ? ab.y : 0;
  container.appendChild(overlay);
  sealOverlay(overlay);

  var oX = overlay.x, oY = overlay.y;
  var PURPLE = { r: 0.549, g: 0.192, b: 0.910 };
  var RED    = { r: 0.937, g: 0.306, b: 0.267 };
  var TAG    = 26;

  // On the canvas each control gets nothing but a numbered tag. Cramming the
  // role and the label beside every button buried the design under text; the
  // number points at the spec sheet, which is where the detail belongs.
  items.forEach(function(it, idx) {
    var missing = it.aria && it.aria.needsLabel;
    var accent  = missing ? RED : PURPLE;

    var tag = figma.createFrame();
    tag.name = String(idx + 1) + ' · ' + it.name;
    tag.layoutMode = 'HORIZONTAL';
    tag.primaryAxisSizingMode = 'FIXED';
    tag.counterAxisSizingMode = 'FIXED';
    tag.primaryAxisAlignItems = 'CENTER';
    tag.counterAxisAlignItems = 'CENTER';
    tag.paddingLeft = 0; tag.paddingRight = 0;
    tag.paddingTop = 0;  tag.paddingBottom = 0;
    tag.resize(TAG, TAG);
    tag.cornerRadius = 7;
    tag.fills = [{ type: 'SOLID', color: accent }];
    tag.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    tag.strokeWeight = 2;
    // Top-right corner of the control, hanging slightly outside it
    tag.x = (it.x || 0) - oX + (it.width || 0) - TAG / 2;
    tag.y = (it.y || 0) - oY - TAG / 2;
    overlay.appendChild(tag);

    var n = figma.createText();
    n.characters = String(idx + 1);
    n.fontSize = 13;
    n.fontName = { family: 'Inter', style: 'Bold' };
    n.textAlignHorizontal = 'CENTER';
    n.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    tag.appendChild(n);
  });

  buildAriaLegend(rootNode, items, agrupar);
  return overlay;
}

// The ARIA spec sheet: a real handoff document parked immediately to the RIGHT
// of the frame it describes, so designer and developer read them side by side.
// Each numbered entry answers three questions in order:
//   1. Qué es este control y cómo se llama para un lector de pantalla
//   2. Exactamente qué código escribir
//   3. Qué tiene que hacer el dev, en una frase

var MONO_FAMILY = 'Roboto Mono';

function buildAriaLegend(rootNode, items, agrupar) {
  var container = getOrCreateAnnotContainer();
  var name = 'WCAG ▸ [ARIA spec] ' + rootNode.name;
  for (var i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i].name === name) container.children[i].remove();
  }

  var W = 520, PAD = 28, GAP = 16;
  var sheet = figma.createFrame();
  sheet.name = name;
  sheet.resize(W, 100);                    // ancho antes del auto-layout
  sheet.layoutMode = 'VERTICAL';
  sheet.counterAxisSizingMode = 'FIXED';   // recuperar el ancho fijo
  sheet.primaryAxisSizingMode = 'AUTO';    // el alto crece con el contenido
  sheet.itemSpacing = GAP;
  sheet.paddingLeft = PAD; sheet.paddingRight = PAD;
  sheet.paddingTop = PAD;  sheet.paddingBottom = PAD;
  sheet.cornerRadius = 16;
  sheet.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  sheet.clipsContent = false;

  // Pegada al costado derecho del frame anotado, alineada arriba
  var ab = rootNode.absoluteBoundingBox;
  sheet.x = ab ? ab.x + ab.width + 64 : 0;
  sheet.y = ab ? ab.y : 0;
  container.appendChild(sheet);
  sealOverlay(sheet, false);   // documento: no tapa nada, queda movible

  var INK    = { r: 0.04, g: 0.04, b: 0.05 };
  var MUTED  = { r: 0.42, g: 0.42, b: 0.46 };
  var PURPLE = { r: 0.42, g: 0.14, b: 0.72 };
  var RED    = { r: 0.75, g: 0.16, b: 0.13 };
  var GREEN  = { r: 0.05, g: 0.45, b: 0.38 };

  function text(parent, chars, size, bold, colr, mono) {
    var t = figma.createText();
    t.characters = chars;
    t.fontSize = size;
    t.fontName = { family: mono ? MONO_FAMILY : 'Inter', style: bold ? 'Bold' : 'Regular' };
    t.fills = [{ type: 'SOLID', color: colr || INK }];
    parent.appendChild(t);
    t.textAutoResize = 'HEIGHT';   // primero fijar ancho
    t.layoutAlign = 'STRETCH';     // después estirar
    return t;
  }

  function column(parent, spacing, pad) {
    var c = figma.createFrame();
    c.layoutMode = 'VERTICAL';
    c.counterAxisSizingMode = 'FIXED';
    c.primaryAxisSizingMode = 'AUTO';
    c.itemSpacing = spacing;
    c.paddingLeft = pad || 0; c.paddingRight = pad || 0;
    c.paddingTop = pad || 0;  c.paddingBottom = pad || 0;
    c.fills = [];
    parent.appendChild(c);
    c.layoutAlign = 'STRETCH';
    return c;
  }

  // ── Encabezado
  var head = column(sheet, 5);
  text(head, 'Especificación ARIA', 22, true);
  text(head, rootNode.name + '  ·  ' + items.length + ' controles  ·  WCAG 2.2 AA (4.1.2, 1.1.1, 2.5.3)',
       11, false, MUTED);

  var intro = column(sheet, 5, 14);
  intro.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.98 } }];
  intro.cornerRadius = 10;
  text(intro, 'Para desarrollo', 10, true, MUTED);
  text(intro, 'Cada número de esta hoja corresponde al tag del mismo número sobre el diseño. ' +
       'El bloque de código es lo que hay que escribir; si el elemento ya es nativo no agregues ' +
       'ARIA de más, porque el ARIA redundante rompe más de lo que arregla.', 11, false, INK);
  text(intro, 'Tag violeta: control con su especificación.   Tag rojo: le falta el nombre accesible, ' +
       'es lo que bloquea el handoff.', 11, false, MUTED);
  if (agrupar === 'tipo') {
    text(intro, 'Ordenada por tipo de control: lo que se repite (rol, estados, teclado) se dice ' +
         'una sola vez por grupo, y abajo va el nombre de cada uno.', 11, false, MUTED);
  }

  // ── Por tipo: una tarjeta por patrón con lo común una vez y la lista de nombres
  if (agrupar === 'tipo') {
    var grupos = {}, orden = [];
    items.forEach(function(it, idx) {
      var a = it.aria || {};
      var k = (a.patronLabel || 'Control') + '|' + (a.role || a.nativo || '');
      if (!grupos[k]) { grupos[k] = []; orden.push(k); }
      grupos[k].push({ it: it, n: idx + 1 });
    });
    orden.forEach(function(k) {
      var lista = grupos[k];
      var a0 = lista[0].it.aria || {};
      var faltan = lista.filter(function(x) { return x.it.aria && x.it.aria.needsLabel &&
                                               !x.it.aria.nombreEditado; }).length;
      var card = column(sheet, 9, 16);
      card.cornerRadius = 12;
      card.fills = [{ type: 'SOLID', color: { r: 0.985, g: 0.985, b: 0.99 } }];
      card.strokes = [{ type: 'SOLID', color: faltan ? { r: 0.96, g: 0.85, b: 0.84 }
                                                     : { r: 0.9, g: 0.9, b: 0.93 } }];
      card.strokeWeight = 1;

      text(card, (a0.patronLabel || 'Control') + '  ·  ' + lista.length +
           (lista.length === 1 ? ' control' : ' controles') + '  ·  #' +
           lista.map(function(x) { return x.n; }).join(', #'), 13, true, INK);
      text(card, a0.role ? 'role="' + a0.role + '"' : (a0.nativo || 'HTML nativo'), 10.5, true, MUTED);
      if (a0.estados && a0.estados.length) text(card, 'Estados que sincroniza el JS: ' + a0.estados.join(', '), 10, false, MUTED);
      if (a0.props && a0.props.length)     text(card, 'Propiedades obligatorias: ' + a0.props.join(', '), 10, false, MUTED);
      if (a0.teclado)                      text(card, 'Teclado: ' + a0.teclado, 10, false, MUTED);

      var codeBlock = column(card, 0, 12);
      codeBlock.cornerRadius = 8;
      codeBlock.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.1 } }];
      // El código y la instrucción son del grupo: el nombre del primero se
      // reemplaza por un marcador, y el nombre de cada uno va en la lista.
      function generico(t) {
        if (lista.length < 2 || !t) return t;
        var n0 = nombreFinal(lista[0].it);
        return n0 ? t.split('"' + n0 + '"').join('"[nombre de cada uno]"') : t;
      }
      text(codeBlock, generico(ariaSnippetFor(lista[0].it)), 11, false, { r: 0.85, g: 0.78, b: 1 }, true);

      var nombres = column(card, 4);
      text(nombres, 'Nombre accesible de cada uno', 9.5, true, MUTED);
      lista.forEach(function(x) {
        var ax = x.it.aria || {};
        var falta = ax.needsLabel && !ax.nombreEditado;
        text(nombres, '#' + x.n + '   "' + nombreFinal(x.it) + '"' +
             (falta ? '   — propuesto, falta confirmarlo' : ''), 11, !!falta, falta ? RED : INK);
      });

      var todo = column(card, 0, 11);
      todo.cornerRadius = 8;
      todo.fills = [{ type: 'SOLID', color: faltan ? { r: 1, g: 0.96, b: 0.95 } : { r: 0.95, g: 0.98, b: 0.97 } }];
      text(todo, generico(ariaInstruction(lista[0].it)), 11, false, faltan ? RED : GREEN);
    });
  }

  // ── Una tarjeta por control, en el orden de la pantalla
  if (agrupar !== 'tipo') items.forEach(function(it, idx) {
    var missing = it.aria && it.aria.needsLabel;
    var card = column(sheet, 9, 16);
    card.cornerRadius = 12;
    card.fills = [{ type: 'SOLID', color: { r: 0.985, g: 0.985, b: 0.99 } }];
    card.strokes = [{ type: 'SOLID', color: missing ? { r: 0.96, g: 0.85, b: 0.84 }
                                                    : { r: 0.9, g: 0.9, b: 0.93 } }];
    card.strokeWeight = 1;

    // Título: número + nombre de capa
    var titleRow = figma.createFrame();
    titleRow.resize(W - PAD * 2 - 32, 24);
    titleRow.layoutMode = 'HORIZONTAL';
    titleRow.counterAxisSizingMode = 'AUTO';
    titleRow.primaryAxisSizingMode = 'FIXED';
    titleRow.counterAxisAlignItems = 'CENTER';
    titleRow.itemSpacing = 10;
    titleRow.fills = [];
    card.appendChild(titleRow);
    titleRow.layoutAlign = 'STRETCH';

    var badge = figma.createFrame();
    badge.layoutMode = 'HORIZONTAL';
    badge.primaryAxisSizingMode = 'FIXED';
    badge.counterAxisSizingMode = 'FIXED';
    badge.primaryAxisAlignItems = 'CENTER';
    badge.counterAxisAlignItems = 'CENTER';
    badge.resize(24, 24);
    badge.cornerRadius = 7;
    badge.fills = [{ type: 'SOLID', color: missing ? { r: 0.937, g: 0.306, b: 0.267 }
                                                   : { r: 0.549, g: 0.192, b: 0.910 } }];
    titleRow.appendChild(badge);
    var bn = figma.createText();
    bn.characters = String(idx + 1);
    bn.fontSize = 12;
    bn.fontName = { family: 'Inter', style: 'Bold' };
    bn.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    badge.appendChild(bn);

    var tn = figma.createText();
    tn.characters = it.name;
    tn.fontSize = 13;
    tn.fontName = { family: 'Inter', style: 'Bold' };
    tn.fills = [{ type: 'SOLID', color: INK }];
    titleRow.appendChild(tn);
    tn.textAutoResize = 'HEIGHT';
    tn.layoutGrow = 1;

    // Nombre accesible: siempre una propuesta concreta, nunca un reclamo
    var a = it.aria || {};
    var propuesto = nombreFinal(it);
    var esPropuesta = !a.accessibleName && !a.nombreEditado;

    var nameBlock = column(card, 3);
    text(nameBlock, 'Nombre accesible' + (a.nombreEditado ? ' — definido en diseño'
         : (esPropuesta ? ' — propuesto' : ' — ya lo da el texto visible')),
         9.5, true, MUTED);
    text(nameBlock, '"' + propuesto + '"', 13, true, esPropuesta ? PURPLE : GREEN);

    var meta = 'Patrón: ' + (a.patronLabel || 'control') +
               '   ·   ' + (a.role ? 'role="' + a.role + '"' : (a.nativo || 'HTML nativo'));
    text(card, meta, 10.5, true, MUTED);

    if (a.estados && a.estados.length) {
      text(card, 'Estados que sincroniza el JS: ' + a.estados.join(', '), 10, false, MUTED);
    }
    if (a.props && a.props.length) {
      text(card, 'Propiedades obligatorias: ' + a.props.join(', '), 10, false, MUTED);
    }
    if (a.teclado) {
      text(card, 'Teclado: ' + a.teclado, 10, false, MUTED);
    }

    // Código
    var codeBlock = column(card, 0, 12);
    codeBlock.cornerRadius = 8;
    codeBlock.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.1 } }];
    text(codeBlock, ariaSnippetFor(it), 11, false, { r: 0.85, g: 0.78, b: 1 }, true);

    // Qué hacer
    var todo = column(card, 0, 11);
    todo.cornerRadius = 8;
    todo.fills = [{ type: 'SOLID', color: missing ? { r: 1, g: 0.96, b: 0.95 }
                                                  : { r: 0.95, g: 0.98, b: 0.97 } }];
    text(todo, ariaInstruction(it), 11, false, missing ? RED : GREEN);

    // Los errores típicos del patrón se sacaron de la hoja: son material de
    // lectura y enterraban lo único que el dev necesita, que es el código.
  });

  // ── Recordatorios que aplican a toda la pantalla
  var foot = column(sheet, 6, 14);
  foot.cornerRadius = 10;
  foot.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.98 } }];
  text(foot, 'Vale para todos los controles de esta pantalla', 10, true, MUTED);
  text(foot, '·  El ícono adentro de un botón va con aria-hidden="true": si no, el lector lo nombra dos veces.', 11);
  text(foot, '·  El nombre describe la ACCIÓN ("Cerrar el diálogo"), nunca la forma ("equis").', 11);
  text(foot, '·  Si hay texto visible, el nombre accesible tiene que empezar por ese mismo texto, o se rompe el control por voz (2.5.3).', 11);
  text(foot, '·  Todo control necesita foco visible y responder a Enter y Espacio.', 11);

  return sheet;
}

// ─── 1. Color Contrast (WCAG 1.4.3) ─────────────────────────────────────────

function auditContrast(rootNode) {
  var issues = [];
  var passed = 0;

  getTextNodes(rootNode).forEach(function(node) {
    // Icon font glyphs are non-text content — skip here, handled by 1.4.11
    if (isIconFont(node)) return;
    if (!node.fills || !Array.isArray(node.fills)) return;
    var solidFill = node.fills.find(function(f) { return f.type === 'SOLID' && f.visible !== false; });
    if (!solidFill) return;

    // Combine fill opacity with node opacity for accurate effective color
    // Guard against figma.mixed (Symbol) returned for nodes with mixed character styles
    var fillAlpha  = typeof solidFill.opacity === 'number' ? solidFill.opacity : 1;
    var nodeAlpha  = typeof node.opacity       === 'number' ? node.opacity      : 1;
    var totalAlpha = fillAlpha * nodeAlpha;

    var rawR = solidFill.color.r * 255;
    var rawG = solidFill.color.g * 255;
    var rawB = solidFill.color.b * 255;

    var bg = resolveBackground(node);

    var effective = totalAlpha < 0.999
      ? blendOver(rawR, rawG, rawB, totalAlpha, bg.r, bg.g, bg.b)
      : { r: rawR, g: rawG, b: rawB };

    var fgR = effective.r;
    var fgG = effective.g;
    var fgB = effective.b;
    var fgHex = hexFromRGB(fgR / 255, fgG / 255, fgB / 255);
    var opacityNote = totalAlpha < 0.999 ? ' (opacity ' + Math.round(totalAlpha * 100) + '%)' : '';

    var fgL = relativeLuminance(fgR, fgG, fgB);
    var bgL = relativeLuminance(bg.r, bg.g, bg.b);
    var ratio = contrastRatio(fgL, bgL);

    // fontSize / fontWeight can be figma.mixed (Symbol) for mixed-style text nodes
    var met = textMetrics(node);
    var fontSize = met.fontSize;
    var isBold = met.bold;
    var isLargeText = met.isLarge;
    var required = isLargeText ? 3.0 : 4.5;

    var ratioFixed = Math.round(ratio * 100) / 100;

    if (ratio < required) {
      // WCAG contrast is binary: any ratio below the threshold is a failure.
      // 'fail' blocks development; 'warning' reserved for near-misses within 0.5 of threshold.
      // La norma exceptúa componentes inactivos y logotipos. Reportarlos entrena
      // a la gente a ignorar los hallazgos, que es peor que no reportar nada.
      var exencion = exencionDe(node);
      if (exencion) { passed++; return; }

      var manual = requiereRevisionManual(node);
      if (manual) {
        issues.push({
          type: 'contrast', severity: 'warning', nodeId: node.id,
          nodeName: node.name || 'Text node',
          message: 'No se puede medir el contraste de "' + (node.name || 'texto') +
                   '": tiene ' + manual + ' detrás. El valor cambia según el píxel.',
          fix: 'Revisalo a ojo sobre la zona más clara y la más oscura de la imagen, o poné ' +
               'una capa sólida o un velo detrás del texto para que el contraste sea estable.',
          wcag: '1.4.3',
          detail: { manual: true, motivo: manual }
        });
        return;
      }

      var contrastSeverity = ratio < (required - 0.5) ? 'fail' : 'warning';

      var suggestion = suggestAccessibleColor(
        { r: fgR, g: fgG, b: fgB },
        { r: bg.r, g: bg.g, b: bg.b },
        required, null,
        tokenDeNodo(node, { r: rawR, g: rawG, b: rawB })
      );

      var fixText = 'Adjust the text or background color to reach at least ' + required + ':1.';
      if (suggestion) {
        fixText = suggestion.token
          ? (suggestion.mismaFamilia
              ? 'Usá ' + suggestion.token + ' (' + suggestion.hex + '): es el escalón de la misma ' +
                'familia que llega a ' + suggestion.ratio + ':1. Cambia lo mínimo y sigue dentro del sistema.'
              : 'Usá ' + suggestion.token + ' (' + suggestion.hex + '), el token del sistema más ' +
                'cercano que pasa, con ' + suggestion.ratio + ':1.')
          : 'Probá ' + suggestion.hex + ': mismo tono, llega a ' + suggestion.ratio + ':1. ' +
            'No está en los estilos del archivo, así que conviene sumarlo a la escala.';
      }
      if (totalAlpha < 0.999) {
        fixText += ' The current opacity (' + Math.round(totalAlpha * 100) + '%) reduces effective contrast.';
      }

      issues.push({
        type: 'contrast',
        severity: contrastSeverity,
        nodeId: node.id,
        nodeName: node.name || 'Text node',
        message: 'Texto ' + fgHex + opacityNote + ' sobre ' + bg.hex + ' da ' + ratioFixed + ':1. ' +
          'Como es de ' + fontSize + 'px' + (isBold ? ' en negrita' : '') +
          (met.mixto ? ' (el más chico del nodo)' : '') + ', cuenta como ' +
          (isLargeText ? 'texto grande' : 'texto normal') + ' y necesita ' + required + ':1 en AA.',
        detail: {
          fg: fgHex, bg: bg.hex, ratio: ratioFixed, required: required, bgSource: bg.source,
          isLargeText: isLargeText, fontSize: fontSize, bold: isBold, mixto: met.mixto,
          // true when the background had to be flattened from semi-transparent layers,
          // or when no opaque background was found and white was assumed
          approximate: !!bg.approximate || !!bg.isDefault,
          suggestion: suggestion
        },
        wcag: '1.4.3',
        fix: fixText
      });
    } else {
      passed++;
    }
  });

  return { issues: issues, passed: passed };
}

// ─── 2. Typography (WCAG 1.4.4, 1.4.12) ─────────────────────────────────────
// 1.4.4: content must not be LOST when zoomed to 200% — checked via fixed
//         containers and truncation (which clip overflow).
// 1.4.12: content must survive when a user OVERRIDES spacing to the specified
//          values — not a requirement to pre-set those values in the design.
//          The only Figma-detectable proxies are the same fixed container /
//          truncation patterns already covered by 1.4.4.

var ICON_FONT_NAMES = ['icon', 'ico', 'glyph', 'v-icon', 'material', 'fontawesome', 'feather', 'ionicon'];

function isIconFont(node) {
  var name = (node.name || '').toLowerCase();
  var family = (node.fontName && node.fontName.family ? node.fontName.family : '').toLowerCase();
  return ICON_FONT_NAMES.some(function(kw) { return name === kw || name.indexOf(kw) !== -1 || family.indexOf(kw) !== -1; }) ||
    // Single-character nodes with non-alphanumeric content are likely icon glyphs
    (typeof node.characters === 'string' && node.characters.length === 1 && !/[a-zA-Z0-9]/.test(node.characters));
}

function auditTypography(rootNode) {
  var issues = [];
  var passed = 0;

  getTextNodes(rootNode).forEach(function(node) {
    // Skip icon font glyphs — not readable text
    if (isIconFont(node)) return;

    var nodeIssues = [];
    var name = node.name || 'Text node';
    var fs = typeof node.fontSize === 'number' ? node.fontSize : 0;

    // ── 1.4.4: Fixed-height container — clips content at 200% zoom ────────
    // textAutoResize / textTruncation can be figma.mixed for mixed-style nodes
    if (typeof node.textAutoResize === 'string' && node.textAutoResize === 'NONE') {
      nodeIssues.push({
        message: 'Contenedor de texto con alto fijo. El contenido se recorta al ampliar al 200% o cuando alguien aumenta el espaciado del texto.',
        fix: 'Pasá la caja a alto automático para que el contenedor crezca junto con el texto.',
        wcag: '1.4.4'
      });
    }

    // ── 1.4.4 / 1.4.12: Truncation — loses content when spacing overrides apply
    if (typeof node.textTruncation === 'string' && node.textTruncation === 'ENDING') {
      nodeIssues.push({
        message: 'Texto con truncado activo. El contenido se pierde cuando alguien aumenta el espaciado (1.4.12).',
        fix: 'Sacá el truncado, o dejá una forma de acceder al texto completo.',
        wcag: '1.4.12'
      });
    }

    // ── 1.4.12: Negative letter-spacing explicitly tightens text and may
    //            cause overlap when a user overrides to ≥0.12em ────────────
    // Guard: letterSpacing can be figma.mixed (Symbol) for mixed-style nodes
    if (node.letterSpacing && typeof node.letterSpacing === 'object') {
      var ls = node.letterSpacing;
      var lsPct = null;
      if (ls.unit === 'PERCENT') lsPct = ls.value;
      else if (ls.unit === 'PIXELS' && fs > 0) lsPct = (ls.value / fs) * 100;

      if (lsPct !== null && lsPct < -5) {
        nodeIssues.push({
          message: 'Negative letter spacing (' + (ls.unit === 'PIXELS' ? ls.value + 'px' : ls.value + '%') + '). Can cause character overlap when overridden by the user.',
          fix: 'Evitá el tracking negativo. Con valores neutros o positivos, los overrides de espaciado del usuario no rompen nada.',
          wcag: '1.4.12'
        });
      }
    }

    if (nodeIssues.length > 0) {
      nodeIssues.forEach(function(issue) {
        issues.push({
          type: 'typography',
          severity: 'warning',
          nodeId: node.id,
          nodeName: name,
          message: issue.message,
          fix: issue.fix,
          wcag: issue.wcag
        });
      });
    } else {
      passed++;
    }
  });

  return { issues: issues, passed: passed };
}

// ─── 3. Visual Hierarchy (WCAG 1.3.1) ────────────────────────────────────────

function auditHierarchy(rootNode) {
  var issues = [];
  var textNodes = getTextNodes(rootNode);
  var sizes = {};

  textNodes.forEach(function(node) {
    if (typeof node.fontSize === 'number') {
      var size = Math.round(node.fontSize);
      sizes[size] = (sizes[size] || 0) + 1;
    }
  });

  var sortedSizes = Object.keys(sizes).map(Number).sort(function(a, b) { return b - a; });

  if (sortedSizes.length < 2) {
    issues.push({
      type: 'hierarchy',
      severity: 'warning',
      nodeId: null,
      nodeName: 'Selection',
      message: 'Se detectó un solo tamaño de fuente. Sin al menos dos niveles no hay jerarquía visual: todo pesa igual.',
      fix: 'Definí al menos dos tamaños distintos: por ejemplo 24px para títulos y 16px para el cuerpo.',
      wcag: '1.3.1'
    });
  }

  var labels = ['H1', 'H2', 'H3', 'Body'];
  var hierarchy = sortedSizes.slice(0, 4).map(function(size, i) {
    return { label: labels[i] || 'Small', size: size, count: sizes[size] };
  });

  return { issues: issues, hierarchy: hierarchy, totalSizes: sortedSizes.length };
}

// ─── Interactive element helper (used by focus, images, non-text contrast) ────

// ─── Palabras de capa, separadas por lo que realmente prueban ────────────────
// Una sola lista mezclaba cosas muy distintas. "icon" y "tab" son sustantivos de
// CONTENIDO: un ícono es un dibujo, y un tab suele ser un contenedor. Tratarlos
// como prueba de que algo es un control convertía todos los íconos del archivo
// en botones — y encima, dos íconos adentro de un tab hacían que el tab pareciera
// una agrupación de controles y se descartara. Un error alimentaba al otro.

// PRUEBA: la palabra nombra un control. No hace falta nada más.
// Tipos de nodo que dibujan una forma: son el glifo en sí, no un contenedor
var GLYPH_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE'];

var CONTROL_KEYWORDS = ['button', 'btn', 'cta', 'link', 'submit', 'checkbox',
  'radio', 'toggle', 'switch', 'fab', 'menu item', 'menuitem', 'tab button',
  'nav item', 'navitem', 'list item', 'enlace', 'boton', 'botón',
  // Controles de formulario: la palabra nombra el control, no el contenido
  'input', 'select', 'dropdown', 'combo', 'combobox', 'slider', 'stepper',
  'textfield', 'text field', 'textarea', 'chip', 'searchbar', 'search bar',
  // Widgets con estado: si están en el archivo es porque se accionan
  'accordion', 'acordeon', 'acordeón', 'disclosure', 'expander', 'pagination',
  'paginacion', 'paginación', 'breadcrumb'];

// INDICIO: la palabra nombra una ACCIÓN. Sugiere control, pero necesita que
// además tenga forma de control o alguna otra señal.
var ACTION_KEYWORDS = ['close', 'cerrar', 'back', 'volver', 'next', 'siguiente',
  'search', 'buscar', 'add', 'agregar', 'delete', 'borrar', 'eliminar', 'edit',
  'editar', 'share', 'compartir', 'download', 'descargar', 'upload', 'subir',
  'play', 'pause', 'send', 'enviar', 'confirm', 'confirmar', 'cancel', 'cancelar'];

// NADA: la palabra describe contenido o estructura. Por sí sola no prueba nada.
// Ojo con el orden: 'tab' matchea dentro de 'tab button', así que CONTROL se
// evalúa primero y estas quedan como último recurso.
var CONTENT_KEYWORDS = ['icon', 'icono', 'ico', 'tab', 'nav', 'menu',
  'action', 'field', 'campo', 'container', 'contenedor'];

// Se mantiene por compatibilidad con el resto del código heredado
var INTERACTIVE_KEYWORDS = CONTROL_KEYWORDS.concat(ACTION_KEYWORDS).concat(CONTENT_KEYWORDS);

function isInteractive(node) {
  return detectInteractive(node).is;
}

// ─── Interactive detection ───────────────────────────────────────────────────
// Name keywords alone miss almost everything in a real file: designers do not
// name every layer "button". This looks at STRUCTURE first and falls back to
// the name, and reports WHY it decided, so the panel can explain itself.
//
// Signals, strongest first:
//   1. Prototype reactions  — an on-click connection is proof of intent.
//   2. Variant states       — a component with hover/pressed/focus variants
//                             exists precisely because it is operable.
//   3. Name keywords        — the old heuristic, still useful.
//   4. Shape heuristic      — a filled container with a single short text line
//                             and control-like proportions.

var STATE_WORDS = ['hover', 'pressed', 'active', 'focus', 'selected', 'checked', 'disabled'];

function nodeVariantStates(node) {
  var words = [];
  try {
    if (node.type === 'INSTANCE' && node.componentProperties) {
      Object.keys(node.componentProperties).forEach(function(k) {
        var v = node.componentProperties[k];
        if (v && typeof v.value === 'string') words.push((k + ' ' + v.value).toLowerCase());
      });
    }
    if (node.type === 'COMPONENT' && node.variantProperties) {
      Object.keys(node.variantProperties).forEach(function(k) {
        words.push((k + ' ' + node.variantProperties[k]).toLowerCase());
      });
    }
    if (node.parent && node.parent.type === 'COMPONENT_SET') {
      (node.parent.children || []).forEach(function(v) { words.push((v.name || '').toLowerCase()); });
    }
  } catch (e) {}
  return words.join(' ');
}

function directTextChildren(node) {
  if (!('children' in node)) return [];
  var out = [];
  (function walk(n, d) {
    if (d > 3) return;
    (n.children || []).forEach(function(c) {
      if (!isLayerVisible(c)) return;
      if (c.type === 'TEXT') out.push(c);
      else if ('children' in c) walk(c, d + 1);
    });
  })(node, 0);
  return out;
}

function hasPaint(node) {
  if ('fills' in node && topSolidFill(node.fills)) return true;
  try {
    if (Array.isArray(node.strokes) && node.strokes.some(function(s) {
      return s.visible !== false && s.type === 'SOLID';
    })) return true;
  } catch (e) {}
  return false;
}

function detectInteractive(node) {
  var no = { is: false, why: null, confidence: 0 };
  if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return no;

  // 1. Prototype reactions — the strongest possible signal
  try {
    if (Array.isArray(node.reactions) && node.reactions.length > 0) {
      return { is: true, why: 'tiene una interacción de prototipo conectada', confidence: 1 };
    }
  } catch (e) {}

  var name = (node.name || '').toLowerCase();

  // 2. Variant states
  var states = nodeVariantStates(node);
  var hits = STATE_WORDS.filter(function(w) { return states.indexOf(w) !== -1; });
  if (hits.length) {
    return { is: true, why: 'el componente tiene variantes de estado (' + hits.slice(0,3).join(', ') + ')', confidence: 0.9 };
  }

  // 3. Palabras que nombran un control: prueba suficiente
  for (var i = 0; i < CONTROL_KEYWORDS.length; i++) {
    if (name.indexOf(CONTROL_KEYWORDS[i]) !== -1) {
      return { is: true, why: 'la capa se llama "' + CONTROL_KEYWORDS[i] + '"', confidence: 0.75 };
    }
  }

  // 4. Palabras de acción: indicio, no prueba. Un ícono llamado "close" es un
  // botón solo si además tiene forma de control tocable. Un vector suelto
  // llamado "close" adentro de un botón es el dibujo, no el botón.
  var accion = null;
  for (var a = 0; a < ACTION_KEYWORDS.length; a++) {
    if (name.indexOf(ACTION_KEYWORDS[a]) !== -1) { accion = ACTION_KEYWORDS[a]; break; }
  }
  if (accion && GLYPH_TYPES.indexOf(node.type) === -1 &&
      typeof node.width === 'number' && node.width >= 24 && node.height >= 24 &&
      node.width <= 460 && hasPaint(node)) {
    // ¿Está adentro de otro control? Entonces el control es el de afuera.
    var dentroDeControl = false, p2 = node.parent, g2 = 0;
    while (p2 && g2++ < 4) {
      var np = (p2.name || '').toLowerCase();
      if (CONTROL_KEYWORDS.some(function(k) { return np.indexOf(k) !== -1; })) { dentroDeControl = true; break; }
      p2 = p2.parent;
    }
    if (!dentroDeControl) {
      return { is: true, why: 'nombra una acción ("' + accion + '") y tiene forma de control tocable',
               confidence: 0.6 };
    }
  }

  // 5. Forma — solo contenedores, nunca texto ni vectores sueltos
  if ((node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'GROUP')
      && typeof node.width === 'number' && typeof node.height === 'number') {
    var texts = directTextChildren(node);
    var oneLabel = texts.length === 1 && typeof texts[0].characters === 'string' &&
      texts[0].characters.trim().length > 0 && texts[0].characters.trim().length <= 28 &&
      texts[0].characters.indexOf('\n') === -1;
    var buttonish = node.height >= 20 && node.height <= 84 && node.width <= 460 && node.width >= 32;

    if (oneLabel && buttonish && hasPaint(node)) {
      return { is: true, why: 'contenedor con fondo y una sola etiqueta corta, con proporciones de control', confidence: 0.5 };
    }
    var square = Math.abs(node.width - node.height) <= 6 && node.width >= 16 && node.width <= 72;
    if (square && texts.length === 0 && hasPaint(node) && node.type !== 'GROUP') {
      return { is: true, why: 'contenedor cuadrado sin texto, con aspecto de botón de ícono', confidence: 0.4 };
    }
  }

  return no;
}


// ─── Métricas de texto, una sola vez ─────────────────────────────────────────
// Había dos lecturas distintas del mismo texto: una miraba node.fontWeight y la
// otra fontName.style, y ninguna manejaba los nodos con tamaños mixtos. Un
// título con una palabra en otro tamaño caía al default de 16px y se evaluaba
// como texto normal, exigiéndole 4.5:1 cuando le correspondía 3:1 — o al revés.
//
// Cuando el nodo tiene mezcla, manda el tamaño MÁS CHICO y la negrita solo
// cuenta si es de punta a punta: el requisito lo fija la parte más exigente.

function textMetrics(node) {
  var size = null, bold = null, mixto = false;

  try {
    if (typeof node.fontSize === 'number') size = node.fontSize;
    else if (node.fontSize !== undefined) {
      mixto = true;
      var len = 0;
      try { len = (node.characters || '').length; } catch (e) {}
      for (var i = 0; i < len; i++) {
        var s2 = node.getRangeFontSize(i, i + 1);
        if (typeof s2 === 'number' && (size === null || s2 < size)) size = s2;
      }
    }
  } catch (e) {}
  if (size === null) size = 16;

  function esNegrita(txt) {
    txt = String(txt || '').toLowerCase();
    return txt.indexOf('bold') !== -1 || txt.indexOf('black') !== -1 ||
           txt.indexOf('heavy') !== -1 || txt.indexOf('extrabold') !== -1;
  }

  try {
    if (typeof node.fontWeight === 'number') bold = node.fontWeight >= 700;
  } catch (e) {}

  if (bold === null) {
    try {
      if (node.fontName && typeof node.fontName === 'object' && node.fontName.style) {
        bold = esNegrita(node.fontName.style);
      } else if (node.fontName !== undefined) {
        // Estilos mezclados: solo cuenta como negrita si TODO el nodo lo es
        mixto = true;
        var n = 0; bold = true;
        try { n = (node.characters || '').length; } catch (e) {}
        for (var j = 0; j < n; j++) {
          var f = node.getRangeFontName(j, j + 1);
          if (!f || typeof f !== 'object' || !esNegrita(f.style)) { bold = false; break; }
        }
      }
    } catch (e) { bold = false; }
  }
  if (bold === null) bold = false;

  return {
    fontSize: Math.round(size * 10) / 10,
    bold: bold,
    mixto: mixto,
    // WCAG: grande es 18pt (≈24px) o 14pt bold (≈18.66px). En la práctica de
    // diseño digital se usa el equivalente en px que define la propia norma.
    isLarge: size >= 18 || (size >= 14 && bold),
    required: (size >= 18 || (size >= 14 && bold)) ? 3 : 4.5
  };
}

// ─── Contrast analysis: every pair, pass and fail, with roles ────────────────
// The audit only ever returned ISSUES, which is why the panel looked like it
// ignored most of the selection. This returns EVERY text/background pair it
// evaluated and where the background came from, so the panel can say exactly
// "this text, over this layer's fill, fails".

function describeContainer(node) {
  var solid = ('fills' in node) ? topSolidFill(node.fills) : null;
  if (!solid) {
    var inherited = resolveBackground(node);
    return {
      name: node.name || node.type, nodeId: node.id, type: node.type,
      hex: inherited.hex, transparent: true, source: inherited.source,
      note: 'Esta capa no tiene relleno propio: el fondo viene de ' + inherited.source + '.'
    };
  }
  var alpha = (typeof solid.opacity === 'number' ? solid.opacity : 1) *
              (typeof node.opacity === 'number' ? node.opacity : 1);
  return {
    name: node.name || node.type, nodeId: node.id, type: node.type,
    hex: hexFromRGB(solid.color.r, solid.color.g, solid.color.b),
    transparent: alpha < 0.999, opacity: Math.round(alpha * 100),
    source: node.name || node.type,
    note: alpha < 0.999
      ? 'El relleno está al ' + Math.round(alpha * 100) + '% de opacidad, así que el color efectivo se mezcla con lo que hay detrás.'
      : null
  };
}

function analyzeContrast(rootNode) {
  skippedHiddenLayers = 0;
  skippedHiddenNames  = [];

  var container = describeContainer(rootNode);
  var pairs = [];

  getTextNodes(rootNode).forEach(function(node) {
    if (!Array.isArray(node.fills)) return;
    var solid = topSolidFill(node.fills);
    if (!solid) return;

    var met = textMetrics(node);
    var fontSize = met.fontSize;
    var bold = met.bold;
    var isLarge = met.isLarge;

    var bg = resolveBackground(node);
    var totalAlpha = (typeof solid.opacity === 'number' ? solid.opacity : 1) *
                     (typeof node.opacity === 'number' ? node.opacity : 1);

    var fr = solid.color.r * 255, fg2 = solid.color.g * 255, fb = solid.color.b * 255;
    var rawHex = hexFromRGB(solid.color.r, solid.color.g, solid.color.b);
    var effHex = rawHex;
    if (totalAlpha < 0.999) {
      var bl = blendOver(fr, fg2, fb, totalAlpha, bg.r, bg.g, bg.b);
      fr = bl.r; fg2 = bl.g; fb = bl.b;
      effHex = hexFromRGB(fr / 255, fg2 / 255, fb / 255);
    }

    var ratio = contrastRatio(relativeLuminance(fr, fg2, fb), relativeLuminance(bg.r, bg.g, bg.b));
    var reqAA = isLarge ? 3 : 4.5, reqAAA = isLarge ? 4.5 : 7;
    var chars = '';
    try { chars = (node.characters || '').replace(/\s+/g, ' ').trim().slice(0, 60); } catch (e) {}

    pairs.push({
      nodeId: node.id, nodeName: node.name || 'Texto', text: chars,
      fg: effHex, fgRaw: rawHex, opacity: Math.round(totalAlpha * 100),
      bg: bg.hex, bgSource: bg.source,
      approximate: !!bg.approximate || !!bg.isDefault,
      fontSize: Math.round(fontSize * 10) / 10, bold: bold, isLarge: isLarge,
      ratio: Math.round(ratio * 100) / 100,
      requiredAA: reqAA, requiredAAA: reqAAA,
      passAA: ratio >= reqAA, passAAA: ratio >= reqAAA,
      suggestionAA: ratio >= reqAA ? null
        : suggestAccessibleColor({ r: fr, g: fg2, b: fb }, { r: bg.r, g: bg.g, b: bg.b }, reqAA, null,
            tokenDeNodo(node, { r: solid.color.r * 255, g: solid.color.g * 255, b: solid.color.b * 255 })),
      // Las dos sugerencias, para que cada tarjeta del panel elija la suya sin
      // volver a analizar: la del sistema y un color nuevo.
      sugerencias: ratio >= reqAA ? null : {
        sistema: suggestAccessibleColor({ r: fr, g: fg2, b: fb }, { r: bg.r, g: bg.g, b: bg.b }, reqAA, 'sistema',
            tokenDeNodo(node, { r: solid.color.r * 255, g: solid.color.g * 255, b: solid.color.b * 255 })),
        explorar: suggestAccessibleColor({ r: fr, g: fg2, b: fb }, { r: bg.r, g: bg.g, b: bg.b }, reqAA, 'explorar')
      }
    });
  });

  pairs.sort(function(a, b) { return a.ratio - b.ratio; });   // worst first

  // No text inside? The selection is still worth reporting: an icon, a border
  // or a divider has to reach 3:1 against what surrounds it (1.4.11). Without
  // this, selecting a shape looked like the plugin simply ignored it.
  var nonText = null;
  if (!pairs.length) {
    var own = ('fills' in rootNode) ? topSolidFill(rootNode.fills) : null;
    var stroke = null;
    try {
      if (Array.isArray(rootNode.strokes)) {
        stroke = rootNode.strokes.filter(function(st) {
          return st.type === 'SOLID' && st.visible !== false; }).pop() || null;
      }
    } catch (e) {}
    var paint = own || stroke;
    if (paint) {
      var behind = resolveBackground(rootNode);
      var pr = paint.color.r * 255, pg = paint.color.g * 255, pb = paint.color.b * 255;
      var nr = contrastRatio(relativeLuminance(pr, pg, pb),
                             relativeLuminance(behind.r, behind.g, behind.b));
      nonText = {
        role: own ? 'relleno' : 'borde',
        hex: hexFromRGB(paint.color.r, paint.color.g, paint.color.b),
        bg: behind.hex,
        bgSource: behind.source,
        ratio: Math.round(nr * 100) / 100,
        required: 3,
        pass: nr >= 3,
        approximate: !!behind.approximate || !!behind.isDefault
      };
    }
  }

  return {
    container: container, pairs: pairs, nonText: nonText,
    hiddenSkipped: skippedHiddenLayers,
    hiddenSample: skippedHiddenNames.slice(0, 10),
    interactive: detectInteractive(rootNode)
  };
}

// ─── Typography inventory (every text, not only the problems) ────────────────

// Mobile, tablet o desktop, por el ancho del frame de más arriba. Cambia qué
// tamaño de lectura conviene: en mobile se lee a menos distancia pero en una
// pantalla chica, y 16px es la referencia para texto de lectura.
function dispositivoDe(node) {
  var top = node;
  try {
    while (top.parent && top.parent.type !== 'PAGE' && top.parent.type !== 'DOCUMENT') top = top.parent;
  } catch (e) {}
  var w = 0;
  try { w = Math.round((top.absoluteBoundingBox && top.absoluteBoundingBox.width) || top.width || 0); } catch (e) {}
  var tipo = !w ? 'desconocido' : (w <= 480 ? 'mobile' : (w <= 1024 ? 'tablet' : 'desktop'));
  return { tipo: tipo, ancho: w, frame: top.name || '' };
}

// El tamaño de cuerpo: el más usado entre los textos largos. Lo que es
// bastante más grande que eso es un título, y a un título no se le pide el
// interlineado de un párrafo.
function cuerpoDe(textos) {
  var cuenta = {};
  textos.forEach(function(t) {
    if (t.size && t.largo >= 40) cuenta[t.size] = (cuenta[t.size] || 0) + t.largo;
  });
  var mejor = null;
  Object.keys(cuenta).forEach(function(k) { if (mejor === null || cuenta[k] > cuenta[mejor]) mejor = k; });
  if (mejor !== null) return Number(mejor);
  var sizes = textos.map(function(t) { return t.size; }).filter(Boolean).sort(function(a, b) { return a - b; });
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : 16;
}

// Inventario tipográfico. Separa dos cosas que antes se mezclaban:
//   · RIESGOS de WCAG: lo que se rompe al ampliar al 200% (1.4.4) o cuando la
//     persona fuerza más espaciado (1.4.12): alto fijo y truncado.
//   · RECOMENDACIONES de legibilidad, que no son requisito AA: WCAG no fija un
//     tamaño mínimo, y el interlineado de 1.5 es una pauta de 1.4.8 (AAA) para
//     párrafos, no un requisito de 1.4.12, que habla de lo que hace la persona.
function analyzeTypography(rootNode) {
  skippedHiddenLayers = 0;
  skippedHiddenNames  = [];

  var dispositivo = dispositivoDe(rootNode);
  var scale = {}, items = [], crudos = [];

  getTextNodes(rootNode).forEach(function(node) {
    var size = typeof node.fontSize === 'number' ? Math.round(node.fontSize * 10) / 10 : null;
    var chars = '';
    try { chars = (node.characters || '').replace(/\s+/g, ' ').trim(); } catch (e) {}
    crudos.push({ node: node, size: size, chars: chars, largo: chars.length });
  });
  var cuerpo = cuerpoDe(crudos);
  var lecturaMin = dispositivo.tipo === 'mobile' ? 16 : 14;

  crudos.forEach(function(c) {
    var node = c.node, size = c.size;
    var family = '', style = '';
    try {
      if (node.fontName && typeof node.fontName === 'object') {
        family = node.fontName.family || ''; style = node.fontName.style || '';
      } else { family = '(mixto)'; }
    } catch (e) { family = '(mixto)'; }

    var lh = null, lhUnit = '';
    try {
      if (node.lineHeight && typeof node.lineHeight === 'object') {
        if (node.lineHeight.unit === 'PIXELS')      { lh = node.lineHeight.value; lhUnit = 'px'; }
        else if (node.lineHeight.unit === 'PERCENT'){ lh = node.lineHeight.value; lhUnit = '%'; }
        else lhUnit = 'auto';
      }
    } catch (e) {}

    var esTitulo = !!size && size >= Math.max(18, cuerpo * 1.2) && c.largo < 80;
    // Texto de lectura: el que se lee de corrido, no una etiqueta de dos palabras
    var esLectura = !esTitulo && c.largo >= 40;
    var rol = esTitulo ? 'título' : (esLectura ? 'lectura' : 'etiqueta');

    var problems = [];

    // ── Riesgos WCAG
    try {
      if (node.textTruncation === 'ENDING') problems.push({ wcag: '1.4.4', severity: 'fail', tipo: 'riesgo',
        text: 'Tiene truncado: al ampliar al 200% o aumentar el espaciado, el texto se corta y se pierde.' });
    } catch (e) {}
    try {
      if (node.textAutoResize === 'NONE' && node.height && size && node.height < size * 1.2 * 1.9)
        problems.push({ wcag: '1.4.12', severity: 'warning', tipo: 'riesgo',
          text: 'Caja de alto fijo: si la persona aumenta el interlineado, el texto se sale o se recorta.' });
    } catch (e) {}

    // ── Recomendaciones de legibilidad (no son requisito AA)
    if (size !== null && size < 12) problems.push({ wcag: 'legibilidad', severity: 'info', tipo: 'recomendacion',
      text: 'Texto de ' + size + 'px. WCAG no fija un mínimo, pero por debajo de 12px cuesta leer; usalo solo para notas muy secundarias.' });
    else if (esLectura && size !== null && size < lecturaMin) problems.push({ wcag: 'legibilidad', severity: 'info', tipo: 'recomendacion',
      text: 'Texto de lectura de ' + size + 'px en ' + dispositivo.tipo + '. Para leer de corrido se recomienda ' + lecturaMin + 'px o más.' });

    var ratioLh = lhUnit === 'px' && size ? lh / size : (lhUnit === '%' ? lh / 100 : null);
    if (esLectura && ratioLh && ratioLh < 1.5) problems.push({ wcag: '1.4.8', severity: 'info', tipo: 'recomendacion',
      text: 'Interlineado de ' + (lhUnit === 'px' ? Math.round(lh) + 'px' : Math.round(lh) + '%') +
            ' (' + ratioLh.toFixed(2) + '×) en un párrafo. Para lectura cómoda se recomienda 1.5× (pauta de 1.4.8, AAA).' });

    var key = (size !== null ? size + 'px' : '?') + ' · ' + (style || '—');
    if (!scale[key]) scale[key] = { key: key, size: size, style: style, family: family, count: 0, problems: 0 };
    scale[key].count++;
    if (problems.some(function(p) { return p.tipo === 'riesgo'; })) scale[key].problems++;

    items.push({
      nodeId: node.id, nodeName: node.name || 'Texto', text: c.chars.slice(0, 50),
      size: size, family: family, style: style, rol: rol,
      lineHeight: lh, lineHeightUnit: lhUnit, problems: problems
    });
  });

  var scaleList = Object.keys(scale).map(function(k) { return scale[k]; });
  scaleList.sort(function(a, b) { return (b.size || 0) - (a.size || 0); });

  var fam = {};
  items.forEach(function(i) { if (i.family) fam[i.family] = (fam[i.family] || 0) + 1; });

  return {
    items: items, scale: scaleList,
    families: Object.keys(fam).map(function(f) { return { name: f, count: fam[f] }; }),
    total: items.length,
    withProblems: items.filter(function(i) { return i.problems.some(function(p) { return p.tipo === 'riesgo'; }); }).length,
    conRecomendaciones: items.filter(function(i) { return i.problems.some(function(p) { return p.tipo === 'recomendacion'; }); }).length,
    dispositivo: dispositivo, cuerpo: cuerpo, lecturaMin: lecturaMin,
    hiddenSkipped: skippedHiddenLayers
  };
}

// ─── 3b. Target Size (WCAG 2.5.5 AAA / 2.5.8 AA in WCAG 2.2) ─────────────────
// 2.5.8 (AA) requires 24×24 CSS px; 2.5.5 (AAA) requires 44×44.
// Cheap to check and one of the most commonly missed issues in design files.

var TARGET_MIN_AA  = 24;
var TARGET_MIN_AAA = 44;

function auditTargetSize(rootNode) {
  var issues = [];
  var passed = 0;
  var bajoAAA = [];   // cumplen AA pero no llegan a los 44px recomendados

  getAllNodes(rootNode).forEach(function(node) {
    if (!isInteractive(node)) return;
    if (typeof node.width !== 'number' || typeof node.height !== 'number') return;
    // Skip inline text links — 2.5.8 exempts targets inside a sentence
    if (node.type === 'TEXT') return;

    var w = Math.round(node.width);
    var h = Math.round(node.height);
    var smallest = Math.min(w, h);

    if (smallest < TARGET_MIN_AA) {
      issues.push({
        type: 'target',
        severity: 'fail',
        nodeId: node.id,
        nodeName: node.name || node.type,
        message: '"' + (node.name || node.type) + '" is ' + w + '×' + h + 'px. Minimum target size is ' + TARGET_MIN_AA + '×' + TARGET_MIN_AA + 'px (AA).',
        detail: { width: w, height: h, requiredAA: TARGET_MIN_AA, requiredAAA: TARGET_MIN_AAA },
        wcag: '2.5.8',
        fix: 'Agrandá el área tocable a por lo menos ' + TARGET_MIN_AA + '×' + TARGET_MIN_AA + 'px — padding on the container counts, the icon itself does not have to grow. Aim for ' + TARGET_MIN_AAA + '×' + TARGET_MIN_AAA + 'px on touch interfaces.'
      });
    } else if (smallest < TARGET_MIN_AAA) {
      // Cumple AA. La recomendación de 44px es AAA (2.5.5) y el plugin apunta a
      // AA: convertir cada control en un hallazgo llenaba el reporte de cosas
      // que pasan. Se cuentan y se resumen en una sola nota al final.
      bajoAAA.push({ nombre: node.name || node.type, w: w, h: h });
      passed++;
    } else {
      passed++;
    }
  });

  // Una sola nota para todos, en vez de un hallazgo por control
  if (bajoAAA.length) {
    issues.push({
      type: 'target', severity: 'warning', nodeId: null,
      nodeName: bajoAAA.length + ' controles entre 24 y 44px',
      message: bajoAAA.length + ' control' + (bajoAAA.length === 1 ? '' : 'es') +
               ' cumplen el mínimo de 24px (AA) pero no llegan a los 44px que se recomiendan ' +
               'para uso táctil: ' + bajoAAA.slice(0, 5).map(function(t) {
                 return t.nombre + ' (' + t.w + '×' + t.h + ')'; }).join(', ') +
               (bajoAAA.length > 5 ? ' y ' + (bajoAAA.length - 5) + ' más' : '') + '.',
      fix: 'No es un incumplimiento de AA. Si la pantalla es táctil, subirlos a 44×44px reduce ' +
           'los toques errados, sobre todo para quien tiene temblor o poca precisión.',
      wcag: '2.5.5',
      detail: { cantidad: bajoAAA.length, soloRecomendacion: true, nivel: 'AAA' }
    });
  }

  return { issues: issues, passed: passed };
}

// ─── 4. Focus Indicators (WCAG 2.4.7) ────────────────────────────────────────
// Heuristic: looks for component variants that do not include a "focus" state

function auditFocusStates(rootNode) {
  var issues = [];
  var passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    if (node.type !== 'COMPONENT_SET' && node.type !== 'COMPONENT') return;
    if (!isInteractive(node)) return;

    var nameLower = (node.name || '').toLowerCase();
    var hasFocusVariant = false;

    if (node.type === 'COMPONENT_SET' && node.children) {
      hasFocusVariant = node.children.some(function(child) {
        return (child.name || '').toLowerCase().indexOf('focus') !== -1;
      });
    } else {
      hasFocusVariant = nameLower.indexOf('focus') !== -1;
    }

    if (!hasFocusVariant) {
      issues.push({
        type: 'focus',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: 'Component "' + node.name + '" has no "focus" state variant defined.',
        fix: 'Agregá una variante de foco con un anillo visible de 2px como mínimo y 3:1 contra el fondo.',
        wcag: '2.4.7'
      });
    } else {
      // Variant exists — now verify it actually has a visible indicator
      var focusChild = null;
      if (node.type === 'COMPONENT_SET' && node.children) {
        focusChild = node.children.find(function(c) {
          return (c.name || '').toLowerCase().indexOf('focus') !== -1;
        });
      }

      if (focusChild) {
        // A visible focus indicator = at least one stroke anywhere in the subtree,
        // OR an effect (box-shadow / drop-shadow used as outline)
        var hasStroke = getAllNodes(focusChild).some(function(n) {
          return n.strokes && Array.isArray(n.strokes) &&
            n.strokes.some(function(s) {
              return s.type === 'SOLID' && s.visible !== false &&
                (s.strokeWeight === undefined || s.strokeWeight >= 1);
            });
        });
        var hasEffect = getAllNodes(focusChild).some(function(n) {
          return n.effects && Array.isArray(n.effects) &&
            n.effects.some(function(e) { return e.visible !== false; });
        });

        if (!hasStroke && !hasEffect) {
          issues.push({
            type: 'focus',
            severity: 'warning',
            nodeId: focusChild.id,
            nodeName: node.name,
            message: 'The "focus" variant of "' + node.name + '" exists but has no visible stroke or visual effect.',
            fix: 'Agregá un trazo de 2px como mínimo, con 3:1 contra el color de fondo.',
            wcag: '2.4.7'
          });
        } else {
          passed++;
        }
      } else {
        passed++;
      }
    }
  });

  return { issues: issues, passed: passed };
}

// ─── Accessibility Suggestion Helpers ────────────────────────────────────────

function suggestAriaLabel(nodeName) {
  var n = (nodeName || '').toLowerCase();
  if (n.indexOf('close')  !== -1 || n.indexOf('cerrar')   !== -1 || n.indexOf('dismiss')  !== -1) return 'Close';
  if (n.indexOf('menu')   !== -1 || n.indexOf('hamburger')!== -1 || n.indexOf('nav')       !== -1) return 'Open menu';
  if (n.indexOf('search') !== -1 || n.indexOf('buscar')   !== -1) return 'Search';
  if (n.indexOf('back')   !== -1 || n.indexOf('volver')   !== -1 || n.indexOf('atrás')     !== -1) return 'Go back';
  if (n.indexOf('next')   !== -1 || n.indexOf('siguiente')!== -1) return 'Next';
  if (n.indexOf('prev')   !== -1 || n.indexOf('anterior') !== -1) return 'Previous';
  if (n.indexOf('delete') !== -1 || n.indexOf('eliminar') !== -1 || n.indexOf('trash')     !== -1) return 'Delete';
  if (n.indexOf('edit')   !== -1 || n.indexOf('editar')   !== -1 || n.indexOf('pencil')    !== -1) return 'Edit';
  if (n.indexOf('add')    !== -1 || n.indexOf('agregar')  !== -1 || n.indexOf('plus')      !== -1) return 'Add';
  if (n.indexOf('filter') !== -1 || n.indexOf('filtrar')  !== -1) return 'Filter';
  if (n.indexOf('settings')!== -1|| n.indexOf('config')  !== -1 || n.indexOf('ajustes')   !== -1) return 'Settings';
  if (n.indexOf('info')   !== -1) return 'View info';
  if (n.indexOf('help')   !== -1 || n.indexOf('ayuda')    !== -1) return 'Help';
  if (n.indexOf('home')   !== -1 || n.indexOf('inicio')   !== -1) return 'Go home';
  if (n.indexOf('profile')!== -1 || n.indexOf('perfil')  !== -1 || n.indexOf('user')      !== -1 || n.indexOf('account') !== -1) return 'My profile';
  if (n.indexOf('notif')  !== -1 || n.indexOf('bell')     !== -1 || n.indexOf('campana')   !== -1) return 'Notifications';
  if (n.indexOf('play')   !== -1) return 'Play';
  if (n.indexOf('pause')  !== -1) return 'Pause';
  if (n.indexOf('refresh')!== -1 || n.indexOf('reload')  !== -1 || n.indexOf('actualizar')!== -1) return 'Refresh';
  if (n.indexOf('share')  !== -1 || n.indexOf('compartir')!== -1) return 'Share';
  if (n.indexOf('download')!== -1|| n.indexOf('descargar')!== -1) return 'Download';
  if (n.indexOf('upload') !== -1 || n.indexOf('subir')   !== -1) return 'Upload file';
  if (n.indexOf('calendar')!== -1|| n.indexOf('fecha')   !== -1) return 'Select date';
  if (n.indexOf('cart')   !== -1 || n.indexOf('carrito') !== -1) return 'Shopping cart';
  if (n.indexOf('like')   !== -1 || n.indexOf('favorito')!== -1 || n.indexOf('heart')     !== -1) return 'Like';
  if (n.indexOf('send')   !== -1 || n.indexOf('enviar')  !== -1) return 'Send';
  if (n.indexOf('copy')   !== -1 || n.indexOf('copiar')  !== -1) return 'Copy';
  if (n.indexOf('expand') !== -1 || n.indexOf('expandir')!== -1) return 'Expand';
  if (n.indexOf('collapse')!== -1|| n.indexOf('contraer')!== -1) return 'Collapse';
  if (n.indexOf('more')   !== -1) return 'More options';
  if (n.indexOf('print')  !== -1 || n.indexOf('imprimir')!== -1) return 'Print';
  if (n.indexOf('sort')   !== -1 || n.indexOf('ordenar') !== -1) return 'Sort';
  if (n.indexOf('lock')   !== -1 || n.indexOf('bloquear')!== -1) return 'Lock';
  if (n.indexOf('zoom')   !== -1) return 'Zoom';
  // Fallback: clean up the node name as a suggested label
  var clean = (nodeName || '').replace(/[-_\/\\.]/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > 2 ? clean : 'Describe button action';
}

function suggestAltText(nodeName) {
  var n = (nodeName || '').toLowerCase();
  if (n.indexOf('bg') !== -1 || n.indexOf('background') !== -1 || n.indexOf('fondo') !== -1 ||
      n.indexOf('pattern') !== -1 || n.indexOf('texture') !== -1 || n.indexOf('decorat') !== -1 || n.indexOf('abstract') !== -1) {
    return 'Appears decorative → rename the layer: "[decorative]"';
  }
  if (n.indexOf('logo') !== -1) {
    return 'Rename: \'alt: [Company] logo\'';
  }
  if (n.indexOf('avatar') !== -1 || n.indexOf('profile') !== -1 || n.indexOf('photo') !== -1 || n.indexOf('foto') !== -1) {
    return 'Rename: \'alt: Profile photo of [Username]\'';
  }
  if (n.indexOf('banner') !== -1 || n.indexOf('hero') !== -1 || n.indexOf('cover') !== -1 || n.indexOf('portada') !== -1) {
    return 'Rename: \'alt: [Brief banner description]\'';
  }
  if (n.indexOf('icon') !== -1 || n.indexOf('ico') !== -1 || n.indexOf('glyph') !== -1) {
    return 'If decorative: "[decorative]". If functional, apply aria-label to the interactive parent element.';
  }
  if (n.indexOf('map') !== -1 || n.indexOf('mapa') !== -1) {
    return 'Rename: \'alt: Map of [Location]\'';
  }
  if (n.indexOf('chart') !== -1 || n.indexOf('graph') !== -1 || n.indexOf('grafic') !== -1) {
    return 'Rename: \'alt: Chart of [Data description]\'';
  }
  var clean = (nodeName || '').replace(/[-_\/\\.]/g, ' ').replace(/\s+/g, ' ').trim();
  return 'Rename: \'alt: ' + clean + '\' or "[decorative]" if it carries no informational content.';
}

// ─── 6. Images & Alt Text (WCAG 1.1.1) ───────────────────────────────────────

function auditImages(rootNode) {
  var issues = [];
  var passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    var hasImageFill = 'fills' in node && Array.isArray(node.fills) &&
      node.fills.some(function(f) { return f.type === 'IMAGE'; });
    if (!hasImageFill) return;

    var name = (node.name || '').toLowerCase();
    var hasAltInName = name.indexOf('alt:') !== -1 || name.indexOf('[decorative]') !== -1 || name.indexOf('[img]') !== -1;

    if (!hasAltInName) {
      issues.push({
        type: 'image',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: '"' + node.name + '" contains an image with no alt text indicated in the layer name.',
        fix: suggestAltText(node.name),
        wcag: '1.1.1'
      });
    } else {
      passed++;
    }
  });

  // ── 1.1.1: Icon-only interactive elements — no visible text label ──────────
  // These need an accessible name (aria-label) documented in the handoff.
  getFrameAndComponentNodes(rootNode).forEach(function(node) {
    if (!isInteractive(node)) return;

    var allDescendants = getAllNodes(node);
    var hasText = allDescendants.some(function(n) {
      return n.type === 'TEXT' && n.characters && n.characters.trim().length > 0;
    });
    var hasIcon = allDescendants.some(function(n) {
      var nl = (n.name || '').toLowerCase();
      return nl.indexOf('icon') !== -1 || nl.indexOf('ico') !== -1 || nl.indexOf('glyph') !== -1;
    });
    var hasImageFill = allDescendants.some(function(n) {
      return n.fills && Array.isArray(n.fills) && n.fills.some(function(f) { return f.type === 'IMAGE'; });
    });

    // Flag: interactive + has icon/image + no text = icon-only button
    if (!hasText && (hasIcon || hasImageFill)) {
      // Don't double-report if already caught by image alt check above
      var alreadyReported = issues.some(function(i) { return i.nodeId === node.id; });
      if (!alreadyReported) {
        issues.push({
          type: 'image',
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: 'El control "' + node.name + '" no tiene texto visible: solo ícono o imagen. ' +
                   'Sin nombre accesible, un lector de pantalla lo anuncia como "botón" y nada más.',
          fix: 'Documentalo en el handoff: aria-label="' + suggestAriaLabel(node.name) + '". Anotalo sobre el componente en Figma.',
          wcag: '1.1.1'
        });
      }
    }
  });

  return { issues: issues, passed: passed };
}

// ─── 7. Non-text Contrast (WCAG 1.4.11) ─────────────────────────────────────
// Borders of inputs/buttons/checkboxes and icon fills need 3:1 vs adjacent color.
// Text nodes are excluded — those are covered by 1.4.3.

var FORM_KEYWORDS = ['input', 'field', 'checkbox', 'radio', 'select', 'textarea', 'search', 'combobox'];
var ICON_KEYWORDS = ['icon', 'ico', 'glyph'];

// ─── 2. Non-text contrast (WCAG 1.4.11) ─────────────────────────────────────
// El criterio pide 3:1 solo para lo que hace falta para IDENTIFICAR un
// componente o entender su estado: el glifo de un ícono, el borde de un input,
// el indicador de foco. NO pide nada para superficies decorativas.
//
// Confundir las dos cosas producía hallazgos falsos: un "Icon container" con
// fondo celeste sobre blanco se reportaba como que fallaba 1.27:1, cuando ese
// celeste es el fondo del ícono, no el ícono. Lo que tiene que contrastar es el
// glifo CONTRA ese celeste. La propia norma exempta lo decorativo.


// Un nodo es GLIFO si dibuja la forma en sí: un vector, o una figura chica sin
// hijos que pinten. Es SUPERFICIE si tiene adentro quien lleve el significado.
function paintedChildren(node) {
  if (!('children' in node)) return [];
  return node.children.filter(function(c) {
    if (!isLayerVisible(c)) return false;
    if (c.type === 'TEXT') return true;
    if (GLYPH_TYPES.indexOf(c.type) !== -1) return true;
    if ('fills' in c && topSolidFill(c.fills)) return true;
    if ('children' in c && c.children.length) return true;
    return false;
  });
}

function isGlyphNode(node) {
  if (GLYPH_TYPES.indexOf(node.type) !== -1) return true;
  // Una figura simple sin hijos pintados, y chica, es el ícono en sí
  if ((node.type === 'ELLIPSE' || node.type === 'RECTANGLE') &&
      paintedChildren(node).length === 0 &&
      typeof node.width === 'number' && node.width <= 64 && node.height <= 64) return true;
  return false;
}

function auditNonTextContrast(rootNode) {
  var issues = [];
  var passed = 0;
  var MIN_RATIO = 3.0;
  var seen = {};

  function check(node, r, g, b, kind, contra, contraNombre) {
    var key = node.id + ':' + kind;
    if (seen[key]) return;
    seen[key] = true;

    // Mismas exenciones que en el texto: inactivo y logotipo no tienen requisito
    if (exencionDe(node)) { passed++; return; }

    var bgL = relativeLuminance(contra.r, contra.g, contra.b);
    var ratio = Math.round(contrastRatio(relativeLuminance(r, g, b), bgL) * 100) / 100;
    var fgHex = hexFromRGB(r / 255, g / 255, b / 255);
    var bgHex = contra.hex || hexFromRGB(contra.r / 255, contra.g / 255, contra.b / 255);

    if (ratio < MIN_RATIO) {
      var etiqueta = kind === 'border' ? 'El borde de' : 'El ícono';
      issues.push({
        type: 'nontext',
        severity: ratio < (MIN_RATIO - 0.5) ? 'fail' : 'warning',
        nodeId: node.id,
        nodeName: node.name,
        message: etiqueta + ' "' + node.name + '" (' + fgHex + ') sobre ' + bgHex +
                 (contraNombre ? ' (' + contraNombre + ')' : '') +
                 ' da ' + ratio + ':1. Los elementos de interfaz necesitan 3:1.',
        fix: 'Oscurecé o aclará ' + (kind === 'border' ? 'el borde' : 'el ícono') +
             ' hasta llegar a 3:1 contra ' + bgHex + '.',
        wcag: '1.4.11',
        detail: { fg: fgHex, bg: bgHex, ratio: ratio, required: 3.0, kind: kind, nonText: true }
      });
    } else {
      passed++;
    }
  }

  // El fondo efectivo de un nodo: el relleno del contenedor si lo tiene, o lo
  // que haya más arriba. Es contra ESTO que tiene que contrastar el glifo.
  function fondoDe(node) {
    var b = resolveBackground(node);
    return { r: b.r, g: b.g, b: b.b, hex: b.hex, source: b.source };
  }

  getAllNodes(rootNode).forEach(function(node) {
    if (node.type === 'TEXT') return;
    var nameLower = (node.name || '').toLowerCase();

    var isForm = FORM_KEYWORDS.some(function(kw) { return nameLower.indexOf(kw) !== -1; });
    var isIconish = ICON_KEYWORDS.some(function(kw) { return nameLower.indexOf(kw) !== -1; });
    var isBtn = isInteractive(node) && !isIconish;

    // ── Bordes de campos y botones: sí identifican el control
    if ((isForm || isBtn) && Array.isArray(node.strokes)) {
      var stroke = null;
      for (var i = 0; i < node.strokes.length; i++) {
        var st = node.strokes[i];
        if (st.type === 'SOLID' && st.visible !== false &&
            (st.opacity === undefined || st.opacity > 0.1)) { stroke = st; break; }
      }
      if (stroke) {
        check(node, stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255,
              'border', fondoDe(node));
      }
    }

    // ── Íconos
    if (!isIconish) return;

    var hijos = paintedChildren(node);

    if (hijos.length > 0) {
      // Es un CONTENEDOR de ícono. Su relleno es el fondo, no el ícono: no se
      // audita. Lo que se audita es cada glifo de adentro contra ese fondo.
      var propio = ('fills' in node) ? topSolidFill(node.fills) : null;
      var fondo = propio
        ? { r: propio.color.r * 255, g: propio.color.g * 255, b: propio.color.b * 255,
            hex: hexFromRGB(propio.color.r, propio.color.g, propio.color.b),
            source: node.name }
        : fondoDe(node);

      getAllNodes(node).forEach(function(hijo) {
        if (hijo.id === node.id) return;
        if (hijo.type === 'TEXT') return;
        if (!isGlyphNode(hijo)) return;
        if (!('fills' in hijo)) return;
        var f = topSolidFill(hijo.fills);
        if (!f) return;
        check(hijo, f.color.r * 255, f.color.g * 255, f.color.b * 255,
              'icon', fondo, 'fondo de ' + node.name);
      });
      return;
    }

    // Sin hijos pintados: el nodo ES el glifo
    if (isGlyphNode(node) && 'fills' in node) {
      var solo = topSolidFill(node.fills);
      if (solo) {
        check(node, solo.color.r * 255, solo.color.g * 255, solo.color.b * 255,
              'icon', fondoDe(node));
      }
    }
  });

  return { issues: issues, passed: passed };
}

// ─── 8. Sensory Language (WCAG 1.3.3) ────────────────────────────────────────
// Instructions must not rely solely on sensory characteristics (shape, color,
// size, position). Detects instructional text that uses sensory-only cues to
// identify UI elements — e.g. "click the red button" or "the button on the left".
//
// Strategy: require an action verb in context so bare color names ("Rojo"),
// proper nouns ("Jess Brown") and product names ("Red Hat") are NOT flagged.

function auditSensoryLanguage(rootNode) {
  var issues = [];
  var passed = 0;

  // Action verbs that establish instructional context.
  // "haz" alone catches "haz clic", "haz click", "haz tap", etc.
  var ACTION = '(?:haz|click|presiona|pulsa|toca|selecciona|elige|escoge|abre|cierra|busca|arrastra|press|tap|find|select|use|open|close|see|refer|go)';

  // Sensory-only descriptor groups
  var COLORS    = '(?:rojo|roja|verde|azul|amarillo|amarilla|naranja|morado|morada|gris|negro|negra|blanco|blanca|rosa|red|green|blue|yellow|orange|purple|grey|gray|black|white|pink)';
  var POSITIONS = '(?:izquierda|derecha|arriba|abajo|superior|inferior|izquierdo|derecho|encima|debajo|left|right|above|below|top|bottom|upper|lower)';
  var SHAPES    = '(?:circular|cuadrado|cuadrada|redondo|redonda|triangular|rectangular|ovalado|ovalada|round|square|triangular|oval|rectangular)';

  // Within a single sentence (no crossing periods/newlines), look for
  // action verb followed within 80 chars by a sensory descriptor.
  var GAP = '[^.!?\\n]{0,80}';

  var sensoryChecks = [
    {
      regex: new RegExp('\\b' + ACTION + '\\b' + GAP + '\\b' + COLORS + '\\b', 'i'),
      kind: 'color',
      message: 'La instrucción usa el color como única referencia para identificar un elemento.',
      fix: 'Add the element name or label alongside the color. E.g. "Save button (green)" instead of just "the green button".'
    },
    {
      regex: new RegExp('\\b' + ACTION + '\\b' + GAP + '\\b' + POSITIONS + '\\b', 'i'),
      kind: 'position',
      message: 'La instrucción usa la posición como única referencia para identificar un elemento.',
      fix: 'Add the element name or label alongside the position. E.g. "Cancel button (left)" instead of "the button on the left".'
    },
    {
      regex: new RegExp('\\b' + ACTION + '\\b' + GAP + '\\b' + SHAPES + '\\b', 'i'),
      kind: 'shape',
      message: 'La instrucción usa la forma como única referencia para identificar un elemento.',
      fix: 'Add the element name or label alongside the shape. E.g. "close icon (circular)" instead of just "the circular icon".'
    }
  ];

  getTextNodes(rootNode).forEach(function(node) {
    if (isIconFont(node)) return;
    var text = typeof node.characters === 'string' ? node.characters.trim() : '';
    if (text.length < 8) return; // too short to contain an instruction

    var firstMatch = null;
    sensoryChecks.forEach(function(check) {
      if (firstMatch) return; // one issue per node
      if (check.regex.test(text)) firstMatch = check;
    });

    if (firstMatch) {
      issues.push({
        type: 'sensory',
        severity: 'warning',
        nodeId: node.id,
        nodeName: node.name || 'Text node',
        message: '"' + (node.name || 'Text node') + '": ' + firstMatch.message,
        fix: firstMatch.fix,
        wcag: '1.3.3'
      });
    } else {
      passed++;
    }
  });

  return { issues: issues, passed: passed };
}

// ─── Score Calculation ────────────────────────────────────────────────────────

function calculateScore(results) {
  var score = 10;

  // 1.4.3 Text contrast: highest weight
  var contrastIssues = results.contrast.issues.length;
  var totalText = contrastIssues + results.contrast.passed;
  if (totalText > 0 && contrastIssues > 0) score -= 4 * (contrastIssues / totalText);

  // 1.4.11 Non-text contrast
  var ntIssues = results.nontext.issues.length;
  var totalNt = ntIssues + results.nontext.passed;
  if (totalNt > 0 && ntIssues > 0) score -= 1.5 * (ntIssues / totalNt);

  // 1.4.4 / 1.4.12 Typography
  var typoIssues = results.typography.issues.length;
  var totalTypo = typoIssues + results.typography.passed;
  if (totalTypo > 0 && typoIssues > 0) score -= 2 * (typoIssues / totalTypo);

  // 1.3.1 Visual hierarchy
  if (results.hierarchy.issues.length > 0) score -= 1.5;

  // 2.4.7 Focus visible
  if (results.focus.issues.length > 0) score -= 1;

  // 1.3.3 Sensory language
  if (results.sensory && results.sensory.issues.length > 0) score -= 1;

  // 2.5.8 Target size — only hard fails count; AAA warnings do not lower an AA score
  if (results.target) {
    var targetFails = results.target.issues.filter(function(i) { return i.severity === 'fail'; }).length;
    var totalTargets = results.target.issues.length + results.target.passed;
    if (totalTargets > 0 && targetFails > 0) score -= 1 * (targetFails / totalTargets);
  }

  return Math.max(0, Math.round(score * 10) / 10);
}

// ─── Main Audit ───────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// AUDITORÍA CONSCIENTE DEL CONTEXTO
//
// Auditar una librería de componentes y auditar una pantalla son dos trabajos
// distintos. En una librería importa la cobertura: ¿todos los controles tienen
// estado de foco?, ¿la escala tipográfica tiene tamaños que no se pueden usar?
// En una pantalla importa la coherencia: ¿los encabezados saltan niveles?,
// ¿dos botones idénticos se llaman distinto?
//
// Este módulo hace tres cosas:
//   1. Detecta qué se está auditando.
//   2. Aplica las EXENCIONES que la propia norma define, para dejar de reportar
//      cosas que WCAG explícitamente no exige.
//   3. Suma criterios que solo tienen sentido a nivel sistema o pantalla.
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Exenciones de la norma ───────────────────────────────────────────────
// WCAG 1.4.3 y 1.4.11 dicen, con todas las letras, que los componentes
// INACTIVOS y los LOGOTIPOS no tienen requisito de contraste. El plugin los
// reportaba igual, y un estado disabled gris siempre va a "fallar" 4.5:1 — es
// gris a propósito. Reportarlo entrena a la gente a ignorar los hallazgos.

var DISABLED_WORDS = ['disabled', 'deshabilitado', 'inactive', 'inactivo',
                      'readonly', 'read-only', 'placeholder'];
var LOGO_WORDS     = ['logo', 'logotipo', 'isotipo', 'wordmark', 'brand', 'marca'];
var DECORATIVE_WORDS = ['decorative', 'decorativo', 'ornament', 'pattern', 'texture',
                        'bg', 'background', 'fondo', 'blur', 'gradient', 'shadow'];

function chainNames(node, hasta) {
  var out = [], cur = node, guard = 0;
  while (cur && guard++ < 40) {
    out.push((cur.name || '').toLowerCase());
    // Las variantes de instancia también nombran el estado
    try {
      if (cur.type === 'INSTANCE' && cur.componentProperties) {
        Object.keys(cur.componentProperties).forEach(function(k) {
          var v = cur.componentProperties[k];
          if (v && typeof v.value === 'string') out.push((k + '=' + v.value).toLowerCase());
        });
      }
      if (cur.variantProperties) {
        Object.keys(cur.variantProperties).forEach(function(k) {
          out.push((k + '=' + cur.variantProperties[k]).toLowerCase());
        });
      }
    } catch (e) {}
    if (hasta && cur.id === hasta.id) break;
    cur = cur.parent;
  }
  return out.join(' | ');
}

function matchAlguna(texto, palabras) {
  for (var i = 0; i < palabras.length; i++) {
    if (texto.indexOf(palabras[i]) !== -1) return palabras[i];
  }
  return null;
}

// Devuelve el motivo de exención, o null si el nodo sí debe cumplir.
function exencionDe(node) {
  var cadena = chainNames(node);

  var dis = matchAlguna(cadena, DISABLED_WORDS);
  if (dis) {
    return {
      motivo: 'estado inactivo',
      detalle: 'WCAG 1.4.3 y 1.4.11 no exigen contraste a los componentes inactivos. ' +
               'Un disabled gris está gris a propósito.',
      palabra: dis,
      wcag: '1.4.3'
    };
  }

  var logo = matchAlguna(cadena, LOGO_WORDS);
  if (logo) {
    return {
      motivo: 'logotipo',
      detalle: 'La norma exceptúa los logotipos: son parte de la identidad y no ' +
               'se les puede pedir que cambien de color.',
      palabra: logo,
      wcag: '1.4.3'
    };
  }

  return null;
}

// Un texto con relleno de imagen o gradiente detrás no se puede medir bien:
// mejor pedir revisión manual que dar un número inventado.
function requiereRevisionManual(node) {
  var cur = node.parent, guard = 0;
  while (cur && guard++ < 20) {
    try {
      if (Array.isArray(cur.fills)) {
        for (var i = 0; i < cur.fills.length; i++) {
          var f = cur.fills[i];
          if (f.visible === false) continue;
          if (f.type === 'IMAGE') return 'imagen de fondo';
          if (f.type && f.type.indexOf('GRADIENT') === 0) return 'degradado de fondo';
          if (f.type === 'VIDEO') return 'video de fondo';
        }
      }
      if (cur.type === 'FRAME' && topSolidFill(cur.fills)) return null;  // fondo sólido: se puede medir
    } catch (e) {}
    cur = cur.parent;
  }
  return null;
}

// ─── 2. Detección de contexto ────────────────────────────────────────────────

function detectarContexto(nodes) {
  var roots = Array.isArray(nodes) ? nodes : [nodes];
  var componentSets = 0, componentes = 0, instancias = 0, textos = 0, total = 0;
  var swatches = 0;

  roots.forEach(function(root) {
    getAllNodes(root).forEach(function(n) {
      total++;
      if (n.type === 'COMPONENT_SET') componentSets++;
      else if (n.type === 'COMPONENT') componentes++;
      else if (n.type === 'INSTANCE') instancias++;
      else if (n.type === 'TEXT') textos++;
      // Cuadrado chico de color sólido sin hijos: muestra de paleta
      if ((n.type === 'RECTANGLE' || n.type === 'ELLIPSE' || n.type === 'FRAME') &&
          typeof n.width === 'number' &&
          Math.abs(n.width - n.height) <= 12 && n.width >= 24 && n.width <= 160 &&
          (!('children' in n) || n.children.length === 0) &&
          'fills' in n && topSolidFill(n.fills)) swatches++;
    });
  });

  // Una librería tiene component sets: es su razón de ser
  if (componentSets >= 3 || (componentSets >= 1 && componentes >= 6)) {
    return { tipo: 'design-system', componentSets: componentSets, componentes: componentes,
             swatches: swatches, total: total,
             label: 'librería de componentes' };
  }
  // Muchas muestras de color y poco texto corrido: página de paleta
  if (swatches >= 8 && textos < swatches * 2) {
    return { tipo: 'paleta', swatches: swatches, total: total,
             label: 'página de paleta' };
  }
  // Un solo componente o instancia seleccionada
  if (roots.length === 1 &&
      (roots[0].type === 'COMPONENT' || roots[0].type === 'INSTANCE' ||
       roots[0].type === 'COMPONENT_SET')) {
    return { tipo: 'componente', total: total, label: 'componente' };
  }
  return { tipo: 'pantalla', textos: textos, instancias: instancias, total: total,
           label: roots.length > 1 ? 'flujo de ' + roots.length + ' pantallas' : 'pantalla' };
}

// ─── 3. Criterios de nivel librería ──────────────────────────────────────────

function auditDesignSystem(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];

  var sets = [];
  lista.forEach(function(root) {
    getAllNodes(root).forEach(function(n) {
      if (n.type === 'COMPONENT_SET') sets.push(n);
    });
  });

  sets.forEach(function(set) {
    var variantes = (set.children || []).filter(isLayerVisible);
    var nombres = variantes.map(function(v) { return (v.name || '').toLowerCase(); }).join(' | ');
    var pareceControl = detectInteractive(set).is ||
      variantes.some(function(v) { return detectInteractive(v).is; });
    if (!pareceControl) return;

    // 2.4.7 Foco visible: un control sin variante de foco no se puede documentar
    if (nombres.indexOf('focus') === -1 && nombres.indexOf('foco') === -1) {
      issues.push({
        type: 'ds', severity: 'fail', nodeId: set.id, nodeName: set.name,
        message: 'El componente "' + set.name + '" no tiene ninguna variante de foco. ' +
                 'Sin ella, nadie puede implementar ni revisar cómo se ve al navegar con Tab.',
        fix: 'Agregá una variante State=Focus con un indicador visible de 3:1 contra el fondo, ' +
             'separado del borde normal del control.',
        wcag: '2.4.7',
        detail: { variantes: variantes.length, nivel: 'sistema' }
      });
    } else passed++;

    // Un control sin estado inactivo obliga a inventarlo en desarrollo
    if (nombres.indexOf('disabled') === -1 && nombres.indexOf('deshabilitado') === -1) {
      issues.push({
        type: 'ds', severity: 'warning', nodeId: set.id, nodeName: set.name,
        message: '"' + set.name + '" no define estado inactivo. Sin él, cada dev lo inventa ' +
                 'y termina distinto en cada pantalla.',
        fix: 'Agregá una variante State=Disabled. No necesita cumplir contraste, pero sí ' +
             'tiene que distinguirse claramente del estado activo por algo más que el color.',
        wcag: '1.4.1',
        detail: { nivel: 'sistema' }
      });
    } else passed++;
  });

  return { issues: issues, passed: passed, sets: sets.length };
}

// ─── 4. Criterios de nivel pantalla ──────────────────────────────────────────

// Jerarquía de encabezados: el tamaño no alcanza, hay que poder inferir niveles.
function auditHeadingOrder(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];
  var headings = [];

  lista.forEach(function(root) {
    getAllNodes(root).forEach(function(n) {
      if (n.type !== 'TEXT') return;
      var nm = (n.name || '').toLowerCase();
      var m = nm.match(/\bh([1-6])\b/);
      if (!m) return;
      var b = absBox(n);
      headings.push({ nivel: parseInt(m[1], 10), node: n, y: b.y, x: b.x });
    });
  });

  if (headings.length < 2) return { issues: issues, passed: passed };

  headings.sort(function(a, b) { return a.y - b.y || a.x - b.x; });

  var h1 = headings.filter(function(h) { return h.nivel === 1; });
  if (h1.length === 0) {
    issues.push({
      type: 'heading', severity: 'warning',
      nodeId: headings[0].node.id, nodeName: headings[0].node.name,
      message: 'La pantalla no tiene ningún H1. El primer encabezado es H' + headings[0].nivel + '.',
      fix: 'Marcá el título principal como H1: es el punto de entrada cuando alguien navega por encabezados.',
      wcag: '1.3.1', detail: { nivel: 'pantalla' }
    });
  } else if (h1.length > 1) {
    issues.push({
      type: 'heading', severity: 'warning',
      nodeId: h1[1].node.id, nodeName: h1[1].node.name,
      message: 'Hay ' + h1.length + ' encabezados marcados como H1 en la misma pantalla.',
      fix: 'Dejá un solo H1 y bajá los demás a H2.',
      wcag: '1.3.1', detail: { nivel: 'pantalla' }
    });
  } else passed++;

  for (var i = 1; i < headings.length; i++) {
    var salto = headings[i].nivel - headings[i-1].nivel;
    if (salto > 1) {
      issues.push({
        type: 'heading', severity: 'fail',
        nodeId: headings[i].node.id, nodeName: headings[i].node.name,
        message: 'Se salta de H' + headings[i-1].nivel + ' a H' + headings[i].nivel +
                 '. Los niveles de encabezado no pueden saltear.',
        fix: 'Usá H' + (headings[i-1].nivel + 1) + ' acá, o subí el encabezado anterior.',
        wcag: '1.3.1', detail: { nivel: 'pantalla' }
      });
    } else passed++;
  }

  return { issues: issues, passed: passed };
}

// 2.4.4 — un link cuyo texto no dice adónde lleva, o dos links con el mismo
// texto que van a lugares distintos, son ilegibles fuera de contexto.
var TEXTO_VAGO = ['clic aca', 'clic acá', 'hacé clic', 'haz clic', 'click here', 'click aqui',
                  'ver mas', 'ver más', 'leer mas', 'leer más', 'mas info', 'más info',
                  'aqui', 'aquí', 'link', 'read more', 'learn more', 'continuar leyendo'];

function auditLinkText(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];
  var vistos = {};

  lista.forEach(function(root) {
    getAllNodes(root).forEach(function(n) {
      var nm = (n.name || '').toLowerCase();
      var esLink = nm.indexOf('link') !== -1 || nm.indexOf('enlace') !== -1;
      if (!esLink) return;

      var txt = '';
      try {
        if (n.type === 'TEXT') txt = (n.characters || '').trim();
        else {
          var hijos = directTextChildren(n);
          txt = hijos.map(function(t) { return (t.characters || '').trim(); }).join(' ');
        }
      } catch (e) {}
      if (!txt) return;

      var norm = txt.toLowerCase().replace(/\s+/g, ' ').trim();
      var vago = matchAlguna(norm, TEXTO_VAGO);
      if (vago && norm.length < 24) {
        issues.push({
          type: 'link', severity: 'warning', nodeId: n.id, nodeName: n.name,
          message: 'El link dice "' + txt + '", que fuera de contexto no dice adónde lleva. ' +
                   'Un lector de pantalla puede listar todos los links juntos.',
          fix: 'Escribí el destino en el propio link: "Leé cómo funciona la garantía" en vez de "' + txt + '".',
          wcag: '2.4.4', detail: { nivel: 'pantalla', texto: txt }
        });
      } else {
        if (vistos[norm]) vistos[norm].push(n); else vistos[norm] = [n];
        passed++;
      }
    });
  });

  return { issues: issues, passed: passed };
}

// 3.2.4 — el mismo control con nombres distintos en pantallas distintas obliga
// a reaprenderlo. Solo tiene sentido cuando se auditan varios frames juntos.
function auditConsistencia(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];
  if (lista.length < 2) return { issues: issues, passed: passed };

  // Agrupa controles por el componente maestro del que salen
  var porMaestro = {};
  lista.forEach(function(root, idx) {
    getAllNodes(root).forEach(function(n) {
      if (n.type !== 'INSTANCE') return;
      var mid = null;
      try { mid = n.mainComponent ? n.mainComponent.id : null; } catch (e) {}
      if (!mid) return;
      var etiqueta = directTextChildren(n)
        .map(function(t) { try { return (t.characters || '').trim(); } catch (e) { return ''; } })
        .join(' ').trim();
      if (!etiqueta) return;
      if (!porMaestro[mid]) porMaestro[mid] = [];
      porMaestro[mid].push({ node: n, etiqueta: etiqueta, frame: root.name, frameIdx: idx });
    });
  });

  Object.keys(porMaestro).forEach(function(mid) {
    var usos = porMaestro[mid];
    var frames = {};
    usos.forEach(function(u) { frames[u.frameIdx] = true; });
    if (Object.keys(frames).length < 2) return;

    var etiquetas = {};
    usos.forEach(function(u) { etiquetas[u.etiqueta.toLowerCase()] = u; });
    var distintas = Object.keys(etiquetas);

    if (distintas.length > 1) {
      var ejemplos = distintas.slice(0, 3).map(function(e) { return '"' + etiquetas[e].etiqueta + '"'; });
      issues.push({
        type: 'consistencia', severity: 'warning',
        nodeId: usos[0].node.id, nodeName: usos[0].node.name,
        message: 'El mismo componente se llama distinto en pantallas distintas: ' +
                 ejemplos.join(', ') + '. Quien no ve la pantalla tiene que reaprenderlo cada vez.',
        fix: 'Usá la misma etiqueta para la misma acción en todo el flujo.',
        wcag: '3.2.4', detail: { nivel: 'flujo', variantes: distintas.length }
      });
    } else passed++;
  });

  return { issues: issues, passed: passed };
}

// ─── 5. Escala tipográfica del sistema ───────────────────────────────────────
// A nivel librería no importa un texto suelto chico: importa si la ESCALA
// ofrece tamaños que no se deberían poder elegir.

function auditEscalaTipografica(roots) {
  var issues = [], passed = 0;
  var t = analyzeTypography(Array.isArray(roots) ? roots[0] : roots);

  t.scale.forEach(function(tok) {
    if (tok.size !== null && tok.size < 12) {
      issues.push({
        type: 'escala', severity: 'fail', nodeId: null, nodeName: tok.key,
        message: 'La escala incluye ' + tok.size + 'px (' + tok.count + ' uso' +
                 (tok.count === 1 ? '' : 's') + '). Un tamaño por debajo de 12px en la ' +
                 'librería se va a usar en producto.',
        fix: 'Sacá ese escalón de la escala, o subilo a 12px. Lo que no existe en el sistema no se puede elegir.',
        wcag: '1.4.4', detail: { nivel: 'sistema', size: tok.size }
      });
    } else passed++;
  });

  if (t.families.length > 3) {
    issues.push({
      type: 'escala', severity: 'warning', nodeId: null, nodeName: 'Familias tipográficas',
      message: 'La selección usa ' + t.families.length + ' familias tipográficas distintas: ' +
               t.families.map(function(f) { return f.name; }).slice(0, 5).join(', ') + '.',
      fix: 'Más de dos o tres familias suele ser señal de valores sueltos que no salen de la librería.',
      wcag: '1.4.4', detail: { nivel: 'sistema' }
    });
  }

  return { issues: issues, passed: passed, escala: t.scale, familias: t.families };
}

// ═════════════════════════════════════════════════════════════════════════════
// TIPOGRAFÍA Y LAYOUT
//
// Los chequeos de tamaño mínimo son el piso. Lo que más rompe en producto real
// es lo que pasa cuando el texto CRECE: cuando alguien aplica sus propios
// overrides de espaciado, cuando la pantalla es angosta, o cuando amplía al
// 200%. Nada de eso se ve en el diseño estático, y es exactamente lo que la
// norma exige soportar.
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1.4.12 Espaciado del texto ──────────────────────────────────────────────
// La norma define cuatro overrides que el contenido tiene que aguantar SIN
// perder contenido ni funcionalidad. No es una recomendación: es el criterio.
//
//   interlineado    ≥ 1.5 × el tamaño de fuente
//   espacio entre párrafos ≥ 2 × el tamaño de fuente
//   espaciado de letra ≥ 0.12 × el tamaño de fuente
//   espaciado de palabra ≥ 0.16 × el tamaño de fuente
//
// Se simula cuánto crece el bloque con esos valores y se compara contra el
// espacio que tiene. Un contenedor de alto fijo es el caso que siempre falla.

var TEXT_SPACING = {
  lineHeight: 1.5,
  paragraph: 2.0,
  letter: 0.12,
  word: 0.16
};

function anchoAproximado(chars, fontSize, letterSpacing) {
  // Ancho medio de glifo en una sans humanista: ~0.52em. Alcanza para estimar
  // si algo va a desbordar, que es lo único que se necesita acá.
  return chars * (fontSize * 0.52 + (letterSpacing || 0));
}

function auditTextSpacing(rootNode) {
  var issues = [], passed = 0;

  getTextNodes(rootNode).forEach(function(node) {
    var met = textMetrics(node);
    var size = met.fontSize;
    if (!size) return;

    var chars = '';
    try { chars = node.characters || ''; } catch (e) {}
    if (!chars.trim()) return;

    var w = node.width || 0, h = node.height || 0;
    var autoResize = 'NONE';
    try { autoResize = node.textAutoResize || 'NONE'; } catch (e) {}

    // Interlineado actual
    var lhPx = null;
    try {
      if (node.lineHeight && typeof node.lineHeight === 'object') {
        if (node.lineHeight.unit === 'PIXELS')       lhPx = node.lineHeight.value;
        else if (node.lineHeight.unit === 'PERCENT') lhPx = size * node.lineHeight.value / 100;
        else lhPx = size * 1.2;   // AUTO ronda 1.2 en la mayoría de las fuentes
      } else lhPx = size * 1.2;
    } catch (e) { lhPx = size * 1.2; }

    var lhRequerido = size * TEXT_SPACING.lineHeight;
    var lineas = Math.max(1, Math.round(h / Math.max(lhPx, 1)));

    // ── Crecimiento vertical al aplicar el interlineado de la norma
    if (lhPx < lhRequerido - 0.5) {
      var altoNuevo = lineas * lhRequerido;
      var crece = Math.round(altoNuevo - h);

      if (autoResize === 'NONE' && crece > 2) {
        issues.push({
          type: 'spacing', severity: 'fail', nodeId: node.id, nodeName: node.name || 'Texto',
          message: '"' + (node.name || 'Texto') + '" tiene interlineado de ' + Math.round(lhPx) +
                   'px y la norma exige soportar ' + Math.round(lhRequerido) + 'px. El contenedor es de ' +
                   'alto fijo, así que el texto crecería ' + crece + 'px y se recortaría.',
          fix: 'Pasá el contenedor a alto automático, o subí el interlineado a 1.5× (' +
               Math.round(lhRequerido) + 'px) desde ahora.',
          wcag: '1.4.12',
          detail: { lineHeightActual: Math.round(lhPx), lineHeightRequerido: Math.round(lhRequerido),
                    crecimiento: crece, lineas: lineas }
        });
      } else if (crece > 2) {
        issues.push({
          type: 'spacing', severity: 'warning', nodeId: node.id, nodeName: node.name || 'Texto',
          message: 'El interlineado es ' + Math.round(lhPx) + 'px sobre ' + size + 'px de fuente ' +
                   '(' + (lhPx / size).toFixed(2) + '×). Al aplicar el 1.5× que exige la norma, ' +
                   'el bloque crece ' + crece + 'px: verificá que lo de abajo no se pise.',
          fix: 'Subí el interlineado a 1.5× o dejá espacio para que crezca.',
          wcag: '1.4.12',
          detail: { lineHeightActual: Math.round(lhPx), lineHeightRequerido: Math.round(lhRequerido),
                    crecimiento: crece }
        });
      }
    } else passed++;

    // ── Crecimiento horizontal por espaciado de letra y palabra
    if (autoResize === 'NONE' || autoResize === 'HEIGHT') {
      var letras = chars.length;
      var palabras = chars.split(/\s+/).length - 1;
      var extra = letras * size * TEXT_SPACING.letter + palabras * size * TEXT_SPACING.word;
      var anchoActual = anchoAproximado(letras / Math.max(lineas, 1), size, 0);

      if (w > 0 && anchoActual > w * 0.88 && extra > w * 0.05) {
        issues.push({
          type: 'spacing', severity: 'warning', nodeId: node.id, nodeName: node.name || 'Texto',
          message: 'Con el espaciado de letra y palabra que exige la norma, este texto necesita ' +
                   'alrededor de ' + Math.round(extra) + 'px más de ancho, y hoy está usando casi ' +
                   'todo el que tiene.',
          fix: 'Dejá aire lateral, o permití que el texto pase a más líneas.',
          wcag: '1.4.12',
          detail: { anchoExtra: Math.round(extra), anchoActual: Math.round(w) }
        });
      }
    }
  });

  return { issues: issues, passed: passed };
}

// ─── 1.4.10 Reflow y 1.4.4 Zoom ──────────────────────────────────────────────
// A 320px de ancho el contenido tiene que reacomodarse sin scroll horizontal.
// Equivale a ampliar al 400% en una pantalla de 1280. En un archivo estático no
// se puede ejecutar, pero sí se puede detectar lo que garantiza que va a fallar:
// anchos fijos que no pueden encoger.

var ANCHO_REFLOW = 320;

function auditReflow(rootNode) {
  var issues = [], passed = 0;
  var b = absBox(rootNode);
  var anchoFrame = b.width || 0;

  if (anchoFrame <= ANCHO_REFLOW + 1) {
    // Ya es angosto: no hay nada que verificar
    return { issues: issues, passed: 1, ancho: anchoFrame };
  }

  // Hijos directos que no pueden encoger
  var rigidos = [];
  var kids = ('children' in rootNode) ? rootNode.children.filter(isLayerVisible) : [];

  kids.forEach(function(c) {
    var cb = absBox(c);
    if (cb.width < ANCHO_REFLOW * 0.6) return;   // ya cabe

    var puedeEncoger = false;
    try {
      // Auto-layout con fill, o constraint de escala, sí encogen
      if (c.layoutGrow === 1) puedeEncoger = true;
      if (c.layoutAlign === 'STRETCH') puedeEncoger = true;
      if (c.constraints && (c.constraints.horizontal === 'SCALE' ||
                            c.constraints.horizontal === 'STRETCH' ||
                            c.constraints.horizontal === 'LEFT_RIGHT')) puedeEncoger = true;
    } catch (e) {}

    if (!puedeEncoger) rigidos.push({ node: c, ancho: Math.round(cb.width) });
  });

  if (rigidos.length) {
    var peor = rigidos.sort(function(a, b2) { return b2.ancho - a.ancho; })[0];
    issues.push({
      type: 'reflow', severity: 'warning', nodeId: peor.node.id, nodeName: peor.node.name,
      message: rigidos.length + ' elemento' + (rigidos.length === 1 ? '' : 's') +
               ' con ancho fijo que no puede encoger. El más ancho es "' + peor.node.name +
               '" con ' + peor.ancho + 'px. A 320px de ancho —el equivalente a ampliar al 400%— ' +
               'esto obliga a scroll horizontal.',
      fix: 'Pasalos a auto-layout con fill, o poné constraints izquierda-derecha. ' +
           'Si algo no puede achicarse (una tabla, un gráfico), la norma lo exceptúa, ' +
           'pero tiene que poder desplazarse solo él, no la pantalla entera.',
      wcag: '1.4.10',
      detail: { anchoFrame: Math.round(anchoFrame), rigidos: rigidos.length,
                elementos: rigidos.slice(0, 5).map(function(r) { return r.node.name + ' (' + r.ancho + 'px)'; }) }
    });
  } else passed++;

  // ── 1.4.4: al 200% el texto duplica su tamaño. Los contenedores de alto fijo
  // con texto adentro son los que se rompen.
  var enRiesgo = [];
  getTextNodes(rootNode).forEach(function(t) {
    var ar = 'NONE';
    try { ar = t.textAutoResize || 'NONE'; } catch (e) {}
    if (ar !== 'NONE') return;
    var met = textMetrics(t);
    // ¿Entra el doble de alto en el espacio que tiene?
    if (t.height && met.fontSize && t.height < met.fontSize * 2.4) {
      enRiesgo.push(t);
    }
  });

  if (enRiesgo.length) {
    issues.push({
      type: 'reflow', severity: 'warning', nodeId: enRiesgo[0].id, nodeName: enRiesgo[0].name,
      message: enRiesgo.length + ' texto' + (enRiesgo.length === 1 ? '' : 's') +
               ' en contenedor de alto fijo, sin lugar para crecer. Al ampliar al 200% ' +
               'se recorta o se superpone.',
      fix: 'Alto automático en los contenedores de texto. Es el cambio que más rompimientos evita.',
      wcag: '1.4.4',
      detail: { cantidad: enRiesgo.length }
    });
  } else passed++;

  return { issues: issues, passed: passed, ancho: Math.round(anchoFrame) };
}

// ─── Legibilidad: longitud de línea, mayúsculas, justificado ─────────────────
// No son criterios de WCAG AA, pero son los tres problemas de legibilidad que
// más aparecen y los tres se ven en el archivo. Van como aviso, no como fallo:
// la diferencia importa para que nadie los confunda con un incumplimiento.

var MAX_CARACTERES_LINEA = 80;

function auditLegibilidad(rootNode) {
  var issues = [], passed = 0;

  getTextNodes(rootNode).forEach(function(node) {
    var chars = '';
    try { chars = node.characters || ''; } catch (e) {}
    if (!chars.trim()) return;

    var met = textMetrics(node);
    var nombre = node.name || 'Texto';

    // ── Longitud de línea
    // El problema es la línea que se LEE, no el ancho de la caja. Antes se
    // medía la capacidad del contenedor: un texto de ancho automático daba
    // "192 caracteres por línea" aunque tuviera ocho palabras en una sola
    // línea, y eso no le dice nada a nadie. Solo cuenta cuando el texto
    // realmente envuelve.
    var w = node.width || 0;
    var autoResize = 'NONE';
    try { autoResize = node.textAutoResize || 'NONE'; } catch (e) {}

    var anchoAutomatico = (autoResize === 'WIDTH_AND_HEIGHT');
    var caracteresReales = chars.replace(/\s+/g, ' ').trim().length;

    // ¿Cuántas líneas ocupa de verdad? Si es una sola, no hay salto de renglón
    // que dificultar.
    var lineasReales = 1;
    if (w > 0 && met.fontSize) {
      lineasReales = Math.max(1, Math.round(caracteresReales / Math.max(1, w / (met.fontSize * 0.52))));
    }

    if (!anchoAutomatico && w > 0 && met.fontSize && lineasReales >= 2) {
      var porLinea = Math.round(caracteresReales / lineasReales);
      if (porLinea > MAX_CARACTERES_LINEA) {
        issues.push({
          type: 'legibilidad', severity: 'warning', nodeId: node.id, nodeName: nombre,
          message: 'Este párrafo tiene unos ' + porLinea + ' caracteres por línea en ' +
                   lineasReales + ' líneas. Por encima de ' + MAX_CARACTERES_LINEA +
                   ' cuesta encontrar dónde sigue la lectura al saltar de renglón.',
          fix: 'Achicá el ancho a unos ' + Math.round(MAX_CARACTERES_LINEA * met.fontSize * 0.52) +
               'px, o subí el interlineado para compensar.',
          wcag: '1.4.8',
          detail: { caracteresPorLinea: porLinea, lineas: lineasReales,
                    recomendado: MAX_CARACTERES_LINEA }
        });
      } else passed++;
    } else passed++;

    // ── Mayúsculas sostenidas
    var textCase = null;
    try { textCase = node.textCase; } catch (e) {}
    var soloMayus = /^[^a-záéíóúñü]*$/.test(chars) && /[A-ZÁÉÍÓÚÑÜ]/.test(chars);
    var esMayus = textCase === 'UPPER' || soloMayus;

    if (esMayus && chars.trim().length > 15) {
      issues.push({
        type: 'legibilidad', severity: 'warning', nodeId: node.id, nodeName: nombre,
        message: 'Texto largo en mayúsculas sostenidas (' + chars.trim().length + ' caracteres). ' +
                 'Sin ascendentes ni descendentes, la palabra pierde su silueta y se lee letra por letra.',
        fix: 'Dejá las mayúsculas para etiquetas cortas. Si es decisión de marca, usá text-transform ' +
             'en CSS y no mayúsculas en el contenido: así el lector de pantalla no lo deletrea.',
        wcag: '1.4.8',
        detail: { caracteres: chars.trim().length, viaTextCase: textCase === 'UPPER' }
      });
    } else passed++;

    // ── Justificado
    var align = null;
    try { align = node.textAlignHorizontal; } catch (e) {}
    if (align === 'JUSTIFIED' && chars.trim().length > 60) {
      issues.push({
        type: 'legibilidad', severity: 'warning', nodeId: node.id, nodeName: nombre,
        message: 'Texto justificado. Los espacios irregulares entre palabras forman "ríos" ' +
                 'verticales que dificultan la lectura, sobre todo con dislexia.',
        fix: 'Alineá a la izquierda. Es el único caso donde WCAG desaconseja explícitamente ' +
             'una alineación (técnica C19).',
        wcag: '1.4.8',
        detail: { alineacion: 'JUSTIFIED' }
      });
    } else passed++;
  });

  return { issues: issues, passed: passed };
}

// ─── Placeholder usado como etiqueta ─────────────────────────────────────────
// El placeholder desaparece al escribir. Si es lo único que decía qué va en el
// campo, después de escribir nadie puede verificar qué completó — y quien usa
// lector de pantalla nunca lo supo.

var PLACEHOLDER_WORDS = ['placeholder', 'hint', 'ejemplo', 'ej.', 'e.g.'];

function esCampoDeFormulario(node) {
  var n = (node.name || '').toLowerCase();
  var porNombre = FORM_KEYWORDS.some(function(kw) { return n.indexOf(kw) !== -1; }) ||
    ['input', 'textfield', 'text field', 'textarea', 'select', 'dropdown', 'combobox']
      .some(function(kw) { return n.indexOf(kw) !== -1; });
  if (porNombre) return true;
  // Y si nadie renombró la capa, se reconoce por su silueta
  return pareceCampoPorForma(node);
}

function auditPlaceholder(rootNode) {
  var issues = [], passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    if (!esCampoDeFormulario(node)) return;
    if (!('children' in node)) return;

    var textos = directTextChildren(node);
    if (textos.length === 0) return;

    // ¿Hay una etiqueta afuera del campo, arriba o al lado?
    var b = absBox(node);
    var tieneLabelExterna = false;
    var padre = node.parent;
    if (padre && 'children' in padre) {
      padre.children.forEach(function(h) {
        if (h.id === node.id || !isLayerVisible(h)) return;
        var hb = absBox(h);
        var esTexto = h.type === 'TEXT' ||
          (('children' in h) && directTextChildren(h).length === 1);
        if (!esTexto) return;
        // Arriba del campo, a menos de 48px, o a la izquierda alineada
        var arriba = hb.y + hb.height <= b.y + 4 && b.y - (hb.y + hb.height) < 48;
        var izquierda = hb.x + hb.width <= b.x + 4 && Math.abs(hb.y - b.y) < 24;
        if (arriba || izquierda) tieneLabelExterna = true;
      });
    }

    // ¿El texto de adentro parece un placeholder?
    var interno = textos[0];
    var nombreInterno = (interno.name || '').toLowerCase();
    var pareceePlaceholder = PLACEHOLDER_WORDS.some(function(w) { return nombreInterno.indexOf(w) !== -1; });

    // O es gris flojo, que es la otra señal
    var grisFlojo = false;
    try {
      var f = topSolidFill(interno.fills);
      if (f) {
        var fondo = resolveBackground(interno);
        var r = contrastRatio(
          relativeLuminance(f.color.r * 255, f.color.g * 255, f.color.b * 255),
          relativeLuminance(fondo.r, fondo.g, fondo.b));
        grisFlojo = r < 4.5;
      }
    } catch (e) {}

    if (!tieneLabelExterna && (pareceePlaceholder || grisFlojo)) {
      var txt = '';
      try { txt = (interno.characters || '').trim().slice(0, 40); } catch (e) {}
      issues.push({
        type: 'placeholder', severity: 'fail', nodeId: node.id, nodeName: node.name || 'Campo',
        message: 'El campo "' + (node.name || 'sin nombre') + '" no tiene etiqueta visible: lo único ' +
                 'que dice qué va adentro es el placeholder' + (txt ? ' ("' + txt + '")' : '') +
                 ', y el placeholder desaparece al escribir.',
        fix: 'Agregá una etiqueta arriba del campo, siempre visible. El placeholder queda para el ' +
             'formato de ejemplo ("nombre@dominio.com"), nunca para decir qué campo es.',
        wcag: '3.3.2',
        detail: { placeholder: txt, grisFlojo: grisFlojo }
      });
    } else passed++;
  });

  return { issues: issues, passed: passed };
}

// ═════════════════════════════════════════════════════════════════════════════
// FORMULARIOS
//
// Es donde más se rompe la accesibilidad en producto real, y donde el diseño
// decide casi todo: si hay etiqueta visible, si el error se entiende, si el
// campo declara qué dato pide. Nada de eso lo puede arreglar desarrollo solo.
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1.3.5 Identificar el propósito del campo ────────────────────────────────
// Cada campo que pide un dato personal tiene que declarar cuál, con el token de
// autocomplete que define HTML. Eso permite autocompletar, y también que
// herramientas de apoyo pongan íconos o traduzcan el campo.

var AUTOCOMPLETE_MAP = [
  { kw: ['email', 'correo', 'e-mail', 'mail'],            token: 'email',             tipo: 'email',    teclado: 'email' },
  { kw: ['nombre completo', 'full name', 'fullname'],      token: 'name',              tipo: 'text',     teclado: 'text' },
  { kw: ['nombre', 'first name', 'firstname'],             token: 'given-name',        tipo: 'text',     teclado: 'text' },
  { kw: ['apellido', 'last name', 'surname'],              token: 'family-name',       tipo: 'text',     teclado: 'text' },
  { kw: ['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil'],
                                                           token: 'tel',               tipo: 'tel',      teclado: 'tel' },
  { kw: ['direccion', 'dirección', 'address', 'calle'],    token: 'street-address',    tipo: 'text',     teclado: 'text' },
  { kw: ['ciudad', 'city', 'localidad'],                   token: 'address-level2',    tipo: 'text',     teclado: 'text' },
  { kw: ['provincia', 'estado', 'state', 'region'],        token: 'address-level1',    tipo: 'text',     teclado: 'text' },
  { kw: ['codigo postal', 'código postal', 'zip', 'postal'],
                                                           token: 'postal-code',       tipo: 'text',     teclado: 'numeric' },
  { kw: ['pais', 'país', 'country'],                       token: 'country-name',      tipo: 'text',     teclado: 'text' },
  { kw: ['tarjeta', 'card number', 'numero de tarjeta'],   token: 'cc-number',         tipo: 'text',     teclado: 'numeric' },
  { kw: ['vencimiento', 'expiry', 'expiracion', 'expiración', 'mm/aa', 'mm/yy'],
                                                           token: 'cc-exp',            tipo: 'text',     teclado: 'numeric' },
  { kw: ['cvv', 'cvc', 'codigo de seguridad', 'security code'],
                                                           token: 'cc-csc',            tipo: 'text',     teclado: 'numeric' },
  { kw: ['titular', 'cardholder', 'nombre en la tarjeta'], token: 'cc-name',           tipo: 'text',     teclado: 'text' },
  { kw: ['contrasena', 'contraseña', 'password', 'clave'], token: 'current-password',  tipo: 'password', teclado: 'text' },
  { kw: ['nueva contrasena', 'nueva contraseña', 'new password'],
                                                           token: 'new-password',      tipo: 'password', teclado: 'text' },
  { kw: ['usuario', 'username'],                           token: 'username',          tipo: 'text',     teclado: 'text' },
  { kw: ['fecha de nacimiento', 'birth', 'nacimiento'],    token: 'bday',              tipo: 'date',     teclado: 'text' },
  { kw: ['organizacion', 'organización', 'empresa', 'company'],
                                                           token: 'organization',      tipo: 'text',     teclado: 'text' },
  { kw: ['busca', 'search', 'buscar'],                     token: null,                tipo: 'search',   teclado: 'search' },
  { kw: ['cantidad', 'quantity', 'monto', 'amount', 'numero', 'número'],
                                                           token: null,                tipo: 'number',   teclado: 'decimal' },
  { kw: ['url', 'sitio web', 'website'],                   token: 'url',               tipo: 'url',      teclado: 'url' }
];

function inferirCampo(texto) {
  var t = (texto || '').toLowerCase();
  // Se recorre buscando la frase más larga primero, para que "nueva contraseña"
  // le gane a "contraseña" y "nombre completo" a "nombre".
  var mejor = null, largo = 0;
  AUTOCOMPLETE_MAP.forEach(function(e) {
    e.kw.forEach(function(k) {
      if (t.indexOf(k) !== -1 && k.length > largo) { mejor = e; largo = k.length; }
    });
  });
  return mejor;
}

var REQUERIDO_WORDS = ['required', 'requerido', 'obligatorio', 'mandatory'];
var ERROR_WORDS = ['error', 'invalid', 'invalido', 'inválido', 'alerta', 'warning'];

function auditFormularios(rootNode) {
  var issues = [], passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    if (!esCampoDeFormulario(node)) return;

    var nombre = node.name || 'Campo';
    var b = absBox(node);

    // ── Buscar la etiqueta: adentro con nombre "label", o afuera cerca
    var labelTexto = null, labelExterna = false, labelNode = null;

    directTextChildren(node).forEach(function(t) {
      var n = (t.name || '').toLowerCase();
      if (n.indexOf('label') !== -1 || n.indexOf('etiqueta') !== -1) {
        try { labelTexto = (t.characters || '').trim(); } catch (e) {}
        labelNode = t;
      }
    });

    if (!labelTexto && node.parent && 'children' in node.parent) {
      node.parent.children.forEach(function(h) {
        if (h.id === node.id || !isLayerVisible(h) || labelTexto) return;
        var hb = absBox(h);
        var arriba = hb.y + hb.height <= b.y + 4 && b.y - (hb.y + hb.height) < 48;
        var izquierda = hb.x + hb.width <= b.x + 4 && Math.abs(hb.y - b.y) < 24;
        if (!arriba && !izquierda) return;
        var t = h.type === 'TEXT' ? h : directTextChildren(h)[0];
        if (!t) return;
        try { labelTexto = (t.characters || '').trim(); } catch (e) {}
        labelNode = t; labelExterna = true;
      });
    }

    // ── 1.3.5: token de autocomplete y tipo de input
    var pistas = nombre + ' ' + (labelTexto || '') + ' ' +
      directTextChildren(node).map(function(t) {
        try { return t.characters || ''; } catch (e) { return ''; } }).join(' ');
    var inferido = inferirCampo(pistas);

    if (inferido) {
      var partes = [];
      if (inferido.token) partes.push('autocomplete="' + inferido.token + '"');
      partes.push('type="' + inferido.tipo + '"');
      if (inferido.teclado !== 'text' && inferido.tipo === 'text') {
        partes.push('inputmode="' + inferido.teclado + '"');
      }
      issues.push({
        type: 'form', severity: 'warning', nodeId: node.id, nodeName: nombre,
        message: '"' + nombre + '" parece pedir un dato personal. Declararlo permite que el ' +
                 'navegador lo autocomplete, y en móvil que aparezca el teclado correcto.',
        fix: 'En el handoff: ' + partes.join('  ') + '. ' +
             (inferido.token
               ? 'El token de autocomplete es lo que exige 1.3.5.'
               : 'Este campo no tiene token de autocomplete, pero el type sí cambia el teclado.'),
        wcag: inferido.token ? '1.3.5' : '1.3.5',
        detail: { autocomplete: inferido.token, tipo: inferido.tipo,
                  inputmode: inferido.teclado, snippet: partes.join(' ') }
      });
    }

    // ── 3.3.2: etiqueta visible
    if (!labelTexto) {
      issues.push({
        type: 'form', severity: 'fail', nodeId: node.id, nodeName: nombre,
        message: 'El campo "' + nombre + '" no tiene ninguna etiqueta de texto asociada.',
        fix: 'Agregá un texto visible arriba del campo, a menos de 48px y alineado a la izquierda. ' +
             'En el código va como <label for="id-del-campo">.',
        wcag: '3.3.2',
        detail: { sinLabel: true }
      });
    } else {
      passed++;
      // La etiqueta existe pero está lejos: la asociación visual se pierde
      if (labelExterna && labelNode) {
        var lb = absBox(labelNode);
        var dist = b.y - (lb.y + lb.height);
        if (dist > 24) {
          issues.push({
            type: 'form', severity: 'warning', nodeId: node.id, nodeName: nombre,
            message: 'La etiqueta "' + labelTexto + '" está a ' + Math.round(dist) + 'px del campo. ' +
                     'A esa distancia deja de leerse como parte del mismo control, sobre todo con ' +
                     'zoom o lupa, donde no entran los dos en pantalla.',
            fix: 'Acercala a menos de 8px del campo y separá más de los campos vecinos: la ' +
                 'proximidad es lo que agrupa.',
            wcag: '1.3.1',
            detail: { distancia: Math.round(dist) }
          });
        }
      }
    }

    // ── 3.3.2 / 1.4.1: indicación de requerido
    var textoCompleto = pistas.toLowerCase();
    var tieneAsterisco = /\*/.test(pistas);
    var dicePalabra = REQUERIDO_WORDS.some(function(w) { return textoCompleto.indexOf(w) !== -1; });

    if (tieneAsterisco && !dicePalabra) {
      issues.push({
        type: 'form', severity: 'warning', nodeId: node.id, nodeName: nombre,
        message: 'El campo marca que es obligatorio solo con un asterisco. Un lector de pantalla ' +
                 'lo anuncia como "asterisco" o lo omite, y sin la leyenda al principio del ' +
                 'formulario nadie sabe qué significa.',
        fix: 'Agregá la palabra "(requerido)" en la etiqueta, o poné una leyenda visible arriba del ' +
             'formulario explicando el asterisco. En el código, además, required y aria-required.',
        wcag: '3.3.2',
        detail: { asteriscoSolo: true }
      });
    } else if (dicePalabra) passed++;

    // ── 3.3.1: mensaje de error cerca y asociado
    if (node.parent && 'children' in node.parent) {
      node.parent.children.forEach(function(h) {
        if (h.id === node.id || !isLayerVisible(h)) return;
        var hn = (h.name || '').toLowerCase();
        if (!ERROR_WORDS.some(function(w) { return hn.indexOf(w) !== -1; })) return;
        var hb = absBox(h);
        var debajo = hb.y >= b.y + b.height - 4;
        var dist2 = hb.y - (b.y + b.height);
        if (!debajo || dist2 > 20) {
          issues.push({
            type: 'form', severity: 'warning', nodeId: h.id, nodeName: h.name || 'Mensaje de error',
            message: 'El mensaje de error no está inmediatamente debajo del campo al que corresponde.',
            fix: 'Ponelo pegado al campo, a menos de 8px. En el código va enlazado con ' +
                 'aria-describedby, y el campo con aria-invalid="true".',
            wcag: '3.3.1',
            detail: { distancia: Math.round(dist2) }
          });
        } else passed++;
      });
    }
  });

  return { issues: issues, passed: passed };
}

// ═════════════════════════════════════════════════════════════════════════════
// INTERACCIÓN: espaciado, superposición y foco
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2.5.8 Espaciado entre objetivos ─────────────────────────────────────────
// El criterio tiene una excepción que el plugin ignoraba: un objetivo menor a
// 24px CUMPLE si un círculo de 24px centrado en él no se superpone con el
// círculo de ningún otro objetivo. Medir solo el tamaño reportaba como fallo
// cosas que la norma acepta.

function auditTargetSpacing(rootNode) {
  var issues = [], passed = 0;
  var MIN = 24;

  var targets = [];
  getAllNodes(rootNode).forEach(function(n) {
    if (!isInteractive(n)) return;
    if (n.type === 'TEXT') return;
    if (!hasArea(n)) return;
    var b = absBox(n);
    targets.push({ node: n, b: b,
                   cx: b.x + b.width / 2, cy: b.y + b.height / 2,
                   menor: Math.min(b.width, b.height) });
  });

  targets.forEach(function(t, i) {
    if (t.menor >= MIN) { passed++; return; }

    // ¿Hay lugar? Distancia al centro del vecino más cercano
    var minDist = Infinity, vecino = null;
    targets.forEach(function(o, j) {
      if (i === j) return;
      var d = Math.sqrt(Math.pow(t.cx - o.cx, 2) + Math.pow(t.cy - o.cy, 2));
      if (d < minDist) { minDist = d; vecino = o; }
    });

    // La excepción: círculos de 24px que no se tocan → separación ≥ 24px
    var cumplePorEspacio = minDist >= MIN;

    if (cumplePorEspacio) {
      passed++;
      issues.push({
        type: 'spacing-target', severity: 'warning', nodeId: t.node.id, nodeName: t.node.name,
        message: '"' + t.node.name + '" mide ' + Math.round(t.b.width) + '×' + Math.round(t.b.height) +
                 'px, por debajo de 24. Cumple 2.5.8 por la excepción de espaciado: el vecino más ' +
                 'cercano está a ' + Math.round(minDist) + 'px. Queda al límite.',
        fix: 'Cumple, pero si el layout se comprime la excepción se pierde. Agrandar el área tocable ' +
             'con padding es más robusto que depender de la separación.',
        wcag: '2.5.8',
        detail: { ancho: Math.round(t.b.width), alto: Math.round(t.b.height),
                  separacion: Math.round(minDist), porExcepcion: true }
      });
    } else {
      issues.push({
        type: 'spacing-target', severity: 'fail', nodeId: t.node.id, nodeName: t.node.name,
        message: '"' + t.node.name + '" mide ' + Math.round(t.b.width) + '×' + Math.round(t.b.height) +
                 'px y tiene otro objetivo a ' + Math.round(minDist) + 'px' +
                 (vecino ? ' ("' + vecino.node.name + '")' : '') + '. Ni llega a 24px ni tiene los ' +
                 '24px de separación que lo exceptuarían.',
        fix: 'Agrandá el área tocable a 24×24px con padding del contenedor —el ícono no tiene que ' +
             'crecer— o separá los objetivos 24px entre centros.',
        wcag: '2.5.8',
        detail: { ancho: Math.round(t.b.width), alto: Math.round(t.b.height),
                  separacion: Math.round(minDist), vecino: vecino ? vecino.node.name : null }
      });
    }
  });

  // ── Objetivos superpuestos: siempre un error, nunca intencional
  for (var i = 0; i < targets.length; i++) {
    for (var j = i + 1; j < targets.length; j++) {
      var a = targets[i].b, c = targets[j].b;
      var solapaX = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
      var solapaY = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
      if (solapaX > 2 && solapaY > 2) {
        // Uno adentro del otro es anidamiento legítimo, no superposición
        var contenido =
          (c.x >= a.x - 1 && c.y >= a.y - 1 &&
           c.x + c.width <= a.x + a.width + 1 && c.y + c.height <= a.y + a.height + 1) ||
          (a.x >= c.x - 1 && a.y >= c.y - 1 &&
           a.x + a.width <= c.x + c.width + 1 && a.y + a.height <= c.y + c.height + 1);
        if (contenido) continue;

        issues.push({
          type: 'spacing-target', severity: 'fail', nodeId: targets[j].node.id,
          nodeName: targets[j].node.name,
          message: 'Los objetivos "' + targets[i].node.name + '" y "' + targets[j].node.name +
                   '" se superponen ' + Math.round(solapaX) + '×' + Math.round(solapaY) + 'px. ' +
                   'En el área compartida no se sabe cuál se acciona.',
          fix: 'Separalos. Una superposición de áreas tocables casi siempre es un descuido de layout, ' +
               'no una decisión.',
          wcag: '2.5.8',
          detail: { solapaX: Math.round(solapaX), solapaY: Math.round(solapaY),
                    con: targets[i].node.name }
        });
      }
    }
  }

  return { issues: issues, passed: passed };
}

// ─── 2.4.7 Foco visible · apariencia del indicador ───────────────────────────
// Ojo con la numeración: en WCAG 2.2, 2.4.11 es "Foco no oscurecido" —que nada
// tape el elemento enfocado— y es un criterio distinto, con su propio chequeo
// más abajo. Lo que se mide acá es que el anillo EXISTA y se vea, que es 2.4.7
// (AA). El grosor mínimo y el contraste exacto son 2.4.13, que es AAA: se
// reportan como aviso, no como incumplimiento de AA.
// Que exista una variante "focus" no alcanza. El anillo tiene que verse: área
// mínima y contraste propio contra lo que lo rodea. Un anillo de 1px del mismo
// tono que el borde normal existe y no sirve.

function auditFocusAppearance(rootNode) {
  var issues = [], passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    if (node.type !== 'COMPONENT_SET') return;

    var variantes = (node.children || []).filter(isLayerVisible);
    var focusVar = null, defaultVar = null;

    variantes.forEach(function(v) {
      var n = (v.name || '').toLowerCase();
      if (n.indexOf('focus') !== -1 || n.indexOf('foco') !== -1) focusVar = v;
      if (n.indexOf('default') !== -1 || n.indexOf('normal') !== -1) defaultVar = v;
    });

    if (!focusVar) return;   // la falta de variante ya la reporta auditDesignSystem
    if (!defaultVar) defaultVar = variantes[0];

    // Trazo del estado de foco
    var strokeFocus = null, grosor = 0;
    try {
      if (Array.isArray(focusVar.strokes)) {
        strokeFocus = focusVar.strokes.filter(function(s) {
          return s.type === 'SOLID' && s.visible !== false; }).pop() || null;
      }
      grosor = typeof focusVar.strokeWeight === 'number' ? focusVar.strokeWeight : 0;
    } catch (e) {}

    if (!strokeFocus) {
      issues.push({
        type: 'focusappearance', severity: 'fail', nodeId: focusVar.id, nodeName: node.name,
        message: 'La variante de foco de "' + node.name + '" no tiene ningún trazo visible. ' +
                 'Si la diferencia con el estado normal es solo un cambio de relleno suave, ' +
                 'a mucha gente no le llega.',
        fix: 'Agregá un anillo de foco de 2px como mínimo, con 3:1 contra el fondo y contra el ' +
             'propio componente. Separado 2px del borde, se ve sobre cualquier color.',
        wcag: '2.4.7',
        detail: { sinTrazo: true }
      });
      return;
    }

    // Grosor
    if (grosor < 2) {
      issues.push({
        type: 'focusappearance', severity: 'warning', nodeId: focusVar.id, nodeName: node.name,
        message: 'El anillo de foco de "' + node.name + '" es de ' + grosor + 'px. Por debajo de 2px ' +
                 'se pierde en pantallas de baja densidad y para quien tiene baja visión.',
        fix: 'Llevalo a 2px, y separalo 2px del borde del control. El grosor exacto lo pide 2.4.13, ' +
             'que es AAA: en AA alcanza con que el foco se vea, pero 2px es lo que lo garantiza.',
        wcag: '2.4.7',
        detail: { grosor: grosor }
      });
    } else passed++;

    // Contraste del anillo contra el fondo
    try {
      var fondo = resolveBackground(focusVar);
      var rf = strokeFocus.color.r * 255, gf = strokeFocus.color.g * 255, bf = strokeFocus.color.b * 255;
      var ratioFondo = contrastRatio(relativeLuminance(rf, gf, bf),
                                     relativeLuminance(fondo.r, fondo.g, fondo.b));
      var hexAnillo = hexFromRGB(strokeFocus.color.r, strokeFocus.color.g, strokeFocus.color.b);

      if (ratioFondo < 3) {
        issues.push({
          type: 'focusappearance', severity: 'fail', nodeId: focusVar.id, nodeName: node.name,
          message: 'El anillo de foco (' + hexAnillo + ') da ' +
                   (Math.round(ratioFondo * 100) / 100) + ':1 contra el fondo. Necesita 3:1: ' +
                   'un anillo que no se distingue es lo mismo que no tener anillo.',
          fix: 'Elegí un color con 3:1 contra el fondo, o usá un anillo de dos tonos (uno claro y uno ' +
               'oscuro) para que funcione sobre cualquier superficie.',
          wcag: '2.4.7',
          detail: { fg: hexAnillo, bg: fondo.hex,
                    ratio: Math.round(ratioFondo * 100) / 100, required: 3 }
        });
      } else passed++;

      // Contraste contra el estado normal: si el anillo es del mismo color que
      // el borde de siempre, el cambio no se percibe
      var strokeDefault = null;
      try {
        if (Array.isArray(defaultVar.strokes)) {
          strokeDefault = defaultVar.strokes.filter(function(s) {
            return s.type === 'SOLID' && s.visible !== false; }).pop() || null;
        }
      } catch (e) {}

      if (strokeDefault) {
        var rd = strokeDefault.color.r * 255, gd = strokeDefault.color.g * 255, bd = strokeDefault.color.b * 255;
        var ratioEstados = contrastRatio(relativeLuminance(rf, gf, bf),
                                         relativeLuminance(rd, gd, bd));
        var mismoGrosor = true;
        try { mismoGrosor = (defaultVar.strokeWeight === focusVar.strokeWeight); } catch (e) {}

        if (ratioEstados < 3 && mismoGrosor) {
          issues.push({
            type: 'focusappearance', severity: 'warning', nodeId: focusVar.id, nodeName: node.name,
            message: 'El anillo de foco y el borde del estado normal son casi del mismo color (' +
                     (Math.round(ratioEstados * 100) / 100) + ':1) y del mismo grosor. ' +
                     'El cambio al recibir foco pasa desapercibido.',
            fix: 'Cambiá el color, el grosor, o los dos. El foco tiene que notarse de un vistazo, ' +
                 'no compararse.',
            wcag: '2.4.7',
            detail: { anilloFoco: hexAnillo,
                      bordeNormal: hexFromRGB(strokeDefault.color.r, strokeDefault.color.g, strokeDefault.color.b),
                      ratio: Math.round(ratioEstados * 100) / 100 }
          });
        } else passed++;
      }
    } catch (e) {}
  });

  return { issues: issues, passed: passed };
}

// ═════════════════════════════════════════════════════════════════════════════
// CALIDAD DEL REPORTE
//
// Tres cosas que cambian cómo se usa una auditoría:
//
//   1. Lo que NO se pudo verificar automáticamente tiene que salir como tarea,
//      no como una nota al pie. Si no, el reporte da la falsa impresión de
//      cobertura completa.
//   2. Decir cuánto se miró. "0 hallazgos" sobre 3 capas y sobre 300 no
//      significan lo mismo.
//   3. Ordenar por impacto real, no por nivel WCAG. Un contraste de 4.4:1 y un
//      botón sin nombre son los dos "AA", y no se parecen en nada.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Severidad por impacto ───────────────────────────────────────────────────
// El nivel WCAG dice qué tan exigible es algo, no qué tan grave. Esta escala
// mide lo otro: qué le pasa a una persona real cuando se encuentra con esto.

var IMPACTO = {
  bloqueante: {
    orden: 0, label: 'Bloqueante', color: '#EF4E44',
    definicion: 'Hay gente que directamente no puede completar la tarea.'
  },
  serio: {
    orden: 1, label: 'Serio', color: '#FF9500',
    definicion: 'Se puede completar, pero con esfuerzo desproporcionado o adivinando.'
  },
  moderado: {
    orden: 2, label: 'Moderado', color: '#FFB800',
    definicion: 'Molesta y cansa, sobre todo en uso prolongado.'
  },
  menor: {
    orden: 3, label: 'Menor', color: '#9A9AA2',
    definicion: 'Mejora la experiencia, no impide nada.'
  }
};

// Cómo se traduce cada hallazgo a impacto. La regla no es el nivel WCAG: es
// preguntarse qué pasa si esto queda así.
function impactoDe(issue) {
  var d = issue.detail || {};
  var t = issue.type;

  // Sin nombre accesible no hay forma de saber qué hace el control: bloqueante.
  if (t === 'aria' && d.aria && d.aria.needsLabel) return 'bloqueante';
  if (t === 'aria' && issue.severity === 'fail')    return 'bloqueante';

  // Un control que no se puede ver ni tocar
  if (t === 'target' && issue.severity === 'fail')         return 'serio';
  if (t === 'spacing-target' && issue.severity === 'fail') return 'serio';
  if (t === 'focusappearance' && issue.severity === 'fail') return 'bloqueante';
  if (t === 'focus' && issue.severity === 'fail')          return 'bloqueante';

  // Contraste: la distancia al umbral es lo que decide, no el umbral
  if (t === 'contrast' || t === 'nontext') {
    if (d.manual) return 'moderado';
    var req = d.required || 4.5;
    var r = parseFloat(d.ratio) || 0;
    if (r < req * 0.5)  return 'bloqueante';   // menos de la mitad: ilegible
    if (r < req * 0.85) return 'serio';
    return 'moderado';                          // rozando el umbral
  }

  // Formularios: sin etiqueta no se sabe qué completar
  if (t === 'form' && issue.severity === 'fail')     return 'bloqueante';
  if (t === 'placeholder')                            return 'bloqueante';
  if (t === 'form')                                   return 'serio';

  // Texto que se recorta al ampliar: se pierde contenido
  if (t === 'spacing' && issue.severity === 'fail') return 'serio';
  if (t === 'reflow')                                return 'serio';
  if (t === 'typography' && issue.severity === 'fail') return 'serio';

  // Estructura y orden
  if (t === 'heading')       return 'serio';
  if (t === 'hierarchy')     return 'moderado';
  if (t === 'link')          return 'moderado';
  if (t === 'consistencia')  return 'moderado';
  if (t === 'images' && issue.severity === 'fail') return 'serio';

  // Legibilidad y sistema
  if (t === 'legibilidad') return 'menor';
  if (t === 'escala')      return 'moderado';
  if (t === 'ds')          return issue.severity === 'fail' ? 'serio' : 'moderado';

  return issue.severity === 'fail' ? 'serio' : 'moderado';
}

function anotarImpacto(issues) {
  issues.forEach(function(i) {
    i.impacto = impactoDe(i);
    i.impactoOrden = IMPACTO[i.impacto].orden;
  });
  return issues;
}


// ─── Agrupación de hallazgos repetidos ───────────────────────────────────────
// En una pantalla real, 24 filas de una lista producen 24 hallazgos idénticos.
// Eso no es información: es la misma información 24 veces, y ahoga a los
// hallazgos únicos que sí merecen atención. Un diseñador arregla el componente
// UNA vez y los 24 se resuelven.
//
// Se agrupa por lo que determina la CORRECCIÓN, no por el nodo: mismo criterio,
// mismo tipo y mismos valores concretos (el par de colores, el tamaño de
// fuente, el motivo). Si dos hallazgos se arreglan con el mismo cambio, son uno.

function claveDeHallazgo(issue) {
  var d = issue.detail || {};
  var partes = [issue.type, issue.wcag];

  // Contraste: lo que define el arreglo es el par de colores y el umbral
  if (d.fg && d.bg) partes.push(d.fg, d.bg, d.required || '');
  else if (d.kind) partes.push(d.kind);

  if (d.motivo)   partes.push(d.motivo);
  if (d.tipo)     partes.push(d.tipo);
  if (d.size)     partes.push('size' + d.size);
  if (d.palabra)  partes.push(d.palabra);
  if (d.autocomplete) partes.push(d.autocomplete);
  if (d.sinLabel) partes.push('sinLabel');
  if (d.asteriscoSolo) partes.push('asterisco');
  if (d.manual)   partes.push('manual');

  // El mensaje, sin nombres propios ni números, describe la forma del problema
  var forma = String(issue.message || '')
    .replace(/"[^"]*"/g, '·')
    .replace(/#[0-9A-Fa-f]{6}/g, '·')
    .replace(/\d+([.,]\d+)?/g, 'N');
  partes.push(forma.slice(0, 120));

  return partes.join('|');
}

function agruparHallazgos(issues) {
  var porClave = {}, orden = [];

  issues.forEach(function(i) {
    var k = claveDeHallazgo(i);
    if (!porClave[k]) {
      porClave[k] = {
        clave: k,
        ejemplo: i,               // el primero representa al grupo
        wcag: i.wcag,
        type: i.type,
        severity: i.severity,
        impacto: i.impacto,
        afectados: [],
        marcadores: []
      };
      orden.push(k);
    }
    var g = porClave[k];
    g.afectados.push({ nodeId: i.nodeId, nodeName: i.nodeName, marker: i.marker });
    if (i.marker && g.marcadores.indexOf(i.marker) === -1) g.marcadores.push(i.marker);
    // El impacto del grupo es el peor de sus integrantes
    if (IMPACTO[i.impacto] && IMPACTO[g.impacto] &&
        IMPACTO[i.impacto].orden < IMPACTO[g.impacto].orden) g.impacto = i.impacto;
  });

  return orden.map(function(k) {
    var g = porClave[k];
    g.cantidad = g.afectados.length;
    g.marcadores.sort(function(a, b) { return a - b; });
    return g;
  });
}


// ─── Inventario por elemento ─────────────────────────────────────────────────
// La pregunta "¿miraste cada elemento?" merece una respuesta verificable. Se
// clasifica cada capa visible por lo que ES —texto, imagen, control, campo,
// contenedor— y se cuenta contra cuántos criterios se la pudo evaluar.
//
// Lo importante es lo que NO se pudo: si una capa no se puede clasificar, se
// dice, en vez de saltearla sin dejar rastro. Ahí es donde el reporte parecía
// arbitrario — miraba menos de lo que aparentaba.

function inventarioElementos(rootNode) {
  var inv = { texto: 0, imagen: 0, control: 0, campo: 0, icono: 0,
              contenedor: 0, decorativo: 0, sinClasificar: 0 };
  var sinClasificarEjemplos = [];

  getAllNodes(rootNode).forEach(function(n) {
    if (n.id === rootNode.id) return;

    if (n.type === 'TEXT') { inv.texto++; return; }

    var tieneImagen = false;
    try {
      tieneImagen = Array.isArray(n.fills) && n.fills.some(function(f) {
        return f.type === 'IMAGE' && f.visible !== false; });
    } catch (e) {}
    if (tieneImagen) { inv.imagen++; return; }

    if (esCampoDeFormulario(n)) { inv.campo++; return; }
    if (isInteractive(n))       { inv.control++; return; }

    if (GLYPH_TYPES.indexOf(n.type) !== -1) { inv.icono++; return; }

    var tieneHijos = ('children' in n) && n.children.filter(isLayerVisible).length > 0;
    if (tieneHijos) { inv.contenedor++; return; }

    // Una figura sola sin hijos y sin interacción: decorativa o sin clasificar
    var pinta = false;
    try { pinta = !!topSolidFill(n.fills); } catch (e) {}
    if (pinta) { inv.decorativo++; return; }

    inv.sinClasificar++;
    if (sinClasificarEjemplos.length < 8) sinClasificarEjemplos.push(n.name || n.type);
  });

  inv.total = inv.texto + inv.imagen + inv.control + inv.campo + inv.icono +
              inv.contenedor + inv.decorativo + inv.sinClasificar;
  inv.sinClasificarEjemplos = sinClasificarEjemplos;

  // Qué criterios aplican a cada clase de elemento, para poder decir contra
  // cuántos se evaluó cada uno.
  inv.criteriosPorTipo = {
    texto:  ['1.4.3', '1.4.4', '1.4.8', '1.4.10', '1.4.12', '1.3.1'],
    imagen: ['1.1.1', '1.4.3', '1.4.5'],
    control:['1.4.11', '2.4.7', '2.5.8', '4.1.2', '2.5.3', '2.4.11'],
    campo:  ['1.3.5', '3.3.1', '3.3.2', '4.1.2', '2.5.8', '1.4.11'],
    icono:  ['1.1.1', '1.4.11'],
    contenedor: ['1.3.1', '1.4.10'],
    decorativo: []
  };

  var evaluaciones = 0;
  Object.keys(inv.criteriosPorTipo).forEach(function(t) {
    evaluaciones += (inv[t] || 0) * inv.criteriosPorTipo[t].length;
  });
  inv.evaluaciones = evaluaciones;

  return inv;
}

// ─── Cobertura ───────────────────────────────────────────────────────────────
// Cuánto del material se miró, y cuántos criterios se pudieron evaluar. Un
// reporte sin esto invita a leer "0 hallazgos" como "está todo bien".

function calcularCobertura(rootNode, results) {
  var visibles = getAllNodes(rootNode).length;
  var totales = getAllNodes(rootNode, { includeHidden: true }).length;
  var ocultas = totales - visibles;

  var textos = 0, interactivos = 0, imagenes = 0;
  getAllNodes(rootNode).forEach(function(n) {
    if (n.type === 'TEXT') textos++;
    if (isInteractive(n)) interactivos++;
    try {
      if (Array.isArray(n.fills) && n.fills.some(function(f) {
        return f.type === 'IMAGE' && f.visible !== false; })) imagenes++;
    } catch (e) {}
  });

  // Criterios: cuántos de los 56 se pudieron evaluar acá
  // 4.1.1 se retiró en 2.2: sigue en el catálogo como referencia histórica,
  // pero no cuenta para la cobertura de un estándar que ya no lo pide.
  var catalogo = wcagCatalogue().filter(function(c) { return !c.obsolete; });
  var automaticos = catalogo.filter(function(c) { return c.auto; });
  var manuales    = catalogo.filter(function(c) { return c.scope === 'manual' && !c.auto; });
  var deCodigo    = catalogo.filter(function(c) { return c.scope === 'code'; });

  var inv = inventarioElementos(rootNode);

  return {
    inventario: inv,
    capasVisibles: visibles,
    capasOcultas: ocultas,
    capasTotales: totales,
    textos: textos,
    interactivos: interactivos,
    imagenes: imagenes,
    criteriosTotales: catalogo.length,
    criteriosAutomaticos: automaticos.length,
    criteriosManuales: manuales.length,
    criteriosDeCodigo: deCodigo.length,
    // Porcentaje del estándar que este reporte puede cubrir por sí solo
    porcentajeAutomatico: Math.round(automaticos.length / catalogo.length * 100),
    nota: 'Este reporte cubre ' + automaticos.length + ' de los ' + catalogo.length +
          ' criterios de WCAG 2.2 nivel A y AA. Los otros ' + (catalogo.length - automaticos.length) +
          ' necesitan revisión humana o dependen del código: están listados como tareas. ' +
          'Cumplir 2.2 cubre también 2.1, porque la incluye entera.',
    detalleInventario: inv.total + ' elementos clasificados: ' +
      inv.texto + ' textos, ' + inv.imagen + ' imágenes, ' +
      (inv.control + inv.campo) + ' controles, ' + inv.icono + ' íconos, ' +
      inv.contenedor + ' contenedores, ' + inv.decorativo + ' decorativos' +
      (inv.sinClasificar ? ', ' + inv.sinClasificar + ' sin clasificar' : '') +
      '. Se corrieron ' + inv.evaluaciones + ' evaluaciones de criterio sobre ellos.'
  };
}

// ─── Checklist de revisión manual ────────────────────────────────────────────
// Los criterios que el plugin no puede evaluar dejan de ser una nota al pie y
// pasan a ser tareas concretas, con qué mirar y cómo verificarlo. Solo se
// incluyen los que APLICAN a lo que hay en pantalla: pedir revisar subtítulos
// de video en una pantalla sin video es ruido.

var COMO_VERIFICAR = {
  '1.4.1': { que: 'Uso del color',
             como: 'Poné la pantalla en escala de grises. Si algo deja de entenderse — un estado, un ' +
                   'error, una categoría — ese color era la única señal.',
             cuando: function(ctx) { return true; } },
  '1.3.4': { que: 'Orientación',
             como: 'Girá el dispositivo. Si la pantalla obliga a una orientación y no es imprescindible ' +
                   '(un piano, un editor de video), no puede bloquearse.',
             cuando: function(ctx) { return ctx.esMobile; } },
  '1.4.13':{ que: 'Contenido al pasar el cursor o al enfocar',
             como: 'Los tooltips y popovers tienen que: cerrarse con Escape, poder recorrerse con el ' +
                   'mouse sin que desaparezcan, y aparecer también con foco de teclado.',
             cuando: function(ctx) { return ctx.hayTooltips; } },
  '2.1.2': { que: 'Sin trampas de teclado',
             como: 'Con el modal abierto, apretá Tab hasta dar la vuelta. Tiene que quedar adentro y ' +
                   'salir con Escape, devolviendo el foco al botón que lo abrió.',
             cuando: function(ctx) { return ctx.hayModales; } },
  '2.2.1': { que: 'Tiempo ajustable',
             como: 'Si hay temporizador, sesión que expira o carrusel automático, tiene que poder ' +
                   'extenderse, pausarse o desactivarse.',
             cuando: function(ctx) { return true; } },
  '2.2.2': { que: 'Pausar, detener, ocultar',
             como: 'Todo lo que se mueva o parpadee más de 5 segundos necesita un control para pararlo.',
             cuando: function(ctx) { return ctx.hayCarruseles; } },
  '2.3.1': { que: 'Destellos',
             como: 'Nada puede parpadear más de tres veces por segundo. Puede provocar convulsiones.',
             cuando: function(ctx) { return true; } },
  '2.4.5': { que: 'Múltiples vías',
             como: 'Tiene que haber más de una forma de llegar a cada pantalla: menú, buscador, ' +
                   'enlaces relacionados o mapa del sitio.',
             cuando: function(ctx) { return true; } },
  '2.5.1': { que: 'Gestos del puntero',
             como: 'Todo gesto de varios dedos o con trayectoria (pellizcar, deslizar para borrar) ' +
                   'necesita una alternativa de un solo toque.',
             cuando: function(ctx) { return ctx.esMobile; } },
  '3.2.1': { que: 'Al recibir el foco',
             como: 'Tabular hasta un elemento no puede abrir un modal, navegar ni enviar nada.',
             cuando: function(ctx) { return ctx.hayControles; } },
  '3.2.2': { que: 'Al recibir entradas',
             como: 'Elegir una opción de un select no puede navegar ni enviar el formulario sin avisar.',
             cuando: function(ctx) { return ctx.hayFormularios; } },
  '3.2.3': { que: 'Navegación coherente',
             como: 'El menú y los elementos repetidos van en el mismo lugar y en el mismo orden en ' +
                   'todas las pantallas del flujo.',
             cuando: function(ctx) { return ctx.variasPantallas; } },
  '3.3.3': { que: 'Sugerencia ante errores',
             como: 'Cada error tiene que decir cómo arreglarlo, no solo que está mal. ' +
                   '"El código tiene 6 dígitos" en vez de "código inválido".',
             cuando: function(ctx) { return ctx.hayFormularios; } },
  '3.3.4': { que: 'Prevención de errores',
             como: 'En pagos, datos legales o acciones destructivas tiene que haber confirmación, ' +
                   'revisión previa o forma de deshacer.',
             cuando: function(ctx) { return ctx.hayFormularios; } },
  '1.1.1': { que: 'Texto alternativo',
             como: 'Para cada imagen: ¿aporta información? Entonces describila. ¿Es decorativa? ' +
                   'Entonces alt vacío. El plugin detecta las imágenes, no puede escribir el alt.',
             cuando: function(ctx) { return ctx.hayImagenes; } },
  '2.4.6': { que: 'Encabezados y etiquetas',
             como: 'Leé solo los títulos, sin el cuerpo. ¿Se entiende de qué trata cada sección?',
             cuando: function(ctx) { return ctx.hayTextos; } },
  '2.4.4': { que: 'Propósito de los enlaces',
             como: 'Leé cada enlace fuera de contexto. ¿Se sabe adónde lleva?',
             cuando: function(ctx) { return ctx.hayEnlaces; } },
  '2.4.11':{ que: 'Foco no oscurecido',
             como: 'Navegá con Tab de arriba abajo con el header fijo y la barra inferior visibles. ' +
                   'Ningún elemento enfocado puede quedar tapado, ni siquiera a medias.',
             cuando: function(ctx) { return ctx.hayControles; } },
  '2.5.7': { que: 'Movimientos de arrastre',
             como: 'Todo lo que se opere arrastrando —sliders, carruseles, listas reordenables, ' +
                   'mapas— necesita otra forma de hacer lo mismo con un solo toque.',
             cuando: function(ctx) { return ctx.hayArrastre; } },
  '3.2.6': { que: 'Ayuda coherente',
             como: 'Si hay contacto, chat o FAQ, tiene que estar en el mismo lugar relativo en ' +
                   'todas las pantallas donde aparezca.',
             cuando: function(ctx) { return ctx.variasPantallas; } },
  '3.3.7': { que: 'Entrada redundante',
             como: 'No pidas dos veces el mismo dato en un mismo flujo. Si hace falta repetirlo, ' +
                   'ofrecelo precargado o con un "usar el mismo".',
             cuando: function(ctx) { return ctx.hayFormularios; } },
  '3.3.8': { que: 'Autenticación accesible',
             como: 'Iniciar sesión no puede depender de recordar ni transcribir. Se tiene que ' +
                   'poder pegar la contraseña y el código, y el gestor de contraseñas tiene que ' +
                   'poder completarlos.',
             cuando: function(ctx) { return ctx.hayAuth; } },
  '1.3.1': { que: 'Información y relaciones',
             como: 'Todo lo que se entiende por lo visual —agrupaciones, jerarquía, tablas— tiene que ' +
                   'estar también en la estructura del código, no solo en el estilo.',
             cuando: function(ctx) { return true; } }
};

function contextoDeContenido(rootNode) {
  var ctx = {
    esMobile: false, hayTooltips: false, hayModales: false, hayCarruseles: false,
    hayControles: false, hayFormularios: false, hayImagenes: false,
    hayTextos: false, hayEnlaces: false, variasPantallas: false,
    hayArrastre: false, hayAuth: false
  };

  var b = absBox(rootNode);
  ctx.esMobile = b.width > 0 && b.width <= 500;

  getAllNodes(rootNode).forEach(function(n) {
    var nm = (n.name || '').toLowerCase();
    if (nm.indexOf('tooltip') !== -1) ctx.hayTooltips = true;
    if (nm.indexOf('modal') !== -1 || nm.indexOf('dialog') !== -1) ctx.hayModales = true;
    if (nm.indexOf('carousel') !== -1 || nm.indexOf('carrusel') !== -1 ||
        nm.indexOf('slider') !== -1 || nm.indexOf('autoplay') !== -1) ctx.hayCarruseles = true;
    if (nm.indexOf('link') !== -1 || nm.indexOf('enlace') !== -1) ctx.hayEnlaces = true;
    if (esCampoDeFormulario(n)) ctx.hayFormularios = true;
    if (ARRASTRE_WORDS.some(function(k) { return nm.indexOf(k) !== -1; })) ctx.hayArrastre = true;
    if (AUTH_WORDS.some(function(k) { return nm.indexOf(k) !== -1; })) ctx.hayAuth = true;
    if (isInteractive(n)) ctx.hayControles = true;
    if (n.type === 'TEXT') ctx.hayTextos = true;
    try {
      if (Array.isArray(n.fills) && n.fills.some(function(f) {
        return f.type === 'IMAGE' && f.visible !== false; })) ctx.hayImagenes = true;
    } catch (e) {}
  });

  return ctx;
}

function checklistManual(rootNode, variasPantallas) {
  var ctx = contextoDeContenido(rootNode);
  ctx.variasPantallas = !!variasPantallas;

  var tareas = [];
  Object.keys(COMO_VERIFICAR).forEach(function(id) {
    var e = COMO_VERIFICAR[id];
    if (!e.cuando(ctx)) return;
    var info = wcagInfo(id);
    tareas.push({
      id: id,
      nivel: info.level,
      criterio: info.es,
      que: e.que,
      como: e.como,
      hecho: false
    });
  });

  tareas.sort(function(a, b) {
    var pa = a.id.split('.').map(Number), pb = b.id.split('.').map(Number);
    return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
  });

  return { tareas: tareas, contexto: ctx };
}

// ═════════════════════════════════════════════════════════════════════════════
// CRITERIOS NUEVOS DE WCAG 2.2
//
// La 2.2 suma seis criterios en A/AA y retira 4.1.1. Casi todos apuntan a
// problemas que el diseño decide y el código solo ejecuta, así que un archivo
// de Figma tiene bastante para decir sobre ellos.
//
//   2.4.11 Foco no oscurecido (AA)   · que nada tape el elemento con foco
//   2.5.7  Movimientos de arrastre (AA) · alternativa de un solo toque
//   2.5.8  Tamaño del objetivo (AA)  · ya cubierto en interacción
//   3.2.6  Ayuda coherente (A)       · el acceso a ayuda, siempre en el mismo lugar
//   3.3.7  Entrada redundante (A)    · no pedir dos veces el mismo dato
//   3.3.8  Autenticación accesible (AA) · sin pruebas de memoria ni de destreza
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2.4.11 Foco no oscurecido ───────────────────────────────────────────────
// Un header fijo, una barra inferior o un chat flotante pueden tapar justo el
// elemento que acaba de recibir el foco. Quien navega con teclado no ve dónde
// está. Es de los criterios que más se rompen y ninguna herramienta lo detecta
// sola, pero el diseño sí muestra qué elementos flotan sobre el resto.

var FLOTANTE_WORDS = ['sticky', 'fixed', 'fijo', 'floating', 'flotante', 'overlay',
                      'bottom bar', 'barra inferior', 'app bar', 'topbar', 'top bar',
                      'header', 'footer', 'fab', 'chat', 'cookie', 'banner',
                      'toolbar', 'navbar', 'nav bar'];

function auditFocusObscured(rootNode) {
  var issues = [], passed = 0;
  var raiz = absBox(rootNode);
  if (!raiz.width) return { issues: issues, passed: passed };

  // Candidatos: elementos que se ven pegados a un borde y ocupan casi todo el ancho
  var flotantes = [];
  var kids = ('children' in rootNode) ? rootNode.children.filter(isLayerVisible) : [];

  kids.forEach(function(c) {
    var b = absBox(c);
    if (!b.width || !b.height) return;
    // La geometría manda; el nombre solo confirma. Antes hacía falta que la
    // capa se llamara "sticky" o "header" para que se mirara siquiera.
    var pos = esBarraFlotantePorForma(c, raiz);
    if (!pos) return;
    flotantes.push({ node: c, b: b,
                     arriba: pos === 'arriba', abajo: pos !== 'arriba', posicion: pos });
  });

  if (!flotantes.length) { passed++; return { issues: issues, passed: passed }; }

  // ¿Hay controles que puedan quedar debajo de alguno de ellos?
  var controles = [];
  getAllNodes(rootNode).forEach(function(n) {
    if (!isInteractive(n)) return;
    var dentroDeFlotante = false;
    flotantes.forEach(function(f) {
      var p = n.parent, g = 0;
      while (p && g++ < 8) { if (p.id === f.node.id) { dentroDeFlotante = true; break; } p = p.parent; }
    });
    if (dentroDeFlotante) return;
    controles.push(n);
  });

  flotantes.forEach(function(f) {
    if (!controles.length) { passed++; return; }
    issues.push({
      type: 'obscured', severity: 'warning', nodeId: f.node.id, nodeName: f.node.name,
      message: '"' + f.node.name + '" está anclado ' + (f.arriba ? 'arriba' : 'abajo') +
               ' y flota sobre el contenido. Al navegar con Tab, el elemento que recibe el foco ' +
               'puede quedar justo debajo y no verse: quien usa teclado pierde el rastro.',
      fix: 'Reservá espacio con scroll-padding del alto de la barra, o usá scroll-margin en los ' +
           'elementos enfocables. Nada de lo que recibe foco puede quedar tapado, ni siquiera ' +
           'parcialmente.',
      wcag: '2.4.11',
      detail: { anclado: f.arriba ? 'arriba' : 'abajo', alto: Math.round(f.b.height),
                controlesEnRiesgo: controles.length }
    });
  });

  return { issues: issues, passed: passed };
}

// ─── 2.5.7 Movimientos de arrastre ───────────────────────────────────────────
// Todo lo que se opere arrastrando necesita una alternativa de un solo toque.
// Para quien usa un switch, un puntero de cabeza o tiene temblor, arrastrar no
// es una opción.

var ARRASTRE_WORDS = ['slider', 'range', 'drag', 'arrastr', 'reorder', 'reordenar',
                      'sortable', 'swipe', 'deslizar', 'carousel', 'carrusel',
                      'handle', 'resize', 'redimension', 'kanban', 'signature', 'firma',
                      'color picker', 'cropper', 'recorte', 'map', 'mapa'];

function auditDragging(rootNode) {
  var issues = [], passed = 0;

  getAllNodes(rootNode).forEach(function(node) {
    var nombre = (node.name || '').toLowerCase();
    var kw = null;
    for (var i = 0; i < ARRASTRE_WORDS.length; i++) {
      if (nombre.indexOf(ARRASTRE_WORDS[i]) !== -1) { kw = ARRASTRE_WORDS[i]; break; }
    }
    if (!kw) return;

    // ¿Hay algo cerca que ofrezca la alternativa sin arrastrar?
    var alternativa = false;
    var padre = node.parent;
    if (padre && 'children' in padre) {
      padre.children.forEach(function(h) {
        if (h.id === node.id || !isLayerVisible(h)) return;
        var hn = (h.name || '').toLowerCase();
        if (/\b(input|field|campo|stepper|button|btn|arrow|flecha|chevron|prev|next|anterior|siguiente|más|mas|menos|plus|minus)\b/.test(hn)) {
          alternativa = true;
        }
      });
    }
    // O el propio componente trae botones adentro
    if (!alternativa && 'children' in node) {
      getAllNodes(node).forEach(function(c) {
        if (c.id === node.id) return;
        var cn = (c.name || '').toLowerCase();
        if (/\b(button|btn|arrow|flecha|stepper|input)\b/.test(cn)) alternativa = true;
      });
    }

    if (alternativa) { passed++; return; }

    issues.push({
      type: 'dragging', severity: 'warning', nodeId: node.id, nodeName: node.name,
      message: '"' + (node.name || 'Elemento') + '" parece operarse arrastrando (' + kw + '). ' +
               'Para quien usa un switch, un puntero de cabeza o tiene temblor, arrastrar no es ' +
               'una opción, y no encontré una alternativa al lado.',
      fix: 'Agregá una forma de hacer lo mismo con un solo toque: flechas o botones ±  junto al ' +
           'slider, un campo numérico, botones de anterior y siguiente en el carrusel, o "mover ' +
           'arriba / mover abajo" en las listas reordenables.',
      wcag: '2.5.7',
      detail: { palabra: kw }
    });
  });

  return { issues: issues, passed: passed };
}

// ─── 3.3.8 Autenticación accesible ───────────────────────────────────────────
// Iniciar sesión no puede depender de recordar o transcribir algo. Los CAPTCHA
// de "escribí lo que ves" y los códigos que hay que copiar a mano son pruebas
// cognitivas, y el criterio las prohíbe salvo que exista otra vía.

var AUTH_WORDS = ['login', 'sign in', 'signin', 'iniciar sesion', 'iniciar sesión',
                  'ingresar', 'password', 'contrasena', 'contraseña', 'clave',
                  'otp', 'código de verificación', 'codigo de verificacion',
                  'verification code', '2fa', 'captcha', 'recaptcha', 'auth'];

function auditAuth(rootNode) {
  var issues = [], passed = 0;
  var nombreRaiz = (rootNode.name || '').toLowerCase();
  var esPantallaAuth = AUTH_WORDS.some(function(k) { return nombreRaiz.indexOf(k) !== -1; });

  var captcha = null, campoOtp = null, campoPass = null;
  getAllNodes(rootNode).forEach(function(n) {
    var nm = (n.name || '').toLowerCase();
    if (/captcha/.test(nm)) captcha = n;
    if (/\b(otp|2fa|verification code|código de verificación|codigo de verificacion)\b/.test(nm)) campoOtp = n;
    if (/\b(password|contrase|clave)\b/.test(nm)) campoPass = n;
    if (!esPantallaAuth && AUTH_WORDS.some(function(k) { return nm.indexOf(k) !== -1; })) {
      esPantallaAuth = true;
    }
  });

  if (!esPantallaAuth) return { issues: issues, passed: passed };

  if (captcha) {
    issues.push({
      type: 'auth', severity: 'fail', nodeId: captcha.id, nodeName: captcha.name,
      message: 'Hay un CAPTCHA en el flujo de autenticación. Si pide transcribir, resolver o ' +
               'reconocer algo, es una prueba cognitiva: WCAG 2.2 la prohíbe como único camino.',
      fix: 'Ofrecé una alternativa que no dependa de la memoria ni del reconocimiento: enlace ' +
           'mágico por email, autenticación del dispositivo (biometría o passkey), o una prueba ' +
           'de objeto ("seleccioná las fotos de un gato" cuenta como reconocimiento de objetos y ' +
           'sí está permitida).',
      wcag: '3.3.8',
      detail: { tipo: 'captcha' }
    });
  } else passed++;

  if (campoOtp) {
    issues.push({
      type: 'auth', severity: 'warning', nodeId: campoOtp.id, nodeName: campoOtp.name,
      message: 'Campo de código de verificación. El criterio exige que se pueda PEGAR: obligar a ' +
               'tipear dígito por dígito, o campos separados que bloquean el pegado, convierte el ' +
               'login en una prueba de memoria de trabajo.',
      fix: 'Permití pegar el código completo, incluso con los recuadros separados. Agregá ' +
           'autocomplete="one-time-code" para que el sistema lo complete solo.',
      wcag: '3.3.8',
      detail: { tipo: 'otp' }
    });
  }

  if (campoPass) {
    issues.push({
      type: 'auth', severity: 'warning', nodeId: campoPass.id, nodeName: campoPass.name,
      message: 'Campo de contraseña. Bloquear el pegado, o impedir que el gestor de contraseñas ' +
               'lo complete, obliga a recordar y transcribir.',
      fix: 'Permití pegar. Usá autocomplete="current-password" o "new-password" y ofrecé mostrar ' +
           'la contraseña con un botón, que reduce los errores de tipeo.',
      wcag: '3.3.8',
      detail: { tipo: 'password' }
    });
  }

  return { issues: issues, passed: passed };
}

// ─── 3.2.6 Ayuda coherente ───────────────────────────────────────────────────
// Si hay acceso a ayuda —contacto, chat, FAQ— tiene que estar en el mismo lugar
// relativo en todas las pantallas donde aparezca. Solo se puede evaluar cuando
// se auditan varias juntas.

var AYUDA_WORDS = ['help', 'ayuda', 'support', 'soporte', 'contact', 'contacto',
                   'faq', 'chat', 'assistance', 'asistencia'];

function auditAyudaCoherente(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];
  if (lista.length < 2) return { issues: issues, passed: passed };

  var porPantalla = lista.map(function(root) {
    var raiz = absBox(root);
    var encontrados = [];
    getAllNodes(root).forEach(function(n) {
      var nm = (n.name || '').toLowerCase();
      if (!AYUDA_WORDS.some(function(k) { return nm.indexOf(k) !== -1; })) return;
      if (!isInteractive(n)) return;
      var b = absBox(n);
      encontrados.push({
        node: n,
        // Posición relativa dentro de la pantalla, que es lo que compara el criterio
        rx: raiz.width ? Math.round((b.x - raiz.x) / raiz.width * 100) : 0,
        ry: raiz.height ? Math.round((b.y - raiz.y) / raiz.height * 100) : 0
      });
    });
    return { root: root, ayudas: encontrados };
  });

  var conAyuda = porPantalla.filter(function(p) { return p.ayudas.length > 0; });
  if (conAyuda.length < 2) return { issues: issues, passed: passed };

  var ref = conAyuda[0].ayudas[0];
  conAyuda.slice(1).forEach(function(p) {
    var a = p.ayudas[0];
    var dx = Math.abs(a.rx - ref.rx), dy = Math.abs(a.ry - ref.ry);
    if (dx > 15 || dy > 15) {
      issues.push({
        type: 'ayuda', severity: 'warning', nodeId: a.node.id, nodeName: a.node.name,
        message: 'El acceso a ayuda cambia de lugar entre pantallas: en "' +
                 conAyuda[0].root.name + '" está al ' + ref.rx + '% / ' + ref.ry +
                 '% y en "' + p.root.name + '" al ' + a.rx + '% / ' + a.ry + '%.',
        fix: 'Dejalo en la misma posición relativa en todas las pantallas donde aparezca. ' +
             'Quien lo busca cuando está trabado no debería tener que encontrarlo de nuevo.',
        wcag: '3.2.6',
        detail: { referencia: conAyuda[0].root.name, difX: dx, difY: dy }
      });
    } else passed++;
  });

  return { issues: issues, passed: passed };
}

// ═════════════════════════════════════════════════════════════════════════════
// DETECCIÓN ESTRUCTURAL
//
// Buena parte de los chequeos dependían de cómo estuvieran nombradas las capas:
// un campo se reconocía porque decía "input", un encabezado porque decía "H1".
// En un archivo real, donde la mitad de las capas se llama "Frame 214", esas
// categorías simplemente no disparaban — y el reporte salía siempre con los
// mismos hallazgos genéricos, los únicos que no dependen del nombre.
//
// Estas funciones deducen lo mismo de la FORMA: qué mide, qué contiene, qué
// relleno tiene, dónde está parado. El nombre pasa a ser una señal más, no la
// única. Cuando ni la forma ni el nombre alcanzan, se dice explícitamente en
// vez de saltear en silencio.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Encabezados por escala tipográfica ──────────────────────────────────────
// Un encabezado no se reconoce porque la capa diga "H1": se reconoce porque es
// notablemente más grande que el texto que lo rodea. Eso es exactamente lo que
// hace una persona al mirar la pantalla, y lo que 1.3.1 pide que además esté en
// el código.

function inferirJerarquiaTexto(rootNode) {
  var textos = [];
  getTextNodes(rootNode).forEach(function(t) {
    var chars = '';
    try { chars = (t.characters || '').trim(); } catch (e) {}
    if (!chars) return;
    var met = textMetrics(t);
    var b = absBox(t);
    textos.push({ node: t, texto: chars, size: met.fontSize, bold: met.bold,
                  y: b.y, x: b.x, largo: chars.length });
  });
  if (textos.length < 3) return { niveles: [], textos: textos, cuerpo: null };

  // El tamaño de cuerpo es el más frecuente entre los textos largos: el que
  // usa la mayor parte del contenido.
  var frecuencia = {};
  textos.forEach(function(t) {
    var peso = t.largo > 40 ? 3 : 1;   // los párrafos pesan más que las etiquetas
    frecuencia[t.size] = (frecuencia[t.size] || 0) + peso;
  });
  var cuerpo = null, mejor = 0;
  Object.keys(frecuencia).forEach(function(s) {
    if (frecuencia[s] > mejor) { mejor = frecuencia[s]; cuerpo = parseFloat(s); }
  });
  if (!cuerpo) return { niveles: [], textos: textos, cuerpo: null };

  // Todo lo que supere el cuerpo en un 15% y sea corto es candidato a encabezado
  var candidatos = textos.filter(function(t) {
    if (t.size <= cuerpo * 1.15) return false;
    if (t.largo > 90) return false;     // un párrafo grande no es un título
    return true;
  });

  // Los tamaños distintos, de mayor a menor, son los niveles
  var tamanos = [];
  candidatos.forEach(function(t) { if (tamanos.indexOf(t.size) === -1) tamanos.push(t.size); });
  tamanos.sort(function(a, b) { return b - a; });

  var niveles = candidatos.map(function(t) {
    return { node: t.node, texto: t.texto, size: t.size, y: t.y, x: t.x,
             nivel: tamanos.indexOf(t.size) + 1 };
  }).sort(function(a, b) { return a.y - b.y || a.x - b.x; });

  return { niveles: niveles, textos: textos, cuerpo: cuerpo, tamanos: tamanos };
}

// Reemplaza al chequeo que exigía capas llamadas H1, H2… Si el archivo las
// tiene, se usan; si no, se deduce de la escala.
function auditHeadingStructure(roots) {
  var issues = [], passed = 0;
  var lista = Array.isArray(roots) ? roots : [roots];

  lista.forEach(function(root) {
    // Primero, si el archivo nombra los niveles, se respeta lo que dice
    var porNombre = [];
    getTextNodes(root).forEach(function(n) {
      var m = (n.name || '').toLowerCase().match(/\bh([1-6])\b/);
      if (!m) return;
      var b = absBox(n);
      porNombre.push({ nivel: parseInt(m[1], 10), node: n, y: b.y, x: b.x,
                       texto: (function() { try { return (n.characters || '').trim(); } catch (e) { return ''; } })() });
    });

    var usados, fuente;
    if (porNombre.length >= 2) {
      usados = porNombre.sort(function(a, b) { return a.y - b.y || a.x - b.x; });
      fuente = 'nombre';
    } else {
      var inf = inferirJerarquiaTexto(root);
      usados = inf.niveles;
      fuente = 'escala';
      if (!usados.length) return;
    }

    // Un solo nivel no es jerarquía
    var distintos = {};
    usados.forEach(function(h) { distintos[h.nivel] = true; });

    if (fuente === 'escala') {
      // No se puede afirmar el nivel exacto: se pide marcarlos explícitamente
      issues.push({
        type: 'heading', severity: 'warning', nodeId: usados[0].node.id,
        nodeName: usados[0].node.name || 'Encabezado',
        message: 'Se detectaron ' + usados.length + ' textos que funcionan como encabezados por su ' +
                 'tamaño (' + Object.keys(distintos).length + ' niveles), pero ninguna capa declara ' +
                 'cuál es cuál. Un lector de pantalla navega por encabezados: si en el código son ' +
                 'párrafos con estilo, esa navegación no existe.',
        fix: 'Nombrá las capas con su nivel (H1, H2, H3) para dejarlo asentado en el handoff, y ' +
             'pedí que en el código sean <h1> a <h6> reales, no <div> con font-size.',
        wcag: '1.3.1',
        detail: { deducidos: usados.length, niveles: Object.keys(distintos).length,
                  porEscala: true,
                  ejemplos: usados.slice(0, 4).map(function(h) {
                    return (h.texto || '').slice(0, 30) + ' (' + h.size + 'px)'; }) }
      });
    } else passed++;

    // Saltos de nivel: vale tanto si vienen del nombre como de la escala
    for (var i = 1; i < usados.length; i++) {
      var salto = usados[i].nivel - usados[i - 1].nivel;
      if (salto > 1) {
        issues.push({
          type: 'heading', severity: 'warning', nodeId: usados[i].node.id,
          nodeName: usados[i].node.name || 'Encabezado',
          message: 'La jerarquía salta de nivel ' + usados[i - 1].nivel + ' a ' + usados[i].nivel +
                   (fuente === 'escala' ? ' (deducido por tamaño de fuente)' : '') +
                   '. Los niveles no pueden saltear: quien navega por encabezados se pierde el nivel intermedio.',
          fix: 'Usá el nivel ' + (usados[i - 1].nivel + 1) + ' acá, o subí el encabezado anterior. ' +
               'El nivel expresa la estructura del contenido, no su tamaño.',
          wcag: '1.3.1',
          detail: { de: usados[i - 1].nivel, a: usados[i].nivel, fuente: fuente }
        });
      } else passed++;
    }
  });

  return { issues: issues, passed: passed };
}

// ─── Campos de formulario por forma ──────────────────────────────────────────
// Un input tiene una silueta muy reconocible: una caja con borde o fondo propio,
// de alto de control, ancha, con un solo texto adentro alineado a la izquierda y
// sin ser un botón. No hace falta que la capa se llame "input".

function pareceCampoPorForma(node) {
  if (node.type === 'TEXT') return false;
  if (!('children' in node)) return false;

  var b = absBox(node);
  if (!b.width || !b.height) return false;

  // Proporciones de campo: alto de control, claramente más ancho que alto
  if (b.height < 28 || b.height > 88) return false;
  if (b.width < 120) return false;
  if (b.width / b.height < 2.2) return false;

  // Tiene borde visible, o fondo distinto del contenedor
  var tieneBorde = false;
  try {
    tieneBorde = Array.isArray(node.strokes) && node.strokes.some(function(s) {
      return s.type === 'SOLID' && s.visible !== false; });
  } catch (e) {}

  var relleno = null;
  try { relleno = topSolidFill(node.fills); } catch (e) {}
  if (!tieneBorde && !relleno) return false;

  // Un solo texto adentro, y no centrado (los botones centran su etiqueta)
  var textos = [];
  getAllNodes(node).forEach(function(c) {
    if (c.type === 'TEXT' && isLayerVisible(c)) textos.push(c);
  });
  if (textos.length !== 1) return false;

  var t = textos[0];
  try {
    if (t.textAlignHorizontal === 'CENTER') return false;   // botón, no campo
  } catch (e) {}

  // El texto arranca cerca del borde izquierdo, como un valor o un placeholder
  var tb = absBox(t);
  var margenIzq = tb.x - b.x;
  if (margenIzq > b.width * 0.4) return false;

  // Un botón con reacción y relleno saturado no es un campo
  var tieneReaccion = false;
  try { tieneReaccion = Array.isArray(node.reactions) && node.reactions.length > 0; } catch (e) {}
  if (tieneReaccion && !tieneBorde) return false;

  return true;
}

// ─── Barras flotantes por geometría ──────────────────────────────────────────
// Que algo esté anclado arriba o abajo ocupando casi todo el ancho es una
// propiedad geométrica. No hace falta que se llame "sticky".

function esBarraFlotantePorForma(node, raiz) {
  var b = absBox(node);
  if (!b.width || !b.height) return null;
  if (b.height > raiz.height * 0.25) return null;      // no es una barra
  if (b.height < 24) return null;

  var anchoCasiTotal = b.width >= raiz.width * 0.8;
  var pegadoArriba = Math.abs(b.y - raiz.y) < 8;
  var pegadoAbajo  = Math.abs((b.y + b.height) - (raiz.y + raiz.height)) < 8;

  if (anchoCasiTotal && pegadoArriba) return 'arriba';
  if (anchoCasiTotal && pegadoAbajo)  return 'abajo';

  // Un botón flotante en una esquina inferior también tapa contenido
  var chico = b.width < raiz.width * 0.35 && b.height < raiz.height * 0.15;
  var esquinaInferior = pegadoAbajo ||
    Math.abs((b.y + b.height) - (raiz.y + raiz.height)) < 48;
  var derecha = Math.abs((b.x + b.width) - (raiz.x + raiz.width)) < 48;
  if (chico && esquinaInferior && derecha) return 'esquina';

  return null;
}


// ─── Grupos de auditoría seleccionables ──────────────────────────────────────
// Correr todo siempre produce un choclo: lo de handoff —nombres accesibles,
// roles, estados— aparece en CUALQUIER archivo, porque nadie lo anota en el
// diseño. Son hallazgos correctos pero que no se resuelven en Figma, y ahogan a
// los que sí. Poder apagarlos es la diferencia entre un reporte que se lee y uno
// que se cierra.

var GRUPOS_AUDITORIA = {
  visual: {
    label: 'Visual',
    desc: 'Lo que se decide y se arregla en el archivo: color, tipografía, tamaños, espaciado.',
    cats: ['contrast', 'nontext', 'typography', 'escala', 'legibilidad',
           'spacing', 'reflow', 'hierarchy']
  },
  interaccion: {
    label: 'Interacción',
    desc: 'Áreas de toque, separación, foco visible y elementos que tapan el foco.',
    cats: ['target', 'spacingTarget', 'focus', 'focusAppearance', 'obscured', 'dragging']
  },
  contenido: {
    label: 'Contenido y estructura',
    desc: 'Encabezados, texto de enlaces, alternativas de imagen y lenguaje sensorial.',
    cats: ['heading', 'link', 'images', 'sensory']
  },
  formularios: {
    label: 'Formularios',
    desc: 'Etiquetas, errores, autocompletado y autenticación.',
    cats: ['form', 'placeholder', 'auth']
  },
  handoff: {
    label: 'Handoff a desarrollo',
    desc: 'Nombres accesibles, roles y estados ARIA. Aparecen en cualquier archivo ' +
          'porque no se anotan en el diseño: son para documentar, no para corregir acá.',
    cats: ['aria', 'ds']
  }
};

// Qué grupo le corresponde a cada categoría
var CAT_A_GRUPO = (function() {
  var m = {};
  Object.keys(GRUPOS_AUDITORIA).forEach(function(g) {
    GRUPOS_AUDITORIA[g].cats.forEach(function(c) { m[c] = g; });
  });
  return m;
})();

function gruposActivos(seleccion) {
  if (!seleccion || !seleccion.length) return Object.keys(GRUPOS_AUDITORIA);
  return seleccion;
}

function categoriaActiva(cat, seleccion) {
  var g = CAT_A_GRUPO[cat];
  if (!g) return true;                      // sin grupo asignado, siempre corre
  return gruposActivos(seleccion).indexOf(g) !== -1;
}



// ═════════════════════════════════════════════════════════════════════════════
// TEXTOS ALTERNATIVOS
//
// El plugin detecta las imágenes; el alt lo tiene que escribir una persona,
// porque depende de qué aporta la imagen EN ESE contexto. Lo que sí puede hacer
// es juntarlas todas en un lugar, proponer un punto de partida, y dejar el
// resultado anotado sobre el diseño para que llegue a desarrollo.
// ═════════════════════════════════════════════════════════════════════════════

// ─── Qué cuenta como imagen ──────────────────────────────────────────────────
// Para WCAG, "imagen" es cualquier contenido no textual que comunique algo. Eso
// incluye mucho más que un relleno de tipo IMAGE:
//
//   · rellenos de imagen y de video
//   · ilustraciones armadas con vectores, que no tienen relleno de imagen
//   · marcos que hacen de placeholder de una foto que todavía no está
//
// Detectar solo el primer caso dejaba afuera media pantalla.

var IMAGEN_WORDS = ['image', 'imagen', 'img', 'photo', 'foto', 'picture', 'pic',
                    'hero', 'banner', 'thumbnail', 'thumb', 'cover', 'portada',
                    'avatar', 'ilustracion', 'ilustración', 'illustration',
                    'graphic', 'grafico', 'gráfico', 'chart', 'diagram', 'diagrama',
                    'logo', 'isotipo', 'placeholder'];

function claseDeImagen(node) {
  // 1. Relleno de imagen o video: es lo más claro
  try {
    if (Array.isArray(node.fills)) {
      for (var i = 0; i < node.fills.length; i++) {
        var f = node.fills[i];
        if (f.visible === false) continue;
        if (f.type === 'IMAGE') return 'imagen';
        if (f.type === 'VIDEO') return 'video';
      }
    }
  } catch (e) {}

  var n = (node.name || '').toLowerCase();
  var b = absBox(node);
  var chico = b.width < 40 && b.height < 40;

  // 2. Ilustración vectorial: varios vectores agrupados, de tamaño de contenido.
  // Un ícono chico no cuenta acá: lo cubre el chequeo de íconos.
  if (('children' in node) && !chico && b.width >= 48 && b.height >= 48) {
    var vectores = 0, otros = 0;
    node.children.forEach(function(c) {
      if (!isLayerVisible(c)) return;
      if (GLYPH_TYPES.indexOf(c.type) !== -1 ||
          c.type === 'ELLIPSE' || c.type === 'RECTANGLE' || c.type === 'STAR') vectores++;
      else if (c.type === 'TEXT') otros += 2;
      else otros++;
    });
    if (vectores >= 2 && otros === 0) return 'ilustración';
  }

  // 3. Placeholder: el nombre dice que ahí va una imagen, aunque todavía no esté
  if (IMAGEN_WORDS.some(function(k) { return n.indexOf(k) !== -1; })) {
    if (node.type === 'TEXT') return null;
    if (chico) return null;
    return 'placeholder';
  }

  return null;
}

// ─── Sugerencia de texto alternativo ─────────────────────────────────────────
// El plugin NO puede ver la imagen: la API da los píxeles, pero no hay nada que
// los interprete. Y aunque pudiera, el alt correcto no depende de qué se ve sino
// de qué APORTA la imagen en ese lugar — la misma foto lleva alt distinto en un
// artículo que en un botón.
//
// Así que la sugerencia sale del CONTEXTO, que es de donde sale también cuando
// la escribe una persona: el título de la card, el encabezado de la sección, el
// texto que la acompaña, el nombre de la capa si alguien lo puso con intención.

function textoCercanoDe(node) {
  var out = { hermano: '', encima: '', distancia: null };
  var b = absBox(node);
  if (!b.width) return out;

  // Solo texto que esté FÍSICAMENTE cerca. Antes se subía por los ancestros
  // buscando el texto más grande, y en una pantalla real eso agarraba el
  // encabezado de otra sección: a una ilustración de "Club arte" le proponía
  // "Auditor de accesibilidad" porque era el título más grande de la página.
  var MAX_DIST = Math.max(120, b.height * 0.6);

  var candidatos = [];

  // 1. Texto encima de la propia imagen: es parte de ella
  function recolectar(scope, esInterno) {
    getAllNodes(scope).forEach(function(t) {
      if (t.type !== 'TEXT' || !isLayerVisible(t)) return;
      if (t.id === node.id) return;
      var chars = '';
      try { chars = (t.characters || '').trim(); } catch (e) {}
      if (!chars || chars.length < 2) return;

      var tb = absBox(t);
      // Distancia vertical al borde de la imagen; 0 si está encima
      var dist;
      var solapaX = Math.min(b.x + b.width, tb.x + tb.width) - Math.max(b.x, tb.x);
      if (solapaX <= 0) return;                       // en otra columna: no la describe
      if (tb.y >= b.y && tb.y + tb.height <= b.y + b.height) dist = 0;   // encima
      else if (tb.y >= b.y + b.height) dist = tb.y - (b.y + b.height);   // debajo
      else if (tb.y + tb.height <= b.y) dist = b.y - (tb.y + tb.height); // arriba
      else dist = 0;

      if (dist > MAX_DIST) return;
      candidatos.push({ texto: chars.slice(0, 70), size: textMetrics(t).fontSize,
                        dist: dist, interno: !!esInterno });
    });
  }

  // Texto puesto sobre la imagen
  if ('children' in node) recolectar(node, true);

  // Texto del contenedor inmediato — la card, no la sección entera
  if (node.parent && 'children' in node.parent) {
    node.parent.children.forEach(function(h) {
      if (h.id === node.id || !isLayerVisible(h)) return;
      recolectar(h, false);
    });
  }

  if (!candidatos.length) return out;

  // Gana el más cercano; con distancias parejas, el más grande
  candidatos.sort(function(a, c) {
    if (Math.abs(a.dist - c.dist) > 24) return a.dist - c.dist;
    return c.size - a.size;
  });

  var mejor = candidatos[0];
  out.hermano = mejor.texto;
  out.distancia = Math.round(mejor.dist);
  if (mejor.interno) out.encima = mejor.texto;
  return out;
}

// Limpia el nombre de capa para usarlo como texto: "Hero image / foto-2" → "Hero"
function nombreUtil(nombre) {
  var n = String(nombre || '')
    .replace(/\[alt:[^\]]*\]/gi, '')
    .replace(/\[decorativa\]/gi, '')
    .split('/').pop()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .replace(/\b(image|imagen|img|photo|foto|picture|pic|copy|frame|rectangle|group|mask)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return n.length >= 3 ? n : '';
}



// ─── Cuentagotas ─────────────────────────────────────────────────────────────
// La API de Figma NO permite muestrear un píxel del canvas: no existe nada
// parecido a un color picker. La EyeDropper del navegador tampoco sirve, porque
// dentro del iframe del plugin solo alcanza al propio panel.
//
// Lo que sí se puede, y para este uso alcanza de sobra: entrar en modo
// cuentagotas y tomar el color de la CAPA que se toque en el canvas. Es lo que
// la persona quiere hacer igual — sacar el color de un texto o de un fondo que
// ya está en el diseño, no de un píxel arbitrario.

var modoCuentagotas = null;   // 'fg' | 'bg' | null

function colorDeCapa(node) {
  var out = { fill: null, stroke: null, texto: null, compuesto: false, opacidad: 1 };
  try {
    var f = topSolidFill(node.fills);
    if (f) {
      // Un negro al 40% sobre blanco se VE gris, y es ese gris el que hay que
      // evaluar. Tomar el hex crudo daba el negro, que no es lo que nadie ve.
      var op = 1;
      if (typeof f.opacity === 'number') op = f.opacity;
      if (typeof node.opacity === 'number') op *= node.opacity;

      if (op < 0.99) {
        var fondo = resolveBackground(node);
        var mez = {
          r: f.color.r * 255 * op + fondo.r * (1 - op),
          g: f.color.g * 255 * op + fondo.g * (1 - op),
          b: f.color.b * 255 * op + fondo.b * (1 - op)
        };
        out.fill = hexFromRGB(mez.r / 255, mez.g / 255, mez.b / 255);
        out.compuesto = true;
        out.opacidad = Math.round(op * 100) / 100;
        out.crudo = hexFromRGB(f.color.r, f.color.g, f.color.b);
      } else {
        out.fill = hexFromRGB(f.color.r, f.color.g, f.color.b);
      }
    }
  } catch (e) {}
  try {
    if (Array.isArray(node.strokes)) {
      var st = node.strokes.filter(function(x) {
        return x.type === 'SOLID' && x.visible !== false; }).pop();
      if (st) out.stroke = hexFromRGB(st.color.r, st.color.g, st.color.b);
    }
  } catch (e) {}
  if (node.type === 'TEXT') {
    try { out.texto = (node.characters || '').trim().slice(0, 40); } catch (e) {}
  }
  return out;
}

// Todos los colores presentes en la selección, con cuántas veces aparecen. Es
// la otra mitad de "elegir cualquier color del frame": una grilla para tocar.
function coloresDelFrame(rootNode) {
  var mapa = {};

  function sumar(hex, origen, nodeId, nombre) {
    if (!hex) return;
    if (!mapa[hex]) mapa[hex] = { hex: hex, usos: 0, origenes: {}, ejemplo: nombre, nodeId: nodeId };
    mapa[hex].usos++;
    mapa[hex].origenes[origen] = (mapa[hex].origenes[origen] || 0) + 1;
  }

  getAllNodes(rootNode).forEach(function(n) {
    var c = colorDeCapa(n);
    if (c.fill)   sumar(c.fill,   n.type === 'TEXT' ? 'texto' : 'relleno', n.id, n.name);
    if (c.stroke) sumar(c.stroke, 'borde', n.id, n.name);
  });

  return Object.keys(mapa).map(function(k) {
    var e = mapa[k];
    e.esTexto = !!e.origenes.texto;
    return e;
  }).sort(function(a, b) { return b.usos - a.usos; });
}

function inventarioImagenes(rootNode) {
  var out = [];

  getAllNodes(rootNode).forEach(function(n) {
    var clase = claseDeImagen(n);
    if (!clase) return;

    var b = absBox(n);
    var nombre = n.name || 'Imagen';
    var guardado = '';
    try { guardado = n.getPluginData('wcagAlt') || ''; } catch (e) {}

    // ¿Está dentro de un control? Entonces el nombre lo lleva el control.
    var dentroDeControl = null;
    var p = n.parent, g = 0;
    while (p && g++ < 6) {
      if (detectInteractive(p).is) { dentroDeControl = p.name || 'un control'; break; }
      p = p.parent;
    }

    var ctx = textoCercanoDe(n);
    var limpio = nombreUtil(nombre);
    var nLower = nombre.toLowerCase();

    // ── La sugerencia: una frase escrita, no un molde para completar
    var sugerido = '', motivo = '', decorativaPorDefecto = false;

    if (dentroDeControl) {
      decorativaPorDefecto = true;
      motivo = 'Está dentro de "' + dentroDeControl + '". El nombre accesible lo lleva el ' +
               'control, así que la imagen va con alt vacío para que no se lea dos veces.';
    } else if (/\b(logo|isotipo|marca|brand|wordmark)\b/.test(nLower)) {
      sugerido = 'Logo de ' + (limpio || '[empresa]');
      motivo = 'Un logo se describe por lo que es, no por cómo se ve. Si es el logo del sitio ' +
               'y está en el header, suele alcanzar con el nombre de la empresa.';
    } else if (/\b(avatar|profile|perfil)\b/.test(nLower)) {
      sugerido = ctx.hermano ? 'Foto de ' + ctx.hermano : 'Foto de perfil';
      motivo = ctx.hermano
        ? 'El nombre "' + ctx.hermano + '" ya está escrito al lado: si es así, la foto es ' +
          'decorativa y va con alt vacío.'
        : 'Si el nombre de la persona está escrito al lado, la foto es decorativa.';
    } else if (/\b(chart|grafico|gráfico|graph|diagram|diagrama)\b/.test(nLower)) {
      sugerido = ctx.hermano
        ? ctx.hermano + ': [el dato principal que muestra]'
        : 'Gráfico: [qué compara y cuál es el dato principal]';
      motivo = 'Un gráfico necesita el DATO, no la forma. "Gráfico de barras" no sirve; ' +
               '"Las ventas subieron 20% en el último trimestre" sí. Si es complejo, además ' +
               'una tabla o un resumen en texto cerca.';
    } else if (ctx.hermano) {
      sugerido = ctx.hermano;
      motivo = (ctx.encima
        ? 'Tiene el texto "' + ctx.hermano + '" encima. Si ese texto está como capa de texto ' +
          'y no dentro del PNG, ya lo lee el lector: la imagen sería decorativa.'
        : 'Hay un texto a ' + ctx.distancia + 'px que dice "' + ctx.hermano + '". Si el alt ' +
          'diría lo mismo, la imagen es decorativa: repetirlo hace que se lea dos veces.');
      decorativaPorDefecto = true;
    } else if (clase === 'ilustración') {
      sugerido = limpio ? 'Ilustración: ' + limpio : '';
      decorativaPorDefecto = !limpio;
      motivo = limpio
        ? 'Una ilustración decorativa —de las que acompañan un estado vacío o un onboarding— ' +
          'va con alt vacío. Solo necesita texto si aporta información que no está escrita.'
        : 'Las ilustraciones de estados vacíos y onboarding suelen ser decorativas: el mensaje ' +
          'ya está en el texto que las acompaña.';
    } else if (limpio) {
      sugerido = limpio.charAt(0).toUpperCase() + limpio.slice(1);
      motivo = 'Salido del nombre de la capa. Revisalo: el alt tiene que decir qué APORTA la ' +
               'imagen acá, no qué se ve en ella.';
    } else {
      motivo = 'Sin contexto alrededor para deducirlo. Si la imagen aporta información, ' +
               'escribila; si no, marcala decorativa.';
    }

    if (clase === 'placeholder') {
      motivo = 'Parece el lugar donde va una imagen, aunque todavía no esté puesta. ' +
               'Dejá el alt documentado igual: llega antes que la imagen. ' + motivo;
    }
    if (clase === 'video') {
      sugerido = sugerido || 'Video: [de qué trata]';
      motivo = 'Un video necesita más que alt: subtítulos (1.2.2) y, si hay información solo ' +
               'visual, audiodescripción (1.2.5). ' + motivo;
    }

    out.push({
      nodeId: n.id, name: nombre, clase: clase,
      width: Math.round(b.width), height: Math.round(b.height),
      alt: guardado,
      sugerido: guardado && guardado !== '[decorativa]' ? guardado : sugerido,
      motivo: motivo,
      decorativa: guardado === '[decorativa]' || (!guardado && decorativaPorDefecto),
      decorativaPorDefecto: decorativaPorDefecto,
      dentroDeControl: dentroDeControl,
      textoCerca: ctx.hermano
    });
  });

  return out;
}

// El alt escrito se guarda EN el nodo, así sobrevive a cerrar el plugin y viaja
// con el archivo. Es lo que hace que esto sirva como handoff y no como un
// ejercicio que se pierde.
function guardarAlt(nodeId, alt) {
  try {
    var n = figma.getNodeById(nodeId);
    if (!n) return false;
    n.setPluginData('wcagAlt', alt || '');
    // Y en el nombre de la capa, para que se vea sin el plugin abierto
    var base = (n.name || '').replace(/\s*\[alt:[^\]]*\]\s*$/, '')
                             .replace(/\s*\[decorativa\]\s*$/, '').trim();
    if (alt === '[decorativa]') n.name = base + '  [decorativa]';
    else if (alt) n.name = base + '  [alt: ' + alt.slice(0, 60) + ']';
    else n.name = base;
    return true;
  } catch (e) { return false; }
}



// Pega los textos alternativos como anotaciones al costado del frame, para que
// lleguen a desarrollo sin depender de que alguien abra el plugin.
// ─── Etiqueta de alt sobre la imagen ─────────────────────────────────────────
// Píldora chica con cola, apoyada SOBRE la imagen y no flotando arriba. Estaba
// puesta 34px por encima del borde, así que en una grilla quedaba encima de la
// imagen de la fila anterior y parecía desfasada. Ahora se ancla adentro.

function etiquetasSobreImagenes(imagenes) {
  var container = getOrCreateAnnotContainer();
  var name = 'WCAG ▸ [Alt] etiquetas';
  for (var i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i].name === name) container.children[i].remove();
  }

  var overlay = figma.createFrame();
  overlay.name = name;
  overlay.fills = [];
  overlay.clipsContent = false;
  overlay.resize(1, 1);
  overlay.x = 0; overlay.y = 0;
  container.appendChild(overlay);
  sealOverlay(overlay);

  var AZUL  = { r: 0.10, g: 0.34, b: 0.72 };
  var VERDE = { r: 0.04, g: 0.42, b: 0.36 };
  var ROJO  = { r: 0.75, g: 0.16, b: 0.13 };

  var puestas = 0;

  imagenes.forEach(function(img) {
    var n = null;
    try { n = figma.getNodeById(img.nodeId); } catch (e) {}
    if (!n || !n.absoluteBoundingBox) return;
    var b = n.absoluteBoundingBox;

    var decorativa = (img.alt === '[decorativa]');
    var texto = decorativa ? 'Alt= ""'
              : (img.alt ? 'Alt= "' + img.alt + '"' : 'Alt: falta escribirlo');
    var color = decorativa ? VERDE : (img.alt ? AZUL : ROJO);

    // La píldora crece con el texto pero no se pasa del ancho de la imagen
    var maxAncho = Math.max(140, Math.min(b.width * 0.85, 420));

    var pill = figma.createFrame();
    pill.name = 'Alt · ' + (n.name || '');
    pill.resize(maxAncho, 34);
    pill.layoutMode = 'HORIZONTAL';
    pill.counterAxisSizingMode = 'AUTO';   // el alto lo da el texto
    pill.primaryAxisSizingMode = 'AUTO';   // y el ancho también, hasta el máximo
    pill.counterAxisAlignItems = 'CENTER';
    pill.paddingLeft = 14; pill.paddingRight = 14;
    pill.paddingTop = 8;   pill.paddingBottom = 8;
    pill.cornerRadius = 8;
    pill.fills = [{ type: 'SOLID', color: color }];
    overlay.appendChild(pill);

    var t = figma.createText();
    t.characters = texto;
    t.fontSize = 13;
    t.fontName = { family: 'Inter', style: 'Bold' };
    t.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    pill.appendChild(t);
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    // Si se pasa del máximo, se fija el ancho y envuelve
    if (t.width > maxAncho - 28) {
      t.textAutoResize = 'HEIGHT';
      t.resize(maxAncho - 28, t.height);
    }

    // Cola triangular apuntando a la imagen, pegada al borde derecho
    var cola = figma.createPolygon();
    cola.pointCount = 3;
    cola.resize(14, 18);
    cola.fills = [{ type: 'SOLID', color: color }];
    cola.rotation = -90;                    // el vértice mira a la derecha
    overlay.appendChild(cola);

    // Anclada SOBRE la imagen, apoyada en el borde izquierdo y cerca de arriba.
    // Se sale un poco hacia afuera para que la cola apunte hacia adentro.
    var px = b.x - 22;
    var py = b.y + Math.min(28, b.height * 0.12);
    pill.x = px;
    pill.y = py;
    cola.x = px + pill.width;
    cola.y = py + (pill.height - 18) / 2 + 18;   // compensa la rotación

    puestas++;
  });

  return { overlay: overlay, puestas: puestas };
}

function pegarAnotacionesAlt(imagenes, rootNode) {
  var container = getOrCreateAnnotContainer();
  var name = 'WCAG ▸ [Textos alternativos]';
  for (var i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i].name === name) container.children[i].remove();
  }

  var W = 460;
  var ab = rootNode && rootNode.absoluteBoundingBox ? rootNode.absoluteBoundingBox : null;
  var doc = crearDocumento(name, W, {
    x: ab ? ab.x + ab.width + 64 : freeSpotOnCanvas().x,
    y: ab ? ab.y : freeSpotOnCanvas().y
  });

  var d = abrirSeccion(doc, 'Portada', 36, 24);
  d.texto('Textos alternativos', 24, true, RP.ink, { gap: 5 });
  d.texto((rootNode ? rootNode.name + '   ·   ' : '') + imagenes.length +
          ' imágenes   ·   WCAG 1.1.1', 11.5, false, RP.muted, { gap: 0 });
  cerrarSeccion(d);

  imagenes.forEach(function(img, idx) {
    var ds = abrirSeccion(doc, 'Imagen ' + (idx + 1), 6, 10);
    var yCaja = ds.y;
    ds.col = { x: 44 + 16, w: ds.w - 32 };
    ds.y += 16;

    var decorativa = (img.alt === '[decorativa]') || (!img.alt && img.decorativa);

    ds.texto((idx + 1) + '.  ' + img.name, 13, true, RP.ink, { gap: 4 });
    ds.texto(img.width + '×' + img.height + 'px', 10, false, RP.muted, { gap: 10 });

    if (decorativa) {
      ds.texto('Decorativa', 11, true, RP.teal, { gap: 4 });
      ds.texto('alt=""', 12, false, RP.ink, { gap: 6 });
      ds.texto('No aporta información que el texto no diga ya. Con alt vacío el lector la ' +
               'saltea, que es lo correcto: describirla sería ruido.', 10.5, false, RP.muted, { gap: 0 });
    } else if (img.alt) {
      ds.texto('Texto alternativo', 10, true, RP.muted, { gap: 4 });
      ds.texto('alt="' + img.alt + '"', 12, false, RP.ink, { gap: 0 });
    } else {
      ds.texto('Falta escribirlo', 11, true, RP.red, { gap: 4 });
      ds.texto(img.sugerido ? 'Sugerencia: ' + img.sugerido : 'Escribí qué aporta esta imagen.',
               11, false, RP.muted, { gap: 4 });
      if (img.motivo) ds.texto(img.motivo, 10.5, false, RP.muted, { gap: 0 });
    }

    ds.y += 16;
    var bg = ds.rect(44, yCaja, ds.w, ds.y - yCaja,
                     decorativa ? RP.tealBg : (img.alt ? RP.papel : RP.rojoBg), 10);
    try { ds.f.insertChild(0, bg); } catch (e) {}
    cerrarSeccion(ds);
  });

  container.appendChild(doc);
  sealOverlay(doc, false);
  traerAnotacionesAlFrente();
  return doc;
}

function runAudit(node, opciones) {
  // Hidden-layer bookkeeping is per audited frame, so the UI can report
  // "12 hidden layers skipped" next to that frame's score.
  skippedHiddenLayers = 0;
  skippedHiddenNames  = [];

  var rootHidden = !isLayerVisible(node);

  var contrast   = auditContrast(node);
  var nontext    = auditNonTextContrast(node);
  var typography = auditTypography(node);
  var hierarchy  = auditHierarchy(node);
  var focus      = auditFocusStates(node);
  var images     = auditImages(node);
  var sensory    = auditSensoryLanguage(node);
  var target     = auditTargetSize(node);
  var aria       = auditAria(node);

  // Criterios que solo tienen sentido según qué se esté auditando. Correr los
  // checks de librería sobre una pantalla, o los de pantalla sobre una librería,
  // produce ruido en vez de información.
  var ctx = detectarContexto(node);
  var vacio = { issues: [], passed: 0 };
  var ds     = vacio, escala = vacio, headings = vacio, links = vacio;

  if (ctx.tipo === 'design-system' || ctx.tipo === 'componente') {
    ds     = auditDesignSystem(node);
    escala = auditEscalaTipografica(node);
  }
  if (ctx.tipo === 'pantalla' || ctx.tipo === 'componente') {
    headings = auditHeadingStructure(node);
    links    = auditLinkText(node);
  }

  // Tipografía y layout: lo que pasa cuando el texto crece
  var spacing  = auditTextSpacing(node);
  var reflow   = auditReflow(node);
  var legible  = auditLegibilidad(node);
  var placeh   = auditPlaceholder(node);

  // Formularios e interacción
  var forms    = auditFormularios(node);
  var spTarget = auditTargetSpacing(node);
  var focusApp = auditFocusAppearance(node);

  // Criterios que suma WCAG 2.2
  var obscured = auditFocusObscured(node);
  var drag     = auditDragging(node);
  var auth     = auditAuth(node);

  var seleccion = (opciones && opciones.grupos) || null;
  var vacioCat = { issues: [], passed: 0 };
  function filtrar(cat, r) { return categoriaActiva(cat, seleccion) ? r : vacioCat; }

  var results = { contrast: contrast, nontext: nontext, typography: typography,
                  hierarchy: hierarchy, focus: focus, images: images, sensory: sensory,
                  target: target, aria: aria,
                  ds: ds, escala: escala, heading: headings, link: links,
                  spacing: spacing, reflow: reflow, legibilidad: legible,
                  placeholder: placeh, form: forms,
                  spacingTarget: spTarget, focusAppearance: focusApp,
                  obscured: obscured, dragging: drag, auth: auth };

  // Se apagan las categorías de los grupos no elegidos
  Object.keys(results).forEach(function(cat) { results[cat] = filtrar(cat, results[cat]); });
  var score = calculateScore(results);

  // Se arma desde results, que ya viene filtrado por los grupos elegidos
  var allIssues = [];
  Object.keys(results).forEach(function(cat) {
    (results[cat].issues || []).forEach(function(x) { allIssues.push(x); });
  });
  // Numeración única del frame: primero los fails, después los warnings, en el
  // mismo orden en que se dibujan los marcadores. El panel, el canvas y el HTML
  // comparten este número — sin él no hay forma de ir de uno al otro.
  // El canvas dibuja UN marcador por nodo, no uno por hallazgo. Si el panel
  // numera 24 y la pantalla muestra 15 círculos, los números dejan de servir
  // para lo único que existen: ir de uno al otro. La numeración replica acá la
  // misma deduplicación y el mismo orden de prioridad que usa el dibujado.
  var paraNumerar = allIssues.filter(function(i) { return i.nodeId; });

  // El impacto se calcula ANTES de numerar: el número tiene que seguir el mismo
  // orden en que se lee el reporte, o el primer grupo arranca en 3 y nadie
  // entiende por qué.
  anotarImpacto(paraNumerar);
  var orden = paraNumerar.slice().sort(function(a, b) {
    return a.impactoOrden - b.impactoOrden;
  });

  var numPorNodo = {}, siguiente = 1;
  orden.forEach(function(i) {
    if (numPorNodo[i.nodeId] === undefined) {
      if (siguiente > 25) return;              // el canvas corta en 25 marcadores
      numPorNodo[i.nodeId] = siguiente++;
    }
  });
  // Todos los hallazgos del mismo nodo comparten su número, que es lo que se ve
  // en la pantalla: un círculo por elemento, no uno por criterio.
  paraNumerar.forEach(function(i) {
    if (numPorNodo[i.nodeId] !== undefined) {
      i.marker = numPorNodo[i.nodeId];
      i.tier = (i.impacto === 'bloqueante') ? 'p1'
             : (i.impacto === 'serio') ? 'p2' : 'p3';
    }
  });




  var fails    = allIssues.filter(function(i) { return i.severity === 'fail'; }).length;
  var warnings = allIssues.filter(function(i) { return i.severity === 'warning'; }).length;

  return {
    score: score,
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    fails: fails,
    warnings: warnings,
    results: results,
    hierarchy: hierarchy.hierarchy,
    contexto: ctx,
    // Hallazgos agrupados: 24 filas con el mismo problema son UN hallazgo que
    // afecta a 24 elementos, no 24 hallazgos.
    grupos: agruparHallazgos(allIssues),
    // Impacto real de cada hallazgo, cobertura del análisis, y lo que quedó
    // pendiente de revisar a mano convertido en tareas.
    cobertura: calcularCobertura(node, results),
    checklist: checklistManual(node, false),
    impactos: (function() {
      anotarImpacto(allIssues);   // los que no tienen nodeId no pasaron por la numeración
      var c = { bloqueante: 0, serio: 0, moderado: 0, menor: 0 };
      allIssues.forEach(function(i) { c[i.impacto] = (c[i.impacto] || 0) + 1; });
      return c;
    })(),
    // Bounds guardados: el reporte se ubica al costado sin depender de volver a
    // buscar el nodo, que puede estar en otra página o haber cambiado de id.
    bounds: (function() {
      var b = node.absoluteBoundingBox;
      return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null;
    })(),
    // Surfaced in the UI so the designer knows the audit was scoped, not incomplete
    visibility: (function() {
      // Cada categoría recorre el árbol y suma al mismo contador: un modal
      // oculto salía contado una vez por categoría. Se cuenta con un solo
      // recorrido, que es lo que efectivamente quedó afuera.
      skippedHiddenLayers = 0; skippedHiddenNames = [];
      try { getAllNodes(node); } catch (e) {}
      return {
        rootHidden: rootHidden,
        hiddenLayersSkipped: skippedHiddenLayers,
        hiddenSample: skippedHiddenNames.slice(0, 10)
      };
    })()
  };
}

// ─── Export Helpers (module-level so they can be called outside runAuditsAndPost) ─

function isNodeDirectlyVisible(n) {
  return n.visible !== false && (typeof n.opacity !== 'number' || n.opacity >= 0.05);
}

function bestExportNode(id) {
  var node = figma.getNodeById(id);
  if (!node) return null;

  if (node.type !== 'TEXT' && node.width >= 16 && node.height >= 8 &&
      isNodeDirectlyVisible(node)) return node;

  var tightFrame    = null;
  var topLevelFrame = null;
  var candidate = node.parent;
  while (candidate && candidate.type !== 'PAGE') {
    var ct = candidate.type;
    if (candidate.parent && candidate.parent.type === 'PAGE') {
      topLevelFrame = candidate;
    }
    if (ct === 'COMPONENT' || ct === 'INSTANCE' || ct === 'COMPONENT_SET') {
      if (isNodeDirectlyVisible(candidate)) return candidate;
    }
    if ((ct === 'FRAME' || ct === 'GROUP' || ct === 'SECTION') &&
        candidate.width >= 16 && candidate.height >= 8 &&
        isNodeDirectlyVisible(candidate)) {
      var area   = candidate.width * candidate.height;
      var maxDim = Math.max(candidate.width, candidate.height);
      if (area < 250000 && maxDim <= 700) {
        if (!tightFrame || area < (tightFrame.width * tightFrame.height)) {
          tightFrame = candidate;
        }
      }
    }
    candidate = candidate.parent;
  }

  if (node.type === 'TEXT') return node;
  return tightFrame || topLevelFrame || node;
}

function tryExportNode(n, id) {
  if (!n || typeof n.exportAsync !== 'function') return Promise.resolve(null);
  var constraint = { type: 'WIDTH', value: 320 };
  if (n.type === 'TEXT') {
    constraint = { type: 'HEIGHT', value: 40 };
  } else if (n.width && n.height && n.height > 0 && n.width / n.height > 5) {
    constraint = { type: 'HEIGHT', value: 80 };
  }
  return n.exportAsync({ format: 'PNG', constraint: constraint })
    .then(function(bytes) {
      if (!bytes || bytes.byteLength < 10) return null;
      var binary = '';
      for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return { id: id, b64: 'data:image/png;base64,' + btoa(binary) };
    })
    .catch(function() { return null; });
}

// ─── Audit & Post Helper ──────────────────────────────────────────────────────
// Shared by both run-audit (selection) and reaudit-session (saved IDs)
// createAnnotations: if true (default), builds WCAG summary cards + markers on canvas

var auditCancelled = false;

// dismissedSet: optional object keyed by "nodeId::msg40" built in the UI from
// the persisted dismissedIssues map. Passed through to buildAnnotationFrame so
// dismissed findings are excluded from the canvas annotation cards.
// ─── Tiempo estimado ─────────────────────────────────────────────────────────
// Una auditoría sobre un frame grande tarda, y sin ninguna señal parece que el
// plugin se colgó. El tiempo se estima por cantidad de capas, con la velocidad
// medida en las corridas anteriores de esta misma compu.
var msPorNodo = 0.8;          // punto de partida hasta tener una medición real
try {
  figma.clientStorage.getAsync('wcagMsPorNodo').then(function(v) {
    if (typeof v === 'number' && v > 0 && v < 50) msPorNodo = v;
  }).catch(function() {});
} catch (e) {}

function contarCapas(nodes) {
  var total = 0;
  (nodes || []).forEach(function(n) { try { total += getAllNodes(n).length; } catch (e) {} });
  return total;
}

function registrarDuracion(capas, ms) {
  if (!capas || capas < 50 || !ms) return;
  var medido = ms / capas;
  // Promedio móvil: una corrida rara no arruina la estimación
  msPorNodo = Math.round((msPorNodo * 0.6 + medido * 0.4) * 1000) / 1000;
  try { figma.clientStorage.setAsync('wcagMsPorNodo', msPorNodo); } catch (e) {}
}

function avisarProgreso(fase, hecho, total, nombre) {
  try {
    figma.ui.postMessage({ type: 'audit-progress', fase: fase, hecho: hecho, total: total,
                           nombre: nombre || '' });
  } catch (e) {}
}

// Audita un frame por vez y le devuelve el control al panel entre uno y otro,
// para que el progreso se vea mientras pasa y no todo junto al final.
function runAuditsAndPost(nodes, createAnnotations, dismissedSet, opciones) {
  if (createAnnotations === undefined) createAnnotations = true;
  auditCancelled = false;                          // reset for each new audit run
  var inicio = Date.now();
  var capas = contarCapas(nodes);
  var audits = [];
  avisarProgreso('analizando', 0, nodes.length, nodes[0] && nodes[0].name);

  function siguiente(i) {
    if (auditCancelled) { auditCancelled = false; return; }
    if (i >= nodes.length) {
      registrarDuracion(capas, Date.now() - inicio);
      avisarProgreso('anotando', nodes.length, nodes.length);
      continuarAuditoria(nodes, audits, createAnnotations, dismissedSet);
      return;
    }
    audits.push(runAudit(nodes[i], opciones));
    avisarProgreso('analizando', i + 1, nodes.length, nodes[i + 1] && nodes[i + 1].name);
    setTimeout(function() { siguiente(i + 1); }, 0);
  }
  setTimeout(function() { siguiente(0); }, 0);
}

function continuarAuditoria(nodes, audits, createAnnotations, dismissedSet) {

  // Collect unique issue nodeIds — fail-severity first so P1 issues always get thumbnails
  var seenIds = {};
  var failIds = [];
  var warnIds = [];
  audits.forEach(function(a) {
    ['contrast','nontext','typography','hierarchy','focus','images','sensory','target','aria','ds','escala','heading','link',
    'spacing','reflow','legibilidad','placeholder','form','spacingTarget','focusAppearance',
    'obscured','dragging','auth'].forEach(function(cat) {
      if (a.results[cat]) {
        a.results[cat].issues.forEach(function(issue) {
          if (issue.nodeId && !seenIds[issue.nodeId]) {
            seenIds[issue.nodeId] = true;
            if (issue.severity === 'fail') failIds.push(issue.nodeId);
            else warnIds.push(issue.nodeId);
          }
        });
      }
    });
  });
  // No cap on uniqueIds: all issue nodes get an origToExportMap entry.
  // getNodeById + parent traversal is synchronous/fast — no async cost here.
  // The actual export cap (cappedExportIds) limits the async PNG work below.
  var uniqueIds = failIds.concat(warnIds);

  // isNodeDirectlyVisible, bestExportNode, tryExportNode — defined at module scope above.

  // ── Deduplicate by export node ────────────────────────────────────────────
  // Many TEXT nodes in the same COMPONENT or FRAME share the same bestExportNode.
  // Instead of exporting one PNG per issue node (can be 1000+), we export one PNG
  // per unique bestExportNode and send a mapping { issueNodeId → exportNodeId }
  // to the UI so each issue card can find the right thumbnail.
  var origToExportMap = {};   // issueNodeId → exportNodeId
  var exportNodeById  = {};   // exportNodeId → export SceneNode
  var exportToOrigId  = {};   // exportNodeId → first issueNodeId that maps to it
  var exportOrder     = [];   // ordered unique export node ids

  uniqueIds.forEach(function(origId) {
    var exportNode = bestExportNode(origId);
    var exportId   = exportNode ? exportNode.id : origId;
    origToExportMap[origId] = exportId;
    if (!exportNodeById[exportId]) {
      exportNodeById[exportId] = exportNode;
      exportToOrigId[exportId] = origId;
      exportOrder.push(exportId);
    }
  });

  // Split the export budget by node type:
  //   • Non-TEXT nodes (components, frames, shapes) get up to 800 slots.
  //     These can be large PNGs and are usually found early in exportOrder
  //     (failIds are contrast issues on real elements).
  //   • TEXT self-exports (typography issues where no tight container was found)
  //     get up to 2000 slots.  They are tiny PNGs (single line of text) so the
  //     extra count adds little cost but prevents typography issues from being
  //     silently dropped when a large file has 100+ frames.
  var textExportIds  = exportOrder.filter(function(id) {
    return exportNodeById[id] && exportNodeById[id].type === 'TEXT';
  });
  var otherExportIds = exportOrder.filter(function(id) {
    return !exportNodeById[id] || exportNodeById[id].type !== 'TEXT';
  });
  // Non-TEXT cap raised to 1500: with CATS iteration order (contrast first,
  // images last), a 800 cap was cutting off images/focus nodes on large files.
  // TEXT cap adjusted to 1500 to keep total reasonable.
  var cappedExportIds = otherExportIds.slice(0, 1500).concat(textExportIds.slice(0, 1500));

  var thumbPromises = cappedExportIds.map(function(exportId) {
    var exportNode = exportNodeById[exportId];
    var origNode   = figma.getNodeById(exportToOrigId[exportId]);
    return tryExportNode(exportNode, exportId)
      .then(function(result) {
        // Fallback 1: original issue node when bestExportNode chose a parent
        if (result) return result;
        if (origNode && origNode !== exportNode) return tryExportNode(origNode, exportId);
        return null;
      })
      .then(function(result) {
        // Fallback 2: immediate parent of original node for context
        if (result) return result;
        var par = origNode && origNode.parent;
        if (par && par.type !== 'PAGE' &&
            typeof par.exportAsync === 'function' &&
            par !== exportNode && par !== origNode) {
          return tryExportNode(par, exportId);
        }
        return null;
      })
      .then(function(result) {
        // Fallback 3: top-level FRAME ancestor — only for non-TEXT export nodes.
        // For TEXT nodes we prefer showing nothing over showing a full screen,
        // because the frame-level thumbnail (frameThumbPromises) already serves
        // as the screen-level fallback in the UI.
        if (result) return result;
        if (exportNode && exportNode.type === 'TEXT') return null;
        var cur = origNode;
        while (cur && cur.parent && cur.parent.type !== 'PAGE') cur = cur.parent;
        if (cur && cur !== exportNode && cur !== origNode &&
            typeof cur.exportAsync === 'function') {
          return tryExportNode(cur, exportId);
        }
        return null;
      });
  });

  // Export each audited frame at reduced size — used as fallback "Current State"
  // thumbnail in the PDF for any issue whose specific node wasn't captured above.
  var frameThumbPromises = nodes.map(function(node) {
    if (typeof node.exportAsync !== 'function') return Promise.resolve(null);
    return node.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: 200 } })
      .then(function(bytes) {
        if (!bytes || bytes.byteLength < 500) return null;
        var binary = '';
        for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return { id: node.id, b64: 'data:image/png;base64,' + btoa(binary) };
      })
      .catch(function() { return null; });
  });

  Promise.all(thumbPromises.concat(frameThumbPromises)).then(function(results) {
    // If the user cancelled while thumbnails were exporting, discard silently
    if (auditCancelled) { auditCancelled = false; return; }

    var thumbnails = {};
    results.forEach(function(r) { if (r) thumbnails[r.id] = r.b64; });

    if (createAnnotations) {
      // Build / update annotation frames on the canvas, then ship results to the UI
      Promise.all([
        figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
        figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
      ]).then(function() {
        if (auditCancelled) { auditCancelled = false; return; }
        nodes.forEach(function(node, i) {
          try { buildAnnotationFrame(node, audits[i], dismissedSet); } catch(e) {
            console.error('[WCAG] buildAnnotationFrame failed for "' + node.name + '" (' + node.id + '):', e);
          }
        });
        figma.ui.postMessage({ type: 'audit-results', audits: audits, thumbnails: thumbnails, thumbMap: origToExportMap });
        traerAnotacionesAlFrente();
        dibujarReporteSiCorresponde(audits);
      }).catch(function() {
        // Font load failed — still return results without annotation frames
        if (!auditCancelled) figma.ui.postMessage({ type: 'audit-results', audits: audits, thumbnails: thumbnails, thumbMap: origToExportMap });
        auditCancelled = false;
      });
    } else {
      // Skip annotation frames entirely — just post results
      figma.ui.postMessage({ type: 'audit-results', audits: audits, thumbnails: thumbnails, thumbMap: origToExportMap });
    }
  });
}

// ─── Annotation Frame Builder ────────────────────────────────────────────────
// Places (or refreshes) a compact WCAG summary card next to each audited frame,
// plus numbered red/orange marker circles overlaid directly on each P1/P2 element
// so designers can instantly locate every issue without opening the plugin panel.

// dismissedSet: optional object keyed by "nodeId::msg40" — issues present here
// are excluded from the annotation card and marker circles.
// ─── Annotation Container ────────────────────────────────────────────────────
// Returns the shared "WCAG Annotations" frame on the current page, creating it
// if it doesn't yet exist.  All annotation cards + marker overlays live inside
// this single container so designers can toggle everything with one layer click.
// ─── Generated artifacts ─────────────────────────────────────────────────────
// Everything the plugin draws follows the same two rules, so annotations never
// get in the way of the work they annotate:
//
//   · OVERLAYS (badges, tags, markers sitting ON TOP of the design) are LOCKED.
//     An unlocked overlay swallows every click meant for the layer underneath,
//     which turns the design into something you cannot select any more.
//     Locked layers are still selectable from the layers panel and unlock with
//     one click, so nothing is lost — only the accidental clicks.
//
//   · DOCUMENTS (the contrast matrix, the ARIA spec sheet) sit beside the page
//     and overlap nothing, so they stay unlocked and movable.
//
// Both get expanded=false: an overlay with fifty badges should be one row in
// the layers panel, not fifty.

function sealOverlay(node, lock) {
  try { node.locked = (lock !== false); } catch (e) {}
  try { node.expanded = false; } catch (e) {}
  try { node.setPluginData('wcagArtifact', lock === false ? 'document' : 'overlay'); } catch (e) {}

  // Los overlays van sobre el diseño: si quedan detrás no sirven para nada.
  // Volver a dibujarlos los lleva al frente otra vez.
  if (lock !== false) {
    try {
      var p = node.parent;
      if (p) p.appendChild(node);              // reappend = al final = arriba
      var page = figma.currentPage;
      if (p && p !== page) page.appendChild(p); // y el contenedor, al frente
    } catch (e) {}
  }
  return node;
}

// Deja todos los marcadores y overlays por encima del diseño. Se llama después
// de dibujar, porque cualquier frame agregado a la página después del
// contenedor lo tapa.
function traerAnotacionesAlFrente() {
  var page = figma.currentPage;
  var cont = null;
  for (var i = 0; i < page.children.length; i++) {
    var ch = page.children[i];
    var tag = '';
    try { tag = ch.getPluginData('wcagAnnotContainer'); } catch (e) {}
    if (tag === '1') { cont = ch; break; }
  }
  if (!cont) return;
  try { page.appendChild(cont); } catch (e) {}

  // Y dentro del contenedor: primero los documentos, después los overlays
  try {
    var hijos = cont.children.slice();
    hijos.forEach(function(h) {
      var t = '';
      try { t = h.getPluginData('wcagArtifact'); } catch (e) {}
      if (t === 'overlay') cont.appendChild(h);
    });
  } catch (e) {}
}

// Locks or unlocks every artifact the plugin has drawn on this page.
function setArtifactsLocked(lock) {
  var n = 0;
  var page = figma.currentPage;
  page.children.forEach(function(child) {
    var tag = '';
    try { tag = child.getPluginData('wcagAnnotContainer'); } catch (e) {}
    if (tag !== '1') return;
    child.children.forEach(function(art) {
      var kind = '';
      try { kind = art.getPluginData('wcagArtifact'); } catch (e) {}
      if (kind === 'document') return;   // los documentos aparte quedan libres
      try { art.locked = !!lock; n++; } catch (e) {}
    });
  });
  return n;
}

function getOrCreateAnnotContainer() {
  var page = figma.currentPage;
  for (var ci = 0; ci < page.children.length; ci++) {
    var ch = page.children[ci];
    if (ch.type !== 'FRAME') continue;
    var tag = '';
    try { tag = ch.getPluginData('wcagAnnotContainer'); } catch(e) {}
    if (tag === '1') {
      // Al frente, siempre. El contenedor se crea una vez, y cualquier frame
      // dibujado después queda por encima: los marcadores terminaban tapados
      // por el propio diseño que estaban anotando.
      try { page.appendChild(ch); } catch (e) {}
      return ch;
    }
  }
  var g = figma.createFrame();
  g.name = '🗂️ WCAG Annotations';
  g.fills = [];           // transparent
  g.clipsContent = false; // children can overflow
  g.resize(1, 1);         // size is irrelevant with clipsContent=false
  g.x = 0; g.y = 0;
  try { g.setPluginData('wcagAnnotContainer', '1'); } catch(e) {}
  try { g.expanded = false; } catch(e) {}
  page.appendChild(g);
  return g;
}

function buildAnnotationFrame(auditedNode, audit, dismissedSet) {
  var MARKER      = 'WCAG ▸ ';
  var frameName   = MARKER + auditedNode.name;
  var markersName = MARKER + '[Issues] ' + auditedNode.name;
  var parent      = auditedNode.parent;

  if (!parent || parent.type === 'DOCUMENT') return;

  // Absolute canvas bounds — used for correct positioning inside the shared container
  var abs  = auditedNode.absoluteBoundingBox;
  var absX = abs ? abs.x : auditedNode.x;
  var absY = abs ? abs.y : auditedNode.y;
  var absW = abs ? abs.width  : auditedNode.width;

  // Shared container frame that holds all annotation cards + markers overlays.
  // Designers can toggle this single layer to show/hide all WCAG annotations.
  var annotContainer = getOrCreateAnnotContainer();

  // ── Remove stale card + markers wherever they are on the page ─────────────
  // Strategy 1 (primary): the audited node stores the IDs of its annotation
  // frames — figma.getNodeById() finds them instantly regardless of whether
  // they were moved away from the original parent.
  var storedAnnotId = '';
  var storedMkrsId  = '';
  try { storedAnnotId = auditedNode.getPluginData('wcagAnnotFrameId'); } catch(e) {}
  try { storedMkrsId  = auditedNode.getPluginData('wcagMkrsFrameId');  } catch(e) {}
  [storedAnnotId, storedMkrsId].forEach(function(id) {
    if (!id) return;
    try {
      var found = figma.getNodeById(id);
      if (found) found.remove();
    } catch(e) {}
  });

  // Strategy 2 (fallback for legacy/first-run): scan the shared container AND
  // the immediate parent for frames tagged with wcagForNodeId or a matching name.
  var nodeIdStr = auditedNode.id;
  var toRemove = [];
  var scanTargets = [annotContainer, parent];
  scanTargets.forEach(function(target) {
    if (!target || !target.children) return;
    for (var ci = 0; ci < target.children.length; ci++) {
      var ch = target.children[ci];
      if (ch.type !== 'FRAME') continue;
      if (ch.id === storedAnnotId || ch.id === storedMkrsId) continue; // already gone
      var linkedId = '';
      try { linkedId = ch.getPluginData('wcagForNodeId'); } catch(e) {}
      if (linkedId === nodeIdStr) { toRemove.push(ch); continue; }
      if (!linkedId && (ch.name === frameName || ch.name === markersName)) {
        toRemove.push(ch);
      }
    }
  });
  toRemove.forEach(function(n) { try { n.remove(); } catch(e) {} });

  // ── Helper: is an issue active (not dismissed)? ───────────────────────────
  function isActive(issue) {
    if (!dismissedSet) return true;
    var k = (issue.nodeId || '') + '::' + (issue.message || '').slice(0, 40);
    return !dismissedSet[k];
  }

  // ── Compute P1 / P2 / P3 counts (dismissed issues excluded) ──────────────
  var p1 = 0, p2 = 0, p3 = 0;
  var CATS = ['contrast','nontext','typography','hierarchy','focus','images','sensory','target','aria','ds','escala','heading','link',
    'spacing','reflow','legibilidad','placeholder','form','spacingTarget','focusAppearance',
    'obscured','dragging','auth'];
  CATS.forEach(function(cat) {
    if (!audit.results[cat]) return;
    audit.results[cat].issues.forEach(function(i) {
      if (!isActive(i)) return;
      if      (i.severity === 'fail')    p1++;
      else if (i.severity === 'warning' && (i.type === 'contrast' || i.type === 'nontext')) p2++;
      else if (i.severity === 'warning') p3++;
    });
  });
  var canDev   = p1 === 0;
  var rawScore = 10 - p1 * 2 - (p2 + p3) * 0.2;
  var score    = Math.round(Math.max(0, Math.min(10, rawScore)) * 10) / 10;

  // ── Collect unique issues for markers: P1 first, then P2, then P3 (cap 25) ─
  // Dismissed issues are excluded from markers too.
  var mP1 = [], mP2 = [], mP3 = [], seenMIds = {};
  CATS.forEach(function(cat) {
    if (!audit.results[cat]) return;
    audit.results[cat].issues.forEach(function(i) {
      if (!isActive(i)) return;
      if (!i.nodeId || seenMIds[i.nodeId]) return;
      seenMIds[i.nodeId] = true;
      if (i.severity === 'fail')                                                       mP1.push({ issue:i, tier:'p1' });
      else if (i.severity === 'warning' && (i.type==='contrast'||i.type==='nontext')) mP2.push({ issue:i, tier:'p2' });
      else if (i.severity === 'warning')                                               mP3.push({ issue:i, tier:'p3' });
    });
  });
  var markerIssues = mP1.concat(mP2).concat(mP3).slice(0, 25);

  // El número del marcador se guarda EN el issue. Sin esto, el canvas mostraba
  // "10" y el panel no tenía forma de decir cuál de sus hallazgos era ese 10.
  // Si la auditoría ya numeró (siempre lo hace), se respeta ese número para que
  // el círculo del canvas diga lo mismo que la tarjeta del panel.
  markerIssues.forEach(function(entry, idx) {
    if (!entry.issue.marker) { entry.issue.marker = idx + 1; entry.issue.tier = entry.tier; }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function h2c(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var ri = parseInt(h.slice(0,2),16), gi = parseInt(h.slice(2,4),16), bi = parseInt(h.slice(4,6),16);
    return { r:(isNaN(ri)?0:ri)/255, g:(isNaN(gi)?0:gi)/255, b:(isNaN(bi)?0:bi)/255 };
  }
  function sf(hex) { return [{ type:'SOLID', color:h2c(hex) }]; }
  var BOLD = { family:'Inter', style:'Bold' };
  var REG  = { family:'Inter', style:'Regular' };
  var W = 280, PAD = 14;

  // La tarjeta oscura de resumen se quitó: duplicaba el frame [1] Resumen y
  // era la tercera cosa que aparecía al auditar. Acá quedan solo los marcadores
  // numerados sobre el diseño, que son los que enlazan con el reporte.

  if (markerIssues.length === 0) return;
  var auditedBounds = auditedNode.absoluteBoundingBox;
  if (!auditedBounds) return;

  // Transparent overlay frame sits on top of the audited frame — placed inside
  // the shared container using absolute canvas coordinates.
  var markersFrame = figma.createFrame();
  markersFrame.name = markersName;
  markersFrame.resize(Math.max(auditedBounds.width, 1), Math.max(auditedBounds.height, 1));
  markersFrame.x = Math.round(absX);
  markersFrame.y = Math.round(absY);
  markersFrame.fills = [];          // fully transparent
  markersFrame.clipsContent = false;
  sealOverlay(markersFrame);        // bloqueado y colapsado, como el resto
  annotContainer.appendChild(markersFrame);
  try { markersFrame.setPluginData('wcagForNodeId', auditedNode.id); } catch(e) {}
  // Store markers frame ID on the audited node for location-independent cleanup
  try { auditedNode.setPluginData('wcagMkrsFrameId', markersFrame.id); } catch(e) {}

  var SZ = 20; // marker circle diameter
  markerIssues.forEach(function(entry, idx) {
    var issueNode = figma.getNodeById(entry.issue.nodeId);
    if (!issueNode) return;
    var nb = issueNode.absoluteBoundingBox;
    if (!nb) return;

    var mc  = entry.tier==='p1' ? '#FF453A' : entry.tier==='p2' ? '#FF9500' : '#F59E0B';
    // El número lo asigna la auditoría, no el dibujado: así el círculo del
    // canvas, la tarjeta del panel y la fila del HTML dicen todos lo mismo.
    var num = entry.issue.marker || (idx + 1);

    // Position circle at top-left corner of the issue node (inside the container)
    var mx = Math.round(nb.x - auditedBounds.x) - Math.round(SZ / 2);
    var my = Math.round(nb.y - auditedBounds.y) - Math.round(SZ / 2);

    var circle = figma.createFrame();
    circle.name = '#' + num;
    circle.resize(SZ, SZ);
    circle.x = mx; circle.y = my;
    circle.fills = sf(mc);
    circle.cornerRadius = SZ / 2;
    markersFrame.appendChild(circle);

    var t = figma.createText();
    t.fontName = BOLD; t.fontSize = 9; t.fills = sf('#FFFFFF');
    t.characters = String(num);
    t.x = num < 10 ? 6 : 3; t.y = 5;
    circle.appendChild(t);
  });

  // Solo se listan los colores que efectivamente aparecen en esta pantalla
  var entradas = [];
  if (mP1.length) entradas.push({ color: h2c('#FF453A'), texto: 'Rojo: falla, hay que corregirlo' });
  if (mP2.length) entradas.push({ color: h2c('#FF9500'), texto: 'Naranja: aviso de contraste para revisar' });
  if (mP3.length) entradas.push({ color: h2c('#F59E0B'), texto: 'Ámbar: aviso, revisar si aplica' });
  entradas.push({ color: h2c('#8E8E93'), texto: 'El número es el mismo del panel y del reporte' });
  try { leyendaEnCanvas(markersFrame, 0, 0, 'Hallazgos de la auditoría', entradas); } catch (e) {}
}

// ─── Figma Frame Report Builder ───────────────────────────────────────────────
// Creates a new Figma page with an editable report frame from serialised audit data.

function buildFigmaReport(data) {
  var W   = 1200;
  var PAD = 40;
  var BOLD = { family: 'Inter', style: 'Bold'    };
  var REG  = { family: 'Inter', style: 'Regular' };
  var y    = 0;

  // ── Color helpers ─────────────────────────────────────────────────────────
  function h2c(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var ri = parseInt(h.slice(0,2), 16);
    var gi = parseInt(h.slice(2,4), 16);
    var bi = parseInt(h.slice(4,6), 16);
    return { r: (isNaN(ri)?0:ri)/255, g: (isNaN(gi)?0:gi)/255, b: (isNaN(bi)?0:bi)/255 };
  }
  function sf(hex) { return [{ type: 'SOLID', color: h2c(hex) }]; }

  // ── Create page and switch to it ──────────────────────────────────────────
  var page = figma.createPage();
  page.name = 'WCAG Report';
  figma.currentPage = page;

  // ── Root frame ────────────────────────────────────────────────────────────
  var root = figma.createFrame();
  root.name = 'Reporte de accesibilidad · WCAG 2.2 AA';
  root.resize(W, 3000);
  root.fills = sf('#FFFFFF');
  root.clipsContent = false;

  // ── Node helpers ──────────────────────────────────────────────────────────
  function addR(x, yy, w, h, hex, rad) {
    var n = figma.createRectangle();
    n.x = Math.round(x); n.y = Math.round(yy);
    n.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    n.fills = sf(hex);
    if (rad) n.cornerRadius = rad;
    root.appendChild(n);
    return n;
  }

  function addT(str, font, size, hex, x, yy, maxW) {
    var n = figma.createText();
    n.fontName = font;
    n.fontSize = size;
    n.fills = sf(hex);
    n.x = Math.round(x); n.y = Math.round(yy);
    n.characters = String(str == null ? '' : str);
    if (maxW) {
      n.textAutoResize = 'HEIGHT';
      n.resize(Math.round(maxW), Math.max(n.height, 16));
    }
    root.appendChild(n);
    return n;
  }

  // ── 1. Header bar ─────────────────────────────────────────────────────────
  addR(0, y, W, 80, '#1A1A2E');
  addT('Auditoría WCAG 2.2 AA', BOLD, 20, '#FFFFFF', PAD, y+20);
  addT('Accessibility Audit · ' + (data.date||''), REG, 12, '#9CA3AF', PAD, y+48);
  addT((data.frameCount||0) + ' frame' + ((data.frameCount||0)!==1?'s':'') + ' audited', REG, 12, '#9CA3AF', W-PAD-180, y+48);
  y += 80;

  // ── 2. Section label: Final Evaluation ────────────────────────────────────
  addR(0, y, W, 40, '#1A1A2E');
  addT('FINAL ACCESSIBILITY EVALUATION', BOLD, 11, '#FFFFFF', PAD, y+14);
  y += 40;

  // ── 3. Summary card ───────────────────────────────────────────────────────
  var sumH = 200;
  addR(0, y, W, sumH, '#FFFFFF');
  addR(0, y, W, 1, '#E2E8F0');
  var scoreC = (data.avgPct||0)>=80 ? '#34C759' : (data.avgPct||0)>=50 ? '#FF9500' : '#FF3B30';
  addT(String(data.avgPct||0)+'%', BOLD, 60, scoreC, PAD, y+16);
  var osBg = data.oStatusBg || '#FF3B30';
  addR(PAD, y+90, 96, 24, osBg, 4);
  addT(data.oStatusLabel||'', BOLD, 10, '#FFFFFF', PAD+8, y+97);
  addT((data.totalPassesAll||0)+' pass · '+(data.totalWarnsAll||0)+' observation · '+(data.totalFailsAll||0)+' fail', REG, 11, '#64748B', PAD, y+124);
  var miniCards = [
    { val: data.canGoCount||0,   lbl: 'Approved',  col: '#34C759' },
    { val: data.blockedCount||0, lbl: 'Blocked',   col: '#FF3B30' },
    { val: data.frameCount||0,   lbl: 'Frames',    col: '#475569' }
  ];
  miniCards.forEach(function(mc, i) {
    var mx = PAD + i*120;
    addR(mx, y+148, 108, 44, '#F8FAFC', 6);
    addT(String(mc.val), BOLD, 22, mc.col, mx+10, y+152);
    addT(mc.lbl, REG, 9, '#64748B', mx+10, y+176);
  });
  // Separator and right panel
  addR(Math.floor(W/2), y, 1, sumH, '#E2E8F0');
  var rx0 = Math.floor(W/2) + 40;
  addT('FINDINGS BY SEVERITY', BOLD, 10, '#64748B', rx0, y+20);
  var sevRows = [
    { dot:'#FF3B30', lbl:String(data.totalP1||0)+' Critical',  bg:'#FEE2E2', fc:'#DC2626', badge:'P1' },
    { dot:'#FF9500', lbl:String(data.totalP2||0)+' Serious',   bg:'#FEF3C7', fc:'#D97706', badge:'P2' },
    { dot:'#FFCC00', lbl:String(data.totalP3||0)+' Moderate',  bg:'#FEFCE8', fc:'#B45309', badge:'P3' }
  ];
  sevRows.forEach(function(s, i) {
    var sy = y+48+i*46;
    addR(rx0, sy+3, 14, 14, s.dot, 7);
    addT(s.lbl, BOLD, 14, '#1E293B', rx0+24, sy);
    addR(rx0+280, sy+1, 36, 20, s.bg, 4);
    addT(s.badge, BOLD, 10, s.fc, rx0+288, sy+5);
  });
  addR(0, y+sumH-1, W, 1, '#E2E8F0');
  y += sumH;

  // ── 4. Category grid ──────────────────────────────────────────────────────
  addR(0, y, W, 40, '#1A1A2E');
  addT('SUMMARY BY CATEGORY', BOLD, 11, '#FFFFFF', PAD, y+14);
  y += 40;

  var cats  = data.catDefs || [];
  var cData = data.catData || {};
  var cellW = Math.floor(W/4);
  var cellH = 90;
  var gridRows = [cats.slice(0,4), cats.slice(4)];
  gridRows.forEach(function(row, ri) {
    row.forEach(function(cat, ci) {
      var cd  = cData[cat.key] || { pass:0, warn:0, fail:0 };
      var cx  = ci * cellW;
      var cyy = y;
      var bgH = cd.fail>0 ? '#FFF5F5' : (cd.warn>0 ? '#FFFBEB' : '#F0FFF4');
      var dotC = cd.fail>0 ? '#FF3B30' : (cd.warn>0 ? '#FF9500' : '#34C759');
      addR(cx, cyy, cellW-1, cellH-1, bgH);
      addT(cat.label, BOLD, 12, '#1E293B', cx+12, cyy+12);
      addT(cat.wcag,  REG,  10, '#94A3B8', cx+12, cyy+30);
      addR(cx+12, cyy+54, 8, 8, dotC, 4);
      addT(String(cd.pass)+' pass  '+String(cd.warn)+' obs  '+String(cd.fail)+' fail', REG, 11, '#374151', cx+28, cyy+50);
      if (ci < row.length-1) addR(cx+cellW-1, cyy, 1, cellH, '#E2E8F0');
    });
    addR(0, y+cellH-1, W, 1, '#E2E8F0');
    y += cellH;
  });
  y += 20;

  // ── 5. Summary table ──────────────────────────────────────────────────────
  addR(0, y, W, 40, '#1A1A2E');
  addT('FRAME SUMMARY TABLE', BOLD, 11, '#FFFFFF', PAD, y+14);
  y += 40;

  var tCols = ['Frame / Screen','Score','P1','P2','P3','Status'];
  var tColW = [380,80,80,80,80,W-PAD*2-700];
  var tRowH = 36;
  addR(0, y, W, tRowH, '#F1F5F9');
  var tx0 = PAD;
  tCols.forEach(function(col, ci) { addT(col, BOLD, 11, '#475569', tx0, y+11); tx0 += tColW[ci]; });
  addR(0, y+tRowH-1, W, 1, '#CBD5E1');
  y += tRowH;

  (data.summaryRows||[]).forEach(function(row, ri) {
    addR(0, y, W, tRowH, ri%2===1?'#F8FAFC':'#FFFFFF');
    var sc3  = (row.pct||0)>=80?'#34C759':(row.pct||0)>=50?'#FF9500':'#FF3B30';
    var tVals = [String(row.name||''), String(row.pct||0)+'%', String(row.p1||0), String(row.p2||0), String(row.p3||0), row.canDev?'APPROVED':'BLOCKED'];
    var tClrs = ['#1E293B', sc3, '#FF3B30', '#FF9500', '#B45309', row.canDev?'#34C759':'#FF3B30'];
    var tx1 = PAD;
    tVals.forEach(function(v, ci) { addT(v, ci===0?BOLD:REG, ci===1?14:12, tClrs[ci], tx1, y+9); tx1 += tColW[ci]; });
    addR(0, y+tRowH-1, W, 1, '#E2E8F0');
    y += tRowH;
  });
  y += 24;

  // ── 6. Detail per frame ───────────────────────────────────────────────────
  addR(0, y, W, 40, '#1A1A2E');
  addT('DETAIL PER FRAME', BOLD, 11, '#FFFFFF', PAD, y+14);
  y += 40;

  var TIER_CFG = {
    critical: { bg:'#FF3B30', txt:'#FFFFFF', lbl:'P1 CRITICAL' },
    serious:  { bg:'#FF9500', txt:'#FFFFFF', lbl:'P2 SERIOUS'  },
    moderate: { bg:'#FFCC00', txt:'#1A1A2E', lbl:'P3 MODERATE' }
  };
  var STATE_MAP = { contrast:'Insufficient text contrast', nontext:'Insufficient UI contrast', image:'Missing alt text', images:'Missing alt text', typography:'Scale/spacing', hierarchy:'Broken hierarchy', focus:'Missing focus', sensory:'Sensory reference', target:'Target too small', aria:'Missing accessible name', ds:'Sistema', escala:'Escala', heading:'Encabezados', link:'Links', spacing:'Espaciado', reflow:'Reflow',
    legibilidad:'Legibilidad', placeholder:'Placeholder', form:'Formulario',
    'spacing-target':'Separación', focusappearance:'Anillo de foco',
    obscured:'Foco tapado', dragging:'Arrastre', auth:'Autenticación' };

  (data.summaryRows||[]).forEach(function(row) {
    // Frame header
    addR(0, y, W, 64, '#1A1A2E');
    var fsc  = (row.pct||0)>=80?'#34C759':(row.pct||0)>=50?'#FF9500':'#FF3B30';
    addT(String(row.pct||0)+'%', BOLD, 20, fsc, PAD, y+10);
    addT(String(row.name||''), BOLD, 15, '#FFFFFF', PAD+64, y+10);
    addT(String((row.p1||0)+(row.p2||0)+(row.p3||0))+' finding(s)', REG, 11, '#9CA3AF', PAD+64, y+34);
    addR(W-PAD-140, y+17, 136, 30, row.canDev?'#34C759':'#FF3B30', 4);
    addT(row.canDev?'APPROVED':'BLOCKED', BOLD, 12, '#FFFFFF', W-PAD-128, y+25);
    y += 64;

    var issues = row.allActive || row.deduped || [];
    if (issues.length === 0) {
      addR(0, y, W, 48, '#FFFFFF');
      addT('No active accessibility issues.', REG, 13, '#34C759', PAD, y+16);
      y += 48;
    } else {
      issues.forEach(function(iss) {
        var tier = iss.severity==='fail' ? 'critical' : (iss.type==='contrast'||iss.type==='nontext' ? 'serious' : 'moderate');
        var tc   = TIER_CFG[tier];

        // Top accent + card header
        addR(0, y, W, 4, tc.bg);
        y += 4;
        addR(0, y, W, 36, '#FAFAFA');
        addR(PAD-4, y+8, 90, 20, tc.bg, 3);
        addT(tc.lbl, BOLD, 10, tc.txt, PAD+2, y+13);
        addR(PAD+96, y+8, 64, 20, '#E0E7FF', 3);
        addT('WCAG '+(iss.wcag||''), BOLD, 10, '#3730A3', PAD+100, y+13);
        addT(String(iss.nodeName||'').slice(0,50), REG, 11, '#475569', PAD+168, y+13);
        if ((iss.count||1) > 1) {
          addR(W-PAD-100, y+8, 92, 20, '#E2E8F0', 3);
          addT(String(iss.count)+' instancias', BOLD, 10, '#475569', W-PAD-96, y+13);
        }
        y += 36;

        // Content columns
        var c1W=180, c2W=500, c3W=W-PAD*2-c1W-c2W;
        var cY = y;
        var stTxt = iss.type==='contrast'&&iss.detail
          ? ((iss.detail.fg||'')+' / '+(iss.detail.bg||'')+'\n'+String(iss.detail.ratio||'')+':1 req.'+String(iss.detail.required||''))
          : (STATE_MAP[iss.type] || 'Ver detalle');
        addT('CURRENT STATUS', BOLD, 9, '#9CA3AF', PAD, cY+8);
        var stT  = addT(stTxt, REG, 11, '#374151', PAD, cY+22, c1W-10);
        var c1H  = stT.height + 30;

        addT('ISSUE', BOLD, 9, '#9CA3AF', PAD+c1W+8, cY+8);
        var prT  = addT(String(iss.message||''), REG, 11, '#374151', PAD+c1W+8, cY+22, c2W-16);
        var c2H  = prT.height + 30;

        addT('RECOMMENDATION', BOLD, 9, '#9CA3AF', PAD+c1W+c2W+8, cY+8);
        var fixT = addT(String(iss.fix||''), REG, 11, '#5B21B6', PAD+c1W+c2W+8, cY+22, c3W-8);
        var c3H  = fixT.height + 30;

        var cH = Math.max(c1H, c2H, c3H, 60);
        addR(PAD+c1W,      cY, 1, cH, '#E2E8F0');
        addR(PAD+c1W+c2W,  cY, 1, cH, '#E2E8F0');
        y += cH;

        // Notes row
        addR(0, y, W, 32, '#FAF5FF');
        addT('Reviewer notes:', BOLD, 9, '#7C3AED', PAD, y+11);
        y += 32;
        addR(0, y, W, 1, '#E2E8F0');
        y += 1;
        y += 8;
      });
    }
    y += 20;
  });

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  addR(0, y, W, 1, '#E2E8F0');
  y += 1;
  addT('Generado con Q-px-accesibility · Qubika · WCAG 2.2 nivel AA', REG, 10, '#94A3B8', PAD, y+12);
  y += 40;

  // ── Resize root and navigate ───────────────────────────────────────────────
  root.resize(W, y);
  figma.viewport.scrollAndZoomIntoView([root]);
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

// Load persisted session + full results on startup and notify the UI immediately
figma.clientStorage.getAsync('wcag_session').then(function(data) {
  figma.clientStorage.getAsync('wcag_session_results').then(function(results) {
    figma.ui.postMessage({ type: 'session-info', data: data || null, results: results || null });
  }).catch(function() {
    figma.ui.postMessage({ type: 'session-info', data: data || null, results: null });
  });
}).catch(function() {
  figma.ui.postMessage({ type: 'session-info', data: null, results: null });
});

// ─── Live Selection Check (instant contrast feedback) ────────────────────────
// This is the "select and get an answer now" mode: no full audit, no waiting.
// Fires on every selection change while the plugin is on the Check tab.

var liveModeOn = false;
// La tipografía solo se recalcula en vivo cuando esa pantalla está abierta.
var liveTypography = false;

function describeSelectionForLive() {
  var sel = figma.currentPage.selection;
  if (sel.length === 0) return { type: 'live-check', state: 'empty' };

  var node = sel[0];

  if (!isEffectivelyVisible(node)) {
    return {
      type: 'live-check',
      state: 'hidden',
      nodeName: node.name || node.type,
      multiple: sel.length > 1
    };
  }

  // Single text node → the fast path the designer actually wants
  if (node.type === 'TEXT') {
    var pairs = auditContrast(node);
    var issue = pairs.issues[0];
    var fontSize = typeof node.fontSize === 'number' ? node.fontSize : null;
    return {
      type: 'live-check',
      state: 'text',
      nodeId: node.id,
      nodeName: node.name || 'Text',
      fontSize: fontSize,
      pass: pairs.issues.length === 0,
      issue: issue || null,
      passedCount: pairs.passed
    };
  }

  // Container → summarise every visible text pair inside it
  var result = auditContrast(node);
  var targetRes = auditTargetSize(node);
  return {
    type: 'live-check',
    state: 'container',
    nodeId: node.id,
    nodeName: node.name || node.type,
    nodeType: node.type,
    fails: result.issues.filter(function(i) { return i.severity === 'fail'; }).length,
    warnings: result.issues.filter(function(i) { return i.severity === 'warning'; }).length,
    passed: result.passed,
    issues: result.issues.slice(0, 12),
    targetIssues: targetRes.issues.slice(0, 6),
    hiddenSkipped: skippedHiddenLayers
  };
}

// ─── Focus Order canvas overlay ──────────────────────────────────────────────
// Numbered badges on each stop + connecting lines + a legend, all inside a
// single toggleable layer so the designer can switch the whole thing off.

// Picks black or white text for a badge, whichever reads better on the accent.
function textOn(rgb) {
  var L = relativeLuminance(rgb.r * 255, rgb.g * 255, rgb.b * 255);
  return L > 0.45 ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
}

// ─── Leyenda de colores ──────────────────────────────────────────────────────
// Foco en azul, lectura en turquesa, hallazgos en rojo y naranja: sin decir qué
// significa cada color, en la revisión la gente los mezclaba. Cada overlay lleva
// su leyenda arriba del frame, adentro del mismo overlay: se mueve, se bloquea y
// se borra junto con él.
function leyendaEnCanvas(parent, x, y, titulo, entradas) {
  var W = 300, PAD = 12;
  var card = figma.createFrame();
  card.name = 'Leyenda';
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.9 } }];
  card.strokeWeight = 1;
  card.cornerRadius = 10;
  card.clipsContent = false;
  parent.appendChild(card);

  var cy = PAD;
  var t = figma.createText();
  t.fontName = { family: 'Inter', style: 'Bold' };
  t.fontSize = 11;
  t.characters = titulo;
  t.fills = [{ type: 'SOLID', color: { r: 0.04, g: 0.04, b: 0.05 } }];
  t.x = PAD; t.y = cy;
  card.appendChild(t);
  cy += 20;

  entradas.forEach(function(e) {
    var dot = figma.createFrame();
    dot.name = 'color';
    dot.resize(12, 12);
    dot.cornerRadius = 6;
    dot.fills = [{ type: 'SOLID', color: e.color }];
    dot.x = PAD; dot.y = cy + 2;
    card.appendChild(dot);

    var l = figma.createText();
    l.fontName = { family: 'Inter', style: 'Regular' };
    l.fontSize = 11;
    l.characters = e.texto;
    l.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.24 } }];
    l.x = PAD + 20; l.y = cy;
    card.appendChild(l);
    // Una línea de 11px mide ~16px; los textos de la leyenda son de una línea
    cy += 20;
  });

  card.resize(W, cy + PAD - 4);
  card.x = x;
  card.y = y - (cy + PAD - 4) - 12;     // apoyada arriba del frame, sin taparlo
  return card;
}

function buildFocusOrderOverlay(rootNode, order) {
  var container = getOrCreateAnnotContainer();
  var name = 'WCAG ▸ [' + (order.kind === 'reading' ? 'Reading order' : 'Focus order') + '] ' + rootNode.name;

  // Replace any previous overlay for this frame
  for (var i = container.children.length - 1; i >= 0; i--) {
    if (container.children[i].name === name) container.children[i].remove();
  }

  // Overlays sit ON TOP of the frame they annotate, so the badges land on the
  // real elements. They must NOT go to the canvas origin: everything the plugin
  // draws used to pile up at 0,0, which is why a focus overlay and a colour
  // matrix looked like the same broken artifact.
  var overlay = figma.createFrame();
  overlay.name = name;
  overlay.fills = [];
  overlay.clipsContent = false;
  overlay.resize(1, 1);
  var ob = rootNode.absoluteBoundingBox;
  overlay.x = ob ? ob.x : 0;
  overlay.y = ob ? ob.y : 0;
  container.appendChild(overlay);
  sealOverlay(overlay);

  // Focus order and reading order must be visually distinguishable when both
  // are drawn on the same screen: same purple for both made them impossible
  // to tell apart. Blue = focus (Tab), teal = reading (screen reader).
  var accent = (order.kind === 'reading')
    ? { r: 0.208, g: 0.824, b: 0.753 }    // Qubika teal  #35D2C0
    : { r: 0.145, g: 0.278, b: 0.906 };   // Qubika blue  #2547E7
  var BADGE = 30;

  // Children of a frame are positioned RELATIVE to it, so the absolute canvas
  // coordinates that come from the UI have to be rebased onto the overlay.
  var oX = overlay.x, oY = overlay.y;

  // Connecting lines first, so badges sit on top
  var links = figma.createFrame();
  links.name = 'Conectores';
  links.fills = [];
  links.clipsContent = false;
  links.resize(1, 1);
  links.x = 0; links.y = 0;
  overlay.appendChild(links);
  try { links.expanded = false; } catch (e) {}

  for (var s = 1; s < order.stops.length; s++) {
    var a = order.stops[s-1], b = order.stops[s];
    var ax = a.x - oX + a.width / 2, ay = a.y - oY + a.height / 2;
    var bx = b.x - oX + b.width / 2, by = b.y - oY + b.height / 2;
    var line = figma.createLine();
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx*dx + dy*dy);
    if (len < 1) continue;
    line.resize(len, 0);
    line.x = ax; line.y = ay;
    line.rotation = -Math.atan2(dy, dx) * 180 / Math.PI;
    line.strokes = [{ type: 'SOLID', color: accent, opacity: 0.65 }];
    line.strokeWeight = 2;
    line.dashPattern = [6, 4];
    line.name = 'link ' + a.index + '→' + b.index;
    links.appendChild(line);
  }

  // Numbered badges, all inside one child frame so the overlay reads as a single
  // unit in the layers panel instead of dozens of loose circles.
  var badges = figma.createFrame();
  badges.name = 'Badges';
  badges.fills = [];
  badges.clipsContent = false;
  badges.resize(1, 1);
  badges.x = 0; badges.y = 0;
  overlay.appendChild(badges);
  try { badges.expanded = false; } catch (e) {}

  order.stops.forEach(function(stop) {
    var badge = figma.createFrame();
    badge.name = 'focus ' + stop.index + ' · ' + stop.name;
    // IMPORTANT: setting layoutMode flips both sizing modes to AUTO, which makes
    // the frame hug its text and collapse the circle. Pin them back to FIXED and
    // resize AFTER, or the number comes out cramped against the edges.
    badge.layoutMode = 'HORIZONTAL';
    badge.primaryAxisSizingMode = 'FIXED';
    badge.counterAxisSizingMode = 'FIXED';
    badge.primaryAxisAlignItems = 'CENTER';
    badge.counterAxisAlignItems = 'CENTER';
    badge.paddingLeft = 0; badge.paddingRight = 0;
    badge.paddingTop = 0;  badge.paddingBottom = 0;
    badge.resize(BADGE, BADGE);
    badge.cornerRadius = BADGE / 2;
    badge.fills = [{ type: 'SOLID', color: accent }];
    badge.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    badge.strokeWeight = 2;
    // Foco en la esquina superior izquierda, lectura en la derecha: con "los
    // dos" marcan los mismos elementos y, en la misma esquina, uno tapaba al otro
    badge.x = (order.kind === 'reading' ? stop.x + stop.width : stop.x) - oX - BADGE / 2;
    badge.y = stop.y - oY - BADGE / 2;
    badges.appendChild(badge);

    var t = figma.createText();
    t.characters = String(stop.index);
    t.fontSize = 13;
    t.fontName = { family: 'Inter', style: 'Bold' };
    t.textAlignHorizontal = 'CENTER';
    t.textAlignVertical = 'CENTER';
    t.fills = [{ type: 'SOLID', color: textOn(accent) }];
    badge.appendChild(t);
  });

  try {
    // Las dos leyendas lado a lado, no una encima de la otra
    leyendaEnCanvas(overlay, order.kind === 'reading' ? 312 : 0, 0, order.kind === 'reading' ? 'Orden de lectura' : 'Orden de foco',
      order.kind === 'reading'
        ? [ { color: accent, texto: 'Turquesa, arriba a la derecha: lo que narra el lector' },
            { color: { r: 0.145, g: 0.278, b: 0.906 }, texto: 'El orden de foco (Tab) se dibuja en azul' } ]
        : [ { color: accent, texto: 'Azul, arriba a la izquierda: el recorrido con Tab' },
            { color: { r: 0.208, g: 0.824, b: 0.753 }, texto: 'El orden de lectura se dibuja en turquesa' } ]);
  } catch (e) {}

  return overlay;
}

// ─── Selection summary (broadcast on every selection change) ─────────────────

function selectionSummary() {
  var sel = figma.currentPage.selection;
  if (sel.length === 0) return { type: 'selection', count: 0 };

  if (sel.length === 1) {
    var n = sel[0];
    return {
      type: 'selection', count: 1,
      nodeId: n.id, name: n.name || n.type, nodeType: n.type,
      visible: isEffectivelyVisible(n),
      hasChildren: 'children' in n && n.children.length > 0
    };
  }
  return {
    type: 'selection', count: sel.length,
    name: sel.length + ' elementos',
    nodeType: 'MULTIPLE',
    visible: true,
    names: sel.slice(0, 12).map(function(n) { return n.name || n.type; })
  };
}

// Pulls every distinct solid colour out of the current selection.
// This is what feeds the matrix: the designer selects the swatches of the
// palette on the canvas and the matrix builds itself from them.
function colorsFromSelection() {
  var found = {};
  var order = [];

  function add(hex, name, r, g, b) {
    if (found[hex]) return;
    found[hex] = true;
    order.push({ name: name, hex: hex, r: r, g: g, b: b });
  }

  figma.currentPage.selection.forEach(function(sel) {
    getAllNodes(sel).forEach(function(node) {
      if (!('fills' in node)) return;
      var solid = topSolidFill(node.fills);
      if (!solid) return;
      var r = solid.color.r * 255, g = solid.color.g * 255, b = solid.color.b * 255;
      var hex = hexFromRGB(solid.color.r, solid.color.g, solid.color.b);

      // Prefer a style name when the fill comes from a paint style
      var label = node.name || hex;
      try {
        if (node.fillStyleId) {
          var st = figma.getStyleById(node.fillStyleId);
          if (st && st.name) label = st.name;
        }
      } catch (e) {}
      add(hex, label, r, g, b);
    });
  });

  return order;
}

// Draws the contrast matrix on the canvas, in the layout of the reference table:
// one row per background, one column per text colour, "Aa" preview where the pair
// passes and a struck-out empty cell where it does not.
// ─── Contrast matrix ─────────────────────────────────────────────────────────
// One shared model for the panel and the canvas, so the drawn frame is the same
// table the designer saw — not a second, different-looking artifact.
//
// Three states per pair, because "pasa / no pasa" hides the useful middle case:
//   AA     ratio ≥ 4.5 → sirve para cualquier texto
//   LARGE  ratio ≥ 3   → solo para 18px+, o 14px bold
//   NO     ratio < 3   → no sirve para texto (ni siquiera para bordes)

function cellState(ratio) {
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3)   return 'LARGE';
  return 'NO';
}

// ─── La matriz como lista ────────────────────────────────────────────────────
// Con diez colores la tabla tiene cien celdas y cuesta encontrar "qué puedo
// usar". La lista dice lo mismo ordenado de mejor a peor y agrupado en los
// tres estados. Va al costado de la matriz de la misma paleta, y regenerarla
// la actualiza en su lugar.
function buildMatrixListFrame(matrix, etiqueta) {
  var container = getOrCreateAnnotContainer();
  var firma = matrix.map(function(r) { return r.bg.hex; }).join('');
  var titulo = etiqueta && String(etiqueta).trim()
    ? String(etiqueta).trim().slice(0, 40) : matrix.length + ' colores';

  var previa = null, matriz = null;
  for (var i = container.children.length - 1; i >= 0; i--) {
    var ch = container.children[i], fl = '', fm = '';
    try { fl = ch.getPluginData('wcagListaFirma') || ''; fm = ch.getPluginData('wcagMatrixFirma') || ''; } catch (e) {}
    if (fl === firma) previa = ch;
    if (fm === firma) matriz = ch;
  }
  var pos = null;
  if (previa) { pos = { x: previa.x, y: previa.y }; previa.remove(); }
  else if (matriz) pos = { x: matriz.x + matriz.width + 48, y: matriz.y };
  else pos = freeSpotOnCanvas();

  var W = 460, PAD = 28;
  var INK = { r: 0.04, g: 0.04, b: 0.05 }, MUTED = { r: 0.42, g: 0.42, b: 0.46 };

  var doc = figma.createFrame();
  doc.name = 'WCAG ▸ [Lista] ' + titulo;
  doc.resize(W, 100);
  doc.layoutMode = 'VERTICAL';
  doc.counterAxisSizingMode = 'FIXED';
  doc.primaryAxisSizingMode = 'AUTO';
  doc.itemSpacing = 14;
  doc.paddingLeft = PAD; doc.paddingRight = PAD; doc.paddingTop = PAD; doc.paddingBottom = PAD;
  doc.cornerRadius = 16;
  doc.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  doc.x = pos.x; doc.y = pos.y;
  container.appendChild(doc);
  try { doc.setPluginData('wcagListaFirma', firma); } catch (e) {}
  sealOverlay(doc, false);

  function text(parent, chars, size, bold, colr) {
    var t = figma.createText();
    t.characters = chars;
    t.fontSize = size;
    t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
    t.fills = [{ type: 'SOLID', color: colr || INK }];
    parent.appendChild(t);
    t.textAutoResize = 'HEIGHT';
    t.layoutAlign = 'STRETCH';
    return t;
  }
  function fila(parent, spacing) {
    var f = figma.createFrame();
    f.layoutMode = 'HORIZONTAL';
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'AUTO';
    f.counterAxisAlignItems = 'CENTER';
    f.itemSpacing = spacing;
    f.fills = [];
    parent.appendChild(f);
    f.layoutAlign = 'STRETCH';
    return f;
  }
  function h2c(hex) {
    return { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255,
             b: parseInt(hex.slice(5, 7), 16) / 255 };
  }

  var pares = [];
  matrix.forEach(function(r) { r.cells.forEach(function(c) {
    if (c.fg.hex === r.bg.hex) return;
    pares.push({ fg: c.fg, bg: r.bg, ratio: c.ratio });
  }); });
  pares.sort(function(a, b) { return b.ratio - a.ratio; });

  text(doc, 'Combinaciones de ' + titulo, 20, true);
  text(doc, pares.length + ' pares de texto sobre fondo, de mejor a peor. WCAG 2.2 AA (1.4.3).', 11, false, MUTED);

  [
    { t: 'Cualquier texto', d: '4.5:1 o más', ok: function(v) { return v >= 4.5; },
      c: { r: 0.05, g: 0.45, b: 0.38 } },
    { t: 'Solo texto grande', d: 'entre 3:1 y 4.5:1: 18px, o 14px en negrita', ok: function(v) { return v >= 3 && v < 4.5; },
      c: { r: 0.6, g: 0.4, b: 0.02 } },
    { t: 'No usar para texto', d: 'menos de 3:1', ok: function(v) { return v < 3; },
      c: { r: 0.75, g: 0.16, b: 0.13 } }
  ].forEach(function(g) {
    var lista = pares.filter(function(p) { return g.ok(p.ratio); });
    if (!lista.length) return;
    text(doc, g.t + ' · ' + lista.length + '  —  ' + g.d, 12, true, g.c);
    lista.forEach(function(p) {
      var f = fila(doc, 12);
      f.resize(W - PAD * 2, 36);
      var sw = figma.createFrame();
      sw.layoutMode = 'HORIZONTAL';
      sw.primaryAxisSizingMode = 'FIXED'; sw.counterAxisSizingMode = 'FIXED';
      sw.primaryAxisAlignItems = 'CENTER'; sw.counterAxisAlignItems = 'CENTER';
      sw.resize(52, 32);
      sw.cornerRadius = 6;
      sw.fills = [{ type: 'SOLID', color: h2c(p.bg.hex) }];
      sw.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.9 } }];
      sw.strokeWeight = 1;
      f.appendChild(sw);
      var aa = figma.createText();
      aa.characters = 'Aa';
      aa.fontSize = 14;
      aa.fontName = { family: 'Inter', style: 'Bold' };
      aa.fills = [{ type: 'SOLID', color: h2c(p.fg.hex) }];
      sw.appendChild(aa);

      var t = figma.createText();
      t.characters = p.fg.name + ' sobre ' + p.bg.name + '   ' + p.fg.hex + ' / ' + p.bg.hex;
      t.fontSize = 11;
      t.fontName = { family: 'Inter', style: 'Regular' };
      t.fills = [{ type: 'SOLID', color: INK }];
      f.appendChild(t);
      t.layoutGrow = 1;
      t.textAutoResize = 'HEIGHT';

      var r = figma.createText();
      r.characters = p.ratio.toFixed(2) + ':1';
      r.fontSize = 12;
      r.fontName = { family: 'Inter', style: 'Bold' };
      r.fills = [{ type: 'SOLID', color: g.c }];
      f.appendChild(r);
    });
  });
  return doc;
}

function buildMatrixFrame(matrix, etiqueta) {
  var CELL = 88, GAP = 6, LABEL_W = 210, HEAD_H = 108, PAD = 32;
  var container = getOrCreateAnnotContainer();

  // Antes el nombre era fijo, así que cada matriz nueva borraba la anterior y
  // no se podían comparar dos paletas. Ahora cada una se identifica por los
  // colores que contiene: volver a generar la MISMA paleta la actualiza en su
  // lugar, y una paleta distinta se agrega al costado.
  var firma = matrix.map(function(r) { return r.bg.hex; }).join('');
  var titulo = etiqueta && String(etiqueta).trim()
    ? String(etiqueta).trim().slice(0, 40)
    : matrix.length + ' colores';
  var name = 'WCAG ▸ [Matriz] ' + titulo;

  var xMax = null, yBase = null, reemplaza = null, xFijo = null;
  for (var i = container.children.length - 1; i >= 0; i--) {
    var ch = container.children[i];
    var esMatriz = false, firmaCh = '';
    try {
      firmaCh = ch.getPluginData('wcagMatrixFirma') || '';
      esMatriz = !!firmaCh;
    } catch (e) {}
    if (!esMatriz) continue;
    if (firmaCh === firma) { reemplaza = ch; continue; }
    // Se lleva registro del borde derecho para no pisar las que ya están
    if (xMax === null || ch.x + ch.width > xMax) xMax = ch.x + ch.width;
    if (yBase === null) yBase = ch.y;
  }
  if (reemplaza) {
    // Misma paleta: se regenera donde estaba, para no perder su posición
    xMax = null; yBase = reemplaza.y; xFijo = reemplaza.x;
    reemplaza.remove();
  }

  var cols = matrix.length ? matrix[0].cells.length : 0;
  var frame = figma.createFrame();
  frame.name = name;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.layoutMode = 'NONE';
  frame.clipsContent = true;
  frame.cornerRadius = 16;
  frame.resize(PAD * 2 + LABEL_W + cols * (CELL + GAP),
               PAD * 2 + HEAD_H + matrix.length * (CELL + GAP) + 76);
  if (xFijo !== null) {
    frame.x = xFijo; frame.y = yBase;
  } else if (xMax !== null) {
    frame.x = xMax + 48;                 // al costado de la última
    frame.y = yBase === null ? 0 : yBase;
  } else {
    var spot = freeSpotOnCanvas();
    frame.x = spot.x; frame.y = spot.y;
  }
  container.appendChild(frame);
  try { frame.setPluginData('wcagMatrixFirma', firma); } catch (e) {}
  sealOverlay(frame, false);

  var INK   = { r: 0.04, g: 0.04, b: 0.05 };
  var MUTED = { r: 0.45, g: 0.45, b: 0.48 };
  var TEAL  = { r: 0.129, g: 0.588, b: 0.529 };
  var AMBER = { r: 0.635, g: 0.427, b: 0.02 };
  var GREY  = { r: 0.6, g: 0.6, b: 0.63 };

  // Fixed-size text: textAutoResize HEIGHT let long token names wrap onto the
  // next line and spill over the row beneath, which is what made the column
  // headers overlap. NONE clips instead of overflowing.
  function label(txt, x, y, size, bold, colr, w, h) {
    var t = figma.createText();
    t.characters = txt;
    t.fontSize = size;
    t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
    t.fills = [{ type: 'SOLID', color: colr || INK }];
    if (w) {
      t.textAutoResize = 'NONE';
      t.resize(w, h || Math.ceil(size * 1.35));
    }
    t.x = x; t.y = y;
    frame.appendChild(t);
    return t;
  }

  function swatch(hex, x, y, size, radius) {
    var r = figma.createRectangle();
    r.resize(size, size);
    r.x = x; r.y = y;
    r.cornerRadius = radius === undefined ? 5 : radius;
    r.fills = [{ type: 'SOLID', color: hexToFigmaRGB(hex) }];
    r.strokes = [{ type: 'SOLID', color: { r: 0.87, g: 0.87, b: 0.89 } }];
    r.strokeWeight = 1;
    frame.appendChild(r);
    return r;
  }

  label(titulo === matrix.length + ' colores'
    ? 'Combinaciones de color accesibles'
    : titulo, PAD, PAD, 21, true, INK, 640, 28);
  label('WCAG 2.2 AA  ·  ' + matrix.length + ' colores  ·  ' + (matrix.length * cols) +
        ' combinaciones  ·  cada celda dice para qué tamaño de texto sirve',
        PAD, PAD + 30, 11, false, MUTED, 720, 16);

  // Column headers — swatch above, name and hex clipped to the column width
  if (matrix[0]) {
    matrix[0].cells.forEach(function(cell, ci) {
      var x = PAD + LABEL_W + ci * (CELL + GAP);
      swatch(cell.fg.hex, x, PAD + HEAD_H - 52, 18, 4);
      label(cell.fg.name, x, PAD + HEAD_H - 30, 9.5, true, INK, CELL - 6, 13);
      label(cell.fg.hex,  x, PAD + HEAD_H - 16, 8.5, false, MUTED, CELL - 6, 12);
    });
  }
  label('Fondo ↓   Texto →', PAD, PAD + HEAD_H - 30, 10, true, MUTED, LABEL_W - 12, 14);

  matrix.forEach(function(row, ri) {
    var y = PAD + HEAD_H + ri * (CELL + GAP);

    swatch(row.bg.hex, PAD, y + (CELL - 48) / 2, 48, 8);
    label(row.bg.name, PAD + 60, y + CELL / 2 - 15, 11.5, true, INK, LABEL_W - 70, 16);
    label(row.bg.hex,  PAD + 60, y + CELL / 2 + 2,  9.5, false, MUTED, LABEL_W - 70, 13);

    row.cells.forEach(function(cell, ci) {
      var x = PAD + LABEL_W + ci * (CELL + GAP);
      var st = cellState(cell.ratio);

      var box = figma.createFrame();
      box.layoutMode = 'VERTICAL';
      box.primaryAxisSizingMode = 'FIXED';
      box.counterAxisSizingMode = 'FIXED';
      box.primaryAxisAlignItems = 'CENTER';
      box.counterAxisAlignItems = 'CENTER';
      box.itemSpacing = 3;
      box.paddingLeft = 4; box.paddingRight = 4;
      box.paddingTop = 6;  box.paddingBottom = 6;
      box.resize(CELL, CELL);
      box.x = x; box.y = y;
      box.cornerRadius = 8;
      box.clipsContent = true;
      box.name = cell.fg.name + ' sobre ' + row.bg.name + ' · ' + cell.ratio + ':1 · ' +
        (st === 'AA' ? 'cualquier texto' : st === 'LARGE' ? 'solo texto grande' : 'no usar');
      frame.appendChild(box);

      function txt(chars, size, bold, colr, opacity) {
        var t = figma.createText();
        t.characters = chars;
        t.fontSize = size;
        t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
        t.textAlignHorizontal = 'CENTER';
        var f = { type: 'SOLID', color: colr };
        if (opacity !== undefined) f.opacity = opacity;
        t.fills = [f];
        box.appendChild(t);
        return t;
      }

      if (st === 'NO') {
        // Never render text nobody could read: show the number instead.
        box.fills = [{ type: 'SOLID', color: { r: 0.949, g: 0.949, b: 0.953 } }];
        box.strokes = [{ type: 'SOLID', color: { r: 0.898, g: 0.898, b: 0.91 } }];
        box.strokeWeight = 1;
        txt(cell.ratio.toFixed(1), 15, true, GREY);
        txt('no usar', 8.5, false, GREY);
      } else {
        box.fills = [{ type: 'SOLID', color: hexToFigmaRGB(row.bg.hex) }];
        box.strokes = [{ type: 'SOLID', color: { r: 0.878, g: 0.878, b: 0.894 } }];
        box.strokeWeight = 1;

        // Two previews: body size and large size, so the difference is visible
        // and not just asserted in a label.
        // La muestra tiene que estar en el tamaño del que habla la celda: si el
        // par solo sirve para texto grande, mostrar la chica confunde.
        txt('Aa', 20, true, hexToFigmaRGB(cell.fg.hex));
        if (st === 'AA') txt('Aa', 12, false, hexToFigmaRGB(cell.fg.hex));
        txt(cell.ratio.toFixed(1) + ' · ' + (st === 'AA' ? 'todo texto' : 'solo grande'),
            8.5, true, hexToFigmaRGB(cell.fg.hex), 0.85);
      }
    });
  });

  // Legend — spells out what the three cell states mean
  var ly = PAD + HEAD_H + matrix.length * (CELL + GAP) + 14;
  label('Cómo leer la tabla', PAD, ly, 11, true, INK, 400, 15);
  label('Aa grande + Aa chica  ·  pasa 4.5:1  ·  sirve para cualquier tamaño de texto.',
        PAD, ly + 20, 10, false, TEAL, 700, 14);
  label('Solo Aa grande  ·  pasa 3:1  ·  únicamente 18px o más, o 14px en negrita. La chica no se puede usar.',
        PAD, ly + 35, 10, false, AMBER, 700, 14);
  label('Celda gris  ·  por debajo de 3:1  ·  no usar para texto.',
        PAD, ly + 50, 10, false, GREY, 700, 14);

  return frame;
}
// ─── Reporte de auditoría como frame de Figma ────────────────────────────────
// Antes era una sola columna de 720px que se estiraba miles de píxeles hacia
// abajo: ilegible en el canvas e imposible de presentar. Ahora es un documento
// de ancho de póster con secciones, un tablero de resumen arriba, y la grilla
// completa de TODO lo que se auditó — incluidas las categorías que pasaron,
// que son las que dan la medida real de la cobertura.

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS EN CANVAS
//
// El reporte se rompió tres veces seguidas armado con auto-layout anidado.
// La causa nunca fue una sola: son varias reglas de orden de la API que fallan
// EN SILENCIO — layoutAlign antes de appendChild, textAutoResize después de
// layoutAlign, resize después de layoutMode. Cada arreglo destapaba la
// siguiente, porque ninguna tira error: simplemente se ignora lo que pediste.
//
// Este motor no usa auto-layout. Posiciona todo de forma absoluta llevando un
// cursor vertical, y mide la altura real de cada texto después de fijarle el
// ancho. Es más código, pero es determinista: lo que se calcula es lo que se ve.
// ═════════════════════════════════════════════════════════════════════════════

function Doc(frame, pad, ancho) {
  this.f = frame;
  this.pad = pad;
  this.ancho = ancho;
  this.w = ancho - pad * 2;
  this.y = pad;
  this.col = { x: pad, w: ancho - pad * 2 };   // columna activa
}

// Texto: se fija el ancho primero y se lee la altura que Figma calcula. Sin ese
// orden, la altura es la de una sola línea y todo lo de abajo se superpone.
Doc.prototype.texto = function(chars, size, bold, color, opts) {
  opts = opts || {};
  var t = figma.createText();
  t.characters = String(chars === null || chars === undefined ? '' : chars);
  t.fontSize = size;
  t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
  t.fills = [{ type: 'SOLID', color: color || { r: 0.04, g: 0.04, b: 0.05 } }];
  if (opts.lineHeight) {
    try { t.lineHeight = { unit: 'PIXELS', value: opts.lineHeight }; } catch (e) {}
  }
  this.f.appendChild(t);
  t.textAutoResize = 'HEIGHT';
  var w = opts.w || this.col.w;
  // resize sobre un texto de alto automático puede FIJAR el alto en lo que se
  // le pase en vez de recalcularlo. Pasarle 10 dejaba el nodo midiendo 10px, y
  // el cursor avanzaba 10 aunque la línea ocupara 40: por eso se pisaban.
  // Se le pasa una altura generosa y después se decide con la estimación.
  var estimado = Doc.estimarAlto(t.characters, w, size, opts.lineHeight);
  // Con lineHeight explícito, ese es el alto de línea que manda
  if (opts.lineHeight) t._lineHeightPx = opts.lineHeight;
  try { t.resize(w, estimado); } catch (e) {}

  t.x = (opts.x !== undefined ? opts.x : this.col.x);
  t.y = (opts.y !== undefined ? opts.y : this.y);

  if (opts.y === undefined) {
    // Se usa el mayor entre lo que reporta Figma y la estimación propia. Si la
    // API mide bien, gana la medición; si devuelve algo raro, gana la
    // estimación. En el peor caso sobra aire — nunca se superpone.
    var alto = Math.max(t.height || 0, estimado);
    if (!isFinite(alto) || alto < 0) alto = estimado;
    var gap = (opts.gap === undefined ? 6 : opts.gap);
    if (!isFinite(gap)) gap = 6;
    this.y += alto + gap;
  }
  return t;
};

// Cuántas líneas entran y cuánto ocupan. El ancho medio de glifo de una sans
// humanista ronda 0.52em; alcanza para no quedarse corto.
Doc.estimarAlto = function(chars, ancho, size, lineHeight) {
  var texto = String(chars || '');
  // Cualquier valor no finito acá se propaga al alto del frame y hace que
  // resize tire excepción, dejando el documento a medias.
  if (!isFinite(size) || size <= 0) size = 14;
  if (!isFinite(ancho) || ancho <= 0) ancho = 400;
  var lh = (isFinite(lineHeight) && lineHeight > 0) ? lineHeight : Math.round(size * 1.35);
  if (!texto) return lh;
  var porLinea = Math.max(1, Math.floor(ancho / (size * 0.52)));

  // Se respetan los saltos de línea explícitos
  var lineas = 0;
  texto.split('\n').forEach(function(parrafo) {
    lineas += Math.max(1, Math.ceil(parrafo.length / porLinea));
  });
  return Math.ceil(lineas * lh);
};

Doc.prototype.espacio = function(px) { this.y += px; };

Doc.prototype.rect = function(x, y, w, h, color, radio, borde) {
  var r = figma.createRectangle();
  if (!isFinite(w) || w < 1) w = 1;
  if (!isFinite(h) || h < 1) h = 1;
  r.resize(w, h);
  r.x = x; r.y = y;
  if (radio) r.cornerRadius = radio;
  r.fills = color ? [{ type: 'SOLID', color: color }] : [];
  if (borde) { r.strokes = [{ type: 'SOLID', color: borde }]; r.strokeWeight = 1; }
  this.f.appendChild(r);
  return r;
};

Doc.prototype.divisor = function(color) {
  this.rect(this.col.x, this.y, this.col.w, 1, color || { r: 0.90, g: 0.90, b: 0.92 });
  this.y += 17;
};

// Abre un bloque con fondo: se dibuja el rectángulo al cerrarlo, cuando ya se
// sabe cuánto ocupó el contenido.
Doc.prototype.abrirCaja = function(padInterno) {
  var caja = { yInicio: this.y, pad: padInterno, colPrevia: this.col };
  this.y += padInterno;
  this.col = { x: this.col.x + padInterno, w: this.col.w - padInterno * 2 };
  return caja;
};

Doc.prototype.cerrarCaja = function(caja, color, radio, borde) {
  var alto = this.y - caja.yInicio + caja.pad;
  var r = this.rect(caja.colPrevia.x, caja.yInicio, caja.colPrevia.w, alto, color, radio, borde);
  // El fondo va detrás del contenido que ya se dibujó
  try { this.f.insertChild(0, r); } catch (e) {}
  this.col = caja.colPrevia;
  this.y = caja.yInicio + alto + 14;
  return r;
};

Doc.prototype.enColumna = function(x, w, fn) {
  var previa = this.col, yPrevia = this.y;
  this.col = { x: x, w: w };
  fn();
  var yFinal = this.y;
  this.col = previa; this.y = yPrevia;
  return yFinal;
};

Doc.prototype.cerrar = function(padFinal) {
  var alto = this.y + (padFinal === undefined ? this.pad : padFinal);
  if (!isFinite(alto) || alto < 1) alto = 1;
  this.f.resize(this.ancho, alto);
  return this.f;
};


// ─── Secciones en auto-layout ────────────────────────────────────────────────
// Un solo auto-layout vertical apila las secciones; cada sección por dentro usa
// posicionamiento absoluto. Así el documento se puede reordenar y editar en
// Figma sin que nada se pise, y el anidamiento profundo —que es donde la API
// falla en silencio— nunca aparece.

function crearDocumento(nombre, ancho, pos) {
  var f = figma.createFrame();
  f._anchoDoc = ancho;   // no depender de leerlo de vuelta
  f.name = nombre;
  f.resize(ancho, 400);          // ancho ANTES de activar auto-layout
  f.layoutMode = 'VERTICAL';
  f.counterAxisSizingMode = 'FIXED';
  f.primaryAxisSizingMode = 'AUTO';
  f.itemSpacing = 0;
  f.paddingLeft = 0; f.paddingRight = 0; f.paddingTop = 0; f.paddingBottom = 0;
  f.cornerRadius = 20;
  f.clipsContent = true;
  f.fills = [{ type: 'SOLID', color: RP.blanco }];
  f.x = pos.x; f.y = pos.y;
  return f;
}

// Abre una sección: devuelve un Doc que escribe en un frame hijo. Al cerrarla,
// el frame se ajusta al contenido y se estira al ancho del documento.
var _seccionesFallidas = [];

// Construye una sección aislando sus errores. Una excepción adentro dejaba el
// documento entero a medias, y sin ningún indicio de dónde había sido.
function seccion(doc, nombre, fn, padTop, padBottom, bg) {
  var d = null;
  try {
    d = abrirSeccion(doc, nombre, padTop, padBottom, bg);
    fn(d);
    return cerrarSeccion(d);
  } catch (e) {
    var msg = (e && e.message) ? e.message : String(e);
    _seccionesFallidas.push(nombre + ': ' + msg);
    try {
      if (d) {
        // Se deja el hueco visible con el motivo, no un salto silencioso
        d.y = 20;
        d.texto('No se pudo dibujar "' + nombre + '"', 12, true, RP.red);
        d.texto(msg, 10.5, false, RP.muted);
        cerrarSeccion(d);
      }
    } catch (e2) {}
    return null;
  }
}

function abrirSeccion(doc, nombre, padTop, padBottom, bg) {
  var ancho = doc._anchoDoc || doc.width || 620;
  var sec = figma.createFrame();
  sec.name = nombre;
  sec.resize(ancho, 100);
  sec.layoutMode = 'NONE';
  sec.clipsContent = false;
  sec.fills = bg ? [{ type: 'SOLID', color: bg }] : [];
  doc.appendChild(sec);
  sec.layoutAlign = 'STRETCH';   // después del appendChild, siempre
  var d = new Doc(sec, 44, ancho);
  d.y = padTop === undefined ? 32 : padTop;
  d._padBottom = padBottom === undefined ? 32 : padBottom;
  return d;
}

function cerrarSeccion(d) {
  var alto = d.y + d._padBottom;
  // Figma rechaza alturas menores a 0.01 y cualquier valor no finito
  if (!isFinite(alto) || alto < 1) alto = 1;
  if (!isFinite(d.ancho) || d.ancho < 1) d.ancho = 620;
  d.f.resize(d.ancho, alto);
  return d.f;
}

// ─── Paleta del reporte ──────────────────────────────────────────────────────
var RP = {
  ink:    { r: 0.04, g: 0.04, b: 0.05 },
  muted:  { r: 0.42, g: 0.42, b: 0.46 },
  soft:   { r: 0.62, g: 0.62, b: 0.66 },
  red:    { r: 0.75, g: 0.16, b: 0.13 },
  amber:  { r: 0.55, g: 0.36, b: 0.02 },
  teal:   { r: 0.04, g: 0.42, b: 0.36 },
  blue:   { r: 0.145, g: 0.278, b: 0.906 },
  linea:  { r: 0.90, g: 0.90, b: 0.92 },
  papel:  { r: 0.969, g: 0.969, b: 0.976 },
  rojoBg: { r: 1, g: 0.957, b: 0.949 },
  ambBg:  { r: 1, g: 0.984, b: 0.925 },
  tealBg: { r: 0.949, g: 0.988, b: 0.976 },
  blanco: { r: 1, g: 1, b: 1 }
};

var GRUPOS_IMPACTO = [
  { k: 'bloqueante', label: 'Bloquea la tarea', c: 'red',
    d: 'Hay gente que directamente no puede completarla.' },
  { k: 'serio',      label: 'Serio',    c: 'amber', d: 'Se puede completar, pero con esfuerzo desproporcionado.' },
  { k: 'moderado',   label: 'Moderado', c: 'amber', d: 'Molesta y cansa, sobre todo en uso prolongado.' },
  { k: 'menor',      label: 'Menor',    c: 'soft',  d: 'Mejora la experiencia, no impide nada.' }
];

var ETIQUETA_CAT = {
  contrast:'Contraste de texto', nontext:'Contraste de UI', typography:'Tipografía',
  hierarchy:'Jerarquía visual', focus:'Estados de foco', images:'Texto alternativo',
  sensory:'Lenguaje sensorial', target:'Área de toque', aria:'Nombres accesibles',
  ds:'Cobertura de estados', escala:'Escala tipográfica', heading:'Encabezados',
  link:'Texto de enlaces', spacing:'Espaciado del texto', reflow:'Reflow y zoom',
  legibilidad:'Legibilidad', placeholder:'Etiquetas de campo', form:'Formularios',
  spacingTarget:'Separación de objetivos', focusAppearance:'Anillo de foco'
};

function agregarDatos(audits) {
  var imp = { bloqueante: 0, serio: 0, moderado: 0, menor: 0 };
  var porCat = {}, totalIssues = 0, totalPassed = 0, todos = [];

  audits.forEach(function(a) {
    // Se cuentan problemas DISTINTOS, no repeticiones del mismo
    if (a.grupos) {
      a.grupos.forEach(function(g) { if (imp[g.impacto] !== undefined) imp[g.impacto]++; });
    } else if (a.impactos) {
      Object.keys(imp).forEach(function(k) { imp[k] += (a.impactos[k] || 0); });
    }
    Object.keys(a.results || {}).forEach(function(cat) {
      var r = a.results[cat] || {};
      if (!porCat[cat]) porCat[cat] = { fallos: 0, pasan: 0 };
      porCat[cat].fallos += (r.issues || []).length;
      porCat[cat].pasan  += (r.passed || 0);
      totalIssues += (r.issues || []).length;
      totalPassed += (r.passed || 0);
      (r.issues || []).forEach(function(i) { todos.push({ issue: i, frame: a.nodeName }); });
    });
  });

  return { imp: imp, porCat: porCat, totalIssues: totalIssues,
           totalPassed: totalPassed, todos: todos };
}

// ═════════════════════════════════════════════════════════════════════════════
// FRAME 1 — Resumen
// ═════════════════════════════════════════════════════════════════════════════

function buildResumenFrame(audits, pos) {
  var W = 620;
  var doc = crearDocumento('WCAG ▸ [1] Resumen', W, pos);
  var g = agregarDatos(audits);
  var fecha = new Date().toISOString().slice(0, 10);

  // ── Portada
  seccion(doc, 'Portada', function(d) {
    d.texto('Auditoría de', 34, true, RP.ink, { gap: 0, lineHeight: 40 });
    d.texto('accesibilidad', 34, true, RP.ink, { gap: 12, lineHeight: 40 });
    d.texto('WCAG 2.2 nivel AA   ·   ' + fecha, 12, true, RP.muted, { gap: 5 });
    d.texto(audits.map(function(a) { return a.nodeName; }).join('   ·   '),
            12, false, RP.muted, { gap: 0 });
  }, 40, 30);

  // ── Tablero de impacto
  d = abrirSeccion(doc, 'Impacto', 8, 32);
  var cw = Math.floor((d.w - 12) / 2);
  for (var f = 0; f < 2; f++) {
    var yFila = d.y, altoFila = 0;
    // Primero se mide el alto que ocupa cada tarjeta
    var contenidos = [];
    for (var c = 0; c < 2; c++) {
      var gr = GRUPOS_IMPACTO[f * 2 + c];
      var x = 44 + c * (cw + 12);
      var yFin = d.enColumna(x + 18, cw - 36, function() {
        d.y = yFila + 18;
        contenidos.push([
          d.texto(String(g.imp[gr.k]), 34, true, g.imp[gr.k] ? RP[gr.c] : RP.soft, { gap: 2 }),
          d.texto(gr.label, 12.5, true, RP.ink, { gap: 3 }),
          d.texto(gr.d, 10.5, false, RP.muted, { gap: 0 })
        ]);
      });
      altoFila = Math.max(altoFila, yFin - yFila + 18);
    }
    // El fondo se dibuja UNA sola vez y se manda atrás. Dibujarlo dos veces
    // dejaba una copia encima del texto: los números quedaban tapados.
    for (var c2 = 0; c2 < 2; c2++) {
      var bg = d.rect(44 + c2 * (cw + 12), yFila, cw, altoFila, RP.papel, 12);
      try { d.f.insertChild(0, bg); } catch (e) {}
    }
    d.y = yFila + altoFila + 12;
  }
  cerrarSeccion(d);

  // ── Qué se auditó
  d = abrirSeccion(doc, 'Categorías', 8, 32);
  d.texto('Qué se auditó', 17, true, RP.ink, { gap: 4 });
  d.texto(g.totalIssues + ' hallazgos y ' + g.totalPassed + ' verificaciones superadas en ' +
          Object.keys(g.porCat).length + ' categorías.', 11.5, false, RP.muted, { gap: 14 });

  var cats = Object.keys(g.porCat).sort(function(a, b) {
    return g.porCat[b].fallos - g.porCat[a].fallos;
  });
  var cwc = Math.floor((d.w - 10) / 2);
  for (var fi = 0; fi < Math.ceil(cats.length / 2); fi++) {
    var yF = d.y, altoF = 0;
    for (var ci = 0; ci < 2; ci++) {
      var cat = cats[fi * 2 + ci];
      if (!cat) continue;
      var dd = g.porCat[cat], ok = dd.fallos === 0;
      var yFin2 = d.enColumna(44 + ci * (cwc + 10) + 12, cwc - 24, function() {
        d.y = yF + 12;
        d.texto((ok ? '✓  ' : dd.fallos + '  ') + (ETIQUETA_CAT[cat] || cat),
                11.5, true, ok ? RP.teal : RP.red, { gap: 3 });
        d.texto(ok
          ? (dd.pasan ? dd.pasan + ' verificaciones, todas pasan' : 'nada que revisar acá')
          : dd.fallos + ' a corregir' + (dd.pasan ? '  ·  ' + dd.pasan + ' pasan' : ''),
          10, false, RP.muted, { gap: 0 });
      });
      altoF = Math.max(altoF, yFin2 - yF + 12);
    }
    for (var ci2 = 0; ci2 < 2; ci2++) {
      var cat2 = cats[fi * 2 + ci2];
      if (!cat2) continue;
      var ok2 = g.porCat[cat2].fallos === 0;
      var bg2 = d.rect(44 + ci2 * (cwc + 10), yF, cwc, altoF, ok2 ? RP.tealBg : RP.rojoBg, 9);
      try { d.f.insertChild(0, bg2); } catch (e) {}
    }
    d.y = yF + altoF + 10;
  }
  cerrarSeccion(d);

  // ── Cobertura
  var cob = audits[0] && audits[0].cobertura;
  if (cob) {
    d = abrirSeccion(doc, 'Cobertura', 8, 32);
    d.rect(44, d.y, d.w, 1, RP.linea);
    d.y += 22;
    d.texto('Qué se miró', 17, true, RP.ink, { gap: 14 });
    var datos = [[cob.capasVisibles, 'capas visibles'], [cob.capasOcultas, 'ocultas, omitidas'],
                 [cob.textos, 'textos'], [cob.interactivos, 'controles']];
    var yD = d.y, altoD = 0, dw = Math.floor(d.w / 4);
    datos.forEach(function(par, i2) {
      var yf = d.enColumna(44 + i2 * dw, dw - 10, function() {
        d.y = yD;
        d.texto(String(par[0]), 24, true, RP.blue, { gap: 2 });
        d.texto(par[1], 10, false, RP.muted, { gap: 0 });
      });
      altoD = Math.max(altoD, yf - yD);
    });
    d.y = yD + altoD + 14;
    d.texto(cob.nota, 11, false, RP.muted, { gap: 0 });
    cerrarSeccion(d);
  }

  // ── Pie
  d = abrirSeccion(doc, 'Pie', 8, 36);
  d.rect(44, d.y, d.w, 1, RP.linea);
  d.y += 20;
  d.texto('Los números del análisis son los mismos que quedan marcados sobre el diseño.',
          10.5, false, RP.muted, { gap: 4 });
  d.texto('Generado con el auditor WCAG de Qubika.', 10, false, RP.soft, { gap: 0 });
  cerrarSeccion(d);

  return doc;
}

// ═════════════════════════════════════════════════════════════════════════════
// FRAME 2 — Análisis completo
// ═════════════════════════════════════════════════════════════════════════════

function ejemploEnDoc(d, issue, ancho) {
  var det = issue.detail || {};
  if (!det.fg || !det.bg) return;
  var sug = det.suggestion || det.suggestionAA;
  var dos = !!(sug && sug.hex);
  var cw = dos ? Math.floor((ancho - 12) / 2) : ancho;
  var yInicio = d.y;
  var alto = 0;

  function muestra(fgHex, bgHex, etiqueta, ratio, ok, idx) {
    var x = d.col.x + idx * (cw + 12);
    var y = yInicio;
    d.texto(etiqueta, 9, true, ok ? RP.teal : RP.red, { x: x, y: y, w: cw });
    var yChip = y + 14;
    d.rect(x, yChip, cw, 54, hexToFigmaRGB(bgHex), 8, RP.linea);
    var size = det.nonText ? 20 : (det.fontSize && det.fontSize > 8 ? Math.min(det.fontSize, 20) : 15);
    d.texto(det.nonText ? '▬▬▬' : (issue.nodeName || 'Texto').slice(0, 22),
            size, !!det.bold, hexToFigmaRGB(fgHex),
            { x: x + 12, y: yChip + Math.max(6, (54 - size * 1.4) / 2), w: cw - 24 });
    d.texto(fgHex + '  sobre  ' + bgHex + '   ·   ' + ratio + ':1',
            9, false, RP.muted, { x: x, y: yChip + 60, w: cw });
    alto = Math.max(alto, 60 + 16);
  }

  muestra(det.fg, det.bg, 'ASÍ ESTÁ HOY  ·  no pasa', det.ratio, false, 0);
  if (dos) muestra(sug.hex, det.bg, 'RECOMENDACIÓN' + (sug.token ? '  ·  ' + sug.token : ''),
                   sug.ratio, true, 1);
  d.y = yInicio + alto + 10;
}

function buildAnalisisFrame(audits, pos) {
  var W = 780;
  var doc = crearDocumento('WCAG ▸ [2] Análisis completo', W, pos);

  var d = abrirSeccion(doc, 'Portada', 40, 28);
  d.texto('Análisis completo', 30, true, RP.ink, { gap: 5 });
  d.texto('Cada hallazgo con su criterio, el ejemplo de cómo se ve corregido, y qué cambiar.',
          12, false, RP.muted, { gap: 0 });
  cerrarSeccion(d);

  audits.forEach(function(a) {
    var all = [];
    Object.keys(a.results || {}).forEach(function(k) {
      (a.results[k].issues || []).forEach(function(i2) { all.push(i2); });
    });

    // ── Encabezado de la pantalla
    var vis = a.visibility || {};
    d = abrirSeccion(doc, 'Pantalla · ' + a.nodeName, 8, 24);
    d.rect(44, d.y, d.w, 1, RP.linea);
    d.y += 22;
    d.texto(a.nodeName, 20, true, RP.ink, { gap: 5 });
    d.texto('Score ' + (a.score || 0) + '/10' +
            (a.contexto ? '   ·   detectado como ' + a.contexto.label : '') +
            (vis.hiddenLayersSkipped ? '   ·   ' + vis.hiddenLayersSkipped + ' capas ocultas omitidas' : ''),
            11.5, false, RP.muted, { gap: 0 });
    if (!all.length) {
      d.espacio(14);
      d.texto('Sin hallazgos en las capas visibles de esta pantalla.', 13, false, RP.teal, { gap: 0 });
    }
    cerrarSeccion(d);

    // ── Checklist ARRIBA: es lo que hay que verificar a mano, y va primero
    // porque es lo que más se saltea. Al final del documento nadie llega.
    if (a.checklist && a.checklist.tareas && a.checklist.tareas.length) {
      d = abrirSeccion(doc, 'Revisión manual', 18, 32);
      var yChk = d.y;
      d.col = { x: 44 + 20, w: d.w - 40 };
      d.y += 20;
      d.texto('Revisión manual — ' + a.checklist.tareas.length + ' tareas',
              15, true, RP.amber, { gap: 5 });
      d.texto('Esto no se puede verificar desde el archivo. Sin estas verificaciones la ' +
              'auditoría está incompleta por más que diga cero hallazgos.',
              11, false, RP.muted, { gap: 16 });
      a.checklist.tareas.forEach(function(t) {
        d.texto('☐   ' + t.id + '  ' + t.que + '   (' + t.nivel + ')', 11.5, true, RP.ink, { gap: 3 });
        d.texto(t.como, 10.5, false, RP.muted,
                { gap: 13, x: 44 + 38, w: d.w - 58 });
      });
      d.y += 8;
      var bgChk = d.rect(44, yChk, d.w, d.y - yChk, RP.ambBg, 12);
      try { d.f.insertChild(0, bgChk); } catch (e) {}
      d.col = { x: 44, w: d.w };
      cerrarSeccion(d);
    }

    // Se recorren los GRUPOS: un hallazgo por problema, con la cuenta de a
    // cuántos elementos afecta. Sin esto, una lista de 24 filas producía 24
    // tarjetas idénticas y el documento se volvía ilegible.
    var grupos = a.grupos || agruparHallazgos(all);

    GRUPOS_IMPACTO.forEach(function(gr) {
      var lista = grupos.filter(function(g) { return g.impacto === gr.k; });
      if (!lista.length) return;

      // Encabezado del grupo, como sección propia
      d = abrirSeccion(doc, gr.label, 16, 12);
      d.texto(gr.label + '  ·  ' + lista.length, 16, true, RP[gr.c], { gap: 4 });
      d.texto(gr.d, 11, false, RP.muted, { gap: 0 });
      cerrarSeccion(d);

      // Una sección por hallazgo: si algo se rompe, se rompe solo ese bloque
      lista.forEach(function(grupo) {
        var issue = grupo.ejemplo;
        var det = issue.detail || {};
        var ds = abrirSeccion(doc, 'Hallazgo ' + (issue.marker || '') + ' · ' + issue.nodeName, 6, 10);
        var yCaja = ds.y;
        ds.col = { x: 44 + 18, w: ds.w - 36 };
        ds.y += 18;

        ds.texto((issue.marker ? '(' + issue.marker + ')   ' : '') + issue.nodeName +
                 (grupo.cantidad > 1 ? '   ·   y ' + (grupo.cantidad - 1) + ' más' : ''),
                 14, true, RP.ink, { gap: 4 });
        ds.texto(issue.wcag + '  ' + wcagInfo(issue.wcag).es +
                 (det.approximate ? '   ·   valor aproximado' : '') +
                 (det.manual ? '   ·   revisión manual' : '') +
                 (det.porExcepcion ? '   ·   cumple por excepción' : ''),
                 10, true, RP.muted, { gap: 10 });
        ds.texto(issue.message, 11.5, false, { r: 0.22, g: 0.22, b: 0.27 }, { gap: 14 });

        if (det.fg && det.bg) ejemploEnDoc(ds, issue, ds.col.w);

        var sug = det.suggestion || det.suggestionAA;
        var accion = sug && sug.hex
          ? 'Qué cambiar: el color del texto a ' +
            (sug.token ? sug.token + ' (' + sug.hex + ')' : sug.hex) +
            ', que llega a ' + sug.ratio + ':1.'
          : (issue.fix ? 'Qué cambiar: ' + issue.fix : null);
        if (accion) {
          var yAcc = ds.y;
          ds.col = { x: 44 + 30, w: ds.w - 60 };
          ds.y += 12;
          ds.texto(accion, 11, false, gr.c === 'soft' ? RP.muted : RP[gr.c], { gap: 0 });
          var altoAcc = ds.y - yAcc + 12;
          var bgAcc = ds.rect(44 + 18, yAcc, ds.w - 36, altoAcc,
                              gr.c === 'red' ? RP.rojoBg : RP.ambBg, 8);
          try { ds.f.insertChild(0, bgAcc); } catch (e) {}
          ds.y = yAcc + altoAcc;
          ds.col = { x: 44 + 18, w: ds.w - 36 };
        }

        // Los elementos afectados, para poder ir a cada uno
        if (grupo.cantidad > 1) {
          ds.texto('Afecta a ' + grupo.cantidad + ' elementos' +
                   (grupo.marcadores.length ? '  ·  marcadores ' + grupo.marcadores.join(', ') : '') +
                   ':  ' + grupo.afectados.slice(0, 12).map(function(af) { return af.nodeName; }).join(', ') +
                   (grupo.cantidad > 12 ? ' y ' + (grupo.cantidad - 12) + ' más' : ''),
                   10, false, RP.muted, { gap: 4 });
        }

        ds.y += 18;
        var bgCaja = ds.rect(44, yCaja, ds.w, ds.y - yCaja, RP.papel, 12);
        try { ds.f.insertChild(0, bgCaja); } catch (e) {}
        cerrarSeccion(ds);
      });
    });

  });

  return doc;
}

// ─── Los dos frames, uno al lado del otro ────────────────────────────────────

// Tras auditar, el reporte se pega solo. Pedir la auditoría y después tener que
// apretar otro botón para verla era un paso de más.
var pegarReporteTrasAuditar = true;

function dibujarReporteSiCorresponde(audits) {
  if (!pegarReporteTrasAuditar) return;
  if (!audits || !audits.length) return;
  Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  ]).then(function() {
    var r = buildReporteFrames(audits);
    traerAnotacionesAlFrente();
    figma.ui.postMessage({ type: 'report-drawn', frames: audits.length, auto: true });
  }).catch(function(e) {
    figma.ui.postMessage({ type: 'error',
      message: 'La auditoría corrió, pero el reporte no se pudo pegar: ' +
               (e && e.message ? e.message : e) });
  });
}

function buildReporteFrames(audits) {
  var container = getOrCreateAnnotContainer();
  ['WCAG ▸ [1] Resumen', 'WCAG ▸ [2] Análisis completo'].forEach(function(n) {
    for (var i = container.children.length - 1; i >= 0; i--) {
      if (container.children[i].name === n) container.children[i].remove();
    }
  });

  // A la derecha del frame auditado
  var ab = (audits.length && audits[0].bounds) ? audits[0].bounds : null;
  if (!ab) {
    try {
      var anchor = audits.length && audits[0].nodeId ? figma.getNodeById(audits[0].nodeId) : null;
      if (anchor && anchor.absoluteBoundingBox) ab = anchor.absoluteBoundingBox;
    } catch (e) {}
  }
  var x0 = ab ? ab.x + ab.width + 100 : freeSpotOnCanvas().x;
  var y0 = ab ? ab.y : freeSpotOnCanvas().y;

  _seccionesFallidas = [];

  // Cada documento se construye aislado: si uno falla, el otro se pega igual y
  // el error viaja al panel con su mensaje real, en vez de dejar un frame vacío.
  var resumen = null, analisis = null;
  try {
    resumen = buildResumenFrame(audits, { x: x0, y: y0 });
    container.appendChild(resumen);
    sealOverlay(resumen, false);
  } catch (e) {
    _seccionesFallidas.push('Resumen: ' + ((e && e.message) ? e.message : String(e)));
  }

  var xAnalisis = x0 + ((resumen && resumen.width) ? resumen.width : 620) + 40;
  try {
    analisis = buildAnalisisFrame(audits, { x: xAnalisis, y: y0 });
    container.appendChild(analisis);
    sealOverlay(analisis, false);
  } catch (e2) {
    _seccionesFallidas.push('Análisis: ' + ((e2 && e2.message) ? e2.message : String(e2)));
  }

  if (_seccionesFallidas.length) {
    figma.ui.postMessage({
      type: 'error',
      message: 'El reporte se pegó parcialmente. Falló: ' +
               _seccionesFallidas.slice(0, 3).join('  ·  ')
    });
  }

  return { resumen: resumen, analisis: analisis };
}

function freeSpotOnCanvas() {
  var maxX = 0, minY = 0, first = true;
  try {
    figma.currentPage.children.forEach(function(n) {
      var b = n.absoluteBoundingBox;
      if (!b) return;
      if (first) { minY = b.y; first = false; }
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y < minY) minY = b.y;
    });
  } catch (e) {}
  return { x: maxX + 160, y: minY };
}

function hexToFigmaRGB(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  };
}

figma.on('selectionchange', function() {
  // Con el cuentagotas activo, tocar una capa toma su color
  if (modoCuentagotas) {
    var sel0 = figma.currentPage.selection[0];
    if (sel0) {
      var c = colorDeCapa(sel0);
      var hex = c.fill || c.stroke;
      if (hex) {
        figma.ui.postMessage({ type: 'picked-color', destino: modoCuentagotas,
          hex: hex, desde: sel0.name || sel0.type,
          esTexto: sel0.type === 'TEXT', tipo: c.fill ? 'relleno' : 'borde',
          compuesto: !!c.compuesto, opacidad: c.opacidad, crudo: c.crudo });
        modoCuentagotas = null;
        figma.ui.postMessage({ type: 'picker-state', destino: null });
      } else {
        figma.ui.postMessage({ type: 'picker-miss', nombre: sel0.name || sel0.type });
      }
    }
  }

  try { figma.ui.postMessage(selectionSummary()); } catch (e) {}
  if (!liveModeOn) return;
  // Live mode re-runs the full analysis so the panel is never stale and the
  // designer never has to press a button after changing the selection.
  try { handleMessage({ type: 'analyze-selection', withTypography: liveTypography }); } catch (e) {}
});

// The real message handler. Wrapped below so a throw surfaces in the panel
// instead of silently killing the plugin — the failure mode that is hardest
// to diagnose is the one that produces no output at all.
// Antes de cualquier análisis que sugiera colores: la paleta se relee de la
// selección (las variables de librería dependen de lo que esté enlazado ahí) y
// se toma el modo que eligió la persona.
function prepararSugerencias(roots, modo) {
  if (modo === 'sistema' || modo === 'explorar') modoSugerencia = modo;
  try { cargarPaletaDelArchivo(roots); } catch (e) {}
}

function infoSistema() {
  var fam = {};
  paletaParaSugerir().forEach(function(c) { var f = familiaDeToken(c.name); if (f) fam[f] = true; });
  return { tokens: paletaParaSugerir().length, familias: Object.keys(fam).length, modo: modoSugerencia };
}

function handleMessage(msg) {
  // ── PNG de una capa, para el simulador de visión y el borrador de alt.
  // Se manda como bytes; el panel arma la imagen. `ref` vuelve tal cual para
  // que el panel sepa a qué pedido corresponde la respuesta.
  if (msg.type === 'export-png') {
    var nodoPng = msg.nodeId ? figma.getNodeById(msg.nodeId) : figma.currentPage.selection[0];
    if (!nodoPng || typeof nodoPng.exportAsync !== 'function') {
      figma.ui.postMessage({ type: 'png-exported', ref: msg.ref, ok: false,
        message: nodoPng ? 'Esta capa no se puede exportar como imagen.' : 'Seleccioná un frame.' });
      return;
    }
    var ancho = Math.min(msg.ancho || 1200, Math.max(1, Math.round(nodoPng.width || 1200) * 2));
    nodoPng.exportAsync({ format: 'PNG', constraint: { type: 'WIDTH', value: ancho } })
      .then(function(bytes) {
        figma.ui.postMessage({ type: 'png-exported', ref: msg.ref, ok: true, bytes: bytes,
          nombre: nodoPng.name, nodeId: nodoPng.id,
          width: Math.round(nodoPng.width || 0), height: Math.round(nodoPng.height || 0) });
      })
      .catch(function(e) {
        figma.ui.postMessage({ type: 'png-exported', ref: msg.ref, ok: false,
          message: 'No se pudo exportar: ' + ((e && e.message) || e) });
      });
    return;
  }

  // ── La key de la API de Claude vive en el clientStorage de cada persona:
  // queda en su compu, no viaja con el archivo ni con el plugin.
  // ── Links externos: dentro del iframe del plugin un target=_blank no
  // siempre abre; figma.openExternal sí. Solo https.
  if (msg.type === 'open-url') {
    if (typeof msg.url === 'string' && /^https:\/\//.test(msg.url)) figma.openExternal(msg.url);
    return;
  }

  // ── Preferencias del panel que se recuerdan entre sesiones
  if (msg.type === 'get-pref' || msg.type === 'set-pref') {
    var PREFS = ['wcagTema'];
    if (PREFS.indexOf(msg.key) === -1) return;
    var op2 = msg.type === 'set-pref'
      ? figma.clientStorage.setAsync(msg.key, msg.value).then(function() { return msg.value; })
      : figma.clientStorage.getAsync(msg.key);
    op2.then(function(v) { figma.ui.postMessage({ type: 'pref', key: msg.key, value: v == null ? null : v }); })
       .catch(function() {});
    return;
  }

  if (msg.type === 'get-ai-key') {
    figma.clientStorage.getAsync('wcagAiKey').then(function(k) {
      figma.ui.postMessage({ type: 'ai-key', key: k || '' });
    }).catch(function() { figma.ui.postMessage({ type: 'ai-key', key: '' }); });
    return;
  }
  if (msg.type === 'set-ai-key') {
    var op = msg.key ? figma.clientStorage.setAsync('wcagAiKey', msg.key)
                     : figma.clientStorage.deleteAsync('wcagAiKey');
    op.then(function() { figma.ui.postMessage({ type: 'ai-key', key: msg.key || '', saved: true }); })
      .catch(function() {});
    return;
  }

  if (msg.type === 'estimate-audit') {
    var selE = figma.currentPage.selection;
    figma.ui.postMessage({ type: 'audit-estimate', capas: contarCapas(selE),
                           frames: selE.length, msPorNodo: msPorNodo });
    return;
  }

  if (msg.type === 'set-color-mode') {
    if (msg.modo === 'sistema' || msg.modo === 'explorar') modoSugerencia = msg.modo;
    return;
  }


  // ── Pegar el reporte: dos frames, resumen y análisis completo
  if (msg.type === 'render-audit-report') {
    var auds = msg.audits || [];
    if (!auds.length) {
      figma.ui.postMessage({ type: 'error', message: 'Primero corré la auditoría.' });
      return;
    }
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      var r = buildReporteFrames(auds);
      var aMostrar = [r.resumen, r.analisis].filter(Boolean);
      if (aMostrar.length) figma.viewport.scrollAndZoomIntoView(aMostrar);
      traerAnotacionesAlFrente();
      figma.ui.postMessage({ type: 'report-drawn', frames: auds.length });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error',
        message: 'No se pudo pegar el reporte: ' + (e && e.message ? e.message : e) });
    });
    return;
  }

  // ── Inventario de imágenes para escribir los alt
  if (msg.type === 'scan-images') {
    var selImg = figma.currentPage.selection;
    if (!selImg.length) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame para revisar sus imágenes.' });
      return;
    }
    var imgs = [];
    selImg.forEach(function(n) { inventarioImagenes(n).forEach(function(i) { imgs.push(i); }); });
    figma.ui.postMessage({ type: 'images-scanned', images: imgs, frameName: selImg[0].name });
    return;
  }

  // ── Cuentagotas: se activa y la próxima capa que toques da el color
  if (msg.type === 'set-picker') {
    modoCuentagotas = msg.destino || null;
    figma.ui.postMessage({ type: 'picker-state', destino: modoCuentagotas });
    return;
  }

  if (msg.type === 'frame-colors') {
    var selC = figma.currentPage.selection;
    if (!selC.length) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame para ver sus colores.' });
      return;
    }
    var todos = [];
    selC.forEach(function(n) { coloresDelFrame(n).forEach(function(c) { todos.push(c); }); });
    figma.ui.postMessage({ type: 'frame-colors', colores: todos.slice(0, 60),
                           frameName: selC[0].name });
    return;
  }

  if (msg.type === 'paste-alts') {
    var imgsP = msg.images || [];
    if (!imgsP.length) {
      figma.ui.postMessage({ type: 'error', message: 'No hay imágenes para anotar.' });
      return;
    }
    var raizP = figma.currentPage.selection[0] || null;
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      // Dos cosas: la etiqueta sobre cada imagen y el documento al costado
      var et = etiquetasSobreImagenes(imgsP);
      var f = pegarAnotacionesAlt(imgsP, raizP);
      traerAnotacionesAlFrente();
      figma.viewport.scrollAndZoomIntoView([f]);
      figma.ui.postMessage({ type: 'alts-pasted', count: imgsP.length, etiquetas: et.puestas });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error',
        message: 'No se pudo pegar: ' + ((e && e.message) ? e.message : e) });
    });
    return;
  }

  if (msg.type === 'save-alt') {
    var ok = guardarAlt(msg.nodeId, msg.alt);
    figma.ui.postMessage({ type: 'alt-saved', nodeId: msg.nodeId, ok: ok });
    return;
  }

  // ── Pegar el reporte: dos frames, resumen y análisis completo
  if (msg.type === 'render-audit-report') {
    var auds = msg.audits || [];
    if (!auds.length) {
      figma.ui.postMessage({ type: 'error', message: 'Primero corré la auditoría.' });
      return;
    }
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      var r = buildReporteFrames(auds);
      var aMostrar = [r.resumen, r.analisis].filter(Boolean);
      if (aMostrar.length) figma.viewport.scrollAndZoomIntoView(aMostrar);
      traerAnotacionesAlFrente();
      figma.ui.postMessage({ type: 'report-drawn', frames: auds.length });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error',
        message: 'No se pudo pegar el reporte: ' + (e && e.message ? e.message : e) });
    });
    return;
  }

  // ── Lock / unlock every overlay the plugin drew on this page
  if (msg.type === 'set-artifacts-locked') {
    var n = setArtifactsLocked(!!msg.locked);
    figma.ui.postMessage({ type: 'artifacts-locked', locked: !!msg.locked, count: n });
    return;
  }

  // ── Analyse the selection once and return everything about it.
  // Selecting a frame should answer both questions at the same time: how the
  // colours behave and how the type behaves. Two screens, one analysis.
  if (msg.type === 'analyze-selection') {
    var selAS = figma.currentPage.selection;
    if (selAS.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame, componente, botón o texto.' });
      return;
    }
    prepararSugerencias(selAS, msg.modoColor);
    var contrastReports = selAS.slice(0, 8).map(function(n) {
      var r = analyzeContrast(n);
      r.rootName = n.name || n.type;
      r.rootType = n.type;
      r.rootId   = n.id;
      r.rootHidden = !isLayerVisible(n);
      return r;
    });
    // El contraste sale primero y solo: es lo que el panel muestra de inmediato.
    figma.ui.postMessage({ type: 'contrast-analysis', reports: contrastReports, selCount: selAS.length,
                           sistema: infoSistema() });

    // La tipografía recorre el árbol otra vez, así que solo se calcula si de
    // verdad se va a mostrar. Antes se hacía siempre y por eso cambiar de
    // selección sobre un frame grande se sentía trabado.
    if (msg.withTypography !== false) {
      var typo = analyzeTypography(selAS[0]);
      typo.frameName = selAS[0].name || selAS[0].type;
      typo.type = 'typography-analysis';
      figma.ui.postMessage(typo);
    }
    return;
  }

  // ── Structured contrast analysis: every pair, with roles and origin
  if (msg.type === 'analyze-contrast') {
    var selAC = figma.currentPage.selection;
    if (selAC.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un botón, sección, frame o texto.' });
      return;
    }
    prepararSugerencias(selAC, msg.modoColor);
    var reports = selAC.slice(0, 8).map(function(n) {
      var r = analyzeContrast(n);
      r.rootName = n.name || n.type;
      r.rootType = n.type;
      r.rootId   = n.id;
      r.rootHidden = !isLayerVisible(n);
      return r;
    });
    figma.ui.postMessage({ type: 'contrast-analysis', reports: reports, selCount: selAC.length,
                           sistema: infoSistema() });
    return;
  }

  // ── Full typography inventory
  if (msg.type === 'analyze-typography') {
    var selT = figma.currentPage.selection;
    if (selT.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame o sección para revisar sus textos.' });
      return;
    }
    var rt = analyzeTypography(selT[0]);
    rt.type = 'typography-analysis';
    rt.frameName = selT[0].name || selT[0].type;
    figma.ui.postMessage(rt);
    return;
  }

  // ── Reading order (1.3.2) — everything a screen reader narrates
  if (msg.type === 'build-reading-order') {
    var selRO = figma.currentPage.selection;
    if (selRO.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame para calcular el orden de lectura.' });
      return;
    }
    var ro = buildReadingOrder(selRO);
    ro.type = 'reading-order';
    ro.frameName = selRO.length > 1 ? selRO.length + ' elementos' : (selRO[0].name || selRO[0].type);
    figma.ui.postMessage(ro);
    return;
  }

  // ── Draw the ARIA tags beside the controls
  if (msg.type === 'render-aria') {
    var selRA = figma.currentPage.selection;
    if (selRA.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná de nuevo el frame para anotar.' });
      return;
    }
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
      // El bloque de código va en monoespaciada. Si no está instalada se cae a
      // Inter en vez de romper toda la hoja.
      figma.loadFontAsync({ family: 'Roboto Mono', style: 'Regular' })
        .catch(function() { MONO_FAMILY = 'Inter'; })
    ]).then(function() {
      var ov = buildAriaOverlay(selRA[0], msg.items || [], msg.agrupar);
      figma.viewport.scrollAndZoomIntoView([ov]);
        traerAnotacionesAlFrente();
      figma.ui.postMessage({ type: 'aria-drawn', count: (msg.items || []).length });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: 'No se pudo anotar: ' + (e && e.message ? e.message : e) });
    });
    return;
  }

  // ── Boot: catalogue + current selection in one round trip
  if (msg.type === 'init') {
    figma.ui.postMessage({ type: 'wcag-catalogue', criteria: wcagCatalogue(),
      gruposAuditoria: Object.keys(GRUPOS_AUDITORIA).map(function(k) {
        return { id: k, label: GRUPOS_AUDITORIA[k].label, desc: GRUPOS_AUDITORIA[k].desc };
      }) });
    figma.ui.postMessage(selectionSummary());
    return;
  }

  if (msg.type === 'get-selection') {
    figma.ui.postMessage(selectionSummary());
    return;
  }

  // ── Run ONE category against the selection (the "quick check" screens)
  if (msg.type === 'run-category') {
    var selC = figma.currentPage.selection;
    if (selC.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame, componente o capa.' });
      return;
    }
    skippedHiddenLayers = 0; skippedHiddenNames = [];
    var node = selC[0];
    var res;
    switch (msg.category) {
      case 'contrast':   res = auditContrast(node);      break;
      case 'nontext':    res = auditNonTextContrast(node); break;
      case 'typography': res = auditTypography(node);    break;
      case 'target':     res = auditTargetSize(node);    break;
      case 'aria':       res = auditAria(node);          break;
      case 'images':     res = auditImages(node);        break;
      case 'focus':      res = auditFocusStates(node);   break;
      default:
        figma.ui.postMessage({ type: 'error', message: 'Categoría desconocida: ' + msg.category });
        return;
    }
    figma.ui.postMessage({
      type: 'category-results',
      category: msg.category,
      frameName: node.name || node.type,
      rootHidden: !isLayerVisible(node),
      hiddenSkipped: skippedHiddenLayers,
      hiddenSample: skippedHiddenNames.slice(0, 10),
      issues: res.issues,
      passed: res.passed || 0
    });
    return;
  }

  // ── Pull the colours out of whatever is selected (feeds the matrix)
  if (msg.type === 'extract-colors') {
    if (figma.currentPage.selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná las muestras de color en el canvas.' });
      return;
    }
    skippedHiddenLayers = 0; skippedHiddenNames = [];
    var colors = colorsFromSelection();
    setDesignSystemPalette(colors);
    figma.ui.postMessage({ type: 'colors-extracted', palette: colors,
      source: (figma.currentPage.selection[0] && figma.currentPage.selection[0].name) || 'Selección' });
    return;
  }

  // ── Draw the matrix as a real frame on the canvas
  if (msg.type === 'render-matrix') {
    if (!dsPalette.length) {
      figma.ui.postMessage({ type: 'error', message: 'No hay paleta cargada.' });
      return;
    }
    var mx = dsPalette.map(function(bg) {
      return {
        bg: { name: bg.name, hex: bg.hex },
        cells: dsPalette.map(function(fg) {
          var rr = Math.round(contrastRatio(fg.l, bg.l) * 100) / 100;
          return { fg: { name: fg.name, hex: fg.hex }, ratio: rr,
                   normalAA: rr >= 4.5, largeAA: rr >= 3, normalAAA: rr >= 7, largeAAA: rr >= 4.5 };
        })
      };
    });
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      var f = msg.vista === 'lista' ? buildMatrixListFrame(mx, msg.etiqueta)
                                    : buildMatrixFrame(mx, msg.etiqueta);
      // La matriz es un documento aparte: se muestra, pero la selección del
      // usuario queda intacta para que pueda seguir chequeando colores.
      figma.viewport.scrollAndZoomIntoView([f]);
      traerAnotacionesAlFrente();
      figma.ui.postMessage({ type: 'matrix-drawn' });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: 'No se pudo dibujar la matriz: ' + (e && e.message ? e.message : e) });
    });
    return;
  }

  // ── Full WCAG 2.2 A/AA catalogue for the reference screen
  if (msg.type === 'get-wcag-catalogue') {
    figma.ui.postMessage({ type: 'wcag-catalogue', criteria: wcagCatalogue(),
      gruposAuditoria: Object.keys(GRUPOS_AUDITORIA).map(function(k) {
        return { id: k, label: GRUPOS_AUDITORIA[k].label, desc: GRUPOS_AUDITORIA[k].desc };
      }) });
    return;
  }

  // ── Infer focus order over the visible layers of the selection
  if (msg.type === 'build-focus-order') {
    var selF = figma.currentPage.selection;
    if (selF.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame para calcular el orden de foco.' });
      return;
    }
    var orderRes = buildFocusOrder(selF);
    orderRes.type = 'focus-order';
    orderRes.frameName = selF.length > 1 ? selF.length + ' elementos' : selF[0].name;
    figma.ui.postMessage(orderRes);
    return;
  }

  // ── Draw the inferred (or designer-corrected) order on the canvas
  if (msg.type === 'render-focus-order') {
    var selR = figma.currentPage.selection;
    if (selR.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná el frame de nuevo para dibujar el orden.' });
      return;
    }
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      var ov = buildFocusOrderOverlay(selR[0], { stops: msg.stops || [], kind: msg.kind || 'focus' });
      // Do NOT steal the selection: the designer keeps working on their frame,
      // and pressing "Calcular" again re-analyses that frame instead of the
      // overlay the plugin just drew.
      figma.viewport.scrollAndZoomIntoView([ov]);
      traerAnotacionesAlFrente();
      figma.ui.postMessage({ type: 'focus-order-drawn', count: (msg.stops || []).length });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: 'No se pudo dibujar: ' + (e && e.message ? e.message : e) });
    });
    return;
  }

  // ── ARIA suggestions for the selection
  if (msg.type === 'build-aria') {
    var selA = figma.currentPage.selection;
    if (selA.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná un frame o componente para sugerir ARIA.' });
      return;
    }
    skippedHiddenLayers = 0; skippedHiddenNames = [];
    var todosA = collectFocusStops(selA[0], [], 0);
    var descartadosA = [];
    var stopsA = todosA.filter(function(n) {
      var d = descartarAria(n);
      if (d) {
        // No se propone ARIA, pero tampoco se esconde: si el plugin se
        // equivocó, el diseñador tiene que poder verlo y decidir.
        descartadosA.push({
          nodeId: n.id, name: n.name || n.type,
          motivo: d.motivo, texto: d.texto
        });
        return false;
      }
      return true;
    });
    var todosLosItems = stopsA.map(function(n) {
      var b = absBox(n);
      return {
        nodeId: n.id, name: n.name || n.type, type: n.type,
        x: b.x, y: b.y, width: b.width, height: b.height,
        detected: detectInteractive(n),
        aria: suggestAria(n)
      };
    });

    // Solo los que necesitan anotación. Los demás se resumen en una línea: son
    // correctos y no hay nada que hacer con ellos.
    var itemsA = [], resueltos = [];
    todosLosItems.forEach(function(it) {
      var vale = ariaVale(it.aria);
      if (vale) { it.porQue = vale; itemsA.push(it); }
      else resueltos.push({ nodeId: it.nodeId, name: it.name,
                            nativo: it.aria.nativo, nombre: it.aria.accessibleName });
    });

    // Lo más grave primero: sin nombre, después estados, después roles
    itemsA.sort(function(x, y) { return x.porQue.prioridad - y.porQue.prioridad; });

    // Etiquetas repetidas: si hay un lápiz en cada sección, la sugerencia es
    // "Editar" para todos, y el lector anuncia cinco botones idénticos. El
    // nombre tiene que decir QUÉ se edita.
    var cuenta = {};
    itemsA.forEach(function(it) {
      var n = (it.aria.accessibleName || it.aria.nombreSugerido || '').trim().toLowerCase();
      if (!n) return;
      cuenta[n] = (cuenta[n] || 0) + 1;
    });
    itemsA.forEach(function(it) {
      var n = (it.aria.accessibleName || it.aria.nombreSugerido || '').trim().toLowerCase();
      if (!n || cuenta[n] < 2) return;
      it.aria.repetida = cuenta[n];
      it.aria.notes = (it.aria.notes || []).concat([{
        wcag: '2.4.6', severity: 'warning',
        text: 'Hay ' + cuenta[n] + ' controles que quedarían con el mismo nombre ("' +
              (it.aria.accessibleName || it.aria.nombreSugerido) + '"). Un lector de pantalla ' +
              'los lista juntos y no se distinguen. El nombre tiene que decir QUÉ: ' +
              '"Editar perfil", "Editar notificaciones", no "Editar".'
      }]);
    });

    figma.ui.postMessage({
      type: 'aria-suggestions',
      frameName: selA[0].name,
      hiddenSkipped: skippedHiddenLayers,
      descartados: descartadosA,
      // Instancias del mismo componente con el mismo patrón se agrupan en UNA
      // entrada. Una lista de 20 clases no necesita 20 specs idénticas: necesita
      // una plantilla y la lista de dónde aplica.
      grupos: agruparRepetidos(itemsA),
      resueltos: resueltos,
      totalControles: todosLosItems.length,
      items: itemsA
    });
    return;
  }

  // ── Toggle instant-feedback mode (Check tab open/closed)
  if (msg.type === 'set-live-mode') {
    liveModeOn = !!msg.on;
    liveTypography = !!msg.typography;
    if (liveModeOn) {
      skippedHiddenLayers = 0;
      skippedHiddenNames  = [];
      figma.ui.postMessage(describeSelectionForLive());
    }
    return;
  }

  // ── Load the design system palette so fixes can name real tokens
  // Expects [{ name, hex, r, g, b }] with r/g/b in 0-255
  if (msg.type === 'set-ds-palette') {
    setDesignSystemPalette(msg.palette || []);
    figma.ui.postMessage({ type: 'ds-palette-loaded', count: dsPalette.length });
    return;
  }

  // ── Read every local paint style / color variable as a candidate palette
  if (msg.type === 'load-local-palette') {
    var palette = [];
    try {
      figma.getLocalPaintStyles().forEach(function(style) {
        var solid = topSolidFill(style.paints);
        if (!solid) return;
        palette.push({
          name: style.name,
          hex: hexFromRGB(solid.color.r, solid.color.g, solid.color.b),
          r: solid.color.r * 255, g: solid.color.g * 255, b: solid.color.b * 255
        });
      });
    } catch (e) { /* older API — fall through with whatever was collected */ }
    setDesignSystemPalette(palette);
    figma.ui.postMessage({ type: 'ds-palette-loaded', count: palette.length, palette: palette,
      source: 'Estilos del archivo' });
    return;
  }

  // ── Build the contrast matrix for the loaded palette
  // Every token against every token, at both text sizes.
  if (msg.type === 'build-palette-matrix') {
    if (!dsPalette.length) {
      figma.ui.postMessage({ type: 'error', message: 'No palette loaded. Run "Load palette" first.' });
      return;
    }
    var matrix = dsPalette.map(function(bg) {
      return {
        bg: { name: bg.name, hex: bg.hex },
        cells: dsPalette.map(function(fg) {
          var ratio = Math.round(contrastRatio(fg.l, bg.l) * 100) / 100;
          return {
            fg: { name: fg.name, hex: fg.hex },
            ratio: ratio,
            normalAA: ratio >= 4.5,   // text under 18px
            largeAA:  ratio >= 3.0,   // ≥18px, or ≥14px bold
            uiAA:     ratio >= 3.0,   // borders, icons, focus rings (1.4.11)
            normalAAA: ratio >= 7.0,
            largeAAA:  ratio >= 4.5
          };
        })
      };
    });
    figma.ui.postMessage({ type: 'palette-matrix', matrix: matrix });
    return;
  }

  // ── Audit current Figma selection
  if (msg.type === 'run-audit') {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Seleccioná al menos un frame o componente para auditar.' });
      return;
    }
    prepararSugerencias(selection, msg.modoColor);
    runAuditsAndPost(selection, msg.createAnnotations !== false, msg.dismissedSet || null,
                     { grupos: msg.grupos || null });
    // El reporte se pega solo: pedir la auditoría ES pedir el reporte.
    pegarReporteTrasAuditar = (msg.pegarReporte !== false);
  }

  // ── Re-audit frames from a previously saved session
  if (msg.type === 'reaudit-session') {
    var sessionNodes = (msg.nodeIds || [])
      .map(function(id) { return figma.getNodeById(id); })
      .filter(Boolean);
    if (sessionNodes.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'The frames from the saved session no longer exist in this file. They may have been deleted or moved to another page.' });
      return;
    }
    runAuditsAndPost(sessionNodes, msg.createAnnotations !== false, msg.dismissedSet || null);
  }

  // ── Cancel an in-progress audit
  if (msg.type === 'cancel-audit') {
    auditCancelled = true;
    figma.ui.postMessage({ type: 'audit-cancelled' });
    return;
  }

  // ── Persist / clear saved session metadata (called from UI after each audit)
  if (msg.type === 'save-session') {
    if (msg.data) {
      figma.clientStorage.setAsync('wcag_session', msg.data).catch(function() {});
    } else {
      // Clearing session — also wipe saved results
      figma.clientStorage.deleteAsync('wcag_session').catch(function() {});
      figma.clientStorage.deleteAsync('wcag_session_results').catch(function() {});
    }
  }

  // ── Persist full audit results so session can be restored without re-auditing
  if (msg.type === 'save-session-results') {
    if (msg.data && msg.data.length > 0) {
      figma.clientStorage.setAsync('wcag_session_results', msg.data).catch(function() {
        // Storage limit exceeded — silently skip; restore will require re-audit
      });
    } else {
      figma.clientStorage.deleteAsync('wcag_session_results').catch(function() {});
    }
  }

  // ── Create report as an editable Figma frame on a new page
  if (msg.type === 'create-figma-report') {
    var reportData = msg.data;
    Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
    ]).then(function() {
      buildFigmaReport(reportData);
      figma.ui.postMessage({ type: 'figma-report-done' });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'error', message: 'No se pudo generar el reporte en Figma: ' + (e ? (e.message || String(e)) : 'unknown') });
    });
  }

  // ── Toggle visibility of the shared WCAG Annotations container ──────────────
  if (msg.type === 'toggle-annotations') {
    var page = figma.currentPage;
    var container = null;
    for (var ci = 0; ci < page.children.length; ci++) {
      var ch = page.children[ci];
      if (ch.type !== 'FRAME') continue;
      var tag = '';
      try { tag = ch.getPluginData('wcagAnnotContainer'); } catch(e) {}
      if (tag === '1') { container = ch; break; }
    }
    if (container) {
      container.visible = !container.visible;
      figma.ui.postMessage({ type: 'annotations-visibility', visible: container.visible });
    } else {
      figma.ui.postMessage({ type: 'annotations-visibility', visible: false, missing: true });
    }
    return;
  }

  // ── Export thumbnails for specific nodes (used when cap was exceeded during audit)
  if (msg.type === 'export-thumbnails-for-nodes') {
    var missingIds = msg.nodeIds || [];
    if (missingIds.length === 0) {
      figma.ui.postMessage({ type: 'thumbnails-exported', thumbnails: {}, thumbMap: {} });
      return;
    }

    var origToExportMap2 = {};
    var exportNodeById2  = {};
    var exportToOrigId2  = {};
    missingIds.forEach(function(origId) {
      var exportNode = bestExportNode(origId);
      var exportId   = exportNode ? exportNode.id : origId;
      origToExportMap2[origId] = exportId;
      if (!exportNodeById2[exportId]) {
        exportNodeById2[exportId] = exportNode;
        exportToOrigId2[exportId] = origId;
      }
    });

    var exportIds2 = Object.keys(exportNodeById2);
    var promises2  = exportIds2.map(function(exportId) {
      var exportNode = exportNodeById2[exportId];
      var origNode   = figma.getNodeById(exportToOrigId2[exportId]);
      return tryExportNode(exportNode, exportId)
        .then(function(r) {
          if (r) return r;
          if (origNode && origNode !== exportNode) return tryExportNode(origNode, exportId);
          return null;
        })
        .then(function(r) {
          if (r) return r;
          var par = origNode && origNode.parent;
          if (par && par.type !== 'PAGE' && typeof par.exportAsync === 'function' &&
              par !== exportNode && par !== origNode) {
            return tryExportNode(par, exportId);
          }
          return null;
        });
    });

    Promise.all(promises2).then(function(results) {
      var thumbnails2 = {};
      results.forEach(function(r) { if (r) thumbnails2[r.id] = r.b64; });
      figma.ui.postMessage({ type: 'thumbnails-exported', thumbnails: thumbnails2, thumbMap: origToExportMap2 });
    });
  }

  if (msg.type === 'select-node') {
    var node = figma.getNodeById(msg.nodeId);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

figma.ui.onmessage = function(msg) {
  try {
    handleMessage(msg);
  } catch (err) {
    var detail = (err && err.message) ? err.message : String(err);
    try { console.error('[WCAG Auditor]', msg && msg.type, err); } catch (e) {}
    figma.ui.postMessage({
      type: 'error',
      message: 'Error en "' + (msg && msg.type ? msg.type : '?') + '": ' + detail,
      fatal: true
    });
  }
};

// Startup ping — if the UI never receives this, the problem is in code.js
// loading, not in any individual action.
try {
  figma.ui.postMessage({ type: 'plugin-ready', api: figma.apiVersion || '1.0.0' });
} catch (e) {}
