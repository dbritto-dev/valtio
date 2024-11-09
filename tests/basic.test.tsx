import { StrictMode, useEffect, useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { proxy, snapshot, useSnapshot } from 'valtio'

const useCommitCount = () => {
  const commitCountRef = useRef(1)
  useEffect(() => {
    commitCountRef.current += 1
  })
  // eslint-disable-next-line react-compiler/react-compiler
  return commitCountRef.current
}

it('simple counter', async () => {
  const obj = proxy({ count: 0 })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>count: {snap.count}</div>
        <button onClick={() => ++obj.count}>button</button>
      </>
    )
  }

  const { unmount } = render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
  unmount()
})

it('no extra re-renders (commits)', async () => {
  const obj = proxy({ count: 0, count2: 0 })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>
          count: {snap.count} ({useCommitCount()})
        </div>
        <button onClick={() => ++obj.count}>button</button>
      </>
    )
  }

  const Counter2 = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>
          count2: {snap.count2} ({useCommitCount()})
        </div>
        <button onClick={() => ++obj.count2}>button2</button>
      </>
    )
  }

  render(
    <>
      <Counter />
      <Counter2 />
    </>,
  )

  await waitFor(() => {
    screen.getByText('count: 0 (1)')
    screen.getByText('count2: 0 (1)')
  })

  fireEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 1 (2)')
    screen.getByText('count2: 0 (1)')
  })

  fireEvent.click(screen.getByText('button2'))
  await waitFor(() => {
    screen.getByText('count: 1 (2)')
    screen.getByText('count2: 1 (2)')
  })
})

it('no extra re-renders (render func calls in non strict mode)', async () => {
  const obj = proxy({ count: 0, count2: 0 })

  const renderFn = vi.fn()
  const Counter = () => {
    const snap = useSnapshot(obj)
    renderFn(snap.count)
    return (
      <>
        <div>count: {snap.count}</div>
        <button onClick={() => ++obj.count}>button</button>
      </>
    )
  }

  const renderFn2 = vi.fn()
  const Counter2 = () => {
    const snap = useSnapshot(obj)
    renderFn2(snap.count2)
    return (
      <>
        <div>count2: {snap.count2}</div>
        <button onClick={() => ++obj.count2}>button2</button>
      </>
    )
  }

  render(
    <>
      <Counter />
      <Counter2 />
    </>,
  )

  await waitFor(() => {
    screen.getByText('count: 0')
    screen.getByText('count2: 0')
  })
  expect(renderFn).toBeCalledTimes(1)
  expect(renderFn).lastCalledWith(0)
  expect(renderFn2).toBeCalledTimes(1)
  expect(renderFn2).lastCalledWith(0)

  fireEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('count2: 0')
  })
  expect(renderFn).toBeCalledTimes(2)
  expect(renderFn).lastCalledWith(1)
  expect(renderFn2).toBeCalledTimes(1)
  expect(renderFn2).lastCalledWith(0)

  fireEvent.click(screen.getByText('button2'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('count2: 1')
  })
  expect(renderFn).toBeCalledTimes(2)
  expect(renderFn).lastCalledWith(1)
  expect(renderFn2).toBeCalledTimes(2)
  expect(renderFn2).lastCalledWith(1)

  fireEvent.click(screen.getByText('button2'))
  await waitFor(() => {
    screen.getByText('count: 1')
    screen.getByText('count2: 2')
  })
  expect(renderFn).toBeCalledTimes(2)
  expect(renderFn).lastCalledWith(1)
  expect(renderFn2).toBeCalledTimes(3)
  expect(renderFn2).lastCalledWith(2)

  fireEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('count: 2')
    screen.getByText('count2: 2')
  })
  expect(renderFn).toBeCalledTimes(3)
  expect(renderFn).lastCalledWith(2)
  expect(renderFn2).toBeCalledTimes(3)
  expect(renderFn2).lastCalledWith(2)
})

it('object in object', async () => {
  const obj = proxy({ object: { count: 0 } })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>count: {snap.object.count}</div>
        <button onClick={() => ++obj.object.count}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
})

it('array in object', async () => {
  const obj = proxy({ counts: [0, 1, 2] })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>counts: {snap.counts.join(',')}</div>
        <button onClick={() => obj.counts.push(obj.counts.length)}>
          button
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('counts: 0,1,2')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('counts: 0,1,2,3')
})

