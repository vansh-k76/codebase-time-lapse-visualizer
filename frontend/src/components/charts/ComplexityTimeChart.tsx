import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CommitComplexity } from '../../types';

interface ComplexityTimeChartProps {
  data: CommitComplexity[];
}

export const ComplexityTimeChart: React.FC<ComplexityTimeChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data.length === 0) return;

    // Parse dates and sort chronologically
    const parsedData = data.map(d => ({
      date: new Date(d.committed_at),
      score: d.complexity_score,
      lines: d.total_lines,
      files: d.file_count
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

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

      // X Scale
      let domainRange = d3.extent(parsedData, d => d.date) as [Date, Date];
      if (domainRange[0] && domainRange[1] && domainRange[0].getTime() === domainRange[1].getTime()) {
        const paddedStart = new Date(domainRange[0]);
        paddedStart.setDate(paddedStart.getDate() - 1);
        const paddedEnd = new Date(domainRange[1]);
        paddedEnd.setDate(paddedEnd.getDate() + 1);
        domainRange = [paddedStart, paddedEnd];
      }

      const xScale = d3.scaleTime()
        .domain(domainRange)
        .range([0, innerWidth]);

      // Y Scale
      const maxY = d3.max(parsedData, d => d.score) || 10;
      const yScale = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([innerHeight, 0]);

      // Gradient Definition
      const gradientId = 'complexity-time-area-gradient';
      const defs = svg.append('defs');
      const linearGradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      linearGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#3b82f6') // Blue
        .attr('stop-opacity', 0.25);

      linearGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#3b82f6')
        .attr('stop-opacity', 0.0);

      // X Axis
      const xAxis = d3.axisBottom(xScale)
        .ticks(Math.min(parsedData.length, 6))
        .tickFormat(d => d3.timeFormat('%b %d')(d as Date));

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

      // Grid Lines
      chartGroup.append('g')
        .attr('class', 'grid-lines')
        .selectAll('line')
        .data(yScale.ticks(5))
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

      // Area Generator
      const areaGenerator = d3.area<{ date: Date; score: number }>()
        .x(d => xScale(d.date))
        .y0(innerHeight)
        .y1(d => yScale(d.score))
        .curve(d3.curveMonotoneX);

      // Area path
      chartGroup.append('path')
        .datum(parsedData)
        .attr('fill', `url(#${gradientId})`)
        .attr('d', areaGenerator);

      // Line Generator
      const lineGenerator = d3.line<{ date: Date; score: number }>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.score))
        .curve(d3.curveMonotoneX);

      // Line path
      chartGroup.append('path')
        .datum(parsedData)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2.5)
        .attr('d', lineGenerator);

      // Dots at each data point
      chartGroup.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(parsedData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.score))
        .attr('r', 4.5)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#0b0f19')
        .attr('stroke-width', 1.5);

      // Interactive Hover Crosshair / Tooltip
      const focusGroup = chartGroup.append('g')
        .attr('class', 'focus')
        .style('display', 'none');

      focusGroup.append('line')
        .attr('class', 'focus-line')
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#475569')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '2,2');

      focusGroup.append('circle')
        .attr('class', 'focus-circle')
        .attr('r', 5)
        .attr('fill', '#3b82f6')
        .attr('stroke', '#0b0f19')
        .attr('stroke-width', 1.5);

      const bisectDate = d3.bisector<{ date: Date }, Date>(d => d.date).left;

      const tooltip = d3.select('body')
        .selectAll<HTMLDivElement, null>('.time-chart-tooltip')
        .data([null])
        .join('div')
        .attr('class', 'time-chart-tooltip absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg p-2.5 shadow-2xl pointer-events-none z-50 font-sans');

      chartGroup.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('class', 'cursor-crosshair')
        .on('mouseover', () => {
          focusGroup.style('display', null);
          tooltip.classed('hidden', false);
        })
        .on('mouseout', () => {
          focusGroup.style('display', 'none');
          tooltip.classed('hidden', true);
        })
        .on('mousemove', (event) => {
          const mouseX = d3.pointer(event)[0];
          const dateAtMouse = xScale.invert(mouseX);
          const index = bisectDate(parsedData, dateAtMouse, 1);
          const d0 = parsedData[index - 1];
          const d1 = parsedData[index];
          if (!d0) return;
          const d = !d1 || (dateAtMouse.getTime() - d0.date.getTime() < d1.date.getTime() - dateAtMouse.getTime()) ? d0 : d1;

          focusGroup.select('.focus-line')
            .attr('x1', xScale(d.date))
            .attr('x2', xScale(d.date));

          focusGroup.select('.focus-circle')
            .attr('cx', xScale(d.date))
            .attr('cy', yScale(d.score));

          const dateStr = d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          tooltip.style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 30) + 'px')
            .html(`
              <div class="text-[10px] text-slate-400 font-semibold mb-0.5">${dateStr}</div>
              <div class="font-bold flex items-center gap-1.5 text-blue-400 mb-1">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Complexity Score: ${d.score.toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300">
                <div>Files: ${d.files}</div>
                <div>Lines of Code: ${d.lines.toLocaleString()}</div>
              </div>
            `);
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
