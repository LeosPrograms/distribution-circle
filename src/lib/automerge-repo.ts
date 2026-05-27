import { Repo, isValidAutomergeUrl, type AutomergeUrl } from '@automerge/automerge-repo'
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel'
import { WebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket'
import { IndexedDBStorageAdapter } from '@automerge/automerge-repo-storage-indexeddb'

// ── Document types ──────────────────────────────────────────────────────────

export type NodeData = {
  label: string
  isCenter?: boolean
  available?: number
  color?: string
  requestA?: number
  requestB?: number
  requestC?: number
  requestCEnabled?: boolean
  requestCDescription?: string
  requestD?: number
  nodeId?: string
  status?: string
  url?: string
  isOffer?: boolean
  isMinimized?: boolean
}

export type PlanNode = {
  id: string
  type: string
  data: NodeData
  position: { x: number; y: number }
}

export type PlanEdge = {
  id: string
  type: string
  source: string
  target: string
  data: { value: number }
}

export type PlanDoc = {
  nodes: Record<string, PlanNode>
  edges: Record<string, PlanEdge>
  nodeCounter: number
  statuses: string[]
  statusColors: Record<string, string>
}

// ── Singleton repo ───────────────────────────────────────────────────────────

let _repo: Repo | null = null

/** Returns the shared Repo instance (browser only). */
export function getRepo(): Repo {
  if (_repo) return _repo
  _repo = new Repo({
    network: [
      new BroadcastChannelNetworkAdapter(),
      new WebSocketClientAdapter('wss://sync.automerge.org'),
    ],
    storage: new IndexedDBStorageAdapter(),
  })
  return _repo
}

export { isValidAutomergeUrl, type AutomergeUrl }
