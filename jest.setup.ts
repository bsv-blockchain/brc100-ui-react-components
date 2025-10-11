import '@testing-library/jest-dom'

// MUI/DOM polyfills that keep tests quiet
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as any).ResizeObserver = RO as any

Object.defineProperty(window, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
})
