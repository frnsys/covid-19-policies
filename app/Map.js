import config from '../config';
import mapboxgl from 'mapbox-gl';
import interpolate from 'color-interpolate';

mapboxgl.accessToken = config.MAPBOX_TOKEN;


const TOOLTIP = document.getElementById('map-tooltip');
const COLOR_MAP = interpolate(['#AFBCE7', '#3246B8']);
const CODES = [
  'AK', 'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE',
  'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
  'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'PR', 'AS', 'GU', 'MP', 'VI'
];

function setupMap(data) {
  let counts = Object.keys(data).reduce((acc, state) => {
    acc[state] = data[state].length;
    return acc;
  }, {});
  let max = Object.values(counts).reduce((max, cur) => cur > max ? cur : max, 0);

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/frnsys/ck8krklr80qb21in3kwaii4nl?fresh=true',
    center: [-98, 38.88],
    minZoom: 2,
    maxZoom: 5,
    zoom: 3
  });

  map.on('load', () => {
    // Match on state code, property "STUSPS" in the layer
    let expression = ['match', ['get', 'STUSPS']];
    CODES.forEach(function(state) {
      let count = counts[state] || 0;
      expression.push(state, COLOR_MAP(count/max));
    });
    expression.push('rgba(0,0,0,0)'); // fallback
    map.setPaintProperty('states', 'fill-color', expression);
  });

  map.on('mousemove', (ev) => {
    let feats = map.queryRenderedFeatures(ev.point);
    if (feats.length > 0) {
      TOOLTIP.style.left = `${ev.originalEvent.offsetX+10}px`;
      TOOLTIP.style.top = `${ev.originalEvent.offsetY+10}px`;
      TOOLTIP.style.display = 'block';
      TOOLTIP.innerHTML = feats.map((f) => {
        let props = f.properties;
        let state = props['STUSPS'];
        console.log(f);
        return `<div class="state-info">
          ${props.NAME}<br />
          ${counts[state] || 0} policies found.
        </div>`;
      }).join('<br />');

    } else {
      TOOLTIP.style.display = 'none';
    }
  });
}

export default setupMap;
