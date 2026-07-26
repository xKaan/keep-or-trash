const MAX_CONCURRENT = 4

let active = 0
const waiting: (() => void)[] = []

function release() {
  active -= 1
  waiting.shift()?.()
}

export function queued<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1
      task().then(resolve, reject).finally(release)
    }
    if (active < MAX_CONCURRENT) run()
    else waiting.push(run)
  })
}
