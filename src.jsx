import React from 'react';
import { 
  line, 
  scaleLinear, 
  geoPath, 
  contourDensity, 
  select,
  interpolateYlGnBu,
} from 'd3';

export { 
  MarginalsInteractive,
  Marginals,
  Marginal1D,
  Marginal2D,
  to_natural, 
  to_grid, 
  get_rows,
  get_coords,
};

export default Marginals;

const testArrays = (arrays, d) => (
  Array.isArray(arrays) &&
  arrays.length === d &&
  arrays.every(
    (a, i) => Array.isArray(a) && a.length === i + 1 
  )
);

const parseClick = e => (
  e.target.nodeName === "svg"
  ? e.target.attributes.name.nodeValue
  : (e.target.viewportElement
    ? e.target.viewportElement.attributes.name.nodeValue
    : undefined
  )
);

/**
 * Our react components
 */
function MarginalsInteractive({ data, labels, svgProps, bandwidths, bandwidth }) {
  // get the dimension each time the data changes
  const d = React.useMemo(() => {
    if (!Array.isArray(data) || !data.length) return 0
    else return data[0].length;
  }, [data]);

  // create state for bandwidths
  const [bandwidthsFix, setBandwidths] = React.useState(
    testArrays(bandwidths, d)
    ? bandwidths
    : Array(d).fill().map((_, i) => Array(i+1).fill(bandwidth || 5.0))
  );

  // create state for selected
  const [selected, setSelected] = React.useState(undefined);
  const onClick = React.useCallback(e => {
    const pair = parseClick(e);
    if (!pair) return;
    else setSelected(pair);
  }, [setSelected]);

  // parse if something is selected
  const pair = selected && selected.match(/[0-9]+/g).map(k => parseInt(k));

  // get the react component for the view
  const view = React.useMemo(() => {
    if (!pair) return null;
    const [row, col] = pair;
    return (
      row === col
      ? <Marginal1D 
          data={ data.map(v => v[row]) } 
          bandwidth={ bandwidthsFix[row][col] }
          { ...{ 
            width: 100 * d, 
            height: 100 * d, 
            strokeWidth: 0.5,
            ...(svgProps || {}) 
          } } />
      : <Marginal2D
          data={ data.map(v => [v[col], v[row]]) } 
          bandwidth={ bandwidthsFix[row][col] }
          { ...{ 
            width: 100 * d, 
            height: 100 * d, 
            strokeWidth: 0.5,
            ...(svgProps || {}) 
          } } />
    );
  }, [pair, bandwidthsFix, data]);

  // create the bandwidth input
  const input = React.useMemo(() => {
    if (!pair) return null;
    const [row, col] = pair;
    return (
      <input 
        placeholder="bandwidth" 
        value={ bandwidthsFix[row][col] }
        onChange={ e => {
          const value = e.target.value;
          setBandwidths(bbs => 
            bbs.map((bs, r) => 
              r === row ? bs.map((b, c) => c === col ? value : b) : bs
            )
          );
        }}
      />
    );
  }, [pair, bandwidthsFix, setBandwidths]);

  return (
    <div>
      <Marginals 
        data={ data } 
        labels={ labels } 
        svgProps={ { ...(svgProps || {}), onClick } }
        bandwidths={ bandwidthsFix } 
        selection={ selected }/>
      { view }
      { input }
    </div>
  );
}

function Marginals({ data, labels, svgProps, bandwidths, bandwidth, selection }) {
  // memoize the lists of marginals
  const { d, marginals } = React.useMemo(() => {
    if (!Array.isArray(data) || !data.length) {
      return { d: 0 };
    } else {
      const d = data[0].length; // assuming every vector is same length
      const marginals = get_rows(d).map(row => row.map(([i, j]) => 
        data.map(v => i === j ? v[i] : [v[i], v[j]])
      ));
      return { d, marginals };
    }
  }, [data]);

  // if there is no data, return null
  if (d === 0) return null;

  // create labels if nonexistant
  const labelsFix = (
    Array.isArray(labels) && labels.length === d
    ? labels 
    : Array(d).fill().map((_, i) => `x${i}`)
  );

  // create bandwidths of nonexistant
  const bandwidthsFix = (
    testArrays(bandwidths, d) 
    ? bandwidths
    : Array(d).fill().map((_, i) => Array(i+1).fill(bandwidth || 5.0))
  );

  // render marginals in table
  return (
    <table>
      <tbody>
        { 
          marginals.map((cols, row) => 
            <tr key={ row } name={ row }>
              <td>{ labelsFix[row] }</td>
              { 
                cols.map((data, col) => 
                  <td key={ col }>
                    { 
                      row === col 
                      ? <Marginal1D 
                        data={ data } 
                        bandwidth={ bandwidthsFix[row][col] }
                        selected={ selection === `(${row},${col})` }
                        { ...{ 
                          width: 100, 
                          height: 100, 
                          name: `(${row},${col})`,
                          ...(svgProps || {}) 
                        } } />
                      : <Marginal2D
                        data={ data } 
                        bandwidth={ bandwidthsFix[row][col] }
                        selected={ selection === `(${row},${col})` }
                        { ...{ 
                          width: 100, 
                          height: 100, 
                          name: `(${row},${col})`,
                          ...(svgProps || {}) 
                        } } />
                    }
                  </td>
                ) 
              }
            </tr>
          ) 
        }
        <tr>
          <td />
          { 
            labelsFix.map((label, l) => 
              <td key={ l } style={{ textAlign: 'center' }}>{ label }</td>
            ) 
          }
        </tr>
      </tbody>
    </table>
  );
}

