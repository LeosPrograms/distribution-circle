<script lang="ts">
  import { SvelteFlow, Controls, Background, BackgroundVariant, MiniMap, Position } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { writable } from 'svelte/store';
  import { setContext, onMount } from 'svelte';
  import { getRepo, isValidAutomergeUrl } from '$lib/automerge-repo';
  import type { PlanDoc, PlanNode, PlanEdge } from '$lib/automerge-repo';
  import type { DocHandle } from '@automerge/automerge-repo';

  // Custom node component with delete button
  import CustomNode from './CustomNode.svelte';
  import InteractiveEdge from './InteractiveEdge.svelte';

  type Node = PlanNode;
  type Edge = PlanEdge;

  const nodeTypes = {
    custom: CustomNode
  };

  const edgeTypes = {
    interactive: InteractiveEdge
  };

  // Central node
  const centerX = 400;
  const centerY = 350;
  const radius = 600;

  // ── Layout helpers ────────────────────────────────────────────────────────
  function getCircularPosition(index: number, total: number, r: number) {
    const angle = (2 * Math.PI * index) / total;
    return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
  }

  function newNodeId(): string {
    return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function createInitialDoc(): PlanDoc {
    const center: PlanNode = {
      id: 'center',
      type: 'custom',
      data: { label: 'Central Hub', isCenter: true, available: 0 },
      position: { x: centerX, y: centerY }
    };
    return {
      nodes: { center },
      edges: {},
      nodeCounter: 1,
      statuses: ['unfinished', 'in progress', 'done', 'blocked'],
      statusColors: {}
    };
  }

  // ── Reactive state (derived from the Automerge doc) ───────────────────────
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let isReady = false;
  let docUrl = '';
  let linkCopied = false;

  const edgesStore = writable<Edge[]>([]);
  const allStatusesStore = writable<string[]>(['unfinished', 'in progress', 'done', 'blocked']);
  const statusColorsStore = writable<Record<string, string>>({});

  // ── Automerge handle ──────────────────────────────────────────────────────
  let handle: DocHandle<PlanDoc> | null = null;

  function syncFromDoc(doc: PlanDoc) {
    nodes = Object.values(doc.nodes ?? {});
    edges = Object.values(doc.edges ?? {});
    allStatusesStore.set(doc.statuses ? [...doc.statuses] : ['unfinished', 'in progress', 'done', 'blocked']);
    statusColorsStore.set(doc.statusColors ? { ...doc.statusColors } : {});
    edgesStore.set(Object.values(doc.edges ?? {}));
  }

  // ── Node / edge mutations (all go through handle.change) ─────────────────

  function deleteNode(nodeId: string) {
    if (nodeId === 'center') { alert('Cannot delete the central hub node.'); return; }
    handle?.change(doc => {
      delete doc.nodes[nodeId];
      for (const id of Object.keys(doc.edges)) {
        const e = doc.edges[id];
        if (e.source === nodeId || e.target === nodeId) delete doc.edges[id];
      }
    });
  }

  setContext('deleteNode', deleteNode);

  function updateNodeStatus(nodeId: string, newStatus: string) {
    handle?.change(doc => {
      if (!doc.statuses.includes(newStatus)) doc.statuses.push(newStatus);
      if (doc.nodes[nodeId] && nodeId !== 'center') doc.nodes[nodeId].data.status = newStatus;
    });
  }

  setContext('updateNodeStatus', updateNodeStatus);
  setContext('allStatuses', allStatusesStore);
  setContext('statusColors', statusColorsStore);

  function updateStatusColor(status: string, color: string) {
    handle?.change(doc => { doc.statusColors[status] = color; });
  }

  function deleteStatus(statusToDelete: string) {
    const nodesUsingStatus = nodes.filter(n => !n.data.isCenter && n.data.status === statusToDelete);
    if (nodesUsingStatus.length > 0) {
      alert(`Cannot delete "${statusToDelete}". It is being used by ${nodesUsingStatus.length} node(s).`);
      return;
    }
    handle?.change(doc => {
      const idx = doc.statuses.indexOf(statusToDelete);
      if (idx !== -1) doc.statuses.splice(idx, 1);
      delete doc.statusColors[statusToDelete];
    });
  }

  // Show/hide status manager
  let showStatusManager = false;

  // New status input
  let newStatusName = '';

  function addNewStatus() {
    const trimmedName = newStatusName.trim();
    if (!trimmedName) { alert('Please enter a status name'); return; }
    if ($allStatusesStore.includes(trimmedName)) { alert('This status already exists'); return; }
    handle?.change(doc => { doc.statuses.unshift(trimmedName); });
    newStatusName = '';
  }

  // Filter by status (empty set = show all)
  let statusFilters = new Set<string>();

  function toggleStatusFilter(status: string) {
    const next = new Set(statusFilters);
    if (next.has(status)) next.delete(status); else next.add(status);
    statusFilters = next;
  }

  // Filter by unmet requirement level
  let requirementFilter: 'all' | 'full' | 'restrained' | 'minimum' | 'stretched' = 'all';

  // Filter by isOffer (people, offers, or both)
  let offerFilter: 'both' | 'people' | 'offers' = 'both';

  // Filtered nodes based on status filter and requirement filter
  $: filteredNodes = (() => {
    let result = nodes;

    if (statusFilters.size > 0) {
      result = result.filter(node => node.data.isCenter || statusFilters.has(node.data.status ?? 'unfinished'));
    }

    if (offerFilter !== 'both') {
      result = result.filter(node => {
        if (node.data.isCenter) return true;
        return offerFilter === 'offers' ? node.data.isOffer === true : !node.data.isOffer;
      });
    }

    if (requirementFilter !== 'all') {
      result = result.filter(node => {
        if (node.data.isCenter) return true;
        const edge = edges.find(e =>
          (e.source === 'center' && e.target === node.id) ||
          (e.source === node.id && e.target === 'center')
        );
        const inputValue = edge?.data?.value || 0;
        if (requirementFilter === 'full') return (node.data.requestA ?? 0) > inputValue;
        if (requirementFilter === 'restrained') return (node.data.requestB ?? 0) > inputValue;
        if (requirementFilter === 'minimum') return (node.data.requestC ?? 0) > inputValue;
        if (requirementFilter === 'stretched') return (node.data.requestD ?? 0) > inputValue;
        return true;
      });
    }

    return result;
  })();

  function updateNodeLabel(nodeId: string, newLabel: string) {
    handle?.change(doc => { if (doc.nodes[nodeId]) doc.nodes[nodeId].data.label = newLabel; });
  }

  function updateNodeRequest(nodeId: string, requestType: 'requestA' | 'requestB' | 'requestC' | 'requestD', newValue: number) {
    handle?.change(doc => {
      if (doc.nodes[nodeId] && nodeId !== 'center') {
        (doc.nodes[nodeId].data as any)[requestType] = newValue;
      }
    });
  }

  function updateCenterAvailable(newValue: number) {
    handle?.change(doc => { if (doc.nodes['center']) doc.nodes['center'].data.available = newValue; });
  }

  function updateNodeUrl(nodeId: string, url: string) {
    handle?.change(doc => { if (doc.nodes[nodeId]) doc.nodes[nodeId].data.url = url; });
  }

  function updateNodeIsOffer(nodeId: string, isOffer: boolean) {
    handle?.change(doc => { if (doc.nodes[nodeId]) doc.nodes[nodeId].data.isOffer = isOffer; });
  }

  function updateNodeIsMinimized(nodeId: string, isMinimized: boolean) {
    handle?.change(doc => { if (doc.nodes[nodeId]) doc.nodes[nodeId].data.isMinimized = isMinimized; });
  }

  function setAllMinimized(isMinimized: boolean) {
    handle?.change(doc => {
      for (const id of Object.keys(doc.nodes)) {
        if (id !== 'center') doc.nodes[id].data.isMinimized = isMinimized;
      }
    });
  }

  setContext('updateNodeLabel', updateNodeLabel);
  setContext('updateNodeRequest', updateNodeRequest);
  setContext('updateCenterAvailable', updateCenterAvailable);
  setContext('updateNodeUrl', updateNodeUrl);
  setContext('updateNodeIsOffer', updateNodeIsOffer);
  setContext('updateNodeIsMinimized', updateNodeIsMinimized);

  function updateNodeRequestCEnabled(nodeId: string, enabled: boolean) {
    handle?.change(doc => {
      if (doc.nodes[nodeId]) {
        doc.nodes[nodeId].data.requestCEnabled = enabled;
        if (!enabled) doc.nodes[nodeId].data.requestCDescription = '';
      }
    });
  }

  function updateNodeRequestCDescription(nodeId: string, description: string) {
    handle?.change(doc => { if (doc.nodes[nodeId]) doc.nodes[nodeId].data.requestCDescription = description; });
  }

  setContext('updateNodeRequestCEnabled', updateNodeRequestCEnabled);
  setContext('updateNodeRequestCDescription', updateNodeRequestCDescription);

  const showStretchedStore = writable(false);
  setContext('showStretched', showStretchedStore);

  function updateEdgeValue(edgeId: string, newValue: number) {
    handle?.change(doc => { if (doc.edges[edgeId]) doc.edges[edgeId].data.value = newValue; });
  }

  let autoAssignLevel: 'requestA' | 'requestB' | 'requestC' | 'requestD' = 'requestA';

  function autoAssign() {
    handle?.change(doc => {
      for (const node of Object.values(doc.nodes)) {
        if (node.id === 'center') continue;
        const amount = (node.data as any)[autoAssignLevel] ?? 0;
        const edgeId = Object.keys(doc.edges).find(eid => {
          const e = doc.edges[eid];
          return (e.source === 'center' && e.target === node.id) ||
                 (e.source === node.id && e.target === 'center');
        });
        if (edgeId) doc.edges[edgeId].data.value = Math.max(doc.edges[edgeId].data.value, amount);
      }
    });
  }

  setContext('updateEdgeValue', updateEdgeValue);
  setContext('edgesStore', edgesStore);

  // ── Graph operations ──────────────────────────────────────────────────────

  function addNewNode() {
    const id = newNodeId();
    const currentCircular = nodes.filter(n => n.id !== 'center');
    const position = getCircularPosition(currentCircular.length, currentCircular.length + 1, radius);
    const newNode: PlanNode = {
      id,
      type: 'custom',
      data: { label: '', color: '#A8E6CF', requestA: 0, requestB: 0, requestC: 0, requestD: 0, nodeId: id, status: 'unfinished', isOffer: false, isMinimized: false },
      position
    };
    handle?.change(doc => {
      doc.nodes[id] = newNode;
      doc.edges[`center-${id}`] = { id: `center-${id}`, type: 'straight', source: 'center', target: id, data: { value: 0 } };
    });
  }

  function reorganizeCircle() {
    handle?.change(doc => {
      const circular = Object.values(doc.nodes).filter(n => n.id !== 'center');
      doc.nodes['center'].position = { x: centerX, y: centerY };
      const nodeSpacing = 320;
      const dynamicRadius = Math.max(radius, (circular.length * nodeSpacing) / (2 * Math.PI));
      circular.forEach((node, i) => {
        doc.nodes[node.id].position = getCircularPosition(i, circular.length, dynamicRadius);
      });
    });
  }

  function onConnect(params: any) {
    const { source, target } = params;
    const edgeId = `${source}-${target}`;
    if (edges.some(e => e.source === source && e.target === target)) return;
    handle?.change(doc => {
      doc.edges[edgeId] = { id: edgeId, type: 'straight', source, target, data: { value: 0 } };
    });
  }

  function onNodeDragStop(event: any) {
    const node = event.targetNode;
    if (!node?.position) return;
    handle?.change(doc => {
      if (doc.nodes[node.id]) doc.nodes[node.id].position = { x: node.position.x, y: node.position.y };
    });
  }

  function onNodeDrag(event: any) {
    const node = event.targetNode;
    if (!node?.position) return;
    // Update local state only during drag (avoid flooding automerge with every drag event)
    nodes = nodes.map(n => n.id === node.id ? { ...n, position: { ...node.position } } : n);
  }

  function resetLayout() {
    if (!confirm('Are you sure you want to reset the layout? This will remove all changes and cannot be undone.')) return;
    const initial = createInitialDoc();
    handle?.change(doc => {
      for (const id of Object.keys(doc.nodes)) delete doc.nodes[id];
      for (const id of Object.keys(doc.edges)) delete doc.edges[id];
      doc.nodes['center'] = initial.nodes['center'];
      doc.nodeCounter = 1;
      doc.statuses.splice(0, doc.statuses.length, ...initial.statuses);
      for (const k of Object.keys(doc.statusColors)) delete doc.statusColors[k];
    });
  }

  function clearAllEdges() {
    handle?.change(doc => {
      for (const id of Object.keys(doc.edges)) delete doc.edges[id];
    });
  }

  function restoreCenterConnections() {
    handle?.change(doc => {
      for (const id of Object.keys(doc.edges)) {
        const e = doc.edges[id];
        if (e.source === 'center' || e.target === 'center') delete doc.edges[id];
      }
      for (const node of Object.values(doc.nodes)) {
        if (node.id !== 'center') {
          const edgeId = `center-${node.id}`;
          doc.edges[edgeId] = { id: edgeId, type: 'straight', source: 'center', target: node.id, data: { value: 0 } };
        }
      }
    });
  }

  function exportGraph() {
    const exportData = {
      nodes,
      edges,
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

  function importGraph() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target?.result as string);
          if (!importData.nodes || !importData.edges) { alert('Invalid file format.'); return; }
          handle?.change(doc => {
            for (const id of Object.keys(doc.nodes)) delete doc.nodes[id];
            for (const id of Object.keys(doc.edges)) delete doc.edges[id];
            const nodesArray: PlanNode[] = Array.isArray(importData.nodes) ? importData.nodes : Object.values(importData.nodes);
            for (const n of nodesArray) doc.nodes[n.id] = n;
            const edgesArray: PlanEdge[] = Array.isArray(importData.edges) ? importData.edges : Object.values(importData.edges);
            for (const edge of edgesArray) doc.edges[edge.id] = edge;
            if (importData.statuses) doc.statuses.splice(0, doc.statuses.length, ...importData.statuses);
            if (importData.statusColors) {
              for (const k of Object.keys(doc.statusColors)) delete doc.statusColors[k];
              Object.assign(doc.statusColors, importData.statusColors);
            }
          });
          alert('Graph imported successfully!');
        } catch (error) {
          console.error('Error importing graph:', error);
          alert('Error importing file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function exportRequestsCSV() {
    const dataNodes = nodes.filter(node => !node.data.isCenter);
    const headers = ['Name', 'Type', 'Regenerative add-on', 'Stress-free basics', 'Basics', 'Stretched', 'Allocated', 'URL'];
    const rows = dataNodes.map(node => {
      const edge = edges.find(e =>
        (e.source === 'center' && e.target === node.id) ||
        (e.source === node.id && e.target === 'center')
      );
      const allocated = edge?.data?.value || 0;
      return [
        node.data.label || '',
        node.data.isOffer ? 'Offer' : 'Person',
        node.data.requestC ?? '',
        node.data.requestB ?? '',
        node.data.requestA ?? '',
        node.data.requestD ?? '',
        allocated,
        node.data.url || ''
      ];
    });
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const s = String(cell);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      }).join(','))
    ].join('\n');
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

  // ── Share / collaboration helpers ─────────────────────────────────────────

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    linkCopied = true;
    setTimeout(() => { linkCopied = false; }, 2000);
  }

  function newPlan() {
    if (confirm('Start a fresh plan? This will open a new empty workspace in this tab.')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('doc');
      window.location.href = url.toString();
    }
  }

  // ── Initialization ────────────────────────────────────────────────────────

  onMount(async () => {
    const repo = getRepo();
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('doc');

    let h: DocHandle<PlanDoc>;
    if (docParam && isValidAutomergeUrl(docParam as any)) {
      h = await repo.find<PlanDoc>(docParam as any);
    } else {
      h = repo.create<PlanDoc>(createInitialDoc());
      const url = new URL(window.location.href);
      url.searchParams.set('doc', h.url);
      window.history.replaceState({}, '', url.toString());
    }

    handle = h;
    docUrl = h.url;

    const doc = await h.doc();
    if (doc) syncFromDoc(doc);

    h.on('change', ({ doc }) => syncFromDoc(doc));
    isReady = true;
  });
