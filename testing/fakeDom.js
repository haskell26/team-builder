class FakeLocalStorage {
  constructor(entries = {}) {
    this.store = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, `${value}`);
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

class FakeElement {
  constructor(id, ownerDocument) {
    this.id = id;
    this.ownerDocument = ownerDocument;
    this.listeners = new Map();
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.scrolled = false;
    this.scrollArguments = [];
    this._innerHTML = '';
    this.registeredChildIds = new Set();
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this.ownerDocument.unregisterElements(this.registeredChildIds);
    this._innerHTML = value;
    this.registeredChildIds = this.ownerDocument.registerMarkup(value);
  }

  addEventListener(type, listener) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  dispatchEvent(event) {
    const payload =
      typeof event === 'string'
        ? {
            type: event,
          }
        : {
            ...event,
          };

    const listeners = this.listeners.get(payload.type) ?? [];
    const normalizedEvent = {
      preventDefault() {},
      target: this,
      currentTarget: this,
      ...payload,
    };

    for (const listener of listeners) {
      listener(normalizedEvent);
    }
  }

  click() {
    if (this.disabled) {
      return;
    }

    this.dispatchEvent('click');
  }

  scrollIntoView(options = {}) {
    this.scrolled = true;
    this.scrollArguments.push(options);
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
    this.registerElement(new FakeElement('app', this));
  }

  registerElement(element) {
    this.elements.set(element.id, element);
    return element;
  }

  registerMarkup(markup) {
    const matches = markup.matchAll(/id="([^"]+)"/g);
    const registeredIds = new Set();

    for (const match of matches) {
      const id = match[1];
      this.registerElement(new FakeElement(id, this));
      registeredIds.add(id);
    }

    return registeredIds;
  }

  unregisterElements(elementIds) {
    for (const id of elementIds) {
      if (id === 'app') {
        continue;
      }

      this.elements.delete(id);
    }
  }

  querySelector(selector) {
    if (!selector.startsWith('#')) {
      return null;
    }

    return this.elements.get(selector.slice(1)) ?? null;
  }
}

export async function loadMainIntoFakeDom({ storageEntries = {} } = {}) {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const document = new FakeDocument();
  const localStorage = new FakeLocalStorage(storageEntries);
  const window = { document, localStorage };

  globalThis.document = document;
  globalThis.window = window;
  globalThis.localStorage = localStorage;

  const moduleUrl = new URL('../src/main.js', import.meta.url);
  await import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`);

  return {
    document,
    localStorage,
    cleanup() {
      if (previousDocument === undefined) {
        delete globalThis.document;
      } else {
        globalThis.document = previousDocument;
      }

      if (previousWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = previousWindow;
      }

      if (previousLocalStorage === undefined) {
        delete globalThis.localStorage;
      } else {
        globalThis.localStorage = previousLocalStorage;
      }
    },
  };
}
