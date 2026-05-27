<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { getContext } from 'svelte';

  export let data: { 
    label: string; 
    requestA?: number;
    requestB?: number;
    requestC?: number;
    requestD?: number;
    isCenter?: boolean;
    available?: number;
    status?: string;
    nodeId?: string;
    url?: string;
    isOffer?: boolean;
    isMinimized?: boolean;
  };
  export let id: string;

  // Get the delete function from context
  const deleteNode = getContext('deleteNode') as ((nodeId: string) => void) | undefined;
  
  // Get update functions from context
  const updateNodeLabel = getContext('updateNodeLabel') as ((nodeId: string, newLabel: string) => void) | undefined;
  const updateNodeRequest = getContext('updateNodeRequest') as ((nodeId: string, requestType: 'requestA' | 'requestB' | 'requestC' | 'requestD', newValue: number) => void) | undefined;
  const updateCenterAvailable = getContext('updateCenterAvailable') as ((newValue: number) => void) | undefined;
  const updateNodeStatus = getContext('updateNodeStatus') as ((nodeId: string, status: string) => void) | undefined;
  const updateNodeUrl = getContext('updateNodeUrl') as ((nodeId: string, url: string) => void) | undefined;
  const updateNodeIsOffer = getContext('updateNodeIsOffer') as ((nodeId: string, isOffer: boolean) => void) | undefined;
  const updateNodeIsMinimized = getContext('updateNodeIsMinimized') as ((nodeId: string, isMinimized: boolean) => void) | undefined;
  const updateNodeRequestCEnabled = getContext('updateNodeRequestCEnabled') as ((nodeId: string, enabled: boolean) => void) | undefined;
  const updateNodeRequestCDescription = getContext('updateNodeRequestCDescription') as ((nodeId: string, description: string) => void) | undefined;
  const showStretchedStore = getContext('showStretched') as any;
  $: showStretched = showStretchedStore ? $showStretchedStore : false;
  
  // Get edges store from context to access current edge values
  const edgesStore = getContext('edgesStore') as any;
  
  // Get updateEdgeValue function from context
  const updateEdgeValue = getContext('updateEdgeValue') as ((edgeId: string, newValue: number) => void) | undefined;
  
  // Get all statuses from context
  const allStatusesStore = getContext('allStatuses') as any;
  const statusColorsStore = getContext('statusColors') as any;
  
  let allStatuses: string[] = [];
  $: if (allStatusesStore) {
    // Ensure 'unfinished' is always included as the first option
    const statuses = $allStatusesStore;
    if (!statuses.includes('unfinished')) {
      allStatuses = ['unfinished', ...statuses];
    } else {
      allStatuses = statuses;
    }
  }
  
  let showCustomInput = false;
  let customStatusValue = '';
  
  // Function to generate color from status name
  function getStatusColor(status: string): { bg: string; text: string; border: string } {
    if (!status || status === 'unfinished') return { bg: '#d3d3d3', text: '#6c757d', border: '#c0c0c0' };
    
    // Check if there's a custom color set
    if (statusColorsStore && $statusColorsStore[status]) {
      const customColor = $statusColorsStore[status];
      return {
        bg: customColor + '33', // Add transparency to background
        text: customColor,
        border: customColor
      };
    }
    
    // Hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < status.length; i++) {
      hash = status.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate hue from hash (0-360)
    const hue = Math.abs(hash % 360);
    
    // Use HSL for better color control
    return {
      bg: `hsl(${hue}, 70%, 90%)`,
      text: `hsl(${hue}, 70%, 25%)`,
      border: `hsl(${hue}, 70%, 60%)`
    };
  }
  
  $: statusColors = getStatusColor(data.status || 'unfinished');
  
  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (value === '__custom__') {
      showCustomInput = true;
      customStatusValue = data.status || '';
      // Focus the input after it's rendered
      setTimeout(() => {
        const input = document.querySelector('.custom-status-input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
    } else {
      showCustomInput = false;
      if (updateNodeStatus) {
        updateNodeStatus(id, value);
      }
    }
  }
  
  function handleCustomStatusSubmit(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (customStatusValue.trim() && updateNodeStatus) {
      updateNodeStatus(id, customStatusValue.trim());
      showCustomInput = false;
      customStatusValue = '';
    } else if (!customStatusValue.trim()) {
      // If empty, just cancel
      showCustomInput = false;
      customStatusValue = '';
    }
  }
  
  function handleCustomStatusKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCustomStatusSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      showCustomInput = false;
      customStatusValue = '';
    }
  }
  
  function handleCustomStatusBlur(event: FocusEvent) {
    // Small delay to allow click events to process first
    setTimeout(() => {
      if (customStatusValue.trim()) {
        handleCustomStatusSubmit();
      } else {
        showCustomInput = false;
        customStatusValue = '';
      }
    }, 100);
  }

  function handleDelete() {
    if (deleteNode) {
      deleteNode(id);
    }
  }

  // Get input value from center edge
  $: inputValue = (() => {
    if (data.isCenter || !edgesStore) return 0;
    
    const centerEdge = $edgesStore.find((edge: any) => 
      (edge.source === 'center' && edge.target === id) ||
      (edge.source === id && edge.target === 'center')
    );
    
    return centerEdge?.data?.value || 0;
  })();

  // Check which requests are completed
  $: completedRequests = {
    a: data.requestA !== undefined && inputValue >= (data.requestA),// + (data.requestB || 0) + (data.requestC || 0)),
    b: data.requestB !== undefined && inputValue >= data.requestB,// + (data.requestC || 0),
    c: data.requestC !== undefined && inputValue >= data.requestC,
    d: data.requestD !== undefined && inputValue >= data.requestD
  };

  // Calculate total allocated from all edges (for center node)
  $: totalAllocated = (() => {
    if (!data.isCenter || !edgesStore) return 0;
    
    return $edgesStore.reduce((total: number, edge: any) => {
      if (edge.source === 'center' || edge.target === 'center') {
        return total + (edge.data?.value || 0);
      }
      return total;
    }, 0);
  })();

  // Calculate remaining available (for center node)
  $: remainingAvailable = data.available !== undefined ? data.available - totalAllocated : 0;
  
  // Get the edge connected to center (for peripheral nodes)
  $: centerEdge = (() => {
    if (data.isCenter || !edgesStore) return null;
    
    return $edgesStore.find((edge: any) => 
      (edge.source === 'center' && edge.target === id) ||
      (edge.source === id && edge.target === 'center')
    );
  })();
  
  $: centerEdgeValue = centerEdge?.data?.value || 0;
  
  // Get isMinimized from data, default to false
  $: isMinimized = data.isMinimized || false;
  
  function toggleMinimize() {
    if (updateNodeIsMinimized) {
      updateNodeIsMinimized(id, !isMinimized);
    }
  }

  function fillPct(allocated: number, target: number): string {
    if (!target) return allocated > 0 ? '100%' : '0%';
    return Math.min(100, Math.round((allocated / target) * 100)) + '%';
  }
