// A cladogram's tree, as the teacher types it: taxa (the tips, each a name)
// grouped into clades, each clade with the trait its members share, gained on
// the branch leading into it. The root clade's trait goes on the root stem.
// A taxon can have a trait of its own too, on its branch, like hair on the
// last branch of a vertebrate cladogram. An empty taxon name is drawn as a
// blank line for students.
//
// Editing is done by index path (the root is [], its second child [1], that
// child's first child [1, 0]) with pure functions that return a new tree, so
// they can be tested and undone.

export interface Taxon {
  name: string
  /** a trait only this taxon has; there, even empty, once the teacher adds one */
  trait?: string
}

export interface Clade {
  trait: string
  children: Node[]
}

export type Node = Taxon | Clade
export type Path = number[]

export const MIN_TAXA = 2
export const MAX_TAXA = 16
export const MAX_LABEL = 40
/** Clades inside clades, as deep as a 16-taxon ladder goes. */
const MAX_DEPTH = MAX_TAXA

export const isClade = (n: Node): n is Clade => 'children' in n

export const taxon = (name: string, trait?: string): Taxon => (trait === undefined ? { name } : { name, trait })
export const clade = (trait: string, ...children: Node[]): Clade => ({ trait, children })

/** The tips, left to right (top to bottom when the tips are on the right). */
export function taxaOf(n: Node): Taxon[] {
  return isClade(n) ? n.children.flatMap(taxaOf) : [n]
}

/** Every node with a trait, in the order they're numbered: the root first,
 *  each node before those inside it. */
export function withTraits(n: Node): Node[] {
  const own = n.trait?.trim() ? [n] : []
  return isClade(n) ? [...own, ...n.children.flatMap(withTraits)] : own
}

/** Every clade, the root first, each before the clades inside it, which is
 *  the order nodes are numbered in. */
export function cladesOf(n: Node): Clade[] {
  return isClade(n) ? [n, ...n.children.flatMap(cladesOf)] : []
}

export function nodeAt(root: Clade, path: Path): Node | undefined {
  let n: Node = root
  for (const i of path) {
    if (!isClade(n)) return undefined
    n = n.children[i]
    if (!n) return undefined
  }
  return n
}

const label = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_LABEL) : '')

/** A clade with one member is just that member; one with none is nothing. A
 *  clade's trait passes to its lone member if it has none of its own. */
function collapse(n: Node): Node | undefined {
  if (!isClade(n)) return n
  const children = n.children.map(collapse).filter((c): c is Node => !!c)
  if (children.length === 0) return undefined
  if (children.length === 1) {
    const only = children[0]
    return only.trait?.trim() || !n.trait.trim() ? only : { ...only, trait: n.trait }
  }
  return { trait: n.trait, children }
}

function tidyNode(v: unknown, depth: number, room: { taxa: number }): Node | undefined {
  if (!v || typeof v !== 'object') return undefined
  const raw = v as Record<string, unknown>
  if (Array.isArray(raw.children)) {
    if (depth >= MAX_DEPTH) return undefined
    const children = raw.children.map((c) => tidyNode(c, depth + 1, room)).filter((c): c is Node => !!c)
    return { trait: label(raw.trait), children }
  }
  if (!('name' in raw) || room.taxa <= 0) return undefined
  room.taxa--
  return taxon(label(raw.name), typeof raw.trait === 'string' ? label(raw.trait) : undefined)
}

/** A valid tree from anything stored or linked, or undefined if it holds
 *  fewer than two taxa. Unusable nodes and taxa past the sixteenth are
 *  dropped, and clades left with one member collapse into it. */
export function tidyTree(v: unknown): Clade | undefined {
  const tidied = collapse(tidyNode(v, 0, { taxa: MAX_TAXA }) ?? { trait: '', children: [] })
  if (!tidied || !isClade(tidied) || taxaOf(tidied).length < MIN_TAXA) return undefined
  return tidied
}

/** A copy of the tree with the node at `path` replaced by what `change`
 *  makes of it (nothing removes it), then tidied. */
