'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

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

declare global {
  interface Window {
    google: {
      charts: {
        load: (version: string, opts: Record<string, unknown>) => void;
        setOnLoadCallback: (cb: () => void) => void;
      };
      visualization: {
        OrgChart: new (el: HTMLElement) => {
          draw: (data: unknown, opts: unknown) => void;
        };
        DataTable: new () => {
          addColumn: (type: string, label: string) => void;
          addRows: (rows: unknown[]) => void;
        };
      };
    };
  }
}

// Build the HTML cell for one person node (matches tree13.py format)
function buildNodeHtml(person: Person, spouseMap: Map<string, Spouse>, linksMap: Map<string, Link[]>): string {
  const spouse = spouseMap.get(person.id);
  const personLinks = linksMap.get(person.id) ?? [];

  const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyNSIgZmlsbD0iI2U1ZDRiNCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iMjAiIHI9IjkiIGZpbGw9IiNhMzZhMjAiLz48cGF0aCBkPSJNOCA0NGMwLTkuOTQgNy42Mi0xOCAxNy0xOHMxNyA4LjA2IDE3IDE4IiBmaWxsPSIjYTM2YTIwIi8+PC9zdmc+';

  function imgTag(url: string, alt: string, color: string): string {
    const src = url && url.trim() ? url : PLACEHOLDER;
    return `<img src="${src}" alt="${alt}" style="width:50px;height:50px;border-radius:50%;border:2px solid ${color};object-fit:cover;vertical-align:middle;" onerror="this.src='${PLACEHOLDER}'" />`;
  }

  // Build links HTML for person
  let linksHtml = '';
  if (personLinks.length > 0) {
    const linkItems = personLinks
      .map((l) => {
        const label = l.display_html || l.description || l.url;
        return `<a href="${l.url}" target="_blank" style="color:#1a56db;font-size:11px;display:block;margin-top:2px;">${label}</a>`;
      })
      .join('');
    linksHtml = `<div style="margin-top:4px;">${linkItems}</div>`;
  }

  const personBlock = `
    <div style="display:inline-block;text-align:center;vertical-align:top;padding:4px;">
      ${imgTag(person.image_url, person.full_name, '#1a6dc4')}
      <div style="color:#1a4a8a;font-weight:bold;font-size:12px;max-width:90px;word-wrap:break-word;margin-top:4px;">${person.full_name}</div>
      ${linksHtml}
    </div>`;

  if (!spouse) {
    return personBlock;
  }

  const spouseBlock = `
    <div style="display:inline-block;text-align:center;vertical-align:top;padding:4px;">
      ${imgTag(spouse.image_url, spouse.full_name, '#c41a1a')}
      <div style="color:#8a1a1a;font-weight:bold;font-size:12px;max-width:90px;word-wrap:break-word;margin-top:4px;">${spouse.full_name}</div>
    </div>`;

  return `<div style="white-space:nowrap;">${personBlock}<span style="font-size:18px;vertical-align:middle;margin:0 2px;">❤️</span>${spouseBlock}</div>`;
}

