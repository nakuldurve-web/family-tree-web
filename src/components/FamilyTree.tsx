'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';

// Dynamically import Tree to avoid SSR issues
const Tree = dynamic(
  () => import('react-d3-tree').then((m) => ({ default: m.Tree })),
  { ssr: false }
);

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

// ─── Generation color palette ────────────────────────────────────────────────

const GEN_COLORS = [
  { border: '#7c3d12', bg: '#fef3c7', text: '#78350f', label: 'Generation 1' },
  { border: '#b45309', bg: '#fff7ed', text: '#92400e', label: 'Generation 2' },
  { border: '#15803d', bg: '#f0fdf4', text: '#14532d', label: 'Generation 3' },
  { border: '#0369a1', bg: '#f0f9ff', text: '#0c4a6e', label: 'Generation 4' },
  { border: '#6d28d9', bg: '#f5f3ff', text: '#4c1d95', label: 'Generation 5' },
  { border: '#be185d', bg: '#fdf2f8', text: '#9d174d', label: 'Generation 6' },
];

function getGenColor(depth: number) {
  return GEN_COLORS[depth % GEN_COLORS.length];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyNSIgZmlsbD0iI2U1ZDRiNCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iMjAiIHI9IjkiIGZpbGw9IiNhMzZhMjAiLz48cGF0aCBkPSJNOCA0NGMwLTkuOTQgNy42Mi0xOCAxNy0xOHMxNyA4LjA2IDE3IDE4IiBmaWxsPSIjYTM2YTIwIi8+PC9zdmc+';

const NODE_WIDTH = 200;
const NODE_HEIGHT_BASE = 90;   // no spouse
const NODE_HEIGHT_SPOUSE = 140; // with spouse

// ─── Tree data builder ───────────────────────────────────────────────────────

interface TreeNode extends RawNodeDatum {
  attributes: { personId: string; hasSpouse?: boolean };
  children?: TreeNode[];
}

function buildTreeData(people: Person[], spouseMap: Map<string, Spouse>): TreeNode[] {
  const approvedIds = new Set(people.map((p) => p.id));
  const nodeMap = new Map<string, TreeNode>();

  // Create nodes
  for (const p of people) {
    nodeMap.set(p.id, {
      name: p.full_name,
      attributes: {
        personId: p.id,
        hasSpouse: spouseMap.has(p.id),
      },
      children: [],
    });
  }

  const roots: TreeNode[] = [];

  // Wire up parent/child relationships
  for (const p of people) {
    const node = nodeMap.get(p.id)!;
    if (p.parent_id && approvedIds.has(p.parent_id)) {
      const parent = nodeMap.get(p.parent_id);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // If multiple roots, wrap in virtual root
  if (roots.length > 1) {
    return [
      {
        name: 'Family',
        attributes: { personId: '__root__' },
        children: roots,
      },
    ];
  }

  return roots.length === 1 ? [roots[0]] : [];
}

// ─── Collect depths present in tree ─────────────────────────────────────────

function collectDepths(nodes: TreeNode[], depth = 0, result = new Set<number>()): Set<number> {
  for (const node of nodes) {
    if (node.attributes?.personId !== '__root__') {
      result.add(depth);
    }
    if (node.children && node.children.length > 0) {
      collectDepths(node.children as TreeNode[], depth + 1, result);
    }
  }
  return result;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function FamilyTree({ people, spouses, links }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(0.6);
  const [translate, setTranslate] = useState({ x: 0, y: 60 });
  const [search, setSearch] = useState('');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const INITIAL_ZOOM = 0.6;

  // Build lookup maps
  const spouseMap = new Map(spouses.map((s) => [s.person_id, s]));
  const linksMap = new Map<string, Link[]>();
  for (const link of links) {
    const arr = linksMap.get(link.person_id) ?? [];
    arr.push(link);
    linksMap.set(link.person_id, arr);
  }

  const treeData = buildTreeData(people, spouseMap);

  // Determine which generations are present (relative to virtual root offset)
  const hasVirtualRoot =
    treeData.length === 1 && treeData[0].attributes?.personId === '__root__';
  const depthsRaw = collectDepths(treeData);
  // If virtual root, depths in raw tree start at 1 for gen 1; shift down
  const presentGenerations = new Set<number>();
  depthsRaw.forEach((d) => {
    presentGenerations.add(hasVirtualRoot ? d - 1 : d);
  });

  // Set initial translate to center of container
  useEffect(() => {
    setMounted(true);
    if (containerRef.current) {
      const w = containerRef.current.clientWidth || 800;
      setTranslate({ x: w / 2, y: 60 });
    }
  }, []);

  // Reset handler
  function handleReset() {
    setZoom(INITIAL_ZOOM);
    const w = containerRef.current?.clientWidth ?? 800;
    setTranslate({ x: w / 2, y: 60 });
  }

  // Search handler
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) {
      setHighlightedId(null);
      return;
    }
    const match = people.find(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
    );
    if (match) {
      setHighlightedId(match.id);
    } else {
      setHighlightedId(null);
      alert(`No person found matching "${search}"`);
    }
  }

  // ── Custom node renderer ────────────────────────────────────────────────────
  function renderNode({ nodeDatum, toggleNode }: CustomNodeElementProps): JSX.Element {
    const personId = (nodeDatum.attributes?.personId as string) ?? '';
    const rawDepth: number = (nodeDatum as unknown as { __rd3t?: { depth?: number } }).__rd3t?.depth ?? 0;

    // Virtual root: render invisible anchor
    if (personId === '__root__') {
      return (
        <g>
          <circle r={1} fill="transparent" stroke="transparent" onClick={toggleNode} style={{ cursor: 'pointer' }} />
        </g>
      );
    }

    // Visual depth: subtract 1 if there's a virtual root
    const depth = hasVirtualRoot ? rawDepth - 1 : rawDepth;
    const colors = getGenColor(Math.max(0, depth));

    const spouse = spouseMap.get(personId);
    const nodeHeight = spouse ? NODE_HEIGHT_SPOUSE : NODE_HEIGHT_BASE;
    const isHighlighted = highlightedId === personId;

    const person = people.find((p) => p.id === personId);
    const personImg = person?.image_url?.trim() ? person.image_url : PLACEHOLDER;
    const spouseImg = spouse?.image_url?.trim() ? spouse.image_url : PLACEHOLDER;

    // foreignObject for HTML-based node
    return (
      <g>
        <foreignObject
          x={-NODE_WIDTH / 2}
          y={-nodeHeight / 2}
          width={NODE_WIDTH}
          height={nodeHeight + 10}
          style={{ overflow: 'visible' }}
        >
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore – xmlns required for foreignObject in SVG */}
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            onClick={toggleNode}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${colors.border}`,
              borderRadius: '10px',
              padding: '8px 10px 8px 12px',
              width: `${NODE_WIDTH}px`,
              boxSizing: 'border-box',
              cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
              position: 'relative',
              boxShadow: isHighlighted
                ? `0 0 0 3px ${colors.border}, 0 0 16px 4px ${colors.border}88`
                : '0 1px 4px rgba(0,0,0,0.12)',
            }}
          >
            {/* Gen badge */}
            <div
              style={{
                position: 'absolute',
                top: '5px',
                right: '8px',
                fontSize: '9px',
                fontWeight: 700,
                color: colors.border,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                opacity: 0.8,
              }}
            >
              {GEN_COLORS[Math.max(0, depth) % GEN_COLORS.length].label}
            </div>

            {/* Person row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={personImg}
                alt={nodeDatum.name}
                width={40}
                height={40}
                style={{
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: `2px solid ${colors.border}`,
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '12px',
                  color: colors.text,
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                }}
              >
                {nodeDatum.name}
              </span>
            </div>

            {/* Spouse row */}
            {spouse && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  paddingTop: '6px',
                  borderTop: `1px dashed ${colors.border}66`,
                }}
              >
                <span style={{ fontSize: '13px', color: '#e11d48', flexShrink: 0 }}>♥</span>
                <img
                  src={spouseImg}
                  alt={spouse.full_name}
                  width={32}
                  height={32}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #e11d48',
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    fontStyle: 'italic',
                    color: '#be185d',
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                  }}
                >
                  {spouse.full_name}
                </span>
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  }

  // ── Legend ──────────────────────────────────────────────────────────────────
  const legendItems = GEN_COLORS.filter((_, i) => presentGenerations.has(i));

  return (
    <div className="w-full">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID…"
          className="flex-1 border border-tan-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tan-400"
        />
        <button
          type="submit"
          className="bg-tan-700 hover:bg-tan-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Find
        </button>
        {highlightedId && (
          <button
            type="button"
            onClick={() => {
              setHighlightedId(null);
              setSearch('');
            }}
            className="text-sm text-tan-500 hover:text-tan-700 px-2"
          >
            ✕
          </button>
        )}
      </form>

      {/* Tree container */}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-tan-200 bg-white shadow-sm overflow-hidden"
        style={{ height: '75vh', minHeight: '500px', position: 'relative' }}
      >
        {/* Loading spinner */}
        {!mounted && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #b45309',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#9ca3af' }}>
              Loading tree…
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Zoom controls (top-left) */}
        {mounted && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {[
              { label: '+', action: () => setZoom((z) => Math.min(z + 0.1, 3)) },
              { label: '−', action: () => setZoom((z) => Math.max(z - 0.1, 0.1)) },
              { label: '⌂', action: handleReset },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                title={label === '⌂' ? 'Reset view' : label === '+' ? 'Zoom in' : 'Zoom out'}
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: label === '⌂' ? '16px' : '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  color: '#374151',
                  lineHeight: 1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Generation legend (top-right) */}
        {mounted && legendItems.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 20,
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
              minWidth: '140px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6b7280',
                marginBottom: '6px',
              }}
            >
              Generations
            </div>
            {legendItems.map((g, i) => {
              // Find which generation index this is
              const genIndex = GEN_COLORS.indexOf(g);
              if (!presentGenerations.has(genIndex)) return null;
              return (
                <div
                  key={g.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i < legendItems.length - 1 ? '5px' : 0 }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      background: g.bg,
                      border: `2px solid ${g.border}`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '11px', color: g.text, fontWeight: 600 }}>
                    {g.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* react-d3-tree */}
        {mounted && treeData.length > 0 && (
          <Tree
            data={treeData[0]}
            orientation="vertical"
            renderCustomNodeElement={renderNode}
            nodeSize={{ x: 220, y: 180 }}
            separation={{ siblings: 1.1, nonSiblings: 1.5 }}
            initialDepth={3}
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
        {mounted && people.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            <span style={{ fontSize: '48px', marginBottom: '12px' }}>🌳</span>
            <p style={{ margin: 0 }}>No family members in the database yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
              Run the import script or add people via the Admin panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