it('array pop and splice', async () => {
  const arr = proxy([0, 1, 2])

  const Counter = () => {
    const snap = useSnapshot(arr)
    return (
      <>
        <div>counts: {snap.join(',')}</div>
        <button onClick={() => arr.pop()}>button</button>
        <button onClick={() => arr.splice(1, 0, 10, 11)}>button2</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('counts: 0,1,2')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('counts: 0,1')

  fireEvent.click(screen.getByText('button2'))
  await screen.findByText('counts: 0,10,11,1')
})

it('array length after direct assignment', async () => {
  const obj = proxy({ counts: [0, 1, 2] })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>counts: {snap.counts.join(',')}</div>
        <div>length: {snap.counts.length}</div>
        <button
          onClick={() => (obj.counts[obj.counts.length] = obj.counts.length)}
        >
          increment
        </button>
        <button
          onClick={() =>
            (obj.counts[obj.counts.length + 5] = obj.counts.length + 5)
          }
        >
          jump
        </button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('counts: 0,1,2')

  fireEvent.click(screen.getByText('increment'))
  await screen.findByText('counts: 0,1,2,3')

  fireEvent.click(screen.getByText('jump'))
  await screen.findByText('counts: 0,1,2,3,,,,,,9')
})

it('deleting property', async () => {
  const obj = proxy<{ count?: number }>({ count: 1 })

  const Counter = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>count: {snap.count ?? 'none'}</div>
        <button onClick={() => delete obj.count}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count: 1')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: none')
})

it('circular object', async () => {
  const obj = proxy<any>({ object: {} })
  obj.object = obj
  obj.object.count = 0

  const Counter = () => {
    const snap = useSnapshot(obj) as any
    return (
      <>
        <div>count: {snap.count}</div>
        <button onClick={() => ++obj.count}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count: 0')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
})

it('circular object with non-proxy object (#375)', async () => {
  const initialObject = { count: 0 }
  const state: any = proxy(initialObject)
  state.obj = initialObject

  const Counter = () => {
    const snap = useSnapshot(state)
    return <div>count: {snap.obj ? 1 : snap.count}</div>
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('count: 1')
})

it('render from outside', async () => {
  const obj = proxy({ count: 0, anotherCount: 0 })

  const Counter = () => {
    const [show, setShow] = useState(false)
    const snap = useSnapshot(obj)
    return (
      <>
        {show ? (
          <div>count: {snap.count}</div>
        ) : (
          <div>anotherCount: {snap.anotherCount}</div>
        )}
        <button onClick={() => ++obj.count}>button</button>
        <button onClick={() => setShow((x) => !x)}>toggle</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Counter />
    </StrictMode>,
  )

  await screen.findByText('anotherCount: 0')

  fireEvent.click(screen.getByText('button'))
  fireEvent.click(screen.getByText('toggle'))
  await screen.findByText('count: 1')
})

it('counter with sync option', async () => {
  const obj = proxy({ count: 0 })

  const Counter = () => {
    const snap = useSnapshot(obj, { sync: true })
    return (
      <>
        <div>
          count: {snap.count} ({useCommitCount()})
        </div>
        <button onClick={() => ++obj.count}>button</button>
      </>
    )
  }

  render(
    <>
      <Counter />
    </>,
  )

  await screen.findByText('count: 0 (1)')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1 (2)')

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 2 (3)')
})

it('support undefined property (#439)', async () => {
  const obj = proxy({ prop: undefined })

  expect('prop' in obj).toBe(true)

  const Component = () => {
    const snap = useSnapshot(obj)
    return <div>has prop: {JSON.stringify('prop' in snap)}</div>
  }

  render(
    <StrictMode>
      <Component />
    </StrictMode>,
  )

  await screen.findByText('has prop: true')
})

it('sync snapshot between nested components (#460)', async () => {
  const obj = proxy<{
    id: 'prop1' | 'prop2'
    prop1: string
    prop2?: string
  }>({ id: 'prop1', prop1: 'value1' })

  const Child = ({ id }: { id: 'prop1' | 'prop2' }) => {
    const snap = useSnapshot(obj)
    return <div>Child: {snap[id]}</div>
  }

  const handleClick = () => {
    obj.prop2 = 'value2'
    obj.id = 'prop2'
  }

  const Parent = () => {
    const snap = useSnapshot(obj)
    return (
      <>
        <div>Parent: {snap[snap.id]}</div>
        <Child id={snap.id} />
        <button onClick={handleClick}>button</button>
      </>
    )
  }

  render(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )

  await waitFor(() => {
    screen.getByText('Parent: value1')
    screen.getByText('Child: value1')
  })

  fireEvent.click(screen.getByText('button'))
  await waitFor(() => {
    screen.getByText('Parent: value2')
    screen.getByText('Child: value2')
  })
})

it('respects property enumerability (#726)', async () => {
  const x = proxy(Object.defineProperty({ a: 1 }, 'b', { value: 2 }))
  expect(Object.keys(snapshot(x))).toEqual(Object.keys(x))
})

it('stable snapshot object (#985)', async () => {
  const state = proxy({ count: 0, obj: {} })

  let effectCount = 0

  const TestComponent = () => {
    const { count, obj } = useSnapshot(state)
    useEffect(() => {
      ++effectCount
    }, [obj])
    return (
      <>
        <div>count: {count}</div>
        <button onClick={() => ++state.count}>button</button>
      </>
    )
  }

  render(<TestComponent />)

  await screen.findByText('count: 0')
  expect(effectCount).toBe(1)

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 1')
  expect(effectCount).toBe(1)

  fireEvent.click(screen.getByText('button'))
  await screen.findByText('count: 2')
  expect(effectCount).toBe(1)
})
