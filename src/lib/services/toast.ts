/**
 * Toast notification service — simple pub/sub for error/success messages
 */

import { writable } from 'svelte/store'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export const toasts = writable<Toast[]>([])

let toastId = 0

export function showToast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = String(++toastId)
  const toast: Toast = { id, message, type, duration }

  toasts.update(list => [...list, toast])

  if (duration) {
    setTimeout(() => {
      toasts.update(list => list.filter(t => t.id !== id))
    }, duration)
  }

  return id
}

export function removeToast(id: string) {
  toasts.update(list => list.filter(t => t.id !== id))
}
