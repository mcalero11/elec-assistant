import type { CatalogItem } from './types.js'

/**
 * Item catalog — scoped strictly to what the seed templates reference (PRD risk
 * table). Names are the words used in Salvadoran ferreterías; `synonyms` feed
 * search and the price-research procedure in packages/data/PRICES.md.
 */
export const catalogItems = [
  // Térmicos 2 polos (breaker enchufable tipo CH/BR según panel — precio de referencia BR)
  // Stranded conductors landing on a mini-split terminal block: a ferrule keeps
  // strands from splaying under the screw. Sold locally as «punteras».
  { id: 'puntera-cable', name: { es: 'punteras (terminales tubulares) para cable', en: 'wire ferrules' }, unit: 'unidad', category: 'material', synonyms: ['puntera', 'terminal tubular', 'terminal de aguja', 'ferrule'] },
  { id: 'breaker-2p-15', name: { es: 'térmico 2 polos 15 A', en: '2-pole breaker 15 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 15', 'breaker 2x15'] },
  { id: 'breaker-2p-20', name: { es: 'térmico 2 polos 20 A', en: '2-pole breaker 20 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 20', 'breaker 2x20'] },
  { id: 'breaker-2p-25', name: { es: 'térmico 2 polos 25 A', en: '2-pole breaker 25 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 25', 'breaker 2x25'] },
  { id: 'breaker-2p-30', name: { es: 'térmico 2 polos 30 A', en: '2-pole breaker 30 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 30', 'breaker 2x30'] },
  { id: 'breaker-2p-35', name: { es: 'térmico 2 polos 35 A', en: '2-pole breaker 35 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 35', 'breaker 2x35'] },
  { id: 'breaker-2p-40', name: { es: 'térmico 2 polos 40 A', en: '2-pole breaker 40 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 40', 'breaker 2x40'] },
  { id: 'breaker-2p-45', name: { es: 'térmico 2 polos 45 A', en: '2-pole breaker 45 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 45', 'breaker 2x45'] },
  { id: 'breaker-2p-50', name: { es: 'térmico 2 polos 50 A', en: '2-pole breaker 50 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 50', 'breaker 2x50'] },
  { id: 'breaker-2p-60', name: { es: 'térmico 2 polos 60 A', en: '2-pole breaker 60 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón doble 60', 'breaker 2x60'] },

  // Térmicos 1 polo
  { id: 'breaker-1p-15', name: { es: 'térmico 1 polo 15 A', en: '1-pole breaker 15 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón 15', 'breaker 1x15'] },
  { id: 'breaker-1p-20', name: { es: 'térmico 1 polo 20 A', en: '1-pole breaker 20 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón 20', 'breaker 1x20'] },
  { id: 'breaker-1p-30', name: { es: 'térmico 1 polo 30 A', en: '1-pole breaker 30 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón 30', 'breaker 1x30'] },
  { id: 'breaker-1p-40', name: { es: 'térmico 1 polo 40 A', en: '1-pole breaker 40 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón 40', 'breaker 1x40'] },
  { id: 'breaker-1p-50', name: { es: 'térmico 1 polo 50 A', en: '1-pole breaker 50 A' }, unit: 'unidad', category: 'material', synonyms: ['flipón 50', 'breaker 1x50'] },

  // Térmicos GFCI (protección de falla a tierra — exigidos en baños/exteriores, 210.8)
  { id: 'breaker-1p-gfci-30', name: { es: 'térmico GFCI 1 polo 30 A', en: '1-pole GFCI breaker 30 A' }, unit: 'unidad', category: 'material', synonyms: ['breaker gfci 30', 'interruptor de falla a tierra 30'] },
  { id: 'breaker-1p-gfci-40', name: { es: 'térmico GFCI 1 polo 40 A', en: '1-pole GFCI breaker 40 A' }, unit: 'unidad', category: 'material', synonyms: ['breaker gfci 40', 'interruptor de falla a tierra 40'] },
  { id: 'breaker-2p-gfci-40', name: { es: 'térmico GFCI 2 polos 40 A', en: '2-pole GFCI breaker 40 A' }, unit: 'unidad', category: 'material', synonyms: ['breaker gfci doble 40'] },
  { id: 'breaker-2p-gfci-30', name: { es: 'térmico GFCI 2 polos 30 A', en: '2-pole GFCI breaker 30 A' }, unit: 'unidad', category: 'material', synonyms: ['breaker gfci doble 30'] },
  { id: 'breaker-2p-gfci-50', name: { es: 'térmico GFCI 2 polos 50 A', en: '2-pole GFCI breaker 50 A' }, unit: 'unidad', category: 'material', synonyms: ['breaker gfci doble 50'] },

  // Tomacorrientes 240 V y caja
  { id: 'receptacle-nema-14-30', name: { es: 'tomacorriente NEMA 14-30 (secadora, 30 A)', en: 'NEMA 14-30 receptacle (dryer, 30 A)' }, unit: 'unidad', category: 'material', synonyms: ['toma de secadora', 'tomacorriente 30 amperios'] },
  { id: 'receptacle-nema-14-50', name: { es: 'tomacorriente NEMA 14-50 (estufa, 50 A)', en: 'NEMA 14-50 receptacle (range, 50 A)' }, unit: 'unidad', category: 'material', synonyms: ['toma de estufa', 'tomacorriente 50 amperios'] },
  { id: 'box-2x4-deep', name: { es: 'caja rectangular profunda 2×4 (para toma 240 V)', en: 'deep 2×4 device box (for 240 V receptacle)' }, unit: 'unidad', category: 'material', synonyms: ['caja profunda', 'caja de toma'] },

  // Dispositivos de circuito ramal (tomas, apagadores, luminarias)
  { id: 'duplex-receptacle', name: { es: 'tomacorriente doble polarizado 15 A', en: 'duplex receptacle 15 A' }, unit: 'unidad', category: 'material', synonyms: ['toma doble', 'tomacorriente'] },
  { id: 'duplex-gfci', name: { es: 'tomacorriente GFCI doble 15 A', en: 'GFCI duplex receptacle 15 A' }, unit: 'unidad', category: 'material', synonyms: ['toma gfci', 'tomacorriente de baño'] },
  { id: 'plate-duplex', name: { es: 'placa para tomacorriente doble', en: 'duplex receptacle plate' }, unit: 'unidad', category: 'material', synonyms: ['tapa de toma', 'placa'] },
  { id: 'switch-simple', name: { es: 'apagador sencillo', en: 'single-pole switch' }, unit: 'unidad', category: 'material', synonyms: ['interruptor de luz', 'switch'] },
  { id: 'plate-switch', name: { es: 'placa para apagador', en: 'switch plate' }, unit: 'unidad', category: 'material', synonyms: ['tapa de apagador'] },
  { id: 'lampholder', name: { es: 'plafonera (portalámparas)', en: 'lampholder' }, unit: 'unidad', category: 'material', synonyms: ['plafón', 'rosetón', 'socket de foco'] },
  { id: 'box-2x4-metal', name: { es: 'caja rectangular 2×4 metálica', en: '2×4 metal device box' }, unit: 'unidad', category: 'material', synonyms: ['caja de apagador', 'caja rectangular'] },
  { id: 'box-2x4-pvc', name: { es: 'caja rectangular 2×4 termoplástica', en: '2×4 thermoplastic device box' }, unit: 'unidad', category: 'material', synonyms: ['caja plástica de toma'] },
  { id: 'box-octagonal-metal', name: { es: 'caja octagonal metálica', en: 'octagonal metal box' }, unit: 'unidad', category: 'material', synonyms: ['caja de techo'] },
  { id: 'box-octagonal-pvc', name: { es: 'caja octagonal termoplástica', en: 'octagonal thermoplastic box' }, unit: 'unidad', category: 'material', synonyms: ['caja de techo plástica'] },

  // Alambre THHN/THWN-2 cobre (por metro)
  { id: 'thhn-cu-14', name: { es: 'alambre THHN/THWN-2 Cu #14', en: 'THHN/THWN-2 Cu wire #14' }, unit: 'm', category: 'material', synonyms: ['alambre 14', 'cable 14'] },
  { id: 'thhn-cu-12', name: { es: 'alambre THHN/THWN-2 Cu #12', en: 'THHN/THWN-2 Cu wire #12' }, unit: 'm', category: 'material', synonyms: ['alambre 12', 'cable 12'] },
  { id: 'thhn-cu-10', name: { es: 'alambre THHN/THWN-2 Cu #10', en: 'THHN/THWN-2 Cu wire #10' }, unit: 'm', category: 'material', synonyms: ['alambre 10', 'cable 10'] },
  { id: 'thhn-cu-8', name: { es: 'alambre THHN/THWN-2 Cu #8', en: 'THHN/THWN-2 Cu wire #8' }, unit: 'm', category: 'material', synonyms: ['alambre 8', 'cable 8'] },
  { id: 'thhn-cu-6', name: { es: 'alambre THHN/THWN-2 Cu #6', en: 'THHN/THWN-2 Cu wire #6' }, unit: 'm', category: 'material', synonyms: ['alambre 6', 'cable 6'] },
  { id: 'thhn-cu-4', name: { es: 'alambre THHN/THWN-2 Cu #4', en: 'THHN/THWN-2 Cu wire #4' }, unit: 'm', category: 'material', synonyms: ['alambre 4', 'cable 4'] },

  // Alambre de aluminio (alimentadores — más barato en recorridos largos)
  { id: 'wire-al-8', name: { es: 'alambre THWN-2/XHHW-2 Al #8', en: 'THWN-2/XHHW-2 Al wire #8' }, unit: 'm', category: 'material', synonyms: ['aluminio 8'] },
  { id: 'wire-al-6', name: { es: 'alambre THWN-2/XHHW-2 Al #6', en: 'THWN-2/XHHW-2 Al wire #6' }, unit: 'm', category: 'material', synonyms: ['aluminio 6'] },
  { id: 'wire-al-4', name: { es: 'alambre THWN-2/XHHW-2 Al #4', en: 'THWN-2/XHHW-2 Al wire #4' }, unit: 'm', category: 'material', synonyms: ['aluminio 4'] },
  { id: 'wire-al-3', name: { es: 'alambre THWN-2/XHHW-2 Al #3', en: 'THWN-2/XHHW-2 Al wire #3' }, unit: 'm', category: 'material', synonyms: ['aluminio 3'] },
  { id: 'wire-al-2', name: { es: 'alambre THWN-2/XHHW-2 Al #2', en: 'THWN-2/XHHW-2 Al wire #2' }, unit: 'm', category: 'material', synonyms: ['aluminio 2'] },
  { id: 'wire-cu-bare-6', name: { es: 'alambre de cobre desnudo #6', en: 'bare copper wire #6' }, unit: 'm', category: 'material', synonyms: ['cobre desnudo', 'alambre de tierra desnudo'] },

  // Tubería EMT (tramo de 10 pies ≈ 3.05 m)
  { id: 'emt-tube-12', name: { es: 'tubo EMT 1/2" (tramo 10 pies)', en: 'EMT tubing 1/2" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['tubo conduit 1/2', 'emt media'] },
  { id: 'emt-tube-34', name: { es: 'tubo EMT 3/4" (tramo 10 pies)', en: 'EMT tubing 3/4" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['tubo conduit 3/4', 'emt tres cuartos'] },
  { id: 'emt-connector-12', name: { es: 'conector EMT 1/2"', en: 'EMT connector 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'emt-connector-34', name: { es: 'conector EMT 3/4"', en: 'EMT connector 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'emt-coupling-12', name: { es: 'unión EMT 1/2"', en: 'EMT coupling 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['copla emt'] },
  { id: 'emt-coupling-34', name: { es: 'unión EMT 3/4"', en: 'EMT coupling 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['copla emt'] },
  { id: 'emt-elbow-12', name: { es: 'curva EMT 1/2"', en: 'EMT elbow 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['codo emt'] },
  { id: 'emt-elbow-34', name: { es: 'curva EMT 3/4"', en: 'EMT elbow 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['codo emt'] },
  { id: 'emt-tube-1', name: { es: 'tubo EMT 1" (tramo 10 pies)', en: 'EMT tubing 1" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['tubo conduit 1'] },
  { id: 'emt-connector-1', name: { es: 'conector EMT 1"', en: 'EMT connector 1"' }, unit: 'unidad', category: 'material' },
  { id: 'emt-coupling-1', name: { es: 'unión EMT 1"', en: 'EMT coupling 1"' }, unit: 'unidad', category: 'material', synonyms: ['copla emt'] },
  { id: 'emt-elbow-1', name: { es: 'curva EMT 1"', en: 'EMT elbow 1"' }, unit: 'unidad', category: 'material', synonyms: ['codo emt'] },

  // Tubería PVC eléctrico cédula 40 (tramo de 10 pies)
  { id: 'pvc-tube-12', name: { es: 'tubo PVC eléctrico 1/2" (tramo 10 pies)', en: 'electrical PVC conduit 1/2" (10-ft stick)' }, unit: 'tramo-3m', category: 'material', synonyms: ['poliducto rígido', 'conduit pvc'] },
  { id: 'pvc-tube-34', name: { es: 'tubo PVC eléctrico 3/4" (tramo 10 pies)', en: 'electrical PVC conduit 3/4" (10-ft stick)' }, unit: 'tramo-3m', category: 'material' },
  { id: 'pvc-elbow-12', name: { es: 'curva PVC eléctrica 1/2"', en: 'electrical PVC elbow 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['codo pvc'] },
  { id: 'pvc-elbow-34', name: { es: 'curva PVC eléctrica 3/4"', en: 'electrical PVC elbow 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-adapter-12', name: { es: 'adaptador terminal PVC 1/2"', en: 'PVC terminal adapter 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-adapter-34', name: { es: 'adaptador terminal PVC 3/4"', en: 'PVC terminal adapter 3/4"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-cement', name: { es: 'pegamento PVC (bote pequeño)', en: 'PVC cement (small can)' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-tube-1', name: { es: 'tubo PVC eléctrico 1" (tramo 10 pies)', en: 'electrical PVC conduit 1" (10-ft stick)' }, unit: 'tramo-3m', category: 'material' },
  { id: 'pvc-elbow-1', name: { es: 'curva PVC eléctrica 1"', en: 'electrical PVC elbow 1"' }, unit: 'unidad', category: 'material' },
  { id: 'pvc-adapter-1', name: { es: 'adaptador terminal PVC 1"', en: 'PVC terminal adapter 1"' }, unit: 'unidad', category: 'material' },

  // Poliducto / LFNC (por metro)
  { id: 'lfnc-12', name: { es: 'manguera flexible eléctrica (poliducto/LFNC) 1/2"', en: 'liquidtight flexible nonmetallic conduit 1/2"' }, unit: 'm', category: 'material', synonyms: ['poliducto', 'manguera negra'] },
  { id: 'lfnc-34', name: { es: 'manguera flexible eléctrica (poliducto/LFNC) 3/4"', en: 'liquidtight flexible nonmetallic conduit 3/4"' }, unit: 'm', category: 'material', synonyms: ['poliducto'] },
  { id: 'lfnc-connector-12', name: { es: 'conector para manguera flexible 1/2"', en: 'LFNC connector 1/2"' }, unit: 'unidad', category: 'material' },
  { id: 'lfnc-connector-34', name: { es: 'conector para manguera flexible 3/4"', en: 'LFNC connector 3/4"' }, unit: 'unidad', category: 'material' },

  // Fijación
  { id: 'strap-12', name: { es: 'abrazadera 1/2"', en: 'conduit strap 1/2"' }, unit: 'unidad', category: 'material', synonyms: ['grapa', 'gaza'] },
  { id: 'strap-34', name: { es: 'abrazadera 3/4"', en: 'conduit strap 3/4"' }, unit: 'unidad', category: 'material', synonyms: ['grapa', 'gaza'] },
  { id: 'strap-1', name: { es: 'abrazadera 1"', en: 'conduit strap 1"' }, unit: 'unidad', category: 'material', synonyms: ['grapa', 'gaza'] },

  // Equipo del circuito de aire. Local practice (verified 2026-08-17): dedicated
  // pull-out A/C disconnects are not sold here — a small NEMA 3R «caja térmica»
  // (2-space breaker enclosure) next to the unit serves as the disconnecting means.
  // Pre-made whips are also not sold; the flexible connection is assembled on site
  // from poliducto + wire (see the template's whip rule).
  { id: 'disconnect-60-3r', name: { es: 'caja térmica NEMA 3R 2 espacios (desconectador junto al A/C)', en: 'NEMA 3R 2-space enclosure (A/C disconnecting means)' }, unit: 'unidad', category: 'material', synonyms: ['caja de seguridad', 'switch de aire', 'caja térmica intemperie'] },

  // Alimentador a construcción separada (subpanel + electrodos)
  { id: 'loadcenter-4', name: { es: 'centro de carga 4 espacios (con barra de tierra)', en: '4-space load center (with ground bar)' }, unit: 'unidad', category: 'material', synonyms: ['subpanel 4', 'caja de térmicos'] },
  { id: 'loadcenter-8', name: { es: 'centro de carga 8 espacios (con barra de tierra)', en: '8-space load center (with ground bar)' }, unit: 'unidad', category: 'material', synonyms: ['subpanel 8', 'caja de térmicos'] },
  { id: 'ground-rod-58', name: { es: 'varilla de tierra 5/8" × 8 pies (copperweld)', en: 'ground rod 5/8" × 8 ft (copperweld)' }, unit: 'unidad', category: 'material', synonyms: ['varilla copperweld', 'electrodo de tierra'] },
  { id: 'rod-clamp-58', name: { es: 'abrazadera para varilla de tierra 5/8"', en: 'ground rod clamp 5/8"' }, unit: 'unidad', category: 'material', synonyms: ['conector de varilla'] },

  // Herramientas
  { id: 'bender-12', name: { es: 'dobladora de tubo EMT 1/2"', en: 'EMT conduit bender 1/2"' }, unit: 'unidad', category: 'herramienta', synonyms: ['grifa'] },
] as const satisfies readonly CatalogItem[]

export type CatalogItemId = (typeof catalogItems)[number]['id']
