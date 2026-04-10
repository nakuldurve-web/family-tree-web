'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';

const Tree = dynamic(
  () => import('react-d3-tree').then((m) => ({ default: m.Tree })),
  { ssr: false }
);

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Person {
  id: string;
  full_name: string;
  parent_id: string | null;
  tooltip: string;
  image_url: string;
}

interface Spouse {
  id: string;
  full_name: string;
  person_id: string;
  image_url: string;
}

interface Link {
  id: number;
  person_id: string;
  url: string;
  description: string;
  display_html: string;
}

interface Props {
  people: Person[];
  spouses: Spouse[];
  links: Link[];
}

// ─── Generation color palette ─────────────────────────────────────────────────

const GEN_COLORS = [
  { border: '#7c3aed', bg: '#f5f3ff', text: '#4c1d95', label: 'Generation 1' },
  { border: '#2563eb', bg: '#eff6ff', text: '#1e3a8a', label: 'Generation 2' },
  { border: '#0891b2', bg: '#ecfeff', text: '#164e63', label: 'Generation 3' },
  { border: '#059669', bg: '#ecfdf5', text: '#064e3b', label: 'Generation 4' },
  { border: '#d97706', bg: '#fffbeb', text: '#78350f', label: 'Generation 5' },
  { border: '#e11d48', bg: '#fff1f2', text: '#881337', label: 'Generation 6' },
];

function getGenColor(gen: number) {
  return GEN_COLORS[Math.max(0, gen) % GEN_COLORS.length];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyNSIgZmlsbD0iI2U1ZDRiNCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iMjAiIHI9IjkiIGZpbGw9IiNhMzZhMjAiLz48cGF0aCBkPSJNOCA0NGMwLTkuOTQgNy42Mi0xOCAxNy0xOHMxNyA4LjA2IDE3IDE4IiBmaWxsPSIjYTM2YTIwIi8+PC9zdmc+';

const NODE_WIDTH = 200;
const NODE_HEIGHT_BASE = 90;
const NODE_HEIGHT_SPOUSE = 140;
const SEARCH_ZOOM = 1.2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isGenNode = (id: string) => /^Generation_\d+$/i.test(id);

/**
 * Compute generation number (0-indexed) purely from tree depth.
 * Roots (no parent, or parent is a Generation_X placeholder) = 0.
 * Each level of children adds 1. Ignores the tooltip field entirely.
 */
function computeGenerations(people: Person[]): Map<string, number> {
  const visible = people.filter((p) => !isGenNode(p.id));
  const visibleIds = new Set(visible.map((p) => p.id));

  // Build children map
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];

  for (const p of visible) {
    const parentIsVisible = p.parent_id && visibleIds.has(p.parent_id);
    if (parentIsVisible) {
      const arr = childrenOf.get(p.parent_id!) ?? [];
      arr.push(p.id);
      childrenOf.set(p.parent_id!, arr);
    } else {
      roots.push(p.id);
    }
  }

  // BFS from roots
  const genMap = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({ id, depth: 0 }));
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    genMap.set(id, depth);
    for (const childId of childrenOf.get(id) ?? []) {
      queue.push({ id: childId, depth: depth + 1 });
    }
  }

  return genMap;
}

// ─── Tree data builder ────────────────────────────────────────────────────────

interface TreeNode extends RawNodeDatum {
  attributes: { personId: string; generation: number; hasSpouse: boolean; highlighted: boolean };
  children?: TreeNode[];
}

