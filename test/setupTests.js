/**
 * Jest Setup for Layout Settings Tests
 * 
 * This file configures the testing environment for Electron/LitElement components
 * and provides common mocks and utilities.
 */

// Mock Electron environment
global.window = global.window || {};
global.window.require = jest.fn();

// Mock Web APIs that might not be available in jsdom
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock CSS custom properties support
Object.defineProperty(global.CSSStyleDeclaration.prototype, 'setProperty', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(global.CSSStyleDeclaration.prototype, 'getPropertyValue', {
  value: jest.fn(),
  writable: true
});

// Mock localStorage if not available
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
}

// Mock document.documentElement
if (!global.document.documentElement) {
  global.document.documentElement = {
    style: {
      setProperty: jest.fn(),
      getPropertyValue: jest.fn()
    },
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    }
  };
}

// Mock CustomEvent for event dispatching
global.CustomEvent = class CustomEvent extends Event {
  constructor(event, params = {}) {
    super(event, params);
    this.detail = params.detail;
  }
};

// Suppress console warnings during tests unless needed
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args) => {
  // Allow specific warnings that are relevant to our tests
  if (args[0] && args[0].includes('layout') || args[0].includes('transparency')) {
    originalConsoleWarn(...args);
  }
};

console.error = (...args) => {
  // Always show errors
  originalConsoleError(...args);
};

// Restore console methods after tests
afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});