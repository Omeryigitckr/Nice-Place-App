import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastPayload {
  id: number;
  message: string;
  tone: ToastTone;
  icon?: ComponentProps<typeof Ionicons>['name'];
  durationMs?: number;
}

type ToastListener = (toast: ToastPayload | null) => void;

let nextId = 1;
let current: ToastPayload | null = null;
const listeners = new Set<ToastListener>();

function emit() {
  listeners.forEach((listener) => listener(current));
}

const DEFAULT_ICONS: Record<ToastTone, ComponentProps<typeof Ionicons>['name']> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
};

export function showAppToast(
  message: string,
  options?: {
    tone?: ToastTone;
    icon?: ComponentProps<typeof Ionicons>['name'];
    durationMs?: number;
  },
): void {
  const tone = options?.tone ?? 'info';
  current = {
    id: nextId++,
    message,
    tone,
    icon: options?.icon ?? DEFAULT_ICONS[tone],
    durationMs: options?.durationMs ?? 2600,
  };
  emit();
}

export function dismissAppToast(): void {
  current = null;
  emit();
}

export function subscribeAppToast(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppToast(): ToastPayload | null {
  return current;
}
