import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Commit } from '../../types';

interface ComplexityLocChartProps {
  data: Commit[];
}

export const ComplexityLocChart: React.FC<ComplexityLocChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data.length === 0) return;

    // Filter commits that have valid total_lines and complexity data
    const parsedData = data.map(d => ({
      hash: d.hash,
      message: d.message,
      author: d.author_name,
      date: new Date(d.committed_at),
      lines: d.total_lines ?? 0,
      complexity: d.complexity_score ?? 0.0
    }));

    const drawChart = () => {
      if (!svgRef.current || !containerRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); // Clear previous drawings

      const margin = { top: 20, right: 20, bottom: 40, left: 55 };
      const width = containerRef.current.clientWidth;
      const height = 280;

      svg.attr('width', width).attr('height', height);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const chartGroup = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // X Scale (LOC)
      const maxLines = d3.max(parsedData, d => d.lines) || 100;
      const minLines = d3.min(parsedData, d => d.lines) || 0;
      const xScale = d3.scaleLinear()
        .domain([Math.max(0, minLines * 0.9), maxLines * 1.1])
        .range([0, innerWidth]);

      // Y Scale (Complexity Score)
      const maxComplexity = d3.max(parsedData, d => d.complexity) || 10;
      const yScale = d3.scaleLinear()
        .domain([0, maxComplexity * 1.1])
        .range([innerHeight, 0]);

      // X Axis
      const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d => d3.format('~s')(d as d3.NumberValue));

      chartGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis)
        .call(g => g.select('.domain').attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('dy', '10px'));

      // Y Axis
      const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => d3.format('~s')(d as d3.NumberValue));

      chartGroup.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call(g => g.select('.domain').attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick line').attr('stroke', '#334155'))
        .call(g => g.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('dx', '-4px'));

      // Grid lines
      chartGroup.append('g')
        .attr('class', 'x-grid-lines')
        .selectAll('line')
        .data(xScale.ticks(5))
        .enter()
        .append('line')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');

      chartGroup.append('g')
        .attr('class', 'y-grid-lines')
        .selectAll('line')
        .data(yScale.ticks(5))
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');

      // Create Tooltip DOM element
      const tooltip = d3.select('body')
        .selectAll<HTMLDivElement, null>('.loc-chart-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'loc-chart-tooltip absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg p-2.5 shadow-2xl pointer-events-none z-50 font-sans max-w-[250px]');

      // Draw Scatter Dots
      chartGroup.append('g')
        .attr('class', 'scatter-dots')
        .selectAll('circle')
        .data(parsedData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.lines))
        .attr('cy', d => yScale(d.complexity))
        .attr('r', 5.5)
        .attr('fill', '#a855f7') // Purple
        .attr('fill-opacity', 0.6)
        .attr('stroke', '#c084fc')
        .attr('stroke-width', 1.2)
        .attr('class', 'cursor-pointer hover:scale-150 hover:fill-opacity-100 transition-all')
        .on('mouseover', (_, d) => {
          tooltip.classed('hidden', false);
          const dateStr = d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          tooltip.html(`
            <div class="font-bold text-slate-200 truncate font-mono mb-0.5">Commit: ${d.hash.substring(0, 8)}</div>
            <div class="text-[10px] text-slate-400 mb-1">${dateStr} by ${d.author}</div>
            <div class="text-[11px] italic text-slate-300 truncate mb-1.5" title="${d.message}">"${d.message}"</div>
            <div class="grid grid-cols-2 gap-x-3 text-[10px] pt-1 border-t border-slate-800">
              <span class="text-slate-400">LOC:</span>
              <span class="font-bold text-slate-200 text-right">${d.lines.toLocaleString()}</span>
              <span class="text-slate-400">Complexity:</span>
              <span class="font-bold text-purple-400 text-right">${d.complexity.toLocaleString()}</span>
            </div>
          `);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 30) + 'px');
        })
        .on('mouseleave', () => {
          tooltip.classed('hidden', true);
        });
    };

    drawChart();

    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  return (
    <div className="w-full h-full" ref={containerRef}>
      <svg ref={svgRef} className="overflow-visible" />
    </div>
  );
};
