const typeRe = /(?<type>\w+)((#(?<id>\w+))|(\.(?<class>\w+))*)/;
export function el(type, ...children) {
  type = typeRe.exec(type);
  if (!type) throw Error('bad type:', type);

  const newEl = document.createElement(type.groups.type);
  if (type.groups.class) newEl.classList.add(type.groups.class);
  if (type.groups.id) newEl.id = type.groups.id;

  for (const child of children) {
    if (typeof child === 'string') {
      newEl.append(document.createTextNode(child));
    } else if (child instanceof Node) {
      newEl.append(child);
    } else {
      console.error('Cannot handle this child:', child);
    }
  }

  return newEl;
}
window.el = el;

export function q(query) {
  return document.querySelector(query);
}
window.q = q;