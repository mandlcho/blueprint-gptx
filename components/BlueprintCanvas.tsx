import React from 'react';
import { 
  ReactFlow, 
  Background, 
  BackgroundVariant, 
  ConnectionLineType,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnReconnect,
  NodeMouseHandler,
  EdgeMouseHandler,
  SelectionMode
} from '@xyflow/react';
import CustomBlueprintNode from './CustomBlueprintNode';
import { BPNode } from '../types';

interface BlueprintCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect?: OnReconnect;
  onReconnectStart?: () => void;
  onReconnectEnd?: (event: MouseEvent | TouchEvent, edge: Edge) => void;
  onEdgeClick?: EdgeMouseHandler;
  onNodeClick?: NodeMouseHandler;
  onPaneClick?: () => void;
}

const nodeTypes = {
  customBlueprintNode: CustomBlueprintNode,
};

const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onConnect, 
  onReconnect, 
  onReconnectStart,
  onReconnectEnd,
  onEdgeClick,
  onNodeClick,
  onPaneClick
}) => {

  return (
    <div 
      className="w-full h-full bg-[#1A1A1A]" 
      onContextMenu={(e) => e.preventDefault()} // Prevent browser context menu
    >
      <ReactFlow<BPNode>
        nodes={nodes as BPNode[]}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        snapToGrid={true}
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }} 
        
        /* UE5 Mouse Behavior */
        panOnDrag={[2]}        
        selectionOnDrag={true} 
        panOnScroll={false}    
        zoomOnScroll={true}    
        selectionMode={SelectionMode.Partial}

        defaultEdgeOptions={{
            type: 'default', 
            animated: false,
            style: { stroke: '#fff', strokeWidth: 2.5 },
        }}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#fff', strokeWidth: 2 }}
      >
        <Background 
            variant={BackgroundVariant.Lines} 
            color="#262626" 
            gap={16} 
            size={1} 
        />
        <Background 
            variant={BackgroundVariant.Lines} 
            color="#000" 
            gap={128} 
            size={2} 
            className="opacity-40"
        />
      </ReactFlow>
    </div>
  );
};

export default BlueprintCanvas;