const SVG = React.forwardRef(({ style, children, selected, ...props }, ref) => (
  <svg 
    { ...props }
    style={{ 
      border: selected ? '1px solid red' : '1px solid black', 
      ...(style || {}) 
    }}
    ref={ ref }
    viewBox="0 0 100 100">
    { children }
  </svg>
));

function Marginal1D({ data, bandwidth, ...props }) {
  // use d3 to create line on data change
  const d = React.useMemo(() => { 
    return kernelDensity({ bandwidth: bandwidth || 5.0, stepSize: 1.0 })(data);
  }, [bandwidth, data]);
  
  // render
  return <SVG { ...props }><path d={ d } fill="none" stroke={ interpolateYlGnBu(1.0) } /></SVG>;
}

function Marginal2D({ data, bandwidth, ...props }) {
  // create a ref for D3
  const ref = React.useRef();

  // call d3 update on data change
 React.useEffect(() => {
    // parse the bounds of the data
    const { xMin, xMax, yMin, yMax } = data.reduce((o, [x, y]) => ({
      xMin: Math.min(x, o.xMin),
      xMax: Math.max(x, o.xMax),
      yMin: Math.min(y, o.yMin),
      yMax: Math.max(y, o.yMax),
    }), { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity });

    // create the scales from the bounds
    const scaleX = scaleLinear().domain([xMin, xMax]).range([0, 100]);
    const scaleY = scaleLinear().domain([yMin, yMax]).range([100, 0]);

    // create the density estimator
    const density = contourDensity()
      .bandwidth(bandwidth || 5.0)
      .x(d => scaleX(d[0]))
      .y(d => scaleY(d[1]));

    // imperatively update svg
    select(ref.current)
      .selectAll('path')
      .data(density(data))
      .join('path')
        .attr('fill', 'none')
        .attr('stroke', (_, i, l) => interpolateYlGnBu(1 - 0.75 * i / l.length))
        .attr('d', geoPath())
  }, [bandwidth, data, ref]);
  
  // render
  return <SVG { ...props } ref={ ref } />;
}

/**
 * helpers for kernel density estimation
 */
const kernel = (x, center, bandwidth) => (
  Math.abs(x - center) <= bandwidth
  ? 0.75 * (1 - Math.pow((x - center) / bandwidth, 2)) / bandwidth
  : 0.0
);
const kernelDensity = ({ bandwidth, stepSize }) => (data => {
  // parse the x-scale
  const [min, max] = data.reduce(
    (a, x) => [Math.min(a[0], x), Math.max(a[1], x)],
    [Infinity, -Infinity],
  ); 
  const xScale = scaleLinear().domain([min, max]).range([0, 100]);

  // create a mesh in the range space and map to appropriate kernel density vals
  const N = parseInt(100 / stepSize);
  const points = Array(N + 1).fill().map((_, i) => {
    const point = xScale.invert(i * stepSize);
    const value = data.reduce(
      (sum, center) => sum + kernel(point, center, bandwidth),
      0.0,
    );
    return [i * stepSize, value];
  });

  // run through the outputs to determine the y-scale
  const yMax = points.reduce((max, [_, y]) => Math.max(max, y), -Infinity);
  const yScale = scaleLinear().domain([0, yMax]).range([100, 0]);

  // return the rendered line
  return line().x(d => d[0]).y(d => yScale(d[1]))(points);
});

/**
 * For any list of length (1 + ... + d), we have a bijection on linear indices 
 * k satisfying:
 *   0 <= k < 1 + ... + d 
 * and (i, j) satisfying:
 *   0 <= j < d
 *   0 <= i <= i.
 *
 * The following functions are helpers for this bijection.
 */
function to_natural(d, i, j) {
  const x = Math.min(d - 1, Math.min(i, j));
  const y = Math.min(d - 1, Math.max(i, j));
  return parseInt(x + y * (y + 1) / 2);
}

function to_grid(d, k) {
  const m = Math.max(k, 0);
  let i = d;
  let j = d;
  for (let l = 0; l < d; l++) {
    let s = parseInt((l + 1) * (l + 2) / 2);
    if (m < s) {
      i = k - s + l + 1;
      j = l;
      break;
    }
  }
  return [i, j];
}

function get_rows(d) {
  return Array(d).fill().map((_, row) => 
    Array(row + 1).fill().map((_, col) => [col, row])
  );
}

function get_coords(d) {
  return Array(d * (d + 1) / 2).fill().map((_, k) => to_grid(d, k));
}
