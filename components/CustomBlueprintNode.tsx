import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow, useHandleConnections } from '@xyflow/react';
import { BlueprintNodeData, NodeType, PinType, BPNode, UE_COLORS } from '../types';
import { Zap, Layers } from 'lucide-react';

// --- Helper Components ---

const PinIcon = ({ type, isConnected }: { type: PinType; isConnected: boolean }) => {
  
  // Exec Pin (Wedge Arrow) - Authentic UE5 Shape
  if (type === PinType.Exec) {
    return (
      <svg width="14" height="14" viewBox="0 0 12 14" fill="none" className="mr-2 shrink-0 transition-all">
        <path 
          d="M 1 1 H 7 L 11 7 L 7 13 H 1 V 1 Z" 
          fill={isConnected ? "white" : "none"} 
          stroke="white" 
          strokeWidth="1.2" 
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Data Pins (Circles)
  let color = UE_COLORS.Default;
  let fill = "none";

  switch (type) {
    case PinType.Boolean: color = UE_COLORS.BooleanConnected; break;
    case PinType.Integer: color = UE_COLORS.Integer; break;
    case PinType.Float: color = UE_COLORS.Float; break;
    case PinType.String: color = UE_COLORS.String; break;
    case PinType.Vector: color = UE_COLORS.Vector; break;
    case PinType.Rotator: color = UE_COLORS.Rotator; break;
    case PinType.Object: color = UE_COLORS.Object; break;
    case PinType.Class: color = UE_COLORS.Class; break;
    case PinType.Struct: color = UE_COLORS.Struct; break;
    case PinType.Byte: color = UE_COLORS.Byte; break;
    case PinType.Name: color = UE_COLORS.Name; break;
    case PinType.Text: color = UE_COLORS.Text; break;
    case PinType.Delegate: color = UE_COLORS.Delegate; break;
  }

  if (isConnected) {
    fill = color;
  }

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-2 shrink-0 transition-all">
       <circle cx="6" cy="6" r="3.5" stroke={color} strokeWidth="1.5" fill={fill} />
       {type === PinType.Object && isConnected && <circle cx="6" cy="6" r="1.5" fill={color} />}
    </svg>
  );
};

interface BlueprintPinProps {
  nodeId: string;
  pin: { id: string; name: string; type: PinType; value?: string };
  side: 'input' | 'output';
  onPinClick: (e: React.MouseEvent, id: string) => void;
  onValueChange: (id: string, val: string) => void;
  compact?: boolean; // For Variable Get nodes
}

const BlueprintPin: React.FC<BlueprintPinProps> = ({ 
  nodeId, 
  pin, 
  side, 
  onPinClick,
  onValueChange,
  compact
}) => {
  const connections = useHandleConnections({
    type: side === 'input' ? 'target' : 'source',
    id: pin.id,
  });
  
  const isConnected = connections.length > 0;
  const showInput = !compact && side === 'input' && !isConnected && pin.type !== PinType.Exec;
  
  // Hide label for standard Exec/Output/ReturnValue pins to clean up UI (Standard UE behavior)
  const isStandardPin = (pin.name === 'Exec' || pin.name === 'Output' || pin.name === 'ReturnValue' || pin.name === 'Then');
  const displayName = isStandardPin && pin.type === PinType.Exec ? '' : pin.name;

  return (
    <div 
      className={`relative flex items-center min-h-[26px] group cursor-pointer ${side === 'output' ? 'flex-row-reverse' : ''}`}
      onMouseDown={(e) => onPinClick(e, pin.id)}
    >
      <Handle
        type={side === 'input' ? 'target' : 'source'}
        position={side === 'input' ? Position.Left : Position.Right}
        id={pin.id}
        className="!w-4 !h-4 !bg-transparent !border-0 !top-1/2 !-translate-y-1/2 z-10"
        style={{ 
           left: side === 'input' ? '-12px' : 'auto',
           right: side === 'output' ? '-12px' : 'auto',
        }}
      />

      <div className="z-0 flex items-center">
        <PinIcon type={pin.type} isConnected={isConnected} />
      </div>

      {displayName && !compact && (
        <span className="text-[11.5px] text-[#eee] tracking-normal antialiased whitespace-nowrap mx-0.5 font-normal" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {displayName}
        </span>
      )}

      {/* Authentic UE5 Input Fields */}
      {showInput && (
         <div className="nodrag flex items-center ml-2" onMouseDown={(e) => e.stopPropagation()}>
            {pin.type === PinType.Boolean ? (
               <div className="w-4 h-4 border border-neutral-600 bg-[#151515] rounded-[3px] flex items-center justify-center hover:border-white/50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onValueChange(pin.id, pin.value === 'true' ? 'false' : 'true'); }}>
                   {pin.value === 'true' && <div className="w-2.5 h-2.5 bg-red-600 rounded-[1px]" />}
               </div>
            ) : (pin.type === PinType.Integer || pin.type === PinType.Float) ? (
               <div className="relative group/input">
                 <input 
                    type="text" 
                    value={pin.value || '0.0'}
                    onChange={(e) => onValueChange(pin.id, e.target.value)}
                    className="w-16 h-[18px] bg-[#080808] border border-white/10 text-[11px] text-[#a0a0a0] px-1 rounded-[3px] focus:border-[#00a6f0] focus:text-white focus:bg-black focus:outline-none font-mono text-right transition-colors"
                 />
                 <div className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-50 pointer-events-none">
                   <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-white mb-[1px]"></div>
                   <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[3px] border-b-white"></div>
                 </div>
               </div>
            ) : (
              <input 
                  type="text" 
                  value={pin.value || ''}
                  onChange={(e) => onValueChange(pin.id, e.target.value)}
                  className="w-24 h-[18px] bg-[#080808] border border-white/10 text-[11px] text-[#a0a0a0] px-1.5 rounded-[3px] focus:border-[#00a6f0] focus:text-white focus:bg-black focus:outline-none transition-colors"
               />
            )}
         </div>
      )}
    </div>
  );
};

const CustomBlueprintNode = ({ id, data }: NodeProps<BPNode>) => {
  const { setEdges, setNodes } = useReactFlow<BPNode>();

  const handlePinClick = useCallback((e: React.MouseEvent, handleId: string) => {
    if (e.altKey) {
        e.stopPropagation();
        e.preventDefault();
        setEdges((edges) => edges.filter((edge) => edge.sourceHandle !== handleId && edge.targetHandle !== handleId));
    }
  }, [setEdges]);

  const handleValueChange = useCallback((pinId: string, newValue: string) => {
     setNodes((nodes) => nodes.map(node => {
        if (node.id !== id) return node;
        const newInputs = node.data.inputs.map(input => 
            input.id === pinId ? { ...input, value: newValue } : input
        );
        return { ...node, data: { ...node.data, inputs: newInputs } };
     }));
  }, [setNodes, id]);

  // --- Styling Heuristics ---
  let effectiveNodeType = data.nodeType;
  const label = data.label || "";

  const FLOW_CONTROL_KEYWORDS = ['Branch', 'Sequence', 'DoOnce', 'DoN', 'FlipFlop', 'ForLoop', 'Gate', 'MultiGate', 'WhileLoop', 'Macro', 'ForEach'];
  if (FLOW_CONTROL_KEYWORDS.some(kw => label.includes(kw))) {
    effectiveNodeType = NodeType.FlowControl;
  }
  if (label.startsWith("Event") || label.startsWith("Input") || label.startsWith("On ")) {
    effectiveNodeType = NodeType.Event;
  }
  if (label.includes("Input Action") || label.includes("InputAxis")) {
    effectiveNodeType = NodeType.InputEvent;
  }

  const isVariableGet = effectiveNodeType === NodeType.VariableGet;
  const isVariableSet = effectiveNodeType === NodeType.VariableSet;
  
  let variableColorHex = UE_COLORS.Default;
  
  // Attempt to find variable color from pins
  if (isVariableGet || isVariableSet) {
    const targetPin = isVariableGet ? data.outputs[0] : data.inputs.find(p => p.type !== PinType.Exec);
    if (targetPin) {
        switch (targetPin.type) {
            case PinType.Boolean: variableColorHex = UE_COLORS.Boolean; break;
            case PinType.Integer: variableColorHex = UE_COLORS.Integer; break;
            case PinType.Float: variableColorHex = UE_COLORS.Float; break;
            case PinType.String: variableColorHex = UE_COLORS.String; break;
            case PinType.Vector: variableColorHex = UE_COLORS.Vector; break;
            case PinType.Rotator: variableColorHex = UE_COLORS.Rotator; break;
            case PinType.Object: variableColorHex = UE_COLORS.Object; break;
            case PinType.Class: variableColorHex = UE_COLORS.Class; break;
            case PinType.Struct: variableColorHex = UE_COLORS.Struct; break;
            case PinType.Byte: variableColorHex = UE_COLORS.Byte; break;
            case PinType.Name: variableColorHex = UE_COLORS.Name; break;
            case PinType.Text: variableColorHex = UE_COLORS.Text; break;
        }
    }
  }

  // --- Compact Variable GET (Pill) ---
  if (isVariableGet) {
    return (
      <div className="
        min-w-[100px] h-[32px] pl-3 pr-2 rounded-full
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)] border
        font-sans select-none flex items-center justify-between gap-3
        bg-gradient-to-b from-[#333] to-[#111]
        hover:brightness-110 transition-all
      "
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="absolute inset-0 rounded-full opacity-30 pointer-events-none" 
             style={{ background: `linear-gradient(90deg, ${variableColorHex} 0%, transparent 60%)` }}></div>
        
        <span className="text-white font-semibold text-[11px] tracking-wide drop-shadow-md whitespace-nowrap relative z-10 pt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {label}
        </span>
        
        {data.outputs.map((pin) => (
           <BlueprintPin key={pin.id} nodeId={id} pin={pin} side="output" onPinClick={handlePinClick} onValueChange={handleValueChange} compact={true} />
        ))}
      </div>
    );
  }

  // --- Standard Node Styling ---
  // Authentic UE5 Colors
  const COLORS = {
     Function: { bg: '#19457E', border: '#5c9aff' },
     PureFunction: { bg: '#376F37', border: '#8f8' },
     Event: { bg: '#8F0000', border: '#ff6b6b' },
     Input: { bg: '#8F0000', border: '#ff6b6b' }, // Input Actions are red
     Macro: { bg: '#505050', border: '#aaa' },
     VariableSet: { bg: variableColorHex, border: variableColorHex }
  };

  let activeStyle = COLORS.Function;
  let icon = <span className="text-[#a0c0ff] font-serif italic font-black text-sm mr-2 drop-shadow">f</span>;
  const isPure = !data.inputs.some(p => p.type === PinType.Exec) && !data.outputs.some(p => p.type === PinType.Exec);

  switch (effectiveNodeType) {
    case NodeType.Event:
    case NodeType.InputEvent:
      activeStyle = COLORS.Event;
      icon = <Zap size={14} className="text-red-100 mr-2 fill-white/20 drop-shadow" />;
      break;
    case NodeType.FlowControl:
    case NodeType.Macro:
      activeStyle = COLORS.Macro;
      icon = <Layers size={14} className="text-gray-300 mr-2 drop-shadow" />;
      break;
    case NodeType.VariableSet:
      activeStyle = COLORS.VariableSet;
      icon = <span className="text-white font-bold text-[10px] mr-2">SET</span>;
      break;
    default:
      if (isPure) {
         activeStyle = COLORS.PureFunction;
         icon = <span className="text-[#baffba] font-serif italic font-black text-sm mr-2 drop-shadow">f</span>;
      }
      break;
  }

  return (
    <div className="min-w-[160px] rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.6)] bg-[#111]/90 font-sans border border-black/80 group backdrop-blur-sm">
      
      {/* Header */}
      <div 
        className="relative px-3 py-1.5 flex items-center rounded-t-[7px] overflow-hidden border-t border-white/20"
        style={{
            background: effectiveNodeType === NodeType.VariableSet 
              ? `linear-gradient(to bottom, ${activeStyle.bg}cc, ${activeStyle.bg}66)`
              : `linear-gradient(to bottom, ${activeStyle.bg}, ${activeStyle.bg}CC)`,
        }}
      >
        {/* Authentic Glossy Tube Effect */}
        <div className="absolute top-0 left-0 right-0 h-[50%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
        
        {icon}
        {/* Font Weight adjusted from Bold (700) to Semibold (600) for cleanliness */}
        <span className="text-white font-semibold text-[12px] tracking-wide truncate relative z-10 pt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 flex justify-between gap-8 relative bg-[#111]/95 rounded-b-lg">
         {/* Background Stripe for aesthetics */}
         <div className="absolute top-0 left-0 w-full h-[1px] bg-black/50"></div>

        {/* Inputs */}
        <div className="flex flex-col gap-2 min-w-[20px] py-1">
            {data.inputs.map((pin) => (
              <BlueprintPin key={pin.id} nodeId={id} pin={pin} side="input" onPinClick={handlePinClick} onValueChange={handleValueChange} />
            ))}
        </div>
        {/* Outputs */}
        <div className="flex flex-col gap-2 min-w-[20px] items-end text-right py-1">
             {data.outputs.map((pin) => (
              <BlueprintPin key={pin.id} nodeId={id} pin={pin} side="output" onPinClick={handlePinClick} onValueChange={handleValueChange} />
            ))}
        </div>
      </div>

      {data.comment && (
         <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#e4e4e4]/10 text-[#eee] text-[10px] rounded-sm border border-white/10 backdrop-blur-md">
            {data.comment}
         </div>
      )}
    </div>
  );
};

export default memo(CustomBlueprintNode);