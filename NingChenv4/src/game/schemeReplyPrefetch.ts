const pendingReplyPrefetchIds = new Set<string>()

export function markSchemeReplyPrefetchStarted(actionId: string) {
    pendingReplyPrefetchIds.add(actionId)
}

export function clearSchemeReplyPrefetch(actionId: string) {
    pendingReplyPrefetchIds.delete(actionId)
}

export function isSchemeReplyPrefetchInFlight(actionId: string): boolean {
    return pendingReplyPrefetchIds.has(actionId)
}

export function __resetSchemeReplyPrefetchRegistryForTests() {
    pendingReplyPrefetchIds.clear()
}
