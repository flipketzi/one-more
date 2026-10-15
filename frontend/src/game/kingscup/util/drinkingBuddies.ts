/** Mirrors the backend: each player has at most one buddy, so both leave their previous pairs. */
export function pairBuddies(buddies: Record<string, string>, playerId: string, buddyId: string): Record<string, string> {
  const next = { ...buddies };
  for (const id of [playerId, buddyId]) {
    const previous = next[id];
    if (previous) delete next[previous];
    delete next[id];
  }
  next[playerId] = buddyId;
  next[buddyId] = playerId;
  return next;
}
