import { Edge, Position } from '@xyflow/react';
import { BPNode } from '../types';

export const getLayoutedElements = (nodes: BPNode[], edges: Edge[]) => {
  const NODE_WIDTH = 300;
  const NODE_HEIGHT = 180; // Height + Gap buffer
  const RANK_SPACING = 450; // Horizontal distance between columns

  // 1. Initialize helper structures
  const nodeMap = new Map<string, BPNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const adjacency: Record<string, string[]> = {}; // Outgoing
  const inverseAdjacency: Record<string, string[]> = {}; // Incoming
  
  nodes.forEach(n => {
    adjacency[n.id] = [];
    inverseAdjacency[n.id] = [];
  });

  edges.forEach(e => {
    if (adjacency[e.source]) adjacency[e.source].push(e.target);
    if (inverseAdjacency[e.target]) inverseAdjacency[e.target].push(e.source);
  });

  // 2. Rank Assignment (Longest Path Layering)
  // This pushes nodes as far right as possible based on dependencies
  const ranks: Record<string, number> = {};
  
  // Initialize source nodes (nodes with no incoming edges)
  const sources = nodes.filter(n => (inverseAdjacency[n.id]?.length || 0) === 0);
  const queue: { id: string, rank: number }[] = sources.map(n => ({ id: n.id, rank: 0 }));
  
  // If cyclic or no clear sources, pick first
  if (queue.length === 0 && nodes.length > 0) {
    queue.push({ id: nodes[0].id, rank: 0 });
  }

  const processed = new Set<string>();

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!;
    
    // If we found a longer path to this node, update it
    if (ranks[id] === undefined || rank > ranks[id]) {
      ranks[id] = rank;
    }

    const neighbors = adjacency[id] || [];
    neighbors.forEach(target => {
      // Simple cycle prevention: don't re-queue if we've processed it at this depth in this specific chain context
      // A better way for DAG is just checking if all deps are processed, but simple BFS with update works for visual layout
      if (ranks[target] === undefined || ranks[target] < rank + 1) {
         queue.push({ id: target, rank: rank + 1 });
      }
    });
  }

  // 3. Group by Rank
  const rankMap: Record<number, string[]> = {};
  let maxRank = 0;
  
  nodes.forEach(node => {
    const r = ranks[node.id] !== undefined ? ranks[node.id] : 0;
    if (!rankMap[r]) rankMap[r] = [];
    rankMap[r].push(node.id);
    maxRank = Math.max(maxRank, r);
  });

  // 4. Order within Ranks (Barycenter Heuristic) & Position Assignment
  // We calculate positions rank by rank, using the previous rank to guide Y sorting
  const positions: Record<string, { x: number, y: number }> = {};

  for (let r = 0; r <= maxRank; r++) {
    const nodeIds = rankMap[r] || [];
    
    // Calculate "Barycenter" (Average Y of parents) for each node
    const nodesWithWeight = nodeIds.map(id => {
      const parents = inverseAdjacency[id] || [];
      let weight = 0;
      let parentCount = 0;
      
      parents.forEach(pid => {
        if (positions[pid]) {
          weight += positions[pid].y;
          parentCount++;
        }
      });

      // If no parents (root) or parents not positioned yet (back-edge), keep original order or use 0
      const avgY = parentCount > 0 ? weight / parentCount : Number.MAX_SAFE_INTEGER;
      
      // Secondary sort key: Input execution pin count (events go top)
      // Use optional chaining for safety against malformed node data
      const isEvent = nodeMap.get(id)?.data?.nodeType === 'event';
      
      return { id, avgY, isEvent };
    });

    // Sort: Events first, then by connectivity (avgY)
    nodesWithWeight.sort((a, b) => {
        if (a.isEvent && !b.isEvent) return -1;
        if (!a.isEvent && b.isEvent) return 1;
        return a.avgY - b.avgY;
    });

    // Assign Positions with Collision Stacking
    let currentY = 0;
    
    // Center this rank vertically relative to the previous rank's center? 
    // For simplicity in Blueprints, we usually start from top-left flow.
    
    nodesWithWeight.forEach((item, idx) => {
       const nodeHeight = 150; // rough estimation or measure?
       const gap = 50;
       
       // If we have a calculated "ideal" Y from parents, try to respect it
       // UNLESS it overlaps with the node above us
       let idealY = item.avgY !== Number.MAX_SAFE_INTEGER ? item.avgY : currentY;
       
       // Prevent overlap with previous node in this rank
       if (idealY < currentY) {
         idealY = currentY;
       }
       
       positions[item.id] = {
         x: r * RANK_SPACING,
         y: idealY
       };

       // Advance currentY for the next node
       currentY = idealY + nodeHeight + gap;
    });
  }

  // 5. Apply to Nodes
  const layoutedNodes = nodes.map(node => {
    const pos = positions[node.id] || { x: 0, y: 0 };
    return {
      ...node,
      position: pos,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  return { nodes: layoutedNodes, edges };
};