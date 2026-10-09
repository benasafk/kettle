/** Stable derived UUIDs keep artifacts identical when a durable success receipt is replayed. */
export async function receiptIds(seed: string, count: number) {
  const ids = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}:${index}`)));
    hash[6] = (hash[6]! & 15) | 80; hash[8] = (hash[8]! & 63) | 128;
    const hex = [...hash.slice(0, 16)].map(v => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }));
  let index = 0;
  return () => { const id = ids[index++]; if (!id) throw new Error('Derived identity bound exceeded'); return id; };
}
