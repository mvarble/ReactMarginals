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
  Marginals,
  Marginal1D,
  Marginal2D,
  to_natural, 
  to_grid, 
  get_rows,
  get_coords,
};

export default Marginals;

/**
 * Our react components
 */
function Marginals({ data, labels, svgProps }) {
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
    (!Array.isArray(labels) || labels.length !== d)
    ? Array(d).fill().map((_, i) => `x${i}`)
    : labels
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
                        { ...{ width: 100, height: 100, ...(svgProps || {}) } } />
                      : <Marginal2D
                        data={ data } 
                        { ...{ width: 100, height: 100, ...(svgProps || {}) } } />
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

const SVG = React.forwardRef(({ style, children, ...props }, ref) => (
  <svg 
    { ...props }
    style={{ border: '1px solid black', ...(style || {}) }}
    ref={ ref }
    viewBox="0 0 100 100">
    { children }
  </svg>
));

function Marginal1D({ data, ...props }) {
  // use d3 to create line on data change
  const d = React.useMemo(() => { 
    return kernelDensity({ bandwidth: 3.0, stepSize: 1.0 })(data); // TODO make bandwidth depend on data
  }, [data]);
  
  // render
  return <SVG { ...props }><path d={ d } fill="none" stroke={ interpolateYlGnBu(1.0) } /></SVG>;
}

function Marginal2D({ data, ...props }) {
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
      .bandwidth(4.0) // TODO: data dependence
      .x(d => scaleX(d[0]))
      .y(d => scaleY(d[1]));

    // imperatively update svg
    select(ref.current)
      .selectAll('path')
      .data(density(data))
      .join('path')
        .attr('fill', 'none')
        .attr('stroke', (_, i, l) => interpolateYlGnBu(1 - 0.75 * i / l.length))
        .attr('stroke-width', 1)
        .attr('d', geoPath())
  }, [data, ref]);
  
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
