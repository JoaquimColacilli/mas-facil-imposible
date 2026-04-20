// Thin wrapper to use Lucide icons as inline SVG.
// Uses window.lucide.icons[name] which in UMD is an array node spec: [tag, attrs, children?]
// Works with lucide v0.453 UMD.

function specToSvgString(spec, attrs = {}) {
  // spec is typically ['svg', {...}, [['path', {...}], ...]]  OR just children array
  let children;
  let rootAttrs;
  if (Array.isArray(spec) && spec[0] === 'svg') {
    rootAttrs = spec[1] || {};
    children = spec[2] || [];
  } else if (Array.isArray(spec) && Array.isArray(spec[0])) {
    // Already children array
    rootAttrs = {};
    children = spec;
  } else {
    return '';
  }
  const mergedAttrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 24, height: 24,
    viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    ...rootAttrs,
    ...attrs,
  };
  const attrStr = Object.entries(mergedAttrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  const inner = children.map(c => {
    if (!Array.isArray(c)) return '';
    const [tag, a] = c;
    const aStr = Object.entries(a || {}).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${aStr} />`;
  }).join('');
  return `<svg ${attrStr}>${inner}</svg>`;
}

const Icon = ({ name, className = '', strokeWidth = 1.8, style, ...rest }) => {
  const spec = (window.lucide && window.lucide.icons && window.lucide.icons[name]) || null;
  const svg = spec
    ? specToSvgString(spec, { 'stroke-width': strokeWidth, width: '100%', height: '100%' })
    : '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor"/></svg>';
  return (
    <span
      className={"inline-flex items-center justify-center shrink-0 " + className}
      style={style}
      aria-hidden="true"
      {...rest}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

Object.assign(window, { Icon });
