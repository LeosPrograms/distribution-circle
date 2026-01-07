<script lang="ts">
  import { SvelteFlow, Controls, Background, BackgroundVariant, MiniMap, Position } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { writable } from 'svelte/store';
  import { setContext } from 'svelte';
  import { onMount } from 'svelte';

  // Custom node component with delete button
  import CustomNode from './CustomNode.svelte';
  import InteractiveEdge from './InteractiveEdge.svelte';

  // Define node data types
  type NodeData = {
    label: string;
    isCenter?: boolean;
    available?: number;
    color?: string;
    requestA?: number;
    requestB?: number;
    requestC?: number;
    requestD?: number;
    nodeId?: string;
    status?: string;
    url?: string;
    isOffer?: boolean;
    isMinimized?: boolean;
  };

  type Node = {
    id: string;
    type: string;
    data: NodeData;
    position: { x: number; y: number };
  };

  const nodeTypes = {
    custom: CustomNode
  };

  const edgeTypes = {
    interactive: InteractiveEdge
  };

  const nodeDefaults = {
    // No sourcePosition or targetPosition specified = connections attach to center
  };

  // Central node
  const centerX = 400;
  const centerY = 350;
  const radius = 200;

  // Function to calculate circular positions
  function getCircularPosition(index: number, total: number, radius: number) {
    const angle = (2 * Math.PI * index) / total;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  }

  // Create circular arrangement with 8 nodes around center
  const circularNodes = [
    { label: '', color: '#FF6B6B', requestA: 0, requestB: 0, requestC: 0, requestD: 0 },
    // { label: 'Daniel', color: '#FF6B6B', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Ling', color: '#4ECDC4', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Yuki', color: '#45B7D1', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Bob', color: '#96CEB4', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Alejandro', color: '#FFEAA7', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Kenji', color: '#DDA0DD', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Luigi', color: '#98D8C8', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 },
    // { label: 'Stephanie', color: '#F7DC6F', requestA: Math.floor(Math.random() * 301) + 800, requestB: Math.floor(Math.random() * 401) + 600, requestC: Math.floor(Math.random() * 501) + 100 }
  ];

  const initialNodes = [
    // Central node
    {
      id: 'center',
      type: 'custom',
      data: { label: 'Central Hub', isCenter: true, available: 0 },
      position: { x: centerX, y: centerY },
      ...nodeDefaults
    },
    // Surrounding nodes in a circle
    ...circularNodes.map((nodeData, index) => {
      const position = getCircularPosition(index, circularNodes.length, radius);
      return {
        id: `node-${index + 1}`,
        type: 'custom',
        data: { 
          label: nodeData.label, 
          color: nodeData.color, 
          requestA: nodeData.requestA,
          requestB: nodeData.requestB,
          requestC: nodeData.requestC,
          requestD: nodeData.requestD,
          nodeId: `node-${index + 1}`,
          status: 'unfinished',
          isOffer: false,
          isMinimized: false
        },
        position,
        ...nodeDefaults
      };
    })
  ];

  // Create edges from center to all surrounding nodes
  const initialEdges = circularNodes.map((_, index) => ({
    id: `center-node-${index + 1}`,
    type: 'straight',
    source: 'center',
    target: `node-${index + 1}`,
    data: { value: 0 }
  }));

  // Create reactive stores for nodes and edges
  let nodes: Node[] = initialNodes;
  let edges = initialEdges;
  const edgesStore = writable(initialEdges);
  let nodeCounter = circularNodes.length + 1;

  // Load nodes and positions from localStorage on component mount
  function loadNodesFromStorage() {
    if (typeof window !== 'undefined') {
      const savedNodes = localStorage.getItem('circularFlowNodes');
      if (savedNodes) {
        try {
          const parsedNodes = JSON.parse(savedNodes);
          nodes = parsedNodes;
        } catch (error) {
          console.error('Error loading nodes from storage:', error);
          nodes = initialNodes;
        }
      }
    }
  }

  // Save entire nodes array to localStorage
  function saveNodesToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('circularFlowNodes', JSON.stringify(nodes));
      localStorage.setItem('circularFlowEdges', JSON.stringify(edges));
    }
  }

  // Load edges from localStorage
  function loadEdgesFromStorage() {
    if (typeof window !== 'undefined') {
      const savedEdges = localStorage.getItem('circularFlowEdges');
      if (savedEdges) {
        try {
          const parsedEdges = JSON.parse(savedEdges);
          edges = parsedEdges;
          edgesStore.set(parsedEdges); // Update the store when loading
        } catch (error) {
          console.error('Error loading edges from storage:', error);
          edges = initialEdges;
          edgesStore.set(initialEdges);
        }
      }
    }
  }

  // Handle node deletion
  function deleteNode(nodeId: string) {
    // Don't allow deletion of center node
    if (nodeId === 'center') {
      alert('Cannot delete the central hub node.');
      return;
    }

    // Remove the node
    nodes = nodes.filter(node => node.id !== nodeId);
    
    // Remove all edges connected to this node
    edges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    
    // Save updated nodes to localStorage
    saveNodesToStorage();
  }

  // Set context for custom nodes to access delete function
  setContext('deleteNode', deleteNode);

  // Store for all unique statuses across nodes
  const allStatusesStore = writable(['unfinished', 'in progress', 'done', 'blocked']);
  
  // Store for status colors (status name -> color)
  const statusColorsStore = writable<Record<string, string>>({});
  
  // Load statuses from localStorage
  function loadStatusesFromStorage() {
    if (typeof window !== 'undefined') {
      const savedStatuses = localStorage.getItem('circularFlowStatuses');
      if (savedStatuses) {
        try {
          allStatusesStore.set(JSON.parse(savedStatuses));
        } catch (error) {
          console.error('Error loading statuses:', error);
        }
      }
      
      const savedColors = localStorage.getItem('circularFlowStatusColors');
      if (savedColors) {
        try {
          statusColorsStore.set(JSON.parse(savedColors));
        } catch (error) {
          console.error('Error loading status colors:', error);
        }
      }
    }
  }
  
  // Save statuses to localStorage
  function saveStatusesToStorage(statuses: string[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('circularFlowStatuses', JSON.stringify(statuses));
    }
  }
  
  // Save status colors to localStorage
  function saveStatusColorsToStorage(colors: Record<string, string>) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('circularFlowStatusColors', JSON.stringify(colors));
    }
  }
  
  // Update status color
  function updateStatusColor(status: string, color: string) {
    statusColorsStore.update(colors => {
      const updated = { ...colors, [status]: color };
      saveStatusColorsToStorage(updated);
      return updated;
    });
  }

  // Handle updating node status
  function updateNodeStatus(nodeId: string, newStatus: string) {
    allStatusesStore.update(statuses => {
      // Add new status to the list if it doesn't exist
      if (!statuses.includes(newStatus)) {
        const updated = [...statuses, newStatus];
        saveStatusesToStorage(updated);
        return updated;
      }
      return statuses;
    });
    
    nodes = nodes.map(node => {
      if (node.id === nodeId && node.id !== 'center') {
        return { ...node, data: { ...node.data, status: newStatus } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Set context for custom nodes to access status functions
  setContext('updateNodeStatus', updateNodeStatus);
  setContext('allStatuses', allStatusesStore);
  setContext('statusColors', statusColorsStore);

  // Delete a status from the list
  function deleteStatus(statusToDelete: string) {
    // Don't allow deletion if any nodes are using this status
    const nodesUsingStatus = nodes.filter(node => 
      !node.data.isCenter && node.data.status === statusToDelete
    );
    
    if (nodesUsingStatus.length > 0) {
      alert(`Cannot delete "${statusToDelete}". It is being used by ${nodesUsingStatus.length} node(s).`);
      return;
    }
    
    allStatusesStore.update(statuses => {
      const updated = statuses.filter(s => s !== statusToDelete);
      saveStatusesToStorage(updated);
      return updated;
    });
    
    // Also remove the color for this status
    statusColorsStore.update(colors => {
      const updated = { ...colors };
      delete updated[statusToDelete];
      saveStatusColorsToStorage(updated);
      return updated;
    });
  }

  // Show/hide status manager
  let showStatusManager = false;
  
  // New status input
  let newStatusName = '';
  
  // Add a new status
  function addNewStatus() {
    const trimmedName = newStatusName.trim();
    
    if (!trimmedName) {
      alert('Please enter a status name');
      return;
    }
    
    if ($allStatusesStore.includes(trimmedName)) {
      alert('This status already exists');
      return;
    }
    
    allStatusesStore.update(statuses => {
      const updated = [trimmedName, ...statuses];
      saveStatusesToStorage(updated);
      return updated;
    });
    
    // Clear the input
    newStatusName = '';
  }
  
  // Filter by status
  let statusFilter: string | null = null;
  
  // Filter by unmet requirement level
  let requirementFilter: 'all' | 'full' | 'restrained' | 'minimum' | 'stretched' = 'all';
  
  // Filter by isOffer (people, offers, or both)
  let offerFilter: 'both' | 'people' | 'offers' = 'both';
  
  // Filtered nodes based on status filter and requirement filter
  $: filteredNodes = (() => {
    let result = nodes;
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(node => node.data.isCenter || node.data.status === statusFilter);
    }
    
    // Apply offer filter
    if (offerFilter !== 'both') {
      result = result.filter(node => {
        if (node.data.isCenter) return true;
        if (offerFilter === 'offers') {
          return node.data.isOffer === true;
        } else { // 'people'
          return !node.data.isOffer;
        }
      });
    }
    
    // Apply requirement filter
    if (requirementFilter !== 'all') {
      result = result.filter(node => {
        if (node.data.isCenter) return true;
        
        // Get the edge value for this node
        const edge = edges.find(e => 
          (e.source === 'center' && e.target === node.id) ||
          (e.source === node.id && e.target === 'center')
        );
        const inputValue = edge?.data?.value || 0;
        
        // Check if requirement is unmet
        if (requirementFilter === 'full') {
          return node.data.requestA !== undefined && inputValue < (node.data.requestA || 0);
        } else if (requirementFilter === 'restrained') {
          return node.data.requestB !== undefined && inputValue < (node.data.requestB || 0);
        } else if (requirementFilter === 'minimum') {
          return node.data.requestC !== undefined && inputValue < (node.data.requestC || 0);
        } else if (requirementFilter === 'stretched') {
          return node.data.requestD !== undefined && inputValue < (node.data.requestD || 0);
        }
        
        return true;
      });
    }
    
    return result;
  })();

  // Handle updating node label
  function updateNodeLabel(nodeId: string, newLabel: string) {
    nodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, label: newLabel } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Handle updating node request values
  function updateNodeRequest(nodeId: string, requestType: 'requestA' | 'requestB' | 'requestC' | 'requestD', newValue: number) {
    nodes = nodes.map(node => {
      if (node.id === nodeId && node.id !== 'center') {
        return { ...node, data: { ...node.data, [requestType]: newValue } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Handle updating center node available amount
  function updateCenterAvailable(newValue: number) {
    nodes = nodes.map(node => {
      if (node.id === 'center') {
        return { ...node, data: { ...node.data, available: newValue } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Handle updating node URL
  function updateNodeUrl(nodeId: string, url: string) {
    nodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, url: url } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Handle updating node isOffer
  function updateNodeIsOffer(nodeId: string, isOffer: boolean) {
    nodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, isOffer: isOffer } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Handle updating node isMinimized
  function updateNodeIsMinimized(nodeId: string, isMinimized: boolean) {
    nodes = nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, isMinimized: isMinimized } };
      }
      return node;
    });
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Set context for custom nodes to access update functions
  setContext('updateNodeLabel', updateNodeLabel);
  setContext('updateNodeRequest', updateNodeRequest);
  setContext('updateCenterAvailable', updateCenterAvailable);
  setContext('updateNodeUrl', updateNodeUrl);
  setContext('updateNodeIsOffer', updateNodeIsOffer);
  setContext('updateNodeIsMinimized', updateNodeIsMinimized);

  // Handle edge value updates
  function updateEdgeValue(edgeId: string, newValue: number) {
    // Update the edge data
    edges = edges.map(edge => 
      edge.id === edgeId 
        ? { ...edge, data: { ...edge.data, value: newValue } }
        : edge
    );
    
    // Update the store as well
    edgesStore.set(edges);
    
    // Save to localStorage
    saveNodesToStorage();
  }

  // Set context for custom edges to access update function
  setContext('updateEdgeValue', updateEdgeValue);
  
  // Set context for nodes to access edge values
  setContext('edgesStore', edgesStore);

  // Add a new node to the circle
  function addNewNode() {
    const currentCircularNodes = nodes.filter(node => node.id !== 'center');
    
    // Find the highest node number to ensure unique IDs
    const maxNodeNumber = currentCircularNodes.reduce((max, node) => {
      const match = node.id.match(/node-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    const newNodeNumber = maxNodeNumber + 1;
    const newIndex = currentCircularNodes.length;
    const newNodeId = `node-${newNodeNumber}`;
    nodeCounter = newNodeNumber + 1; // Update counter for next time

    // Calculate position for new node (add it to the circle without reorganizing)
    const position = getCircularPosition(newIndex, currentCircularNodes.length + 1, radius);

    // Add the new node without recalculating existing node positions
    const newNode = {
      id: newNodeId,
      type: 'custom',
      data: { 
        label: "", 
        color: '#A8E6CF', 
        requestA: 0,
        requestB: 0,
        requestC: 0,
        requestD: 0,
        nodeId: newNodeId,
        status: 'unfinished',
        isOffer: false,
        isMinimized: false
      },
      position,
      ...nodeDefaults
    };

    nodes = [...nodes, newNode];

    // Add edge from center to new node
    const newEdge = {
      id: `center-${newNodeId}`,
      type: 'straight',
      source: 'center',
      target: newNodeId,
      data: { value: 0 }
    };

    edges = [...edges, newEdge];
    edgesStore.set(edges); // Update the store immediately
    saveNodesToStorage();
  }

  // Reorganize nodes in perfect circle
  function reorganizeCircle() {
    const circularNodes = nodes.filter(node => node.id !== 'center');
    
    nodes = nodes.map(node => {
      if (node.id === 'center') {
        return { ...node, position: { x: centerX, y: centerY } };
      }
      
      const nodeIndex = circularNodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        const newPosition = getCircularPosition(nodeIndex, circularNodes.length, radius);
        return { ...node, position: newPosition };
      }
      return node;
    });

    saveNodesToStorage();
  }

  // Handle connection events from SvelteFlow
  function onConnect(params: any) {
    const { source, target } = params;
    
    // Only allow connections from center to other nodes or between circular nodes
    const newEdge = {
      id: `${source}-${target}`,
      type: 'straight',
      source: source,
      target: target,
      data: { value: 0 }
    };
    
    // Check if edge already exists
    const exists = edges.some(edge => edge.source === source && edge.target === target);
    if (!exists) {
      edges = [...edges, newEdge];
      saveNodesToStorage();
    }
  }

  // Handle node position changes when dragging
  function onNodeDragStop(event: any) {
    const node = event.targetNode;
    if (node && node.position) {
      nodes = nodes.map(n => 
        n.id === node.id 
          ? { ...n, position: { ...node.position } }
          : n
      );
      saveNodesToStorage();
    }
  }

  function onNodeDrag(event: any) {
    const node = event.targetNode;
    if (node && node.position) {
      nodes = nodes.map(n => 
        n.id === node.id 
          ? { ...n, position: { ...node.position } }
          : n
      );
    }
  }

  // Reset to initial state
  function resetLayout() {
    const confirmReset = confirm('Are you sure you want to reset the layout? This will remove all changes and cannot be undone.');
    if (!confirmReset) return;
    
    nodes = [...initialNodes];
    edges = [...initialEdges];
    nodeCounter = circularNodes.length + 1;
    
    // Reset statuses
    const defaultStatuses = ['unfinished', 'done', 'flagged'];
    allStatusesStore.set(defaultStatuses);
    statusColorsStore.set({});
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('circularFlowNodes');
      localStorage.removeItem('circularFlowEdges');
      localStorage.removeItem('circularFlowStatuses');
      localStorage.removeItem('circularFlowStatusColors');
    }
  }

  // Clear all edges
  function clearAllEdges() {
    edges = [];
    saveNodesToStorage();
  }

  // Restore center connections
  function restoreCenterConnections() {
    const circularNodes = nodes.filter(node => node.id !== 'center');
    const centerEdges = circularNodes.map(node => ({
      id: `center-${node.id}`,
      type: 'straight',
      source: 'center',
      target: node.id,
      data: { value: 0 }
    }));
    
    // Remove existing center connections and add new ones
    edges = edges.filter(edge => edge.source !== 'center' && edge.target !== 'center');
    edges = [...edges, ...centerEdges];
    saveNodesToStorage();
  }

  // Export graph data to JSON file
  function exportGraph() {
    const exportData = {
      nodes: nodes,
      edges: edges,
      nodeCounter: nodeCounter,
      statuses: $allStatusesStore,
      statusColors: $statusColorsStore,
      exportDate: new Date().toISOString(),
      version: '1.1'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `transfer-puzzle-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Import graph data from JSON file
  function importGraph() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target?.result as string);
          
          // Validate the data structure
          if (importData.nodes && importData.edges) {
            nodes = importData.nodes;
            edges = importData.edges;
            if (importData.nodeCounter) {
              nodeCounter = importData.nodeCounter;
            }
            
            // Import statuses if available
            if (importData.statuses) {
              allStatusesStore.set(importData.statuses);
              saveStatusesToStorage(importData.statuses);
            }
            
            // Import status colors if available
            if (importData.statusColors) {
              statusColorsStore.set(importData.statusColors);
              saveStatusColorsToStorage(importData.statusColors);
            }
            
            // Save to localStorage
            saveNodesToStorage();
            
            alert('Graph imported successfully!');
          } else {
            alert('Invalid file format. Please select a valid export file.');
          }
        } catch (error) {
          console.error('Error importing graph:', error);
          alert('Error importing file. Please check the file format.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  // Export requests vs received data as CSV
  function exportRequestsCSV() {
    // Get all non-center nodes
    const dataNodes = nodes.filter(node => !node.data.isCenter);
    
    // Build CSV header
    const headers = ['Name', 'Type', 'Full Request', 'Restrained Request', 'Minimum Request', 'Stretched Request', 'Allocated', 'URL'];
    
    // Build CSV rows
    const rows = dataNodes.map(node => {
      // Find the edge connected to this node to get allocated value
      const edge = edges.find(e => 
        (e.source === 'center' && e.target === node.id) ||
        (e.source === node.id && e.target === 'center')
      );
      const allocated = edge?.data?.value || 0;
      
      // Get request values
      const fullRequest = node.data.requestA ?? '';
      const restrainedRequest = node.data.requestB ?? '';
      const minimumRequest = node.data.requestC ?? '';
      const stretchedRequest = node.data.requestD ?? '';
      
      return [
        node.data.label || '',
        node.data.isOffer ? 'Offer' : 'Person',
        fullRequest,
        restrainedRequest,
        minimumRequest,
        stretchedRequest,
        allocated,
        node.data.url || ''
      ];
    });
    
    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain commas or quotes
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `transfer-puzzle-requests-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    console.log("Loading nodes and edges from storage...");
    loadNodesFromStorage();
    loadEdgesFromStorage();
    loadStatusesFromStorage();
  });
</script>

<div id="graph-container">
  <div class="controls-panel">
    <button on:click={() => showStatusManager = !showStatusManager} class="btn btn-secondary">
      {showStatusManager ? 'Hide' : 'Manage'} Statuses
    </button>
    <button on:click={resetLayout} class="btn btn-warning">Reset</button>
    <button on:click={exportGraph} class="btn btn-success">Export</button>
    <button on:click={importGraph} class="btn btn-info">Import</button>
    <button on:click={exportRequestsCSV} class="btn btn-success">CSV</button>
    <button on:click={reorganizeCircle} class="btn btn-secondary">Organize</button>
    <button on:click={addNewNode} class="btn btn-primary">Add Person</button>
    <select 
      class="offer-filter-select"
      value={offerFilter}
      on:change={(e) => offerFilter = (e.target as HTMLSelectElement).value as 'both' | 'people' | 'offers'}
    >
      <option value="both">Members & Offers</option>
      <option value="people">Members Only</option>
      <option value="offers">Offers Only</option>
    </select>
    <select 
      class="status-filter-select"
      value={statusFilter || ''}
      on:change={(e) => statusFilter = (e.target as HTMLSelectElement).value || null}
    >
      <option value="">All Statuses</option>
      {#each $allStatusesStore as status}
        <option value={status}>{status}</option>
      {/each}
    </select>
    <select 
      class="status-filter-select"
      value={requirementFilter}
      on:change={(e) => requirementFilter = (e.target as HTMLSelectElement).value as 'all' | 'full' | 'restrained' | 'minimum' | 'stretched'}
    >
      <option value="all">All Requirements</option>
      <option value="full">Unmet Full</option>
      <option value="restrained">Unmet Restrained</option>
      <option value="minimum">Unmet Minimum</option>
      <option value="stretched">Unmet Stretched</option>
    </select>
  </div>

  {#if showStatusManager}
    <div class="status-manager">
      <h3>Manage Statuses</h3>
      <div class="add-status-section">
        <input 
          type="text" 
          bind:value={newStatusName}
          placeholder="New status name..."
          class="new-status-input"
          on:keydown={(e) => e.key === 'Enter' && addNewStatus()}
        />
        <button 
          class="btn btn-primary btn-small" 
          on:click={addNewStatus}
        >
          Add
        </button>
      </div>
      <div class="status-list">
        {#each $allStatusesStore as status}
          <div class="status-item">
            <span class="status-name">{status}</span>
            <input 
              type="color" 
              value={$statusColorsStore[status] || '#808080'}
              on:input={(e) => updateStatusColor(status, (e.target as HTMLInputElement).value)}
              class="color-picker"
              title="Set status color"
            />
            <button 
              class="delete-status-btn" 
              on:click={() => deleteStatus(status)}
              title="Delete this status"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <SvelteFlow 
    nodes={filteredNodes} 
    {edges} 
    {nodeTypes}
    fitView={true}
    fitViewOptions={{ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 }}
    onconnect={onConnect}
    onnodedragstop={onNodeDragStop}
    onnodedrag={onNodeDrag}
    nodesDraggable={true}
    nodesConnectable={true}
    panOnDrag={true}
    zoomOnScroll={true}
    zoomOnPinch={true}
    zoomOnDoubleClick={false}
  >
    <Controls />
    <Background bgColor="#1a1a1a" />
    <MiniMap />
  </SvelteFlow>
</div>

<style>
  #graph-container {
    width: 100%;
    height: 100vh;
    position: relative;
  }

  .controls-panel {
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0);
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    width: auto;
    max-width: calc(100% - 20px);
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .status-filter-select,
  .offer-filter-select {
    padding: 6px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #495057;
  }

  .status-filter-select:hover,
  .offer-filter-select:hover {
    border-color: #80bdff;
  }

  .status-filter-select:focus,
  .offer-filter-select:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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

  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background-color: #5a6268;
  }

  .btn-info {
    background-color: #17a2b8;
    color: white;
  }

  .btn-info:hover {
    background-color: #138496;
  }

  .btn-success {
    background-color: #28a745;
    color: white;
  }

  .btn-success:hover {
    background-color: #218838;
  }

  .status-manager {
    position: absolute;
    top: 60px;
    left: 20px;
    z-index: 1000;
    background: white;
    padding: 15px;
    border-radius: 5px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 300px;
  }

  .status-manager h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: #333;
  }

  .add-status-section {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }

  .new-status-input {
    flex-grow: 1;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 13px;
  }

  .new-status-input:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .btn-small {
    padding: 6px 14px;
    font-size: 13px;
  }

  .status-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #dee2e6;
    gap: 8px;
  }

  .status-name {
    font-size: 13px;
    color: #495057;
    flex-grow: 1;
  }

  .color-picker {
    width: 32px;
    height: 24px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
  }

  .color-picker::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-picker::-webkit-color-swatch {
    border: none;
    border-radius: 3px;
  }

  .delete-status-btn {
    background: transparent;
    border: none;
    color: #dc3545;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .delete-status-btn:hover {
    background-color: #f8d7da;
  }

  .delete-status-btn:active {
    transform: scale(0.95);
  }
</style>