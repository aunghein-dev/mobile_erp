export function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
