import { GoogleGenAI } from "@google/genai";
import { GeneratedBlueprint, BPNode, BPEdge } from "../types";

// Helper to safely get Env vars in both Vite (import.meta) and Webpack/Node (process.env)
const getEnvVar = (key: string): string | undefined => {
  try {
    // Vite / Modern Browsers
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    // Webpack / Node
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

// Helper to inject missing pins for standard nodes if the AI forgets them
const ensureDefaultPins = (node: any) => {
  const label = node.label || "";
  const type = node.nodeType;
  
  if (!node.inputs) node.inputs = [];
  if (!node.outputs) node.outputs = [];

  // SKIP PURE NODES: Don't inject Exec pins into Getters, Math, or Questions
  // This ensures they stay Green (Pure) instead of turning Blue (Impure)
  const isLikelyPure = 
     type === 'variable_get' ||
     label.startsWith('Get ') ||
     label.startsWith('Make ') ||
     label.startsWith('Break ') ||
     label.startsWith('Is ') ||
     label.startsWith('Find ') ||
     label.startsWith('Select ') ||
     label.includes('Math') ||
     label.includes('+') ||
     label.includes('-');

  // 1. BRANCH / IF
  if (label === "Branch" || label === "If") {
     if (!node.inputs.some((p:any) => p.type === 'exec')) {
        node.inputs.unshift({ id: `${node.id}_Exec`, name: "Exec", type: 'exec' });
     }
     if (!node.inputs.some((p:any) => p.type === 'boolean')) {
        node.inputs.push({ id: `${node.id}_Condition`, name: "Condition", type: 'boolean' });
     }
     if (!node.outputs.some((p:any) => p.name === 'True')) {
        node.outputs.push({ id: `${node.id}_True`, name: "True", type: 'exec' });
     }
     if (!node.outputs.some((p:any) => p.name === 'False')) {
        node.outputs.push({ id: `${node.id}_False`, name: "False", type: 'exec' });
     }
     return node;
  }

  // 2. EVENTS
  if (type === 'event' || label.startsWith('Event') || label.startsWith('On ') || label.startsWith('Input')) {
     if (!node.outputs.some((p:any) => p.type === 'exec')) {
         node.outputs.unshift({ id: `${node.id}_Output`, name: "Output", type: 'exec' });
     }
     return node;
  }

  // 3. SEQUENCE
  if (label === "Sequence") {
     if (!node.inputs.some((p:any) => p.type === 'exec')) {
         node.inputs.unshift({ id: `${node.id}_Exec`, name: "Exec", type: 'exec' });
     }
     if (node.outputs.length < 2) {
         node.outputs.push({ id: `${node.id}_Then0`, name: "Then 0", type: 'exec' });
         node.outputs.push({ id: `${node.id}_Then1`, name: "Then 1", type: 'exec' });
     }
     return node;
  }

  // 4. SET VARIABLE
  if (type === 'variable_set' || label.startsWith('Set ')) {
      if (!node.inputs.some((p:any) => p.type === 'exec')) {
          node.inputs.unshift({ id: `${node.id}_Exec`, name: "Exec", type: 'exec' });
      }
      if (!node.outputs.some((p:any) => p.type === 'exec')) {
          node.outputs.unshift({ id: `${node.id}_Output`, name: "Output", type: 'exec' });
      }
      return node;
  }

  // 5. GET VARIABLE
  if (type === 'variable_get') {
      if (node.inputs.length > 0 && node.outputs.length === 0) {
          node.outputs = [...node.inputs];
          node.inputs = [];
      }
      if (node.outputs.length === 0) {
          node.outputs.push({ id: `${node.id}_Value`, name: "Value", type: 'boolean' });
      }
      return node;
  }

  // 6. FOR LOOP
  if (label === "For Loop" || label === "ForEach Loop") {
      if (!node.inputs.some((p:any) => p.type === 'exec')) {
          node.inputs.unshift({ id: `${node.id}_Exec`, name: "Exec", type: 'exec' });
      }
      if (!node.outputs.some((p:any) => p.name === 'Loop Body')) {
          node.outputs.push({ id: `${node.id}_LoopBody`, name: "Loop Body", type: 'exec' });
      }
      if (!node.outputs.some((p:any) => p.name === 'Completed')) {
          node.outputs.push({ id: `${node.id}_Completed`, name: "Completed", type: 'exec' });
      }
      return node;
  }

  // 7. GENERIC EXECUTION NODES
  // Only inject Exec pins if it's NOT a pure node and NOT a comment
  if (!isLikelyPure && type !== 'comment' && type !== 'variable_get') {
      if (!node.inputs.some((p:any) => p.type === 'exec')) {
          node.inputs.unshift({ id: `${node.id}_Exec`, name: "Exec", type: 'exec' });
      }
      if (!node.outputs.some((p:any) => p.type === 'exec')) {
          node.outputs.unshift({ id: `${node.id}_Output`, name: "Output", type: 'exec' });
      }
  }

  return node;
};

export const generateBlueprint = async (prompt: string): Promise<GeneratedBlueprint> => {
  // PRIORITY: 
  // 1. LocalStorage (User entered key)
  // 2. Vite Env Var (Local Dev)
  // 3. Process Env Var (Node/Webpack)
  const apiKey = localStorage.getItem("BLUEPRINT_VIBE_GEMINI_KEY") || 
                 localStorage.getItem("BLUEPRINT_VIBE_API_KEY") || 
                 getEnvVar("VITE_GEMINI_API_KEY") ||
                 getEnvVar("API_KEY");
  
  // SPECIFIC ERROR MESSAGE: This string is checked in App.tsx to auto-open settings
  if (!apiKey) {
      throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a world-class Unreal Engine 5.3 Senior Gameplay Programmer. Your primary goal is to generate **100% correct and accurate** Blueprint graphs and C++ code.

    **LOGIC VERIFICATION PROTOCOL (MANDATORY)**:
    Before outputting JSON, you must perform a silent, internal review of your generated logic. Follow these steps:
    1.  **Requirement Mapping**: Re-read the user's prompt. Does your graph address every single part of their request?
    2.  **Execution Flow Analysis**: Trace the white "Exec" wires from the starting Event node. Does the flow make logical sense? Are there any dead ends or infinite loops that are not intentional?
    3.  **API Validation**: For every function node (e.g., "Get Actor Location", "Apply Damage"), confirm that this function exists on the assumed 'targetClass' (e.g., 'AActor', 'ACharacter'). Verify the pin names and data types match the official Unreal Engine 5.3 documentation. If a function doesn't exist, state that it's not possible or use a known alternative.
    4.  **Data Flow Analysis**: Trace the colored data wires. Is the output of one node a valid input for the next? (e.g., you cannot plug a Vector into a Boolean).
    5.  **Correction**: If you find any errors during this review, you MUST correct them before generating the final JSON output. This self-correction phase is critical for accuracy.

    **CRITICAL C++ COMPLIANCE INSTRUCTIONS (STRICT)**:
    1.  **COMPILER SIMULATION**: Verify that every class, function, and macro exists in the Unreal Engine 5.3 API.
    2.  **HEADER MANDATE**: You MUST include the specific headers for every class used (e.g., "Components/CapsuleComponent.h").
    3.  **CONTEXT**: Code is within 'AGeneratedActor'. Use 'GetWorld()', 'GetController()' correctly. For components, use 'GetOwner()->...'.
    4.  **NAMING**: Booleans 'bIsActive', Classes 'U', Actors 'A', Enums 'E'.
    5.  **NO HALLUCINATIONS**: Do not invent functions.

    **STRICT JSON OUTPUT RULES**:
    1. Output MUST be valid JSON.
    2. **ALL Keys MUST be enclosed in double quotes** (e.g., "nodes": ...).
    3. All string values MUST be double-quoted.
    4. **NO Trailing commas**.
    5. **NO Comments** inside the JSON structure.
    6. **NO Markdown** code blocks (e.g. \`\`\`json).

    **CRITICAL EDGE GENERATION RULES**:
    1. **PIN IDs MUST BE EXPLICIT**: Every input and output pin MUST have a unique 'id' field. 
       - Convention: "{NodeID}_{PinName}" (e.g., "Branch1_True", "Event1_Output").
    2. **EDGES MUST MATCH PIN IDs**: The 'sourceHandle' of an edge MUST match an 'id' in the source node's 'outputs'. The 'targetHandle' MUST match an 'id' in the target node's 'inputs'.
    3. If these IDs do not match exactly, the link will be invisible.

    **COMMON MISTAKES TO AVOID**:
    - For "Branch", you MUST include outputs "True" and "False".
    - For "Sequence", you MUST include outputs "Then 0", "Then 1", etc.
    - For "Variable Set", you MUST include an Exec input and an Exec output.
    - **Summary**: Must be point-form (bullet points).

    **JSON STRUCTURE EXAMPLE (Connected Logic)**:
    {
      "nodes": [
        { 
          "id": "Event1", 
          "label": "Event BeginPlay", 
          "nodeType": "event", 
          "inputs": [], 
          "outputs": [{"id":"Event1_ExecOut","name":"Output","type":"exec"}] 
        }
      ],
      "edges": [],
      "variables": [],
      "functions": [],
      "targetClass": "BP_PlayerCharacter",
      "cppCode": "#include \"GeneratedActor.h\"\\n// Code...",
      "summary": "- Logic step 1\\n- Logic step 2"
    }

    **TARGET CLASS IDENTIFICATION**:
    Identify the most appropriate Blueprint Class name for this logic based on the user's request.
    - If logic implies a player, use "BP_Player" or "BP_Character".
    - If logic implies an enemy, use "BP_Enemy".
    - If generic, use "BP_GeneratedActor".
    - Field: "targetClass".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.05, // Lowered for maximum predictability and accuracy
      }
    });

    let result = response.text || "";
    
    // Cleanup JSON
    result = result.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = result.indexOf('{');
    const lastBrace = result.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      result = result.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error("No JSON object found in response");
    }

    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      console.warn("Initial parse failed, attempting to fix trailing commas...");
      result = result.replace(/,(\s*[}\]])/g, '$1');
      try {
        parsed = JSON.parse(result);
      } catch (e2) {
         throw new Error(`JSON Parse Failed: ${(e2 as Error).message}`);
      }
    }
    
    const transformedNodes: BPNode[] = (parsed.nodes || []).map((node: any) => {
      const enrichedNode = ensureDefaultPins(node);
      return {
        id: enrichedNode.id,
        type: 'customBlueprintNode',
        position: { x: 0, y: 0 }, 
        data: {
            label: enrichedNode.label,
            nodeType: enrichedNode.nodeType,
            inputs: enrichedNode.inputs || [],
            outputs: enrichedNode.outputs || [],
            comment: enrichedNode.comment
        }
      };
    });

    const validEdges: BPEdge[] = (parsed.edges || []).map((edge: any, index: number) => {
        const sourceNode = transformedNodes.find(n => n.id === edge.source);
        const targetNode = transformedNodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) return null;

        let finalSourceHandle = edge.sourceHandle;
        let finalTargetHandle = edge.targetHandle;

        const sourceHandleStr = finalSourceHandle ? String(finalSourceHandle).toLowerCase() : "";
        const sourcePinExists = finalSourceHandle && sourceNode.data.outputs.some(p => p.id === finalSourceHandle);
        
        if (!sourcePinExists) {
            const isExecLike = !finalSourceHandle || sourceHandleStr.includes('exec') || sourceHandleStr.includes('then') || sourceHandleStr.includes('true') || sourceHandleStr.includes('out');
            
            if (isExecLike) {
                 const execPin = sourceNode.data.outputs.find(p => p.type === 'exec');
                 if (execPin) finalSourceHandle = execPin.id;
                 else if (sourceNode.data.outputs.length > 0) finalSourceHandle = sourceNode.data.outputs[0].id;
            } else {
                 if (sourceNode.data.outputs.length > 0) {
                     finalSourceHandle = sourceNode.data.outputs[0].id;
                 }
            }
        }

        const targetHandleStr = finalTargetHandle ? String(finalTargetHandle).toLowerCase() : "";
        const targetPinExists = finalTargetHandle && targetNode.data.inputs.some(p => p.id === finalTargetHandle);
        
        if (!targetPinExists) {
             const isExecLike = !finalTargetHandle || targetHandleStr.includes('exec');
             if (isExecLike) {
                 const execPin = targetNode.data.inputs.find(p => p.type === 'exec');
                 if (execPin) finalTargetHandle = execPin.id;
                 else if (targetNode.data.inputs.length > 0) finalTargetHandle = targetNode.data.inputs[0].id;
             } else {
                 if (targetNode.data.inputs.length > 0) {
                     finalTargetHandle = targetNode.data.inputs[0].id;
                 }
             }
        }

        const edgeId = edge.id || `e_${edge.source}_${edge.target}_${index}`;
        if (!finalSourceHandle || !finalTargetHandle) return null;

        return {
            id: edgeId,
            source: edge.source,
            target: edge.target,
            sourceHandle: finalSourceHandle,
            targetHandle: finalTargetHandle,
            type: 'default',
            animated: false
        };
    }).filter((e: BPEdge | null) => e !== null);

    return {
        nodes: transformedNodes,
        edges: validEdges,
        summary: parsed.summary || "No summary provided.",
        cppCode: parsed.cppCode || "// No C++ code generated.",
        targetClass: parsed.targetClass || "BP_GeneratedActor",
        variables: parsed.variables || [],
        functions: parsed.functions || [],
        sources: parsed.sources || []
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(`${error instanceof Error ? error.message : "Unknown error"}`);
  }
};