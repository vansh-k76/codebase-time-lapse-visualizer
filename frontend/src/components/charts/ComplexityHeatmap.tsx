import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { FileNode } from '../../types';

interface ComplexityHeatmapProps {
  tree: FileNode;
}

export const ComplexityHeatmap: React.FC<ComplexityHeatmapProps> = ({ tree }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tree) return;

    const drawTreemap = () => {
      if (!svgRef.current || !containerRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); // Clear previous drawings

      const width = containerRef.current.clientWidth || 600;
      const height = containerRef.current.clientHeight || 300;

      svg.attr('width', width).attr('height', height);

      // Create hierarchy
      const root = d3.hierarchy<FileNode>(tree)
        .sum(d => d.type === 'file' ? (d.lines || 1) : 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      // Create treemap layout
      const rectRoot = d3.treemap<FileNode>()
        .size([width, height])
        .paddingOuter(2)
        .paddingInner(1.5)
        .round(true)(root);

      const leaves = rectRoot.leaves().filter(d => d.x1 - d.x0 > 5 && d.y1 - d.y0 > 5); // filter out tiny boxes that can't be rendered

      // Find max complexity dynamically for scaling
      const maxComplexity = Math.max(10, d3.max(leaves, d => d.data.complexity || 0) || 10);

      // Color scale: Green (low) -> Yellow/Orange (mid) -> Red (high)
      const colorScale = d3.scaleSequential<string>()
        .domain([0, maxComplexity])
        .interpolator(d3.interpolateRgbBasis(['#10b981', '#f59e0b', '#ef4444']));

      // Create Tooltip DOM element
      const tooltip = d3.select('body')
        .selectAll<HTMLDivElement, null>('.heatmap-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'heatmap-tooltip absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg p-2.5 shadow-2xl pointer-events-none z-50 font-sans leading-relaxed max-w-[250px]');

      // Draw tree cells
      const cells = svg.selectAll('g')
        .data(leaves)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x0}, ${d.y0})`);

      cells.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => colorScale(d.data.complexity || 0))
        .attr('fill-opacity', 0.85)
        .attr('stroke', '#0b0f19')
        .attr('stroke-width', 0.8)
        .attr('class', 'cursor-pointer hover:fill-opacity-100 hover:stroke-slate-300 transition-all')
        .on('mouseover', (_, d) => {
          tooltip.classed('hidden', false)
            .html(`
              <div class="font-bold text-slate-100">${d.data.name}</div>
              <div class="text-[10px] text-slate-400 break-all">${d.data.path}</div>
              <div class="grid grid-cols-2 gap-x-3 text-[10px] mt-1.5 pt-1.5 border-t border-slate-800">
                <span class="text-slate-400">Lines of Code:</span>
                <span class="font-bold text-slate-200 text-right">${(d.data.lines || 0).toLocaleString()}</span>
                <span class="text-slate-400">Complexity:</span>
                <span class="font-bold text-slate-100 text-right" style="color: ${colorScale(d.data.complexity || 0)}">
                  ${(d.data.complexity || 0).toLocaleString()}
                </span>
              </div>
            `);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', (event.pageX + 12) + 'px')
            .style('top', (event.pageY - 25) + 'px');
        })
        .on('mouseleave', () => {
          tooltip.classed('hidden', true);
        });

      // Filename labels on boxes (only if box is large enough)
      cells.filter(d => (d.x1 - d.x0 > 50) && (d.y1 - d.y0 > 25))
        .append('text')
        .attr('x', 5)
        .attr('y', 15)
        .attr('fill', '#0b0f19')
        .attr('font-weight', 'bold')
        .attr('font-size', '10px')
        .attr('class', 'select-none pointer-events-none')
        .text(d => d.data.name)
        .each(function(d) {
          // Truncate text if it overflows the rect width
          const self = d3.select(this);
          const rectWidth = d.x1 - d.x0 - 10;
          let textLength = (this as SVGTextElement).getComputedTextLength();
          let text = d.data.name;
          while (textLength > rectWidth && text.length > 0) {
            text = text.slice(0, -1);
            self.text(text + '...');
            textLength = (this as SVGTextElement).getComputedTextLength();
          }
        });
    };

    drawTreemap();

    const handleResize = () => {
      drawTreemap();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [tree]);

  return (
    <div className="w-full h-full min-h-[300px]" ref={containerRef}>
      <svg ref={svgRef} className="overflow-hidden rounded-xl border border-darkBorder bg-slate-950/20" />
    </div>
  );
};
