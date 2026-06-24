import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DailyMetric } from '../../types';

interface GrowthChartProps {
  data: DailyMetric[];
}

interface ParsedMetric {
  date: Date;
  lines: number;
  files: number;
}

interface ChartParams {
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data: ParsedMetric[];
  yAccessor: (d: ParsedMetric) => number;
  colorGradient: [string, string];
  accentColor: string;
  labelText: string;
  idPrefix: string;
}

const drawSingleChart = ({
  svgRef,
  containerRef,
  data,
  yAccessor,
  colorGradient,
  accentColor,
  labelText,
  idPrefix
}: ChartParams) => {
  if (!svgRef.current || !containerRef.current) return;

  const svg = d3.select(svgRef.current);
  svg.selectAll('*').remove(); // Clear previous contents

  const margin = { top: 20, right: 20, bottom: 40, left: 55 };
  const width = containerRef.current.clientWidth;
  const height = 280;

  svg.attr('width', width).attr('height', height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const chartGroup = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // X scale
  let domainRange = d3.extent(data, d => d.date) as [Date, Date];
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

  // Y scale
  const maxY = d3.max(data, yAccessor) || 10;
  const yScale = d3.scaleLinear()
    .domain([0, maxY * 1.1]) // Add 10% breathing room
    .range([innerHeight, 0]);

  // Define Gradients
  const gradientId = `${idPrefix}-area-gradient`;
  const defs = svg.append('defs');
  const linearGradient = defs.append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');

  linearGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', colorGradient[0])
    .attr('stop-opacity', 0.25);

  linearGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', colorGradient[1])
    .attr('stop-opacity', 0.0);

  // X Axis
  const xAxis = d3.axisBottom(xScale)
    .ticks(Math.min(data.length, 6))
    .tickFormat((d) => d3.timeFormat('%b %d')(d as Date));

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
    .tickFormat((d) => d3.format('~s')(d as d3.NumberValue));

  chartGroup.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .call(g => g.select('.domain').attr('stroke', '#334155'))
    .call(g => g.selectAll('.tick line').attr('stroke', '#334155'))
    .call(g => g.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('dx', '-4px'));

  // Draw Grid Lines (Y-only for clean look)
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
  const areaGenerator = d3.area<ParsedMetric>()
    .x(d => xScale(d.date))
    .y0(innerHeight)
    .y1(d => yScale(yAccessor(d)))
    .curve(d3.curveMonotoneX);

  // Path area
  chartGroup.append('path')
    .datum(data)
    .attr('fill', `url(#${gradientId})`)
    .attr('d', areaGenerator);

  // Line Generator
  const lineGenerator = d3.line<ParsedMetric>()
    .x(d => xScale(d.date))
    .y(d => yScale(yAccessor(d)))
    .curve(d3.curveMonotoneX);

  // Path line
  chartGroup.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', colorGradient[0])
    .attr('stroke-width', 2.5)
    .attr('d', lineGenerator);

  // Draw dots at each data point
  chartGroup.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.date))
    .attr('cy', d => yScale(yAccessor(d)))
    .attr('r', 4.5)
    .attr('fill', colorGradient[0])
    .attr('stroke', '#0b0f19')
    .attr('stroke-width', 1.5);

  // Interactive Hover Crosshair / Tooltip
  const focusGroup = chartGroup.append('g')
    .attr('class', 'focus')
    .style('display', 'none');

  // Vertical line
  focusGroup.append('line')
    .attr('class', 'focus-line')
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .attr('stroke', '#475569')
    .attr('stroke-width', 1.2)
    .attr('stroke-dasharray', '2,2');

  // Glowing dot
  focusGroup.append('circle')
    .attr('class', 'focus-circle')
    .attr('r', 5)
    .attr('fill', accentColor)
    .attr('stroke', '#0b0f19')
    .attr('stroke-width', 1.5);

  // Hover box detector
  const bisectDate = d3.bisector<ParsedMetric, Date>(d => d.date).left;

  // Tooltip overlay HTML wrapper
  const tooltip = d3.select('body').append('div')
    .attr('class', 'absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg p-2.5 shadow-2xl pointer-events-none z-50 font-sans');

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
      tooltip.remove();
    })
    .on('mousemove', (event) => {
      const mouseX = d3.pointer(event)[0];
      const dateAtMouse = xScale.invert(mouseX);
      const index = bisectDate(data, dateAtMouse, 1);
      const d0 = data[index - 1];
      const d1 = data[index];
      if (!d0) return;
      const d = !d1 || (dateAtMouse.getTime() - d0.date.getTime() < d1.date.getTime() - dateAtMouse.getTime()) ? d0 : d1;

      focusGroup.select('.focus-line')
        .attr('x1', xScale(d.date))
        .attr('x2', xScale(d.date));

      focusGroup.select('.focus-circle')
        .attr('cx', xScale(d.date))
        .attr('cy', yScale(yAccessor(d)));

      const dateStr = d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      tooltip.style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 30) + 'px')
        .html(`
          <div class="text-[10px] text-slate-400 font-semibold mb-0.5">${dateStr}</div>
          <div class="font-bold flex items-center gap-1.5" style="color: ${colorGradient[0]}">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${colorGradient[0]}"></span>
            <span>${labelText}: ${yAccessor(d).toLocaleString()}</span>
          </div>
        `);
    });
};

