#!/usr/bin/env node
// Test del modo "dynamic-page": así corre el plugin publicado. Las lecturas
// sincrónicas (getNodeById, mainComponent, getVariableById, getStyleById,
// getLocalPaintStyles…) tiran error, como en Figma; solo andan las Async.
// Se mandan todos los mensajes que manda ui.html y ninguno puede fallar.
// Ejecutar: node test-dynamic-page.js

var fs = require('fs');
var out = [], selection = [], created = [];
function prohibido(n) { return function() { throw new Error('Cannot call ' + n + ' with documentAccess: dynamic-page'); }; }

var vars = {
  'VariableID:1': { id:'VariableID:1', name:'gray/500', resolvedType:'COLOR', variableCollectionId:'C1',
    valuesByMode:{ m1:{ r:0.5, g:0.5, b:0.5, a:1 } } },
  'VariableID:2': { id:'VariableID:2', name:'text/muted', resolvedType:'COLOR', variableCollectionId:'C1',
    valuesByMode:{ m1:{ type:'VARIABLE_ALIAS', id:'VariableID:1' } } }
};
var cols = { C1: { id:'C1', defaultModeId:'m1', variableIds:['VariableID:1','VariableID:2'] } };
var mainComp = { id:'M1', type:'COMPONENT', name:'Button', variantProperties:{ State:'Default' } };

function fakeNode(p, children){
  var n = Object.assign({ type:'FRAME', name:'node', visible:true, opacity:1, x:0, y:0, width:100, height:40,
    id: String(Math.floor(Math.random()*900)+10) + ':' + String(Math.floor(Math.random()*900)+10) }, p);
  n.absoluteBoundingBox = { x:n.x, y:n.y, width:n.width, height:n.height };
  n.getPluginData = function(){ return ''; }; n.setPluginData = function(){};
  n.exportAsync = function(){ return Promise.resolve(new Uint8Array([137,80,78,71])); };
  if (n.type === 'INSTANCE') {
    Object.defineProperty(n, 'mainComponent', { get: prohibido('mainComponent') });
    n.getMainComponentAsync = function(){ return Promise.resolve(mainComp); };
  }
  if (children){ n.children = children; children.forEach(function(c){ c.parent = n; }); }
  return n;
}
function fill(hex, varId){
  var f = { type:'SOLID', visible:true, color:{ r:parseInt(hex.slice(1,3),16)/255, g:parseInt(hex.slice(3,5),16)/255, b:parseInt(hex.slice(5,7),16)/255 } };
  if (varId) f.boundVariables = { color: { type:'VARIABLE_ALIAS', id: varId } };
  return f;
}
function textNode(chars, hex, size, p){
  return fakeNode(Object.assign({ type:'TEXT', characters:chars, fontSize:size||14, name:chars,
    fills:[fill(hex||'#000000')], fontName:{family:'Inter',style:'Regular'} }, p||{}));
}
function scene(){
  return fakeNode({ name:'Card / Checkout', width:340, height:220, fills:[fill('#FFFFFF')] }, [
    textNode('Título', '#11161C', 20, { y:10, fills:[fill('#808080', 'VariableID:2')] }),
    textNode('Descripción muy clara', '#7BA7E0', 14, { y:50 }),
    fakeNode({ type:'INSTANCE', name:'button / icon / close', x:300, y:8, width:16, height:16, fills:[fill('#DCE9F9')],
      reactions:[{ trigger:{ type:'ON_CLICK' } }] }),
    fakeNode({ name:'Foto', x:10, y:90, width:120, height:60, fills:[{ type:'IMAGE', visible:true }] }),
    fakeNode({ name:'button / Pagar', x:10, y:150, width:300, height:48, fills:[fill('#1B4F9C')], fillStyleId:'S:1' },
      [ textNode('Pagar', '#FFFFFF', 16) ])
  ]);
}
function buscar(id){
  var found = null;
  (function walk(n){ if (!n || found) return; if (n.id === id) { found = n; return; } (n.children||[]).forEach(walk); })(selection[0]);
  return found;
}
function mkFrame(){
  var f = { type:'FRAME', name:'', children:[], fills:[], strokes:[], x:0, y:0, width:0, height:0,
    resize:function(w,h){ this.width=w; this.height=h; },
    appendChild:function(c){ this.children.push(c); c.parent=this; },
    insertChild:function(i,c){ this.children.splice(i,0,c); c.parent=this; },
    remove:function(){}, setPluginData:function(){}, getPluginData:function(){ return ''; } };
  created.push(f); return f;
}
var page = { type:'PAGE', name:'Page 1', selection: selection, children: [],
  appendChild:function(c){ this.children.push(c); c.parent = this; },
  findAll:function(fn){ var r=[]; (function walk(n){ (n.children||[]).forEach(function(c){ if(fn(c)) r.push(c); walk(c); }); })({ children: selection }); return r; },
  findOne:function(fn){ return this.findAll(fn)[0] || null; } };