function edit(root: Clade, path: Path, change: (n: Node) => Node | undefined): Clade {
  const at = (n: Node, rest: Path): Node | undefined => {
    if (!rest.length) return change(n)
    if (!isClade(n)) return n
    const [i, ...more] = rest
    const children = n.children.map((c, j) => (j === i ? at(c, more) : c)).filter((c): c is Node => !!c)
    return { trait: n.trait, children }
  }
  const next = collapse(at(structuredClone(root), path) ?? root)
  return next && isClade(next) && taxaOf(next).length >= MIN_TAXA ? next : root
}

const full = (root: Clade) => taxaOf(root).length >= MAX_TAXA

/** A new, unnamed taxon at the end of the clade at `path`. */
export function addTaxon(root: Clade, path: Path): Clade {
  if (full(root)) return root
  return edit(root, path, (n) => (isClade(n) ? { ...n, children: [...n.children, taxon('')] } : n))
}

/** The taxon at `path` and a new, unnamed one, grouped as a clade. */
export function pairTaxon(root: Clade, path: Path): Clade {
  if (full(root)) return root
  return edit(root, path, (n) => (isClade(n) ? n : clade('', n, taxon(''))))
}

/** The node at `path` and everything in it, gone. The root can't go, and
 *  nothing is removed that would leave fewer than two taxa. */
export function removeNode(root: Clade, path: Path): Clade {
  if (!path.length) return root
  return edit(root, path, () => undefined)
}

/** The node at `path` swapped with its sibling `by` places along. */
export function moveNode(root: Clade, path: Path, by: number): Clade {
  if (!path.length) return root
  const parentPath = path.slice(0, -1)
  const i = path[path.length - 1]
  return edit(root, parentPath, (n) => {
    if (!isClade(n)) return n
    const j = i + by
    if (j < 0 || j >= n.children.length) return n
    const children = [...n.children]
    ;[children[i], children[j]] = [children[j], children[i]]
    return { ...n, children }
  })
}

/** The clade at `path` dissolved: its members join its parent in its place,
 *  and its trait goes. */
export function ungroup(root: Clade, path: Path): Clade {
  if (!path.length) return root
  const parentPath = path.slice(0, -1)
  const i = path[path.length - 1]
  return edit(root, parentPath, (n) => {
    if (!isClade(n)) return n
    const child = n.children[i]
    if (!child || !isClade(child)) return n
    return { ...n, children: [...n.children.slice(0, i), ...child.children, ...n.children.slice(i + 1)] }
  })
}

/** What the editor's buttons do to a node. */
export type Edit = 'addTaxon' | 'pair' | 'remove' | 'up' | 'down' | 'ungroup' | 'addTrait'

/** The tree after one of the editor's buttons is pressed on the node at `path`. */
export function applyEdit(root: Clade, kind: Edit, path: Path): Clade {
  switch (kind) {
    case 'addTaxon':
      return addTaxon(root, path)
    case 'pair':
      return pairTaxon(root, path)
    case 'remove':
      return removeNode(root, path)
    case 'up':
      return moveNode(root, path, -1)
    case 'down':
      return moveNode(root, path, 1)
    case 'ungroup':
      return ungroup(root, path)
    case 'addTrait':
      return edit(root, path, (n) => (isClade(n) || n.trait !== undefined ? n : { ...n, trait: '' }))
  }
}

/** The tree with the name or trait of the node at `path` changed. */
export function setText(root: Clade, path: Path, field: 'name' | 'trait', text: string): Clade {
  return edit(root, path, (n) => (field === 'name' && isClade(n) ? n : { ...n, [field]: text.slice(0, MAX_LABEL) }))
}

/** A ladder (comb) tree, the classic school cladogram: the first taxon
 *  branches off first, and each trait is gained before the next taxon
 *  branches off. `traits[i]` is shared by taxa[i] and every taxon after it,
 *  so `traits[0]` is on the root stem. */
export function ladder(taxa: string[], traits: string[]): Clade {
  const build = (i: number): Node =>
    i === taxa.length - 1 ? taxon(taxa[i], traits[i] || undefined) : clade(traits[i] ?? '', taxon(taxa[i]), build(i + 1))
  return build(0) as Clade
}
