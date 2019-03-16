export function timer(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}

export async function waitUntilApplicationExits() {
  while (true) {
    await timer(500)
  }
}
