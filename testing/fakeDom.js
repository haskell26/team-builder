class FakeElement {
  constructor(id, ownerDocument) {
    this.id = id;
    this.ownerDocument = ownerDocument;
    this.listeners = new Map();
    this.value = '';
    this.scrolled = false;
    this.scrollArguments = [];
    this._innerHTML = '';
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = value;

    if (this.id === 'app') {
      this.ownerDocument.registerMarkup(value);
    }
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

    for (const match of matches) {
      const id = match[1];

      if (!this.elements.has(id)) {
        this.registerElement(new FakeElement(id, this));
      }
    }
  }

  querySelector(selector) {
    if (!selector.startsWith('#')) {
      return null;
    }

    return this.elements.get(selector.slice(1)) ?? null;
  }
}

export async function loadMainIntoFakeDom() {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const document = new FakeDocument();
  const window = { document };

  globalThis.document = document;
  globalThis.window = window;

  const moduleUrl = new URL('../src/main.js', import.meta.url);
  await import(`${moduleUrl.href}?test=${Date.now()}-${Math.random()}`);

  return {
    document,
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
    },
  };
}