</script>

<div class="custom-node" class:center-node={data.isCenter} class:peripheral-node={!data.isCenter} style={!data.isCenter && data.status ? `border: 3px ${data.isOffer ? "dashed" : "solid"} ${statusColors.border};` : ''}>
  <!-- Single handle in the center for both source and target -->
  <Handle type="target" position={Position.Top} style="top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0;" />
  <Handle type="source" position={Position.Bottom} style="top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0;" />
  
  <div class="node-content">
    <div class="node-info">
      <div class="node-label">
        <div style="display: flex; align-items: center; gap: 6px; position: relative;">
          <div style="display: flex; align-items: flex-start; gap: 4px;">
            {#if !data.isCenter}
              <button class="delete-btn" on:click={handleDelete} title="Delete node">
                ×
              </button>
            {/if}
            {#if data.isCenter}
              <input 
                type="text" 
                value={data.label} 
                on:input={(e) => updateNodeLabel && updateNodeLabel(id, (e.target as HTMLInputElement).value)}
                class="label-input center-label-input"
                placeholder="Center Hub"
              />
            {:else}
              <input 
                type="text" 
                value={data.label} 
                on:input={(e) => updateNodeLabel && updateNodeLabel(id, (e.target as HTMLInputElement).value)}
                class="label-input"
                placeholder="Name"
              />
            {/if}
          </div>

          <!-- person/offer toggle -->
           {#if !data.isCenter && !isMinimized}
            <button class="offer-toggle-btn" on:click={() => {
              if (updateNodeIsOffer) {
                updateNodeIsOffer(id, !data.isOffer);
              }
            }} title={data.isOffer ? "Switch to Member" : "Switch to Offer"}>
              {data.isOffer ? '☆' : '☺︎'}
            </button>
          {/if}

        <!-- <div class="status-controls btns"> -->
          {#if !data.isCenter && !isMinimized}
            {#if showCustomInput}
              <input 
                type="text" 
                value={customStatusValue}
                on:input={(e) => customStatusValue = (e.target as HTMLInputElement).value}
                on:keydown={handleCustomStatusKeydown}
                on:blur={handleCustomStatusBlur}
                class="custom-status-input"
                placeholder="Enter status..."
              />
            {:else}
              <select 
                class="status-select" 
                value={data.status || 'unfinished'}
                on:change={handleStatusChange}
                style="background-color: {statusColors.bg}; color: {statusColors.text}; border-color: {statusColors.border};"
              >
                {#each allStatuses as status}
                  <option value={status}>{status}</option>
                {/each}
                <option value="__custom__">+ Custom...</option>
              </select>
            {/if}
          {/if}
        <!-- </div> -->

          <button class="minimize-btn" on:click={toggleMinimize} title={isMinimized ? "Expand" : "Minimize"}>
            {isMinimized ? '□' : '−'}
          </button>
        </div>
      </div>
      {#if !isMinimized}
        {#if !data.isCenter}
          <div class="url-container">
            <input 
              type="text" 
              value={data.url || ''} 
              on:input={(e) => updateNodeUrl && updateNodeUrl(id, (e.target as HTMLInputElement).value)}
              class="url-input"
              placeholder="spreadsheet url"
            />
            {#if data.url && data.url.trim()}
              <a href={data.url} target="_blank" rel="noopener noreferrer" class="url-link" title="Open link">
                🔗
              </a>
            {/if}
          </div>
        {/if}
        {#if !data.isCenter && (data.requestA !== undefined || data.requestB !== undefined)}
        <div class="requests-container">
          {#if data.requestCEnabled}
            <div class="addon-description-row">
              <span class="addon-label">add-on</span><input
                type="text"
                value={data.requestCDescription || ''}
                on:input={(e) => updateNodeRequestCDescription && updateNodeRequestCDescription(id, (e.target as HTMLInputElement).value)}
                class="addon-description-input"
                placeholder="What is this for?"
              />
              <button class="remove-addon-btn" on:click={() => updateNodeRequestCEnabled && updateNodeRequestCEnabled(id, false)} title="Remove regenerative add-on">×</button>
            </div>
            <div class="request-item" class:completed={completedRequests.c} data-tooltip="Missing: {inputValue - (data.requestC ?? 0) < 0 ? ((inputValue - (data.requestC ?? 0)) * -1) : 0}" style="background: linear-gradient(to right, {completedRequests.c ? '#d4edda' : '#fff3cd'} {fillPct(inputValue, data.requestC ?? 0)}, transparent {fillPct(inputValue, data.requestC ?? 0)})">
              <span>
                <span class="checkmark" class:completed={completedRequests.c}>
                  {completedRequests.c ? '✓' : ''}
                </span>
                <span class="request-label">Regenerative add-on:</span>
              </span>
              <input
                type="text"
                value={data.requestC ?? 0}
                on:input={(e) => updateNodeRequest && updateNodeRequest(id, 'requestC', Number((e.target as HTMLInputElement).value))}
                class="request-input"
                min="0"
              />
            </div>
          {:else}
            <button class="add-addon-btn" on:click={() => updateNodeRequestCEnabled && updateNodeRequestCEnabled(id, true)}>+ Regenerative add-on</button>
          {/if}
          {#if data.requestB !== undefined}
            <div class="request-item" class:completed={completedRequests.b} data-tooltip="Missing: {inputValue - data.requestB < 0 ? ((inputValue - data.requestB) * -1) : 0}" style="background: linear-gradient(to right, {completedRequests.b ? '#d4edda' : '#fff3cd'} {fillPct(inputValue, data.requestB)}, transparent {fillPct(inputValue, data.requestB)})">
              <span>
                <span class="checkmark" class:completed={completedRequests.b}>
                  {completedRequests.b ? '✓' : ''}
                </span>
                <span class="request-label">Stress-free basics:</span>
              </span>
              <input 
                type="text" 
                value={data.requestB} 
                on:input={(e) => updateNodeRequest && updateNodeRequest(id, 'requestB', Number((e.target as HTMLInputElement).value))}
                class="request-input"
                min="0"
              />
            </div>
          {/if}
          {#if data.requestA !== undefined}
            <div class="request-item" class:completed={completedRequests.a} data-tooltip="Missing: {inputValue - data.requestA < 0 ? ((inputValue - data.requestA) * -1) : 0}" style="background: linear-gradient(to right, {completedRequests.a ? '#d4edda' : '#fff3cd'} {fillPct(inputValue, data.requestA)}, transparent {fillPct(inputValue, data.requestA)})">
              <span>
                <span class="checkmark" class:completed={completedRequests.a}>
                  {completedRequests.a ? '✓' : ''}
                </span>
                <span class="request-label">Basics:</span>
              </span>
              <input 
                type="text" 
                value={data.requestA} 
                on:input={(e) => updateNodeRequest && updateNodeRequest(id, 'requestA', Number((e.target as HTMLInputElement).value))}
                class="request-input"
                min="0"
              />
            </div>
          {/if}
          {#if data.requestD !== undefined && showStretched}
            <div class="request-item" class:completed={completedRequests.d} data-tooltip="Missing: {inputValue - data.requestD < 0 ? ((inputValue - data.requestD) * -1) : 0}" style="background: linear-gradient(to right, {completedRequests.d ? '#d4edda' : '#fff3cd'} {fillPct(inputValue, data.requestD)}, transparent {fillPct(inputValue, data.requestD)})">
              <span>
                <span class="checkmark" class:completed={completedRequests.d}>
                  {completedRequests.d ? '✓' : ''}
                </span>
                <span class="request-label">Stretched:</span>
              </span>
              <input 
                type="text" 
                value={data.requestD} 
                on:input={(e) => updateNodeRequest && updateNodeRequest(id, 'requestD', Number((e.target as HTMLInputElement).value))}
                class="request-input"
                min="0"
              />
            </div>
          {/if}
        </div>
        {/if}
        <!-- <div class="input-value">Input: {inputValue}</div> -->
        {#if centerEdge}
          <div class="edge-input-container">
            <label class="edge-input-label">
              Allocated:
              <input 
                type="number" 
                value={centerEdgeValue} 
                on:input={(e) => updateEdgeValue && centerEdge && updateEdgeValue(centerEdge.id, Number((e.target as HTMLInputElement).value) || 0)}
                class="edge-value-input"
                min="0"
                step="1"
              />
            </label>
          </div>
        {/if}
        {#if data.isCenter && data.available !== undefined}
          <div class="center-info">
            <div class="available-info">
              Available: 
              <input 
                type="text" 
                value={data.available} 
                on:input={(e) => updateCenterAvailable && updateCenterAvailable(Number((e.target as HTMLInputElement).value))}
                class="available-input"
                min="0"
              />
            </div>
            <div class="allocated-info">Allocated: {totalAllocated}</div>
            <div class="remaining-info" class:positive={remainingAvailable >= 0} class:negative={remainingAvailable < 0}>
              Remaining: {remainingAvailable}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .custom-node {
    position: relative;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 8px 12px;
    min-width: 120px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .node-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .node-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .node-label {
    font-size: 14px;
    font-weight: bold;
  }

  .requests-container {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
  }

  .request-item {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 11px;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
    cursor: help;
  }

  .request-item[data-tooltip] {
    position: relative;
  }

  .request-item[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: -24%;
    left: 120%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 1000;
    pointer-events: none;
    margin-bottom: 4px;
  }

  .request-item.completed .request-label {
    color: #155724;
    font-weight: bold;
  }

  .request-item.completed .request-input {
    color: #155724;
    font-weight: bold;
  }

  .add-addon-btn {
    width: 100%;
    background: transparent;
    border: none;
    color: #c0c0c0;
    font-size: 10px;
    padding: 1px 2px;
    cursor: pointer;
    text-align: left;
  }

  .add-addon-btn:hover {
    color: #6c757d;
  }

  .addon-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #fff;
    background: #adb5bd;
    border-radius: 3px;
    padding: 1px 4px 2px;
    flex-shrink: 0;
  }

  .addon-description-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }

  .addon-description-input {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 1px solid #ced4da;
    font-size: 10px;
    font-style: italic;
    color: #495057;
    padding: 1px 2px;
    min-width: 0;
  }

  .addon-description-input:focus {
    outline: none;
    border-bottom-color: #007bff;
  }

  .remove-addon-btn {
    background: transparent;
    border: none;
    color: #adb5bd;
    font-size: 12px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }

  .remove-addon-btn:hover {
    color: #dc3545;
  }

  .label-input {
    background: transparent;
    border: none;
    font-size: 14px;
    font-weight: bold;
    padding: 2px 4px;
    margin: auto;
    text-align: left;
    border-radius: 3px;
    width: 80px;
  }

  .label-input:focus {
    background: white;
    border: 1px solid #007bff;
    outline: none;
  }

  .center-label-input {
    font-size: 16px;
    text-align: center;
    width: 100px;
  }

  .request-input {
    background: transparent;
    border: none;
    font-size: 11px;
    padding: 1px 3px;
    border-radius: 2px;
    width: 50px;
    text-align: right;
  }

  .request-input:focus {
    background: white;
    border: 1px solid #007bff;
    outline: none;
  }

  .available-input {
    background: transparent;
    border: none;
    font-size: 11px;
    font-weight: bold;
    padding: 1px 3px;
    border-radius: 2px;
    width: 60px;
    text-align: right;
  }

  .available-input:focus {
    background: white;
    border: 1px solid #007bff;
    outline: none;
  }

  .checkmark {
    font-size: 12px;
    font-weight: bold;
    width: 14px;
    text-align: center;
  }

  .checkmark.completed {
    color: #28a745;
  }

  .checkmark:not(.completed) {
    color: #6c757d;
  }

  .request-label {
    color: #495057;
  }

  .status-select {
    border: 2px solid;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
    max-width: 84px;
  }

  .status-select:hover {
    opacity: 0.8;
  }

  .status-select:focus {
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .custom-status-input {
    border: 2px solid #007bff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: bold;
    outline: none;
    width: 100px;
  }

  .custom-status-input:focus {
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .center-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 6px;
    font-size: 11px;
  }

  .available-info {
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 3px;
    background-color: #d1ecf1;
    color: #0c5460;
  }

  .allocated-info {
    padding: 2px 4px;
    border-radius: 3px;
    background-color: #fff3cd;
    color: #856404;
  }

  .remaining-info {
    font-weight: bold;
    padding: 2px 4px;
    border-radius: 3px;
  }

  .remaining-info.positive {
    background-color: #d4edda;
    color: #155724;
  }

  .remaining-info.negative {
    background-color: #f8d7da;
    color: #721c24;
  }

  .center-node .node-label {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    text-align: center;
  }

  .peripheral-node .node-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .offer-toggle-btn {
    border: 0;
    background-color: transparent;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s;
    padding: 0;
  }

  .delete-btn {
    border: 0;
    background-color: transparent;
    color: rgb(139, 139, 139);
    border-radius: 4px;
    width: 25px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    transition: background-color 0.2s;
  }

  .delete-btn:hover {
    opacity: 1;
  }

  .delete-btn:hover {
    background: #292929;
  }

  .delete-btn:active {
    transform: scale(0.95);
  }

  .minimize-btn {
    top: -4px;
    right: -4px;
    border: 0;
    background-color: #f0f0f0;
    color: #495057;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    line-height: 1;
    transition: background-color 0.2s;
    padding: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .minimize-btn:hover {
    background-color: #e0e0e0;
  }

  .minimize-btn:active {
    transform: scale(0.95);
  }

  .edge-input-container {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 4px;
    background: #f8f9fa;
    border-radius: 4px;
  }

  .edge-input-label {
    font-size: 11px;
    color: #495057;
    font-weight: bold;
  }

  .edge-value-input {
    width: 116px;
    padding: 4px 6px;
    border: 1px solid #ced4da;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    text-align: left;
  }

  .edge-value-input:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .url-container {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }

  .url-input {
    flex: 1;
    background: transparent;
    border: 0;
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 3px;
    width: 100%;
    color: #666b70;
  }

  .url-input:focus {
    background: white;
    border: 1px solid #007bff;
    outline: none;
  }

  .url-input::placeholder {
    color: #adb5bd;
    font-style: italic;
  }

  .url-link {
    font-size: 14px;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.2s;
    display: flex;
    align-items: center;
  }

  .url-link:hover {
    transform: scale(1.2);
  }
</style>