var stub = {
  showUI: function(){}, on: function(){},
  ui: { postMessage: function(m){ out.push(m); }, onmessage: null },
  root: { children: [page] },
  viewport: { scrollAndZoomIntoView: function(){}, bounds:{ x:0, y:0, width:2000, height:2000 } },
  // Lo sincrónico, prohibido
  getNodeById: prohibido('getNodeById'), getStyleById: prohibido('getStyleById'),
  getLocalPaintStyles: prohibido('getLocalPaintStyles'),
  // Lo asincrónico, permitido
  getNodeByIdAsync: function(id){ return Promise.resolve(buscar(id)); },
  getStyleByIdAsync: function(id){ return Promise.resolve(id === 'S:1' ? { id:'S:1', name:'brand/primary' } : null); },
  getLocalPaintStylesAsync: function(){ return Promise.resolve([{ name:'brand/primary', paints:[fill('#1B4F9C')] }]); },
  setCurrentPageAsync: function(p){ return Promise.resolve(); },
  createPage: function(){ var p = mkFrame(); p.type = 'PAGE'; return p; },
  variables: {
    getVariableById: prohibido('variables.getVariableById'),
    getVariableCollectionById: prohibido('variables.getVariableCollectionById'),
    getLocalVariables: prohibido('variables.getLocalVariables'),
    getVariableByIdAsync: function(id){ return Promise.resolve(vars[id] || null); },
    getVariableCollectionByIdAsync: function(id){ return Promise.resolve(cols[id] || null); },
    getLocalVariablesAsync: function(){ return Promise.resolve([vars['VariableID:1'], vars['VariableID:2']]); }
  },
  loadFontAsync: function(){ return Promise.resolve(); },
  createFrame: mkFrame,
  createImage: function(){ return { hash:'h' }; },
  createRectangle: function(){ var r={ type:'RECTANGLE', fills:[], strokes:[], resize:function(w,h){this.width=w;this.height=h;} }; created.push(r); return r; },
  createEllipse: function(){ var r={ type:'ELLIPSE', fills:[], resize:function(w,h){this.width=w;this.height=h;} }; created.push(r); return r; },
  createVector: function(){ var r={ type:'VECTOR', fills:[], strokes:[] }; created.push(r); return r; },
  createPolygon: function(){ var r={ type:'POLYGON', fills:[], resize:function(w,h){this.width=w;this.height=h;} }; created.push(r); return r; },
  createLine: function(){ var l={ type:'LINE', strokes:[], resize:function(w,h){this.width=w;this.height=h;} }; created.push(l); return l; },
  createText: function(){ var t={ type:'TEXT', characters:'', fills:[], fontName:{family:'Inter',style:'Regular'}, width:80, height:16,
    resize:function(w,h){this.width=w;this.height=h;} }; created.push(t); return t; },
  clientStorage: { getAsync:function(){ return Promise.resolve(null); }, setAsync:function(){ return Promise.resolve(); },
    deleteAsync:function(){ return Promise.resolve(); } },
  openExternal: function(){}, notify: function(){}, closePlugin: function(){}
};
Object.defineProperty(stub, 'currentPage', { get: function(){ return page; }, set: prohibido('currentPage setter') });
global.figma = stub;
global.__html__ = '';
require(process.cwd() + '/code.js');
var handler = global.figma.ui.onmessage;

