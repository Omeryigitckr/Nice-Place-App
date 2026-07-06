let pendingAuthCallbackUrl: string | null = null;

export function stashAuthCallbackUrl(url: string): void {
  pendingAuthCallbackUrl = url;
}

export function takeAuthCallbackUrl(): string | null {
  const url = pendingAuthCallbackUrl;
  pendingAuthCallbackUrl = null;
  return url;
}