export const GrowthChart: React.FC<GrowthChartProps> = ({ data }) => {
  const locSvgRef = useRef<SVGSVGElement>(null);
  const locContainerRef = useRef<HTMLDivElement>(null);
  
  const filesSvgRef = useRef<SVGSVGElement>(null);
  const filesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("GrowthChart received data:", data);
    if (data.length === 0) return;

    // Parse date strings to Date objects
    const parsedData = data.map(d => ({
      date: new Date(d.record_date),
      lines: d.total_lines,
      files: d.total_files
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // 1. Draw LOC Chart
    drawSingleChart({
      svgRef: locSvgRef,
      containerRef: locContainerRef,
      data: parsedData,
      yAccessor: d => d.lines,
      colorGradient: ['#a855f7', '#3b82f6'], // Purple to Blue
      accentColor: '#a855f7',
      labelText: 'Lines of Code (LOC)',
      idPrefix: 'loc'
    });

    // 2. Draw File Count Chart
    drawSingleChart({
      svgRef: filesSvgRef,
      containerRef: filesContainerRef,
      data: parsedData,
      yAccessor: d => d.files,
      colorGradient: ['#10b981', '#06b6d4'], // Emerald to Cyan
      accentColor: '#10b981',
      labelText: 'Total File Count',
      idPrefix: 'files'
    });

    // Set up resize listener
    const handleResize = () => {
      if (data.length === 0) return;
      
      drawSingleChart({
        svgRef: locSvgRef,
        containerRef: locContainerRef,
        data: parsedData,
        yAccessor: d => d.lines,
        colorGradient: ['#a855f7', '#3b82f6'],
        accentColor: '#a855f7',
        labelText: 'Lines of Code (LOC)',
        idPrefix: 'loc'
      });

      drawSingleChart({
        svgRef: filesSvgRef,
        containerRef: filesContainerRef,
        data: parsedData,
        yAccessor: d => d.files,
        colorGradient: ['#10b981', '#06b6d4'],
        accentColor: '#10b981',
        labelText: 'Total File Count',
        idPrefix: 'files'
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);



  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* LOC Chart Card */}
      <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg" ref={locContainerRef}>
        <div className="flex items-center justify-between border-b border-darkBorder/50 pb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Lines of Code Growth</h4>
          <span className="text-[10px] text-slate-500 font-mono">LOC Timeline</span>
        </div>
        <div className="w-full h-[280px]">
          <svg ref={locSvgRef} className="overflow-visible" />
        </div>
      </div>

      {/* File Count Chart Card */}
      <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg" ref={filesContainerRef}>
        <div className="flex items-center justify-between border-b border-darkBorder/50 pb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Repository File Count Growth</h4>
          <span className="text-[10px] text-slate-500 font-mono">Files Timeline</span>
        </div>
        <div className="w-full h-[280px]">
          <svg ref={filesSvgRef} className="overflow-visible" />
        </div>
      </div>
    </div>
  );
};
