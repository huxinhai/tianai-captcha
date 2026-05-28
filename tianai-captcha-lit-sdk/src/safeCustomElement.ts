export function safeCustomElement(tagName: string) {
  return <T extends CustomElementConstructor>(klass: T): T => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, klass);
    }
    return klass;
  };
}
