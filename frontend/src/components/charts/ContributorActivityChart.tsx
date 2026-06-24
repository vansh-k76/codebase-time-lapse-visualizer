import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Commit, Contributor } from '../../types';

interface ContributorActivityChartProps {
  commits: Commit[];
  contributors: Contributor[];
}

interface TimelinePoint {
  date: Date;
  message: string;
  hash: string;
  author: string;
  [email: string]: string | Date | number | undefined;
}

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#ec4899', // Pink
  '#eab308', // Yellow
];

export const ContributorActivityChart: React.FC<ContributorActivityChartProps> = ({ commits, contributors }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("ContributorActivityChart received data - commits:", commits, "contributors:", contributors);
    if (commits.length === 0 || contributors.length === 0) return;

    // 1. Get Top Contributors (up to 6)
    const topContributors = contributors.slice(0, 6);
    const topContribEmails = new Set(topContributors.map(c => c.email));

    // 2. Sort commits chronologically
    const chronologicalCommits = [...commits].sort(
      (a, b) => new Date(a.committed_at).getTime() - new Date(b.committed_at).getTime()
    );

    // 3. Calculate running/cumulative sum of commits over time for each top contributor
    const runningSums = new Map<string, number>();
    topContributors.forEach(c => runningSums.set(c.email, 0));
    
    // Group cumulative counts by date
    // Each record: { date: Date, [email]: cumulative_commits }
    const timelineData: TimelinePoint[] = [];

    chronologicalCommits.forEach(commit => {
      const email = commit.author_email;
      if (topContribEmails.has(email)) {
        const currentSum = runningSums.get(email) || 0;
        runningSums.set(email, currentSum + 1);
      }

      // Record state at this commit point
      const stateAtPoint: TimelinePoint = {
        date: new Date(commit.committed_at),
        message: commit.message,
        hash: commit.hash,
        author: commit.author_name
      };

      topContributors.forEach(c => {
        stateAtPoint[c.email] = runningSums.get(c.email) || 0;
      });

      timelineData.push(stateAtPoint);
    });

    // 4. Draw Chart
    const drawChart = () => {
      if (!svgRef.current || !containerRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove(); // Clear previous drawings

      const margin = { top: 25, right: 30, bottom: 40, left: 55 };
      const width = containerRef.current.clientWidth;
      const height = 300;

      svg.attr('width', width).attr('height', height);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const chartGroup = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      // X Scale
      let domainRange = d3.extent(timelineData, d => d.date) as [Date, Date];
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

      // Y Scale (max cumulative commits for any top contributor)
      const maxY = d3.max(topContributors.map(c => runningSums.get(c.email) || 0)) || 10;
      const yScale = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([innerHeight, 0]);

      // X Axis
      const xAxis = d3.axisBottom(xScale)
        .ticks(Math.min(timelineData.length, 6))
        .tickFormat((d) => d3.timeFormat('%b %Y')(d as Date));

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
        .tickFormat(d3.format('d'));

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

      // Draw Lines for each contributor
      topContributors.forEach((contrib, i) => {
        const color = COLORS[i % COLORS.length];

        const lineGenerator = d3.line<TimelinePoint>()
          .x(d => xScale(d.date))
          .y(d => yScale((d[contrib.email] as number) || 0))
          .curve(d3.curveMonotoneX);

        chartGroup.append('path')
          .datum(timelineData)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', lineGenerator);

        // Draw dots at each data point
        chartGroup.append('g')
          .attr('class', `dots-${contrib.id}`)
          .selectAll('circle')
          .data(timelineData)
          .enter()
          .append('circle')
          .attr('cx', d => xScale(d.date))
          .attr('cy', d => yScale((d[contrib.email] as number) || 0))
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', '#0b0f19')
          .attr('stroke-width', 1.2);
      });

      // Hover Crosshair and tooltip
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

      const bisectDate = d3.bisector<TimelinePoint, Date>(d => d.date).left;

      const tooltip = d3.select('body').append('div')
        .attr('class', 'absolute hidden bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg p-3 shadow-2xl pointer-events-none z-50 font-sans min-w-[180px]');

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
          const index = bisectDate(timelineData, dateAtMouse, 1);
          const d0 = timelineData[index - 1];
          const d1 = timelineData[index];
          if (!d0) return;
          const d = !d1 || (dateAtMouse.getTime() - d0.date.getTime() < d1.date.getTime() - dateAtMouse.getTime()) ? d0 : d1;

          focusGroup.select('.focus-line')
            .attr('x1', xScale(d.date))
            .attr('x2', xScale(d.date));

          const dateStr = d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          
          let breakdownHtml = '';
          topContributors.forEach((contrib, i) => {
            const color = COLORS[i % COLORS.length];
            breakdownHtml += `
              <div class="flex items-center justify-between gap-4 mt-1">
                <span class="flex items-center gap-1.5 text-slate-300">
                  <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></span>
                  <span class="truncate max-w-[110px]">${contrib.name}</span>
                </span>
                <span class="font-bold text-slate-100">${d[contrib.email] as number}</span>
              </div>
            `;
          });

          tooltip.style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 30) + 'px')
            .html(`
              <div class="text-[10px] text-slate-400 font-semibold mb-1 pb-1 border-b border-slate-800">${dateStr}</div>
              <div class="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Cumulative Commits</div>
              ${breakdownHtml}
            `);
        });
    };

    drawChart();

    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [commits, contributors]);

  return (
    <div className="bg-darkCard/40 border border-darkBorder rounded-xl p-5 flex flex-col gap-4 shadow-lg" ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-darkBorder/50 pb-3 gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Contributor Contribution Timeline</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Cumulative commits over time per top contributor</p>
        </div>
        
        {/* Color Legend */}
        <div className="flex flex-wrap gap-2.5">
          {contributors.slice(0, 6).map((contrib, i) => (
            <div key={contrib.id} className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
              <span>{contrib.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full h-[300px]">
        <svg ref={svgRef} className="overflow-visible" />
      </div>
    </div>
  );
};
