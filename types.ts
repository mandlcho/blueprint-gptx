import { Node, Edge } from '@xyflow/react';

export enum PinType {
  Exec = 'exec',
  Boolean = 'boolean',
  Integer = 'integer',
  Float = 'float',
  String = 'string',
  Vector = 'vector',
  Rotator = 'rotator',
  Object = 'object',
  Class = 'class',
  Struct = 'struct',
  Byte = 'byte',
  Name = 'name',
  Text = 'text',
  Delegate = 'delegate'
}

// UE5 Standard Colors
export const UE_COLORS = {
  Exec: '#FFFFFF',
  Boolean: '#8C0000', 
  BooleanConnected: '#920101',
  Integer: '#00E5CA', // Cyan
  Float: '#35D039',   // Green
  String: '#E900EB',  // Magenta
  Vector: '#FDC31F',  // Gold
  Rotator: '#9999FF', // Periwinkle
  Object: '#00A8F6',  // Blue (Official UE Object Color)
  Class: '#5800A5',   // Purple
  Struct: '#005090',  // Dark Blue
  Byte: '#006575',
  Name: '#C671FF',
  Text: '#E27294',
  Delegate: '#FF3838',
  Default: '#9ca3af'
};

export enum NodeType {
  Event = 'event',
  InputEvent = 'input_event',
  Function = 'function',
  Macro = 'macro',
  VariableGet = 'variable_get',
  VariableSet = 'variable_set',
  FlowControl = 'flow_control'
}

export interface PinDefinition {
  id: string;
  name: string;
  type: PinType;
  isOutput: boolean;
  defaultValue?: string;
  value?: string; // Current user-editable value
}

export interface BlueprintNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
  comment?: string;
}

// React Flow specific types
export type BPNode = Node<BlueprintNodeData>;
export type BPEdge = Edge;

export interface BlueprintVariable {
  id: string;
  name: string;
  type: PinType;
  defaultValue?: string;
}

export interface BlueprintFunction {
  id: string;
  name: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
}

export interface GeneratedBlueprint {
  nodes: BPNode[];
  edges: BPEdge[];
  summary: string;
  cppCode?: string; // C++ Representation of the logic
  targetClass?: string; // e.g. "BP_Player", "BP_Enemy"
  sources?: Array<{
    title: string;
    url: string;
  }>;
  variables?: BlueprintVariable[];
  functions?: BlueprintFunction[];
}