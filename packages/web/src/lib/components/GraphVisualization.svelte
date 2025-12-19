<script lang="ts">
  import { onMount } from 'svelte';
  import { interpreterStore } from '$lib/stores/interpreter';
  import * as d3 from 'd3';
  import type { GraphData } from '@songlang/core';

  let svgElement: SVGSVGElement;
  let containerElement: HTMLDivElement;
  let width = 400;
  let height = 300;

  interface D3Node extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    properties: Record<string, unknown>;
    abilities: string[];
  }

  interface D3Link extends d3.SimulationLinkDatum<D3Node> {
    source: D3Node | string;
    target: D3Node | string;
    type: string;
  }

  let simulation: d3.Simulation<D3Node, D3Link> | null = null;

  function updateGraph(data: GraphData) {
    if (!svgElement) return;
    if (width <= 0 || height <= 0) return;

    // Stop previous simulation
    if (simulation) {
      simulation.stop();
      simulation = null;
    }

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    if (data.nodes.length === 0) return;

    const nodes: D3Node[] = data.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      properties: n.properties,
      abilities: n.abilities,
    }));

    const links: D3Link[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
    }));

    // Container with zoom
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#888');

    // Force simulation
    const newSimulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulation = newSimulation;

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#666')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g');

    // Add drag behavior
    node.call(d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) newSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) newSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => d.abilities.length > 0 ? '#4ade80' : '#60a5fa')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Node labels
    node.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', '#e0e0e0')
      .attr('font-size', '12px')
      .attr('font-family', 'sans-serif');

    // Tooltip
    node.append('title')
      .text((d) => {
        let text = d.name;
        if (Object.keys(d.properties).length > 0) {
          text += '\n\nProperties:';
          for (const [key, value] of Object.entries(d.properties)) {
            text += `\n  ${key}: ${value}`;
          }
        }
        if (d.abilities.length > 0) {
          text += '\n\nAbilities:';
          for (const ability of d.abilities) {
            text += `\n  ${ability}`;
          }
        }
        return text;
      });

    newSimulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as D3Node).x ?? 0)
        .attr('y1', (d) => (d.source as D3Node).y ?? 0)
        .attr('x2', (d) => (d.target as D3Node).x ?? 0)
        .attr('y2', (d) => (d.target as D3Node).y ?? 0);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
  }

  onMount(() => {
    // Get initial dimensions
    if (containerElement) {
      const rect = containerElement.getBoundingClientRect();
      width = rect.width || 400;
      height = rect.height || 300;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          width = newWidth;
          height = newHeight;
          updateGraph($interpreterStore.graphData);
        }
      }
    });

    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    return () => {
      resizeObserver.disconnect();
      if (simulation) {
        simulation.stop();
      }
    };
  });

  // React to store changes
  $: if (svgElement && width > 0 && height > 0) {
    updateGraph($interpreterStore.graphData);
  }
</script>

<div class="graph-container">
  <div class="header">
    <span>Graph Visualization</span>
    <span class="node-count">{$interpreterStore.graphData.nodes.length} nodes</span>
  </div>
  <div class="graph-wrapper" bind:this={containerElement}>
    <svg bind:this={svgElement} {width} {height}></svg>
  </div>
</div>

<style>
  .graph-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0f0f1a;
    border-left: 1px solid #333;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a2e;
    border-bottom: 1px solid #333;
    color: #e0e0e0;
    font-size: 14px;
    font-weight: 500;
  }

  .node-count {
    font-size: 12px;
    color: #888;
  }

  .graph-wrapper {
    flex: 1;
    overflow: hidden;
  }

  svg {
    width: 100%;
    height: 100%;
  }
</style>
