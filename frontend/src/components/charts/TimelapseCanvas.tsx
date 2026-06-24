import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { FileNode } from '../../types';
import { useVisualizerStore } from '../../state/store';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Search } from 'lucide-react';

interface TimelapseCanvasProps {
  tree: FileNode | null;
}

interface VisualNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'file' | 'directory';
  lines: number;
  file_type: string;
  parentPath?: string;
  isNew?: boolean;
  isModified?: boolean;
  prevLines?: number;
}

interface VisualLink extends d3.SimulationLinkDatum<VisualNode> {
  source: string | VisualNode;
  target: string | VisualNode;
}

// Harmonious colors for different file categories
const getFileTypeColor = (type: string): string => {
  const ext = type.toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return '#3b82f6'; // Indigo/Blue
  if (['py'].includes(ext)) return '#10b981'; // Emerald
  if (['html', 'css', 'scss'].includes(ext)) return '#a855f7'; // Purple
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '#f59e0b'; // Amber
  if (['md', 'txt'].includes(ext)) return '#64748b'; // Slate
  return '#14b8a6'; // Teal fallback
};

// Flatten nested FileNode structure
const flattenTree = (node: FileNode, parentPath = ""): { nodes: VisualNode[]; links: VisualLink[] } => {
  const nodes: VisualNode[] = [];
  const links: VisualLink[] = [];
  const currentPath = node.path;

  if (currentPath !== "") {
    nodes.push({
      id: currentPath,
      name: node.name,
      type: node.type,
      lines: node.lines || 0,
      file_type: node.file_type || "",
      parentPath: parentPath || undefined,
    });

    if (parentPath !== "") {
      links.push({
        source: parentPath,
        target: currentPath,
      });
    }
  }

  if (node.children) {
    node.children.forEach(child => {
      const flattened = flattenTree(child, currentPath);
      nodes.push(...flattened.nodes);
      links.push(...flattened.links);
    });
  }

  return { nodes, links };
};

