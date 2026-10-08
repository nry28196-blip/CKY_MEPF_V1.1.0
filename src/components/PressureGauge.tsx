import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PressureGaugeProps {
  totalDrop: number;
  available: number;
  maxAllowableDrop: number;
}

export default function PressureGauge({ totalDrop, available, maxAllowableDrop }: PressureGaugeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 200;
    const height = 120;
    const margin = 10;
    const radius = Math.min(width, height * 2) / 2 - margin;

    const svg = d3.select(svgRef.current);
    
    // Initialize structure if empty
    if (svg.select('g').empty()) {
      const g = svg.append('g').attr('transform', `translate(${width / 2},${height - margin})`);
      
      // Arc generator for background
      const arc = d3.arc<any, any>()
        .innerRadius(radius - 15)
        .outerRadius(radius)
        .startAngle(-Math.PI / 2)
        .cornerRadius(4);
        
      // Background arc
      g.append('path')
        .datum({ endAngle: Math.PI / 2 })
        .style('fill', '#1e293b') // slate-800
        .attr('d', arc);
        
      // Threshold line group
      g.append('path').attr('class', 'threshold-path');
      
      // Value arc
      g.append('path').attr('class', 'value-path')
        .datum({ endAngle: -Math.PI / 2 });
        
      // Value text
      g.append('text')
        .attr('class', 'value-text text-2xl font-bold fill-white')
        .attr('text-anchor', 'middle')
        .attr('y', -10)
        .text('0.0%');
        
      // Subtext
      g.append('text')
        .attr('class', 'text-[9px] uppercase font-bold fill-slate-400')
        .attr('text-anchor', 'middle')
        .attr('y', 5)
        .text('Pressure Drop');
    }

    const g = svg.select('g');
    
    // Create base arc function for value and threshold
    const arc = d3.arc<any, any>()
      .innerRadius(radius - 15)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(4);

    // Update threshold
    const maxDropPct = Math.min(1, Math.max(0, maxAllowableDrop / available));
    const maxDropAngle = -Math.PI / 2 + maxDropPct * Math.PI;
    const thresholdArc = d3.arc<any, any>()
      .innerRadius(radius - 20)
      .outerRadius(radius + 5)
      .startAngle(maxDropAngle - 0.02)
      .endAngle(maxDropAngle + 0.02);
      
    g.select('.threshold-path')
      .transition()
      .duration(750)
      .style('fill', '#10b981')
      .attr('d', thresholdArc as any);

    // Update value arc
    const pct = Math.min(1, Math.max(0, totalDrop / available));
    const valueAngle = -Math.PI / 2 + pct * Math.PI;

    let color = '#10b981'; // green
    if (totalDrop > maxAllowableDrop) {
      color = '#f87171'; // red
    } else if (totalDrop > maxAllowableDrop * 0.8) {
      color = '#fbbf24'; // yellow
    }

    g.select('.value-path')
      .transition()
      .duration(750)
      .style('fill', color)
      .attrTween('d', function(this: any, d: any) {
        const interpolate = d3.interpolate(d.endAngle, valueAngle);
        return function(t) {
          d.endAngle = interpolate(t);
          return arc(d) as string;
        };
      });
      
    // Update text
    g.select('.value-text')
      .transition()
      .duration(750)
      .tween('text', function(this: any) {
        const el = d3.select(this);
        const currentText = el.text().replace('%', '');
        const startVal = parseFloat(currentText) || 0;
        const endVal = pct * 100;
        const interpolate = d3.interpolateNumber(startVal, endVal);
        return function(t) {
          el.text(`${(interpolate(t) || 0).toFixed(1)}%`);
        };
      });

  }, [totalDrop, available, maxAllowableDrop]);

  return (
    <div className="flex flex-col items-center justify-center mt-2">
      <svg ref={svgRef} width={200} height={120} />
      <div className="flex gap-4 text-[10px] text-slate-400 font-mono mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Safe
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Marginal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400"></span> Fail
        </span>
      </div>
    </div>
  );
}
