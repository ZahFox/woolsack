export function timer(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}
