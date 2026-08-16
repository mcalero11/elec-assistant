import type { CatalogItem } from './types.js'

/**
 * Item catalog — scoped strictly to what the seed templates reference (PRD risk
 * table). Names are the words used in Salvadoran ferreterías; `synonyms` feed
 * search and the price-research procedure in packages/data/PRICES.md.
 */
export const catalogItems = [
  // Térmicos 2 polos (breaker enchufable tipo CH/BR según panel — precio de referencia BR)
  { id: 'breaker-2p-15', name: { es: 'térmico 2 polos 15 A', en: '2-pole breaker 15 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 15', 'breaker 2x15'] },
  { id: 'breaker-2p-20', name: { es: 'térmico 2 polos 20 A', en: '2-pole breaker 20 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 20', 'breaker 2x20'] },
  { id: 'breaker-2p-25', name: { es: 'térmico 2 polos 25 A', en: '2-pole breaker 25 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 25', 'breaker 2x25'] },
  { id: 'breaker-2p-30', name: { es: 'térmico 2 polos 30 A', en: '2-pole breaker 30 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 30', 'breaker 2x30'] },
  { id: 'breaker-2p-40', name: { es: 'térmico 2 polos 40 A', en: '2-pole breaker 40 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 40', 'breaker 2x40'] },

  // Alambre THHN/THWN-2 cobre (por metro)
  { id: 'thhn-cu-14', name: { es: 'alambre THHN/THWN-2 Cu #14', en: 'THHN/THWN-2 Cu wire #14' }, unit: 'm', category: 'material', synonyms: ['alambre 14', 'cable 14'] },
  { id: 'thhn-cu-12', name: { es: 'alambre THHN/THWN-2 Cu #12', en: 'THHN/THWN-2 Cu wire #12' }, unit: 'm', category: 'material', synonyms: ['alambre 12', 'cable 12'] },
  { id: 'thhn-cu-10', name: { es: 'alambre THHN/THWN-2 Cu #10', en: 'THHN/THWN-2 Cu wire #10' }, unit: 'm', category: 'material', synonyms: ['alambre 10', 'cable 10'] },
  { id: 'thhn-cu-8', name: { es: 'alambre THHN/THWN-2 Cu #8', en: 'THHN/THWN-2 Cu wire #8' }, unit: 'm', category: 'material', synonyms: ['alambre 8', 'cable 8'] },
  { id: 'thhn-cu-6', name: { es: 'alambre THHN/THWN-2 Cu #6', en: 'THHN/THWN-2 Cu wire #6' }, unit: 'm', category: 'material', synonyms: ['alambre 6', 'cable 6'] },

  // Tubería EMT (tramo de 10 pies ≈ 3.05 m)
  { id: 'emt-tube-12', name: { es: 'tubo EMT 1/2" (tramo 10 pies)', en: 'EMT tubing 1/2" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['tubo conduit 1/2', 'emt media'] },
  { id: 'emt-tube-34', name: { es: 'tubo EMT 3/4" (tramo 10 pies)', en: 'EMT tubing 3/4" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['tubo conduit 3/4', 'emt tres cuartos'] },
  { id: 'emt-connector-12', name: { es: 'conector EMT 1/2"', en: 'EMT connector 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'emt-connector-34', name: { es: 'conector EMT 3/4"', en: 'EMT connector 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'emt-coupling-12', name: { es: 'unión EMT 1/2"', en: 'EMT coupling 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['copla emt'] },
  { id: 'emt-coupling-34', name: { es: 'unión EMT 3/4"', en: 'EMT coupling 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['copla emt'] },
  { id: 'emt-elbow-12', name: { es: 'curva EMT 1/2"', en: 'EMT elbow 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['codo emt'] },
  { id: 'emt-elbow-34', name: { es: 'curva EMT 3/4"', en: 'EMT elbow 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['codo emt'] },

  // Tubería PVC eléctrico cédula 40 (tramo de 10 pies)
  { id: 'pvc-tube-12', name: { es: 'tubo PVC eléctrico 1/2" (tramo 10 pies)', en: 'electrical PVC conduit 1/2" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['poliducto rígido', 'conduit pvc'] },
  { id: 'pvc-tube-34', name: { es: 'tubo PVC eléctrico 3/4" (tramo 10 pies)', en: 'electrical PVC conduit 3/4" (10-ft stick)' }, unit: 'tramo-3m', category: 'material' },
  { id: 'pvc-elbow-12', name: { es: 'curva PVC eléctrica 1/2"', en: 'electrical PVC elbow 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['codo pvc'] },
  { id: 'pvc-elbow-34', name: { es: 'curva PVC eléctrica 3/4"', en: 'electrical PVC elbow 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-adapter-12', name: { es: 'adaptador terminal PVC 1/2"', en: 'PVC terminal adapter 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-adapter-34', name: { es: 'adaptador terminal PVC 3/4"', en: 'PVC terminal adapter 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-cement', name: { es: 'pegamento PVC (bote pequeño)', en: 'PVC cement (small can)' }, unit: 'unidad', category: 'material' },

  // Poliducto / LFNC (por metro)
  { id: 'lfnc-12', name: { es: 'manguera flexible eléctrica (poliducto/LFNC) 1/2"', en: 'liquidtight flexible nonmetallic conduit 1/2"' }, unit: 'm', category: 'material', synonyms: ['poliducto', 'manguera negra'] },
  { id: 'lfnc-34', name: { es: 'manguera flexible eléctrica (poliducto/LFNC) 3/4"', en: 'liquidtight flexible nonmetallic conduit 3/4"' }, unit: 'm', category: 'material', synonyms: ['poliducto'] },
  { id: 'lfnc-connector-12', name: { es: 'conector para manguera flexible 1/2"', en: 'LFNC connector 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'lfnc-connector-34', name: { es: 'conector para manguera flexible 3/4"', en: 'LFNC connector 3/4"' }, unit: 'unidad', category: 'material' },

  // Fijación
  { id: 'strap-12', name: { es: 'abrazadera 1/2"', en: 'conduit strap 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['grapa', 'gaza'] },
  { id: 'strap-34', name: { es: 'abrazadera 3/4"', en: 'conduit strap 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['grapa', 'gaza'] },

  // Equipo del circuito de aire
  { id: 'disconnect-60-3r', name: { es: 'desconectador para A/C 60 A NEMA 3R (sin fusibles)', en: 'A/C disconnect 60 A NEMA 3R (non-fused)' }, unit: 'unidad', category: 'material', synonyms: ['caja de seguridad', 'switch de aire'] },
  { id: 'ac-whip-12', name: { es: 'whip para A/C 1/2" × 6 pies (manguera con conectores)', en: 'A/C whip 1/2" × 6 ft (conduit kit with connectors)' }, unit: 'unidad', category: 'material', synonyms: ['whip', 'conexión flexible aire'] },

  // Herramientas
  { id: 'bender-12', name: { es: 'dobladora de tubo EMT 1/2"', en: 'EMT conduit bender 1/2"' }, unit: 'unidad', category: 'herramienta', synonyms: ['grifa'] },
] as const satisfies readonly CatalogItem[]

export type CatalogItemId = (typeof catalogItems)[number]['id']
