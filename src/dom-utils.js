const _template = document.createElement('template');

export function getDOM(html) {
  _template.innerHTML = html.join('');
  return _template.content;
}

export function appendSync(root, elem) {
  root.append(elem);
}

export function append(root, elem) {
  return new Promise((resolve) => {
    setTimeout(() => {
      appendSync(root, elem);
      resolve(root);
    }, 0);
  });
}
