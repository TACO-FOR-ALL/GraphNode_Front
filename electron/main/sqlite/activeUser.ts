let activeUserId: string | null = null;

export function setActiveUserId(userId: string): void {
  activeUserId = userId;
}

export function clearActiveUserId(): void {
  activeUserId = null;
}

export function getActiveUserId(): string | null {
  return activeUserId;
}