</script>

<div id="graph-container">
  {#if !isReady}
    <div class="loading-overlay">Connecting to collaborative workspace…</div>
  {/if}
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
    <button on:click={() => setAllMinimized(true)} class="btn btn-secondary" title="Minimize all nodes">− All</button>
    <button on:click={() => setAllMinimized(false)} class="btn btn-secondary" title="Expand all nodes">□ All</button>
    <button on:click={() => showStretchedStore.update(v => !v)} class="btn btn-secondary" title="Show/hide Stretched level">{$showStretchedStore ? 'Hide Stretched' : 'Show Stretched'}</button>
    <div class="auto-assign-group">
      <select class="offer-filter-select" bind:value={autoAssignLevel}>
        <option value="requestC">Regenerative add-on</option>
        <option value="requestB">Stress-free basics</option>
        <option value="requestA">Basics</option>
        <option value="requestD">Stretched</option>
      </select>
      <button on:click={autoAssign} title="Set every node's allocation to this request level">Auto-assign</button>
    </div>
    <button on:click={copyShareLink} class="btn btn-share" title="Copy shareable link to clipboard">
      {linkCopied ? '✓ Copied!' : '🔗 Share'}
    </button>
    <button on:click={newPlan} class="btn btn-secondary" title="Start a fresh empty plan">New Plan</button>
    <select 
      class="offer-filter-select"
      value={offerFilter}
      on:change={(e) => offerFilter = (e.target as HTMLSelectElement).value as 'both' | 'people' | 'offers'}
    >
      <option value="both">Members & Offers</option>
      <option value="people">Members Only</option>
      <option value="offers">Offers Only</option>
    </select>
    <details class="status-filter-details">
      <summary class="status-filter-summary">
        {statusFilters.size === 0 ? 'All Statuses' : `${statusFilters.size} status${statusFilters.size > 1 ? 'es' : ''}`}
      </summary>
      <div class="status-filter-dropdown">
        <label class="status-filter-item">
          <input type="checkbox" checked={statusFilters.size === 0} on:change={() => statusFilters = new Set()} />
          All
        </label>
        {#each $allStatusesStore as status}
          <label class="status-filter-item">
            <input type="checkbox" checked={statusFilters.has(status)} on:change={() => toggleStatusFilter(status)} />
            {status}
          </label>
        {/each}
      </div>
    </details>
    <select 
      class="status-filter-select"
      value={requirementFilter}
      on:change={(e) => requirementFilter = (e.target as HTMLSelectElement).value as 'all' | 'full' | 'restrained' | 'minimum' | 'stretched'}
    >
      <option value="all">All Requirements</option>
      <option value="minimum">Unmet Regenerative add-on</option>
      <option value="restrained">Unmet Stress-free basics</option>
      <option value="full">Unmet Basics</option>
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

  .auto-assign-group {
    display: flex;
    align-items: stretch;
  }

  .auto-assign-group select {
    border-radius: 4px 0 0 4px;
    border-right: none;
    padding: 6px 10px;
    border: 1px solid #ced4da;
    background-color: white;
    font-size: 13px;
    font-weight: 500;
    color: #495057;
    cursor: pointer;
  }

  .auto-assign-group select:focus {
    outline: none;
    border-color: #80bdff;
    z-index: 1;
    position: relative;
  }

  .auto-assign-group button {
    border-radius: 0 4px 4px 0;
    border: 1px solid #ced4da;
    background-color: #f8f9fa;
    color: #495057;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .auto-assign-group button:hover {
    background-color: #e2e6ea;
    border-color: #adb5bd;
  }

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

  .offer-filter-select:hover {
    border-color: #80bdff;
  }

  .offer-filter-select:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .status-filter-details {
    position: relative;
    display: inline-block;
  }

  .status-filter-summary {
    padding: 6px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #495057;
    list-style: none;
    user-select: none;
  }

  .status-filter-summary::-webkit-details-marker { display: none; }

  .status-filter-summary:hover {
    border-color: #80bdff;
  }

  .status-filter-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    background: white;
    border: 1px solid #ced4da;
    border-radius: 4px;
    padding: 6px 0;
    min-width: 150px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .status-filter-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
  }

  .status-filter-item:hover {
    background-color: #f0f4ff;
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

  .btn-share {
    background-color: #6f42c1;
    color: white;
  }

  .btn-share:hover {
    background-color: #5a32a3;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(26, 26, 26, 0.85);
    color: #fff;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
</style>