export const TimelapseCanvas: React.FC<TimelapseCanvasProps> = ({ tree }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isLoadingSnapshot } = useVisualizerStore();

  const simulationRef = useRef<d3.Simulation<VisualNode, VisualLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Structural Group Refs
  const mainGroupRef = useRef<d3.Selection<SVGGElement, unknown, d3.BaseType, unknown> | null>(null);
  const linkGroupRef = useRef<d3.Selection<SVGGElement, unknown, d3.BaseType, unknown> | null>(null);
  const nodeGroupRef = useRef<d3.Selection<SVGGElement, unknown, d3.BaseType, unknown> | null>(null);
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, null, d3.BaseType, unknown> | null>(null);

  // Persistent nodes & links caches to preserve physics engine states
  const nodesRef = useRef<VisualNode[]>([]);
  const linksRef = useRef<VisualLink[]>([]);

  // 1. Mount Phase - Structural Setup
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean start

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Zoom setup
    const mainGroup = svg.append('g').attr('class', 'main-group');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
      });
    
    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial center camera
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));

    // Append child container groups
    linkGroupRef.current = mainGroup.append('g').attr('class', 'links-container');
    nodeGroupRef.current = mainGroup.append('g').attr('class', 'nodes-container');
    mainGroupRef.current = mainGroup;

    // Create persistent tooltip in DOM body
    tooltipRef.current = d3.select('body')
      .selectAll<HTMLDivElement, null>('.visualizer-tooltip')
      .data([null])
      .join('div')
      .attr('class', 'visualizer-tooltip absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded px-2.5 py-1.5 shadow-xl pointer-events-none z-50 font-sans leading-relaxed');

    // Create D3 Force simulation
    const simulation = d3.forceSimulation<VisualNode, VisualLink>([])
      .force('link', d3.forceLink<VisualNode, VisualLink>([])
        .id(d => d.id)
        .distance(d => (d.source as VisualNode).type === 'directory' ? 40 : 25)
      )
      .force('charge', d3.forceManyBody<VisualNode>().strength(d => d.type === 'directory' ? -150 : -45))
      .force('collision', d3.forceCollide<VisualNode>().radius(d => d.type === 'directory' ? 14 : Math.sqrt(d.lines || 1) * 0.8 + 6))
      .force('center', d3.forceCenter(0, 0).strength(0.04));

    // Simulation Tick Listener
    simulation.on('tick', () => {
      const lGroup = linkGroupRef.current;
      const nGroup = nodeGroupRef.current;

      if (lGroup) {
        lGroup.selectAll<SVGLineElement, VisualLink>('line')
          .attr('x1', d => (d.source as VisualNode).x ?? 0)
          .attr('y1', d => (d.source as VisualNode).y ?? 0)
          .attr('x2', d => (d.target as VisualNode).x ?? 0)
          .attr('y2', d => (d.target as VisualNode).y ?? 0);
      }

      if (nGroup) {
        nGroup.selectAll<SVGGElement, VisualNode>('.node-group')
          .attr('transform', d => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
      }
    });

    simulationRef.current = simulation;

    // Cleanup on unmount
    return () => {
      simulation.stop();
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, []);

  // 2. Update Phase - Node & Link Enter/Update/Exit cycle
  useEffect(() => {
    if (!tree || !simulationRef.current || !linkGroupRef.current || !nodeGroupRef.current) return;

    // Flatten new tree layout
    const { nodes: newNodes, links: newLinks } = flattenTree(tree);

    // Map existing nodes to copy coordinates and calculate deltas
    const currentNodes = nodesRef.current;
    const currentNodesMap = new Map(currentNodes.map(n => [n.id, n]));

    const updatedNodes: VisualNode[] = newNodes.map(n => {
      const existing = currentNodesMap.get(n.id);
      if (existing) {
        // Carry over physics coordinates to maintain layout stability
        existing.isNew = false;
        if (existing.lines !== n.lines) {
          existing.isModified = true;
          existing.prevLines = existing.lines;
          existing.lines = n.lines;
        } else {
          existing.isModified = false;
        }
        return existing;
      } else {
        // Sprout entering nodes from parent coordinates
        n.isNew = true;
        n.isModified = false;
        if (n.parentPath) {
          const parentNode = currentNodesMap.get(n.parentPath);
          if (parentNode) {
            n.x = parentNode.x;
            n.y = parentNode.y;
          }
        }
        return n;
      }
    });

    // Save nodes ref
    nodesRef.current = updatedNodes;

    // Map links
    linksRef.current = newLinks.map(l => ({
      source: l.source,
      target: l.target
    }));

    // Update Simulation Ingests
    const simulation = simulationRef.current;
    simulation.nodes(nodesRef.current);
    
    const linkForce = simulation.force('link') as d3.ForceLink<VisualNode, VisualLink>;
    if (linkForce) {
      linkForce.links(linksRef.current);
    }

    // --- Link rendering ---
    const link = linkGroupRef.current.selectAll<SVGLineElement, VisualLink>('line')
      .data(linksRef.current, d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return `${sourceId}-${targetId}`;
      });

    // EXIT Link
    link.exit()
      .transition()
      .duration(400)
      .attr('stroke-opacity', 0)
      .remove();

    // ENTER Link
    const linkEnter = link.enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0);

    linkEnter.transition()
      .duration(600)
      .attr('stroke-opacity', 0.4);

    // Merge selections
    const allLinks = linkEnter.merge(link);

    // --- Node rendering ---
    const node = nodeGroupRef.current.selectAll<SVGGElement, VisualNode>('.node-group')
      .data(nodesRef.current, d => d.id);

    // EXIT Node (Fade out and shrink circles, fade out text labels)
    const nodeExit = node.exit<SVGGElement>();
    
    nodeExit.select('circle')
      .transition()
      .duration(500)
      .attr('r', 0)
      .attr('stroke', '#ef4444') // flash red on delete
      .attr('stroke-width', 3)
      .attr('opacity', 0);

    nodeExit.select('text')
      .transition()
      .duration(400)
      .attr('opacity', 0);

    nodeExit.transition()
      .duration(550)
      .remove();

    // ENTER Node
    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node-group')
      .call(d3.drag<SVGGElement, VisualNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Base circle for new nodes (radius starts at 0, opacity 0, flashes green border)
    nodeEnter.append('circle')
      .attr('r', 0)
      .attr('opacity', 0)
      .attr('fill', d => d.type === 'directory' ? '#475569' : getFileTypeColor(d.file_type))
      .attr('stroke', '#10b981') // flash green on create
      .attr('stroke-width', 3)
      .attr('class', 'cursor-pointer transition-all hover:scale-125')
      .on('mouseover', (_, d) => {
        if (tooltipRef.current) {
          tooltipRef.current.classed('hidden', false)
            .html(`
              <div class="font-bold text-slate-200">${d.name}</div>
              <div class="text-slate-400 text-[10px] break-all max-w-[250px]">${d.id}</div>
              <div class="mt-1 flex items-center justify-between">
                <span class="capitalize text-slate-400 font-semibold">${d.type}</span>
                ${d.type === 'file' ? `<span class="bg-blue-900 text-blue-300 font-mono rounded px-1">${d.lines} lines</span>` : ''}
              </div>
            `);
        }
      })
      .on('mousemove', (event) => {
        if (tooltipRef.current) {
          tooltipRef.current.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 25) + 'px');
        }
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) {
          tooltipRef.current.classed('hidden', true);
        }
      });

    // Animate Circle Entry size & ease out green flash
    nodeEnter.select('circle')
      .transition()
      .duration(700)
      .attr('r', d => d.type === 'directory' ? 8 : Math.sqrt(d.lines || 1) * 0.8 + 4)
      .attr('opacity', 1)
      .transition()
      .duration(1200)
      .attr('stroke', d => d.type === 'directory' ? '#94a3b8' : '#0b0f19')
      .attr('stroke-width', d => d.type === 'directory' ? 1.5 : 1);

    // Directory labels for entering folders
    nodeEnter.filter(d => d.type === 'directory')
      .append('text')
      .attr('dy', -12)
      .attr('text-anchor', 'middle')
      .text(d => d.name)
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .attr('opacity', 0)
      .attr('class', 'select-none pointer-events-none shadow-sm')
      .transition()
      .duration(700)
      .attr('opacity', 1);

    // Merge selections
    const allNodes = nodeEnter.merge(node);

    // UPDATE Node states (LOC size changes)
    node.select('circle')
      .transition()
      .duration(600)
      .attr('r', d => d.type === 'directory' ? 8 : Math.sqrt(d.lines || 1) * 0.8 + 4)
      .attr('fill', d => d.type === 'directory' ? '#475569' : getFileTypeColor(d.file_type));

    // Flash modified nodes blue
    node.filter(d => d.isModified === true)
      .select('circle')
      .attr('stroke', '#3b82f6') // flash blue on modify
      .attr('stroke-width', 3.5)
      .transition()
      .duration(1500)
      .attr('stroke', d => d.type === 'directory' ? '#94a3b8' : '#0b0f19')
      .attr('stroke-width', d => d.type === 'directory' ? 1.5 : 1);

    // Handle search queries
    if (searchTerm) {
      allNodes.selectAll<SVGCircleElement, VisualNode>('circle')
        .attr('opacity', d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.15);
      allLinks.attr('stroke-opacity', 0.05);
    } else {
      allNodes.selectAll<SVGCircleElement, VisualNode>('circle').attr('opacity', 1);
      allLinks.attr('stroke-opacity', 0.4);
    }

    // Restart simulation with target alpha so it relaxes gracefully to the additions
    simulation.alpha(0.2).restart();

    // Drag helper utilities
    function dragstarted(event: d3.D3DragEvent<SVGGElement, VisualNode, VisualNode>, d: VisualNode) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, VisualNode, VisualNode>, d: VisualNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, VisualNode, VisualNode>, d: VisualNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [tree, searchTerm]);

  // Zoom Toolbar handlers
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    svg.transition().duration(250).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
    );
  };

  return (
    <div className="relative w-full h-full bg-[#0b0f19] rounded-xl border border-darkBorder flex flex-col overflow-hidden" ref={containerRef}>
      {/* Top toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-4 pointer-events-none">
        {/* Search */}
        <div className="flex items-center bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg px-3 py-1.5 w-64 pointer-events-auto">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search files..."
            className="bg-transparent border-none outline-none text-xs text-slate-100 placeholder-slate-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-lg p-1 pointer-events-auto shadow-md">
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-600 self-center"></div>
          <button
            onClick={handleResetZoom}
            className="p-1 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* D3 Canvas */}
      {tree ? (
        <svg ref={svgRef} className="w-full flex-grow block outline-none select-none bg-radial-dots" />
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <p className="text-sm">Calculating repository nodes...</p>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingSnapshot && tree && (
        <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Legend overlay bottom left */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 text-[10px] text-slate-300 p-2.5 rounded-lg flex flex-col gap-1.5 shadow-md">
        <div className="font-semibold text-slate-400 mb-1 border-b border-slate-800 pb-1">Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
          <span>JavaScript / TypeScript</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
          <span>Python</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]"></span>
          <span>HTML / CSS / Sass</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
          <span>JSON / YAML / Config</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#475569]"></span>
          <span>Folders / Directories</span>
        </div>
      </div>
    </div>
  );
};