function esperar(){ return new Promise(function(r){ setTimeout(r, 15); }); }
var passed = 0, failed = 0;
async function test(l, f){
  try { out = []; await f(); console.log('  \x1b[32m✓\x1b[0m ' + l); passed++; }
  catch (e) { console.log('  \x1b[31m✕\x1b[0m ' + l + '\n    \x1b[33m→ ' + e.message + '\x1b[0m'); failed++; }
}
function assert(c, m){ if (!c) throw new Error(m || 'assertion failed'); }
async function send(m){ handler(m); await esperar(); await esperar(); }
function errores(){ return out.filter(function(m){ return m.type === 'error' && /dynamic-page|Cannot call/.test(m.message || ''); }); }

(async function(){
  console.log('\n\x1b[1mModo dynamic-page (como el plugin publicado)\x1b[0m');
  selection.push(scene());
  var ids = []; (function walk(n){ ids.push(n.id); (n.children||[]).forEach(walk); })(selection[0]);
  var instancia = selection[0].children[2], texto = selection[0].children[0], foto = selection[0].children[3];

  await test('el manifest pide dynamic-page', async function(){
    var man = JSON.parse(fs.readFileSync(__dirname + '/manifest.json', 'utf8'));
    assert(man.documentAccess === 'dynamic-page', 'falta documentAccess');
  });

  await test('init responde', async function(){
    await send({ type:'init' });
    assert(out.some(function(m){ return m.type === 'wcag-catalogue'; }), 'sin catálogo');
  });

  await test('localizar una capa usa la lectura asincrónica', async function(){
    var sel = null; Object.defineProperty(page, 'selection', { configurable:true, get:function(){ return selection; }, set:function(v){ sel = v; } });
    await send({ type:'select-node', nodeId: texto.id });
    assert(sel && sel[0] === texto, 'no seleccionó la capa');
    assert(!errores().length, errores().map(function(e){ return e.message; }).join(' | '));
  });

  // Todos los mensajes que manda el panel
  var ui = fs.readFileSync(__dirname + '/ui.html', 'utf8');
  var tipos = {}; ui.replace(/post\(\{\s*type:\s*'([a-z0-9-]+)'/g, function(_, t){ tipos[t] = true; });
  var extra = {
    'save-alt': { nodeId: foto.id, alt: 'Foto de prueba' },
    'export-png': { nodeId: foto.id, ref: 'r1', ancho: 160 },
    'paste-alts': { images: [{ nodeId: foto.id, name:'Foto', alt:'Foto de prueba' }] },
    'select-node': { nodeId: texto.id },
    'render-aria': { items: [{ nodeId: instancia.id, name:'close', aria:{ needsLabel:true, role:null, nativo:'<button>' } }] },
    'reaudit-session': { nodeIds: [selection[0].id] },
    'run-category': { category:'contrast' },
    'open-url': { url:'https://example.com' }
  };
  for (var t of Object.keys(tipos).sort()) {
    await test('mensaje "' + t + '" sin errores de dynamic-page', async function(){
      var m = Object.assign({ type: t }, extra[t] || {});
      await send(m);
      var e = errores();
      assert(!e.length, e.map(function(x){ return x.message; }).join(' | '));
      var fatal = out.filter(function(x){ return x.type === 'error' && x.fatal; });
      assert(!fatal.length, 'error fatal: ' + fatal.map(function(x){ return x.message; }).join(' | '));
    });
  }

  await test('la paleta del archivo sale de las variables, con el alias resuelto', async function(){
    await send({ type:'analyze-selection', withTypography:true });
    var e = errores(); assert(!e.length, e.map(function(x){ return x.message; }).join(' | '));
  });

  console.log('\n' + (failed ? '\x1b[31m' + failed + ' fallaron\x1b[0m, ' : '') + passed + (failed ? ' OK' : ' tests OK'));
  process.exit(failed ? 1 : 0);
})();