export default function FamilyTree({ people, spouses, links }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Build lookup maps
  const spouseMap = new Map(spouses.map((s) => [s.person_id, s]));
  const linksMap = new Map<string, Link[]>();
  for (const link of links) {
    const arr = linksMap.get(link.person_id) ?? [];
    arr.push(link);
    linksMap.set(link.person_id, arr);
  }

  const drawChart = useCallback(() => {
    if (!chartRef.current || !window.google?.visualization) return;
    try {
      const data = new window.google.visualization.DataTable();
      data.addColumn('string', 'Name');
      data.addColumn('string', 'Manager');
      data.addColumn('string', 'Tooltip');

      const rows: [{ v: string; f: string }, string, string][] = [];

      for (const person of people) {
        const nodeHtml = buildNodeHtml(person, spouseMap, linksMap);
        const tooltip = person.tooltip || person.full_name;
        const parent = person.parent_id ?? '';
        rows.push([{ v: person.id, f: nodeHtml }, parent, tooltip]);
      }

      data.addRows(rows);

      const chart = new window.google.visualization.OrgChart(chartRef.current);
      chart.draw(data, {
        allowHtml: true,
        allowCollapse: true,
        size: 'medium',
        nodeClass: 'family-tree-node',
        selectedNodeClass: 'family-tree-node-selected',
      });
    } catch (e) {
      setError(String(e));
    }
  }, [people, spouseMap, linksMap]);

  // When Google Charts is ready, draw
  useEffect(() => {
    if (!googleReady) return;
    if (people.length === 0) return;
    drawChart();
  }, [googleReady, drawChart, people]);

  // Handle script load — init google.charts
  function handleScriptLoad() {
    setScriptLoaded(true);
    if (window.google?.charts) {
      window.google.charts.load('current', { packages: ['orgchart'] });
      window.google.charts.setOnLoadCallback(() => setGoogleReady(true));
    }
  }

  // If script was already loaded (e.g. hot reload), fire manually
  useEffect(() => {
    if (scriptLoaded && window.google?.charts) {
      window.google.charts.load('current', { packages: ['orgchart'] });
      window.google.charts.setOnLoadCallback(() => setGoogleReady(true));
    }
  }, [scriptLoaded]);

  // Search highlight: scroll to and highlight the matching person node
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) { setHighlightId(null); return; }
    const term = search.trim().toLowerCase();
    const match = people.find(
      (p) =>
        p.id.toLowerCase().includes(term) ||
        p.full_name.toLowerCase().includes(term)
    );
    if (match) {
      setHighlightId(match.id);
      // Try to find the rendered node and scroll to it
      if (chartRef.current) {
        // Google OrgChart renders each node with the data value as an attribute on the td
        const cells = chartRef.current.querySelectorAll('td.google-visualization-orgchart-node');
        cells.forEach((cell) => {
          const inner = cell.querySelector('[data-row]');
          if (inner) return;
          // fall back: check text content
        });
        // Simpler: find the first element whose text contains the name
        const allNodes = chartRef.current.querySelectorAll('.google-visualization-orgchart-node');
        for (const node of Array.from(allNodes)) {
          if (node.textContent?.toLowerCase().includes(term)) {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (node as HTMLElement).style.boxShadow = '0 0 0 3px #e3ad4e';
            setTimeout(() => {
              (node as HTMLElement).style.boxShadow = '';
            }, 3000);
            break;
          }
        }
      }
    } else {
      setHighlightId(null);
      alert(`No person found matching "${search}"`);
    }
  }

  return (
    <div className="w-full">
      <Script
        src="https://www.gstatic.com/charts/loader.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />

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
        {highlightId && (
          <button
            type="button"
            onClick={() => { setHighlightId(null); setSearch(''); }}
            className="text-sm text-tan-500 hover:text-tan-700 px-2"
          >
            ✕
          </button>
        )}
      </form>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          Chart error: {error}
        </div>
      )}

      {/* Loading state */}
      {!googleReady && (
        <div className="flex items-center justify-center py-20 text-tan-500">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-tan-200 border-t-tan-600 mr-3" />
          <span className="text-sm">Loading chart…</span>
        </div>
      )}

      {/* Chart container */}
      <div
        className="w-full overflow-x-auto rounded-xl border border-tan-200 bg-white shadow-sm"
        style={{ minHeight: googleReady ? undefined : '0px' }}
      >
        <div
          ref={chartRef}
          className="p-4"
          style={{ display: googleReady ? 'block' : 'none' }}
        />
      </div>

      {people.length === 0 && googleReady && (
        <div className="text-center py-16 text-tan-500">
          <span className="text-4xl block mb-3">🌳</span>
          <p>No family members in the database yet.</p>
          <p className="text-sm mt-1">
            Run the import script or add people via the Admin panel.
          </p>
        </div>
      )}
    </div>
  );
}