function buildTreeData(
  people: Person[],
  spouseMap: Map<string, Spouse>,
  genMap: Map<string, number>,
  highlightedId: string | null
): TreeNode[] {
  // Exclude Generation_X placeholder nodes
  const visible = people.filter((p) => !isGenNode(p.id));
  const visibleIds = new Set(visible.map((p) => p.id));
  const nodeMap = new Map<string, TreeNode>();

  for (const p of visible) {
    nodeMap.set(p.id, {
      name: p.full_name,
      attributes: {
        personId: p.id,
        generation: genMap.get(p.id) ?? 0,
        hasSpouse: spouseMap.has(p.id),
        highlighted: p.id === highlightedId,
      },
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const p of visible) {
    const node = nodeMap.get(p.id)!;
    // Attach to parent if parent is a visible approved person
    if (p.parent_id && visibleIds.has(p.parent_id)) {
      nodeMap.get(p.parent_id)?.children?.push(node);
    } else {
      // Parent is a Generation node, null, or not approved → root
      roots.push(node);
    }
  }

  if (roots.length === 0) return [];
  if (roots.length === 1) return [roots[0]];

  // Wrap multiple roots in a hidden virtual root
  return [
    {
      name: 'Family',
      attributes: { personId: '__root__', generation: -1, hasSpouse: false, highlighted: false },
      children: roots,
    },
  ];
}

// ─── CSS keyframes (injected once) ────────────────────────────────────────────

const GLOBAL_STYLES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes highlightPulse {
    0%, 100% { box-shadow: 0 0 0 3px #f59e0b, 0 0 20px 6px #f59e0baa; }
    50%       { box-shadow: 0 0 0 5px #f59e0b, 0 0 32px 12px #f59e0b88; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function FamilyTree({ people, spouses, links }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 60 });
  const [search, setSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Stores the tree-space position of the highlighted node (set during renderNode)
  const highlightedPosRef = useRef<{ x: number; y: number } | null>(null);

  const INITIAL_ZOOM = 0.5;

  const spouseMap = new Map(spouses.map((s) => [s.person_id, s]));
  const linksMap = new Map<string, Link[]>();
  for (const link of links) {
    const arr = linksMap.get(link.person_id) ?? [];
    arr.push(link);
    linksMap.set(link.person_id, arr);
  }

  const genMap = computeGenerations(people);
  const treeData = buildTreeData(people, spouseMap, genMap, highlightedId);

  // Which generations are actually present (for legend)
  const presentGenerations = new Set<number>();
  for (const p of people) {
    if (!isGenNode(p.id)) {
      const g = genMap.get(p.id);
      if (g !== undefined) presentGenerations.add(g % GEN_COLORS.length);
    }
  }

  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      setTranslate({ x: containerRef.current.clientWidth / 2, y: 60 });
    }
  }, []);

  // Pan & zoom to highlighted node whenever highlightedId changes
  useEffect(() => {
    if (!highlightedId || !containerRef.current) return;
    // Give react-d3-tree one frame to render and populate highlightedPosRef
    const timer = setTimeout(() => {
      const pos = highlightedPosRef.current;
      if (!pos) return;
      const cw = containerRef.current!.clientWidth;
      const ch = containerRef.current!.clientHeight;
      setZoom(SEARCH_ZOOM);
      setTranslate({
        x: cw / 2 - pos.x * SEARCH_ZOOM,
        y: ch / 2 - pos.y * SEARCH_ZOOM,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  function handleReset() {
    setZoom(INITIAL_ZOOM);
    setTranslate({ x: (containerRef.current?.clientWidth ?? 800) / 2, y: 60 });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) { setHighlightedId(null); return; }
    const match = people.find(
      (p) => !isGenNode(p.id) && (
        p.full_name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      )
    );
    if (match) {
      highlightedPosRef.current = null; // clear stale position
      setHighlightedId(match.id);
    } else {
      setHighlightedId(null);
      alert(`No person found matching "${search}"`);
    }
  }

  // ── Custom node renderer ──────────────────────────────────────────────────

  function renderNode({ nodeDatum, toggleNode, hierarchyPointNode }: CustomNodeElementProps): JSX.Element {
    const personId = (nodeDatum.attributes?.personId as string) ?? '';

    // Virtual root — invisible connector
    if (personId === '__root__') {
      return (
        <g>
          <circle r={1} fill="transparent" stroke="transparent" onClick={toggleNode} style={{ cursor: 'pointer' }} />
        </g>
      );
    }

    const generation = (nodeDatum.attributes?.generation as number) ?? 0;
    const colors = getGenColor(generation);
    const spouse = spouseMap.get(personId);
    const nodeHeight = spouse ? NODE_HEIGHT_SPOUSE : NODE_HEIGHT_BASE;
    const isHighlighted = (nodeDatum.attributes?.highlighted as boolean) ?? false;

    // Capture position of highlighted node for centering
    if (isHighlighted && hierarchyPointNode) {
      highlightedPosRef.current = { x: hierarchyPointNode.x, y: hierarchyPointNode.y };
    }

    // Collapsed indicator — node has children but they are hidden
    const rd3t = (nodeDatum as unknown as { __rd3t?: { collapsed?: boolean } }).__rd3t;
    const isCollapsed = !!(rd3t?.collapsed);
    const childCount = nodeDatum.children?.length ?? 0;
    const hasHiddenChildren = isCollapsed && childCount > 0;

    const person = people.find((p) => p.id === personId);
    const personImg = person?.image_url?.trim() ? person.image_url : PLACEHOLDER;
    const spouseImg = spouse?.image_url?.trim() ? spouse.image_url : PLACEHOLDER;

    return (
      <g>
        <foreignObject
          x={-NODE_WIDTH / 2}
          y={-nodeHeight / 2}
          width={NODE_WIDTH}
          height={nodeHeight + (hasHiddenChildren ? 30 : 10)}
          style={{ overflow: 'visible' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${NODE_WIDTH}px` }}>
            {/* Main card */}
            <div
              onClick={toggleNode}
              style={{
                background: isHighlighted ? '#fef3c7' : colors.bg,
                border: isHighlighted ? '2px solid #f59e0b' : `1px solid ${colors.border}`,
                borderLeft: isHighlighted ? '5px solid #f59e0b' : `4px solid ${colors.border}`,
                borderRadius: '10px',
                padding: '8px 10px 8px 12px',
                width: `${NODE_WIDTH}px`,
                boxSizing: 'border-box',
                cursor: 'pointer',
                fontFamily: 'system-ui, sans-serif',
                position: 'relative',
                animation: isHighlighted ? 'highlightPulse 1.4s ease-in-out infinite' : 'none',
                boxShadow: isHighlighted
                  ? '0 0 0 3px #f59e0b, 0 0 20px 6px #f59e0baa'
                  : '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              {/* "Found" badge for highlighted node */}
              {isHighlighted && (
                <div style={{
                  position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                  background: '#f59e0b', color: 'white', fontSize: '9px', fontWeight: 800,
                  padding: '2px 8px', borderRadius: '99px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}>
                  ★ Found
                </div>
              )}

              {/* Gen badge */}
              <div style={{
                position: 'absolute', top: '5px', right: '8px',
                fontSize: '9px', fontWeight: 700, color: isHighlighted ? '#92400e' : colors.border,
                letterSpacing: '0.05em', textTransform: 'uppercase', opacity: 0.8,
              }}>
                {colors.label}
              </div>

              {/* Person */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={personImg}
                  alt={nodeDatum.name}
                  width={40} height={40}
                  style={{
                    borderRadius: '50%', objectFit: 'cover',
                    border: isHighlighted ? '2px solid #f59e0b' : `2px solid ${colors.border}`,
                    flexShrink: 0,
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                />
                <span style={{
                  fontWeight: 700, fontSize: '12px',
                  color: isHighlighted ? '#78350f' : colors.text,
                  wordBreak: 'break-word', lineHeight: 1.3,
                }}>
                  {nodeDatum.name}
                </span>
              </div>

              {/* Spouse */}
              {spouse && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '6px', borderTop: `1px dashed ${isHighlighted ? '#f59e0b88' : colors.border + '66'}` }}>
                  <span style={{ fontSize: '13px', color: '#e11d48', flexShrink: 0 }}>♥</span>
                  <img
                    src={spouseImg}
                    alt={spouse.full_name}
                    width={32} height={32}
                    style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #e11d48', flexShrink: 0 }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                  />
                  <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#be185d', wordBreak: 'break-word', lineHeight: 1.3 }}>
                    {spouse.full_name}
                  </span>
                </div>
              )}
            </div>

            {/* Collapsed children badge */}
            {hasHiddenChildren && (
              <div
                onClick={toggleNode}
                style={{
                  marginTop: '4px',
                  background: colors.border,
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '99px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  letterSpacing: '0.03em',
                }}
              >
                <span style={{ fontSize: '8px' }}>▼</span>
                {childCount} {childCount === 1 ? 'child' : 'children'} hidden
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  }

  // ── Legend ────────────────────────────────────────────────────────────────

  const legendItems = GEN_COLORS.filter((_, i) => presentGenerations.has(i));

  return (
    <div className="w-full">
      {/* Inject global keyframes */}
      <style>{GLOBAL_STYLES}</style>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="flex-1 border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400"
        />
        <button type="submit" className="bg-accent-600 hover:bg-accent-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
          Find
        </button>
        {highlightedId && (
          <button type="button" onClick={() => { setHighlightedId(null); setSearch(''); }} className="text-sm text-tan-400 hover:text-tan-600 px-2">
            ✕
          </button>
        )}
      </form>

      {/* Tree container */}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-tan-200 bg-white shadow-sm overflow-hidden"
        style={{ height: '80vh', minHeight: '500px', position: 'relative' }}
      >
        {/* Spinner */}
        {!mounted && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', zIndex: 10 }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ marginLeft: 12, fontSize: 14, color: '#94a3b8' }}>Loading tree…</span>
          </div>
        )}

        {/* Zoom controls */}
        {mounted && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: '+', action: () => setZoom((z) => Math.min(z + 0.15, 3)) },
              { label: '−', action: () => setZoom((z) => Math.max(z - 0.15, 0.05)) },
              { label: '⌂', action: handleReset },
            ].map(({ label, action }) => (
              <button key={label} onClick={action}
                title={label === '⌂' ? 'Reset view' : label === '+' ? 'Zoom in' : 'Zoom out'}
                style={{ width: 32, height: 32, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: label === '⌂' ? 16 : 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: '#374151' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        {mounted && legendItems.length > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minWidth: 140 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 6 }}>
              Generations
            </div>
            {legendItems.map((g, i) => (
              <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < legendItems.length - 1 ? 5 : 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: g.bg, border: `2px solid ${g.border}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: g.text, fontWeight: 600 }}>{g.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tree */}
        {mounted && treeData.length > 0 && (
          <Tree
            data={treeData[0]}
            orientation="vertical"
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 220, y: 200 }}
            separation={{ siblings: 1.1, nonSiblings: 1.5 }}
            zoom={zoom}
            translate={translate}
            onUpdate={({ zoom: z, translate: t }) => {
              setZoom(z as number);
              setTranslate(t as { x: number; y: number });
            }}
            pathFunc="step"
            enableLegacyTransitions={false}
          />
        )}

        {/* Empty state */}
        {mounted && people.filter((p) => !isGenNode(p.id)).length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: 48, marginBottom: 12 }}>🌳</span>
            <p style={{ margin: 0 }}>No family members yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
