<script lang="ts">
  import { SvelteFlow, Controls, Background, BackgroundVariant, MiniMap, Position } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { writable } from 'svelte/store';
  import { setContext } from 'svelte';
  import { onMount } from 'svelte';

  // Custom node component with delete button
  import CustomNode from './CustomNode.svelte';

  const nodeTypes = {
    custom: CustomNode
  };

  const nodeDefaults = {
    sourcePosition: Position.Right,
    targetPosition: Position.Left, 
  };

  const initialNodes = [
    // Offers column (left)
    {
      id: 'offer1',
      type: 'custom',
      data: { label: '$250' },
      position: { x: 0, y: 250 },
      ...nodeDefaults
    },
    {
      id: 'offer2',
      type: 'custom',
      data: { label: '€3000' },
      position: { x: 50, y: 350 },
      ...nodeDefaults
    },
    {
      id: 'offer3',
      type: 'custom',
      data: { label: '€1200' },
      position: { x: 50, y: 450 },
      ...nodeDefaults
    },
    {
      id: 'offer4',
      type: 'custom',
      data: { label: '₺990' },
      position: { x: 50, y: 550 },
      ...nodeDefaults
    },
    
    // Processes column (middle)
    {
      id: 'process1',
      type: 'custom',
      data: { label: 'Euro to GBP Conversion' },
      position: { x: 300, y: 300 },
      ...nodeDefaults
    },
    {
      id: 'process2',
      type: 'custom',
      data: { label: 'YEN to JPY Conversion' },
      position: { x: 300, y: 400 },
      ...nodeDefaults
    },
    {
      id: 'process3',
      type: 'custom',
      data: { label: 'BANK Transfer' },
      position: { x: 300, y: 500 },
      ...nodeDefaults
    },
    
    // Requests column (right)
    {
      id: 'request1',
      type: 'custom',
      data: { label: '$100' },
      position: { x: 550, y: 250 },
      ...nodeDefaults
    },
    {
      id: 'request2',
      type: 'custom',
      data: { label: '£200' },
      position: { x: 550, y: 450 },
      ...nodeDefaults
    },
    {
      id: 'request3',
      type: 'custom',
      data: { label: '¥15000' },
      position: { x: 550, y: 550 },
      ...nodeDefaults
    },
    {
      id: 'request4',
      type: 'custom',
      data: { label: '₺800' },
      position: { x: 550, y: 650 },
      ...nodeDefaults 
    }
  ];

  const initialEdges = [
    // Wood and Labor to Furniture Making
    {
      id: 'offer1-process1',
      type: 'default',
      source: 'offer1',
      target: 'process1'
    },
    {
      id: 'offer3-process1',
      type: 'default',
      source: 'offer3',
      target: 'process1'
    },
    
    // Furniture Making to Chair and Table requests
    {
      id: 'process1-request1',
      type: 'default',
      source: 'process1',
      target: 'request1'
    },
    {
      id: 'process1-request2',
      type: 'default',
      source: 'process1',
      target: 'request2'
    },
    
    // Wood, Steel, and Labor to Construction
    {
      id: 'offer1-process2',
      type: 'default',
      source: 'offer1',
      target: 'process2'
    },
    {
      id: 'offer2-process2',
      type: 'default',
      source: 'offer2',
      target: 'process2'
    },
    {
      id: 'offer3-process2',
      type: 'default',
      source: 'offer3',
      target: 'process2'
    },
    
    // Construction to House request
    {
      id: 'process2-request3',
      type: 'default',
      source: 'process2',
      target: 'request3'
    },
    
    // Steel and Tools to Metalworking
    {
      id: 'offer2-process3',
      type: 'default',
      source: 'offer2',
      target: 'process3'
    },
    {
      id: 'offer4-process3',
      type: 'default',
      source: 'offer4',
      target: 'process3'
    },
    
    // Metalworking to Tool request
    {
      id: 'process3-request4',
      type: 'default',
      source: 'process3',
      target: 'request4'
    }
  ];

  // Create reactive stores for nodes and edges
  let nodes = initialNodes;
  let edges = initialEdges;
  let processCounter = 4; // Start from 4 since we have process1, process2, process3

  // Load nodes and positions from localStorage on component mount
  function loadNodesFromStorage() {
    if (typeof window !== 'undefined') {
      const savedNodes = localStorage.getItem('flowNodes');
      if (savedNodes) {
        try {
          const parsedNodes = JSON.parse(savedNodes);
          nodes = parsedNodes;
        } catch (error) {
          console.error('Error loading nodes from storage:', error);
          // Fallback to initial nodes if parsing fails
          nodes = initialNodes;
        }
      }
    }
  }

  // Save entire nodes array to localStorage
  function saveNodesToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flowNodes', JSON.stringify(nodes));
      localStorage.setItem('flowEdges', JSON.stringify(edges));
    }
  }

  // Load edges from localStorage
  function loadEdgesFromStorage() {
    if (typeof window !== 'undefined') {
      const savedEdges = localStorage.getItem('flowEdges');
      if (savedEdges) {
        try {
          const parsedEdges = JSON.parse(savedEdges);
          edges = parsedEdges;
        } catch (error) {
          console.error('Error loading edges from storage:', error);
          // Fallback to initial edges if parsing fails
          edges = initialEdges;
        }
      }
    }
  }

  // Legacy function for backwards compatibility - now saves entire nodes and edges
  function savePositionsToStorage() {
    saveNodesToStorage();
  }

  // Legacy function for backwards compatibility - now loads entire nodes and edges
  function loadPositionsFromStorage() {
    loadNodesFromStorage();
    loadEdgesFromStorage();
  }

  // Load positions on mount
  loadPositionsFromStorage();

  // Handle node deletion
  function deleteNode(nodeId: string) {
    // Don't allow deletion of original offers and requests
    const isOriginalNode = nodeId.startsWith('offer') || nodeId.startsWith('request');
    if (isOriginalNode) {
      alert('Cannot delete original offers and requests. Only dynamically created process nodes can be deleted.');
      return;
    }

    // if (confirm(`Delete node ${nodeId}?`)) {
      // Remove the node
      nodes = nodes.filter(node => node.id !== nodeId);
      
      // Remove all edges connected to this node
      edges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
      
      // Save updated nodes to localStorage
      saveNodesToStorage();
    // }
  }

  // Set context for custom nodes to access delete function
  setContext('deleteNode', deleteNode);

  // Function to find a compatible process (returns one or more process names)
  function findCompatibleProcess(): string[] {
    // const processes = ['Furniture Making', 'Construction', 'Metalworking', 'Assembly', 'Crafting', 'Manufacturing', 'Processing', 'Transformation'];
    const processes = ['USD to EURO Conversion', 'EURO to GBP Conversion', 'GBP to JPY Conversion', 'BANK Transfer', 'WISE transfer', 'PayPal Transfer'];
    
    // 70% chance of single process, 30% chance of multiple processes
    const shouldReturnMultiple = Math.random() < 0.3;
    
    if (shouldReturnMultiple) {
      // Return 2-3 processes
      const count = Math.random() < 0.5 ? 2 : 3;
      const selectedProcesses: string[] = [];
      const availableProcesses = [...processes];
      
      for (let i = 0; i < count && availableProcesses.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableProcesses.length);
        selectedProcesses.push(availableProcesses.splice(randomIndex, 1)[0]);
      }
      
      return selectedProcesses;
    } else {
      // Return single process
      const randomIndex = Math.floor(Math.random() * processes.length);
      return [processes[randomIndex]];
    }
  }

  // Function to create new process node(s) - can create a chain if multiple processes
  function createNewProcess(sourceY: number, targetY: number): string[] {
    const processNames = findCompatibleProcess();
    const processIds: string[] = [];
    
    // Calculate vertical position for the process chain
    const chainY = (sourceY + targetY) / 2;
    
    // Calculate starting X position with offset for existing processes
    let baseX = 300;
    const existingAtY = nodes.filter(node => 
      Math.abs(node.position.y - chainY) < 50 && 
      node.position.x >= 250 && node.position.x <= 500
    );
    if (existingAtY.length > 0) {
      baseX = 300 + (existingAtY.length * 200); // Offset by 200px for each existing process chain
    }
    
    // Create each process node in the chain
    processNames.forEach((processName, index) => {
      const processId = `process${processCounter}`;
      processCounter++;
      
      // Position processes horizontally in a chain, 150px apart
      const processX = baseX + (index * 150);
      
      const newProcessNode = {
        id: processId,
        type: 'custom',
        data: { label: processName },
        position: { x: processX, y: chainY },
        ...nodeDefaults
      };
      
      // Add the new process node to the nodes array
      nodes = [...nodes, newProcessNode];
      processIds.push(processId);
    });
    
    // Save updated nodes to localStorage
    saveNodesToStorage();
    
    return processIds;
  }

  // Function to load nodes from localStorage and update nodes array
  function loadCurrentPositionsFromStorage() {
    const savedNodes = JSON.parse(localStorage.getItem('flowNodes') || '[]');
    const savedEdges = JSON.parse(localStorage.getItem('flowEdges') || '[]');
    
    // Only update if we have saved nodes
    if (savedNodes.length > 0) {
      // Force a new array reference to trigger reactivity
      nodes = [...savedNodes];
    }
    
    // Update edges as well
    if (savedEdges.length > 0) {
      edges = [...savedEdges];
    }
  }

  // Alias for backwards compatibility
  const createNewProcessAtPosition = createNewProcess;

  // Handle connection events from SvelteFlow
  function onConnect(params: any) {
    const { source, target } = params;
    
    // Before creating connections, restore any saved nodes to prevent reset
    const savedNodes = JSON.parse(localStorage.getItem('flowNodes') || '[]');
    if (savedNodes.length > 0) {
      nodes = [...savedNodes];
    }
    
    // Check if we're connecting an offer directly to a request
    const isOfferToRequest = source.startsWith('offer') && target.startsWith('request');
    
    if (isOfferToRequest) {
      // Get current positions from our nodes array
      const sourceNode = nodes.find(node => node.id === source);
      const targetNode = nodes.find(node => node.id === target);
      
      if (sourceNode && targetNode) {
        // Create new process node(s) between source and target
        const processIds = createNewProcessAtPosition(sourceNode.position.y, targetNode.position.y);
        
        // Create edges for the chain: offer -> process1 -> process2 -> ... -> request
        const newEdges = [];
        
        // First edge: offer to first process
        newEdges.push({
          id: `${source}-${processIds[0]}`,
          type: 'default',
          source: source,
          target: processIds[0]
        });
        
        // Chain edges between processes (if multiple)
        for (let i = 0; i < processIds.length - 1; i++) {
          newEdges.push({
            id: `${processIds[i]}-${processIds[i + 1]}`,
            type: 'default',
            source: processIds[i],
            target: processIds[i + 1]
          });
        }
        
        // Last edge: last process to request
        newEdges.push({
          id: `${processIds[processIds.length - 1]}-${target}`,
          type: 'default',
          source: processIds[processIds.length - 1],
          target: target
        });
        
        // Add all edges
        edges = [...edges, ...newEdges];
        
        // Save edges to localStorage
        saveNodesToStorage();
      }
    } else {
      // Direct connection (not offer to request)
      const newEdge = {
        id: `${source}-${target}`,
        type: 'default',
        source: source,
        target: target
      };
      
      // Check if edge already exists
      const exists = edges.some(edge => edge.source === source && edge.target === target);
      if (!exists) {
        edges = [...edges, newEdge];
        // Save edges to localStorage
        saveNodesToStorage();
      }
    }
  }

  // Handle node position changes when dragging - ensure this updates immediately
  function onNodeDragStop(event: any) {
    const node = event.targetNode;
    if (node && node.position) {
      // Update the node position in our nodes array immediately
      nodes = nodes.map(n => 
        n.id === node.id 
          ? { ...n, position: { ...node.position } }
          : n
      );
      // Save entire nodes array to localStorage immediately
      saveNodesToStorage();
    }
  }

  // Also handle ongoing drag to update positions in real-time
  function onNodeDrag(event: any) {
    const node = event.targetNode;
    if (node && node.position) {
      // Update the node position in our nodes array during drag
      nodes = nodes.map(n => 
        n.id === node.id 
          ? { ...n, position: { ...node.position } }
          : n
      );
      // Don't save on every drag event, only on drag stop
    }
  }

  // Preserve all current node positions before adding new nodes
  function resetAllPositions() {
    // Reset to initial nodes and edges
    nodes = [...initialNodes];
    edges = [...initialEdges];
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flowNodes');
      localStorage.removeItem('flowEdges');
      localStorage.removeItem('nodePositions'); // Remove legacy storage too
    }
  }

  // Event handlers for adding and removing edges
  function addConnection(sourceId: string, targetId: string) {
    // Check if we're connecting an offer directly to a request
    const isOfferToRequest = sourceId.startsWith('offer') && targetId.startsWith('request');
    
    if (isOfferToRequest) {
      // Get source and target node positions for positioning the new process
      const sourceNode = nodes.find(node => node.id === sourceId);
      const targetNode = nodes.find(node => node.id === targetId);
      
      if (sourceNode && targetNode) {
        // Create new process node(s) between source and target
        const processIds = createNewProcess(sourceNode.position.y, targetNode.position.y);
        
        // Create edges for the chain: offer -> process1 -> process2 -> ... -> request
        const newEdges = [];
        
        // First edge: offer to first process
        newEdges.push({
          id: `${sourceId}-${processIds[0]}`,
          type: 'default',
          source: sourceId,
          target: processIds[0]
        });
        
        // Chain edges between processes (if multiple)
        for (let i = 0; i < processIds.length - 1; i++) {
          newEdges.push({
            id: `${processIds[i]}-${processIds[i + 1]}`,
            type: 'default',
            source: processIds[i],
            target: processIds[i + 1]
          });
        }
        
        // Last edge: last process to request
        newEdges.push({
          id: `${processIds[processIds.length - 1]}-${targetId}`,
          type: 'default',
          source: processIds[processIds.length - 1],
          target: targetId
        });
        
        // Add all edges
        edges = [...edges, ...newEdges];
        
        // Save to localStorage
        saveNodesToStorage();
      }
    } else {
      // Direct connection (not offer to request)
      const newEdge = {
        id: `${sourceId}-${targetId}`,
        type: 'default',
        source: sourceId,
        target: targetId
      };
      
      // Check if edge already exists
      const exists = edges.some(edge => edge.source === sourceId && edge.target === targetId);
      if (!exists) {
        edges = [...edges, newEdge];
        // Save to localStorage
        saveNodesToStorage();
      }
    }
  }

  function removeEdge(edgeId: string) {
    edges = edges.filter(edge => edge.id !== edgeId);
    // Save to localStorage
    saveNodesToStorage();
  }

  function clearAllEdges() {
    edges = [];
    // remove all process nodes as well, keep only offers and requests
    nodes = nodes.filter(node => node.id.startsWith('offer') || node.id.startsWith('request'));
    processCounter = 4; // reset process counter
    // Update localStorage after clearing
    saveNodesToStorage();
  }

  // Handle edge clicks for deletion
  function handleEdgeClick(event: CustomEvent) {
    const edge = event.detail.edge;
    if (confirm(`Delete edge from ${edge.source} to ${edge.target}?`)) {
      removeEdge(edge.id);
    }
  }
  
  onMount(() => {
    // Load nodes and edges from storage when component mounts
    loadNodesFromStorage();
    loadEdgesFromStorage();
  });
</script>

<div id="graph-container">
  <div class="controls-panel">
    <button on:click={clearAllEdges} class="btn btn-danger">Clear All Edges</button>
    <button on:click={resetAllPositions} class="btn btn-warning">Reset Positions</button>
  </div>
  
  <SvelteFlow 
    {nodes} 
    {edges} 
    {nodeTypes}
    fitView={false}
    onconnect={onConnect}
    onnodedragstop={onNodeDragStop}
    onnodedrag={onNodeDrag}
    nodesDraggable={true}
    nodesConnectable={true}
  >
    <Controls />
    <Background variant={BackgroundVariant.Dots} />
    <MiniMap />
  </SvelteFlow>
</div>

<style>
  #graph-container {
    width: 100%;
    height: calc(100vh - 60px);
    position: relative;
  }

  .controls-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-primary {
    background-color: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background-color: #0056b3;
  }

  .btn-warning {
    background-color: #ffc107;
    color: #212529;
  }

  .btn-warning:hover {
    background-color: #e0a800;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background-color: #c82333;
  }

  .instruction {
    margin: 0;
    font-size: 12px;
    color: #666;
  }
</style>