import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

export interface VrfRoom {
  id: string;
  name: string;
  basis: 'area' | 'volume';
  size: number;
  occupants: number;
  tons: number;
  watts: number;
  pipeLength?: number;
}

interface VrfLoadDistributionChartProps {
  rooms: VrfRoom[];
}

export default function VrfLoadDistributionChart({ rooms }: VrfLoadDistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: 300
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || rooms.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      return;
    }

    const data = rooms.map(r => ({
      name: r.name,
      value: r.tons
    })).filter(d => d.value > 0);

    if (data.length === 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const width = dimensions.width || 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto;');

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const tailwindColors = ['#059669', '#10b981', '#34d399', '#0ea5e9', '#38bdf8', '#8b5cf6', '#a78bfa', '#f59e0b', '#fbbf24', '#f43f5e'];
    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.name))
      .range(tailwindColors);

    const pie = d3.pie<{name: string, value: number}>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{name: string, value: number}>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.85);

    const arcHover = d3.arc<d3.PieArcDatum<{name: string, value: number}>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.95);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Setup tooltip
    // Check if tooltip already exists to avoid duplicates in strict mode
    let tooltip = d3.select(containerRef.current).select('.d3-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select(containerRef.current)
          .append('div')
          .attr('class', 'd3-tooltip')
          .style('position', 'absolute')
          .style('opacity', 0)
          .style('background', 'rgba(15, 23, 42, 0.95)')
          .style('border', '1px solid rgba(51, 65, 85, 1)')
          .style('color', '#f8fafc')
          .style('padding', '8px 12px')
          .style('border-radius', '8px')
          .style('pointer-events', 'none')
          .style('font-size', '12px')
          .style('font-family', 'monospace')
          .style('z-index', 10)
          .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.5)');
    }

    arcs.append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.name) as string)
      .attr('stroke', '#020617')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any)
          .style('filter', 'brightness(1.1)');
          
        const containerRect = containerRef.current!.getBoundingClientRect();
        // Calculate relative position within container
        const relX = event.clientX - containerRect.left;
        const relY = event.clientY - containerRect.top;
          
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`<strong style="color: ${color(d.data.name)}">${d.data.name}</strong><br/>${(d.data.value || 0).toFixed(2)} TR`)
          .style('left', (relX + 15) + 'px')
          .style('top', (relY - 30) + 'px');
      })
      .on('mousemove', function (event) {
        const containerRect = containerRef.current!.getBoundingClientRect();
        const relX = event.clientX - containerRect.left;
        const relY = event.clientY - containerRect.top;
        
        tooltip.style('left', (relX + 15) + 'px')
          .style('top', (relY - 30) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .style('filter', 'none');
          
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Add labels if slices are large enough
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d as any)})`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .text(d => (d.endAngle - d.startAngle > 0.4) ? d.data.name : '')
      .style('fill', '#fff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.8)');
      
    // Center text
    const totalTons = d3.sum(data, d => d.value);
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .text('TOTAL LOAD')
      .style('fill', '#94a3b8')
      .style('font-size', '10px')
      .style('font-weight', 'bold');
      
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .text(`${(totalTons || 0).toFixed(1)} TR`)
      .style('fill', '#34d399')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('font-family', 'monospace');

    return () => {
      tooltip.remove();
    };

  }, [rooms]);

  return (
    <div className="w-full bg-slate-900/40 rounded-xl border border-slate-850 p-4 flex flex-col relative" ref={containerRef}>
      <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">Zone Load Distribution</h3>
      {rooms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[200px] text-slate-500 text-xs italic">
          Add zones to visualize load distribution
        </div>
      ) : (
        <div className="flex-1 flex justify-center items-center w-full min-h-[260px]">
          <svg ref={svgRef}></svg>
        </div>
      )}
    </div>
  );
}
