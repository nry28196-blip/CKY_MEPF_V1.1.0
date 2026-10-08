import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { HistoryItem } from '../types';

interface ComparisonChartProps {
  calcA: HistoryItem;
  calcB: HistoryItem;
}

const parameterLabels: Record<string, string> = {
  area: "Area",
  volume: "Volume",
  occupants: "Occupants",
  airflow: "Airflow",
  frictionRate: "Friction",
  velocityLimit: "Vel. Limit",
  ductHeight: "Duct Ht",
  numBranches: "Branches",
  power: "Power",
  voltage: "Voltage",
  powerFactor: "PF",
  efficiency: "Efficiency",
  length: "Length",
  allowableDrop: "Allow Drop",
  demand: "Demand",
  waterHeaterSize: "Heater Size",
  pumpFlow: "Pump Flow",
  pumpHead: "Pump Head",
  pumpEfficiency: "Pump Eff.",
  tankCapacity: "Tank Cap",
  tankHeight: "Tank Ht",
  sprinklerArea: "Sprinkler Area",
  designDensity: "Design Density",
  hoseAllowance: "Hose Allow.",
  numberOfStandpipes: "Standpipes",
  dischargeFlow: "Discharge Flow",
  dischargePressure: "Discharge Press",
};

export default function ComparisonChart({ calcA, calcB }: ComparisonChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: 260
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !calcA || !calcB || dimensions.width === 0) return;

    const paramsA = calcA.parameters || {};
    const paramsB = calcB.parameters || {};

    const allKeys = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
    
    const numericKeys = allKeys.filter(key => {
      const valA = paramsA[key];
      const valB = paramsB[key];
      return (typeof valA === 'number' || typeof valB === 'number');
    });

    if (numericKeys.length === 0) {
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const data = numericKeys.map(key => {
      return {
        key: parameterLabels[key] || key,
        rawKey: key,
        calcA: typeof paramsA[key] === 'number' ? paramsA[key] : 0,
        calcB: typeof paramsB[key] === 'number' ? paramsB[key] : 0
      };
    });

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 20, right: 30, bottom: 60, left: 50 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);
    
    svg.selectAll('*').remove();

    const x0 = d3.scaleBand()
      .domain(data.map(d => d.key))
      .rangeRound([margin.left, width - margin.right])
      .paddingInner(0.2);

    const x1 = d3.scaleBand()
      .domain(['calcA', 'calcB'])
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    const maxVal = d3.max(data, d => Math.max(d.calcA, d.calcB)) || 1;
    
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal<string>()
      .domain(['calcA', 'calcB'])
      .range(['#38bdf8', '#34d399']); // sky-400 and emerald-400

    const g = svg.append('g');

    // Add Gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,0)`)
      .call(d3.axisLeft(y)
        .tickSize(-width + margin.left + margin.right)
        .tickFormat(() => "")
      )
      .attr('color', '#334155') // slate-700
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.5)
      .selectAll('.tick line')
      .attr('x1', margin.left);

    // Setup tooltip
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

    const formatNumber = d3.format(",.1f");

    const categoryG = g.selectAll('g.category')
      .data(data)
      .enter().append('g')
      .attr('class', 'category')
      .attr('transform', d => `translate(${x0(d.key)},0)`);
      
    // Calc A bars
    categoryG.append('rect')
      .attr('x', x1('calcA')!)
      .attr('y', height - margin.bottom)
      .attr('width', x1.bandwidth())
      .attr('height', 0)
      .attr('fill', color('calcA'))
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`<strong style="color: #38bdf8">Calc A (Left)</strong><br/>${d.key}: ${formatNumber(d.calcA)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        tooltip.transition().duration(500).style('opacity', 0);
      })
      .transition()
      .duration(800)
      .attr('y', d => y(d.calcA))
      .attr('height', d => height - margin.bottom - y(d.calcA));

    // Calc B bars
    categoryG.append('rect')
      .attr('x', x1('calcB')!)
      .attr('y', height - margin.bottom)
      .attr('width', x1.bandwidth())
      .attr('height', 0)
      .attr('fill', color('calcB'))
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('filter', 'brightness(1.2)');
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`<strong style="color: #34d399">Calc B (Right)</strong><br/>${d.key}: ${formatNumber(d.calcB)}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mousemove', function(event) {
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).style('filter', 'none');
        tooltip.transition().duration(500).style('opacity', 0);
      })
      .transition()
      .duration(800)
      .delay(100)
      .attr('y', d => y(d.calcB))
      .attr('height', d => height - margin.bottom - y(d.calcB));

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .style('font-family', 'sans-serif')
      .style('font-size', '10px')
      .style('fill', '#94a3b8'); // slate-400

    // Y Axis
    g.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => d3.format('~s')(d)))
      .selectAll('text')
      .style('font-family', 'monospace')
      .style('font-size', '10px')
      .style('fill', '#94a3b8');
      
    // Axis lines styling
    svg.selectAll('.domain').style('stroke', '#475569'); // slate-600
    svg.selectAll('.tick line').style('stroke', '#475569');

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, ${margin.top - 10})`);
      
    legend.append('rect').attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#38bdf8').attr('rx', 2);
    legend.append('text').attr('x', 16).attr('y', 9).text('Calc A').style('fill', '#38bdf8').style('font-size', '11px').style('font-weight', 'bold').style('font-family', 'sans-serif');
    
    legend.append('rect').attr('x', 70).attr('y', 0).attr('width', 10).attr('height', 10).attr('fill', '#34d399').attr('rx', 2);
    legend.append('text').attr('x', 86).attr('y', 9).text('Calc B').style('fill', '#34d399').style('font-size', '11px').style('font-weight', 'bold').style('font-family', 'sans-serif');

    return () => {
      tooltip.remove();
    };
  }, [calcA, calcB, dimensions]);

  const paramsA = calcA.parameters || {};
  const paramsB = calcB.parameters || {};
  const allKeys = Array.from(new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]));
  const numericKeys = allKeys.filter(key => {
    return (typeof paramsA[key] === 'number' || typeof paramsB[key] === 'number');
  });

  if (numericKeys.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-950/60 rounded-xl border border-slate-850 p-4 flex flex-col relative" ref={containerRef}>
      <h3 className="text-[11px] font-bold text-slate-300 tracking-wider uppercase mb-1">Parameter Variance Chart</h3>
      <p className="text-[9px] text-slate-500 mb-3 uppercase tracking-wider">Numeric Input Analysis (A vs B)</p>
      <div className="flex-1 w-full flex justify-center items-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
}
