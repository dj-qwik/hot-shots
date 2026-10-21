// Lists identifiers the simulation (createSim body in dist/sim.cjs) uses but never declares.
// Anything on the SIM path must be a JS built-in or an injected fx name; draw-only names are browser globals.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const acornPath = process.env.ACORN || '/tmp/claude-0/c8ee53b7-c64a-5cfb-bb2f-f968ff870525/scratchpad/gh/acorn/acorn/src/index.js'
const { parse } = await import(acornPath)
const src = fs.readFileSync(path.join(here, '..', 'dist', 'sim.cjs'), 'utf8')
const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script' })
const fn = ast.body.find((n) => n.type === 'FunctionDeclaration' && n.id.name === 'createSim')
const declared = new Set(), used = new Map()
for (const n of ast.body) {
  if (n.type === 'FunctionDeclaration') declared.add(n.id.name)
  if (n.type === 'VariableDeclaration') n.declarations.forEach((d) => d.id.type === 'Identifier' && declared.add(d.id.name))
}
function pat(p) {
  if (!p) return
  if (p.type === 'Identifier') declared.add(p.name)
  else if (p.type === 'ObjectPattern') p.properties.forEach((q) => pat(q.type === 'RestElement' ? q.argument : q.value))
  else if (p.type === 'ArrayPattern') p.elements.forEach(pat)
  else if (p.type === 'AssignmentPattern') pat(p.left)
  else if (p.type === 'RestElement') pat(p.argument)
}
// Identifiers inside a property/method named draw*/cam* are browser-only (the server never draws).
function walk(node, parent, key, inDraw) {
  if (!node || typeof node.type !== 'string') return
  const named = (node.type === 'Property' || node.type === 'MethodDefinition') && node.key && /^(draw|cam)/.test(node.key.name || '')
  const d = inDraw || named
  if (node.type === 'VariableDeclarator') pat(node.id)
  if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name)
  if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name)
  if (/Function/.test(node.type)) node.params.forEach(pat)
  if (node.type === 'CatchClause') pat(node.param)
  if (node.type === 'Identifier') {
    const isProp = (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
      (parent?.type === 'Property' && key === 'key' && !parent.computed) || (parent?.type === 'MethodDefinition' && key === 'key')
    if (!isProp) { const u = used.get(node.name) || { sim: 0, draw: 0 }; u[d ? 'draw' : 'sim']++; used.set(node.name, u) }
  }
  for (const k of Object.keys(node)) {
    const v = node[k]
    if (Array.isArray(v)) v.forEach((c) => walk(c, node, k, d))
    else if (v && typeof v.type === 'string') walk(v, node, k, d)
  }
}
walk(fn.body, null, null, false)
const BUILTIN = new Set(['Math', 'Object', 'Array', 'Number', 'String', 'Boolean', 'Map', 'Set', 'WeakMap', 'JSON', 'Error', 'Infinity', 'NaN', 'undefined', 'isFinite', 'isNaN', 'parseInt', 'parseFloat', 'Proxy', 'Symbol', 'Float64Array', 'Uint32Array', 'Uint8Array', 'Uint16Array', 'Int8Array', 'BigInt', 'setTimeout', 'clearTimeout', 'console', 'arguments', 'globalThis'])
const free = [...used].filter(([n]) => !declared.has(n) && !BUILTIN.has(n)).sort((a, b) => b[1].sim - a[1].sim)
console.log('SIM-PATH free names (must be injected fx, or only used by helpers that draw):')
console.log(free.filter(([, u]) => u.sim).map(([n, u]) => `  ${n} (outside draw ${u.sim}, in draw ${u.draw})`).join('\n') || '  none')
console.log('DRAW-ONLY free names (browser globals):', free.filter(([, u]) => !u.sim).map(([n]) => n).join(' '))
// Drawing must never consume the simulation's random stream (browsers would desync from the server).
const rngInDraw = []
;(function scan(node, inDraw, where) {
  if (!node || typeof node.type !== 'string') return
  const named = (node.type === 'Property' || node.type === 'MethodDefinition') && node.key && /^(draw|cam)/.test(node.key.name || '')
  const d = inDraw || named
  if (d && node.type === 'CallExpression' && node.callee.type === 'Identifier' && /^(rnd|RNG|shuffleWith|makeBean)$/.test(node.callee.name)) {
    const line = src.slice(0, node.start).split('\n').length
    rngInDraw.push(`${node.callee.name} @ sim.cjs:${line}  ${src.split('\n')[line - 1].trim().slice(0, 110)}`)
  }
  for (const k of Object.keys(node)) { const v = node[k]; if (Array.isArray(v)) v.forEach((c) => scan(c, d)); else if (v && typeof v.type === 'string') scan(v, d) }
})(fn.body, false)
console.log(rngInDraw.length ? 'SIM RANDOMNESS USED WHILE DRAWING (must fix):\n  ' + rngInDraw.join('\n  ') : 'no simulation randomness used while drawing ✓')
