import { writable } from 'svelte/store'

// Tab navigation store - allows cross-component tab switching
export const activeTab = writable<'chat' | 'papers' | 'pdf' | 'notes' | 'graph'>('chat')
