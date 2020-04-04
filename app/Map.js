import config from '../config';
import mapboxgl from 'mapbox-gl';
import interpolate from 'color-interpolate';

mapboxgl.accessToken = config.MAPBOX_TOKEN;


const TOOLTIP = document.getElementById('map-tooltip');
const CONTROL = document.getElementById('map-control');
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

// Parse states. Expects them to be two characters
const stateRe = /[^A-Z]?([A-Z]{2})[^A-Z]?/g;
function parseStates(location) {
  return Array.from(location.matchAll(stateRe), m => m[1]);
}

function setData(map, states, key) {
  // Match on state code, property "STUSPS" in the layer
  let expression = ['match', ['get', 'STUSPS']];

  let max = Object.values(states)
    .reduce((max, cur) => cur[key] > max ? cur[key] : max, 0);
  CODES.forEach(function(state) {
    let count = (states[state] || {})[key] || 0;
    expression.push(state, COLOR_MAP(max > 0 ? count/max : 0));
  });
  expression.push('rgba(0,0,0,0)'); // fallback
  map.setPaintProperty('states', 'fill-color', expression);
}

function setupMap(table) {
  let key = 'all';
  let categories = table.reduce((acc, r) => {
    let cat = r['category'];
    if (!(cat in acc)) {
      acc[cat] = new Set();
    }
    let whats = r['what'].split(',');
    whats.forEach((w) => {
      acc[cat].add(w);
    });
    return acc;
  }, {});

  // Setup map controls
  let catSelect = document.createElement('select');
  let allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.innerText = 'All';
  catSelect.appendChild(allOption);
  Object.keys(categories).forEach((c) => {
    let opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    catSelect.appendChild(opt);
  });
  CONTROL.appendChild(catSelect);
  catSelect.addEventListener('change', (ev) => {
    while (whatSelect.firstChild) {
      whatSelect.removeChild(whatSelect.lastChild);
    }
    let cat = ev.target.value;
    let allOption = document.createElement('option');
    allOption.value = `${cat}.all`;
    allOption.innerText = 'All';
    whatSelect.appendChild(allOption);

    categories[cat].forEach((w) => {
      let opt = document.createElement('option');
      opt.value = `${cat}.${w}`;
      opt.innerText = w;
      whatSelect.appendChild(opt);
    });

    key = `${cat}.all`
    setData(map, states, key);
  });

  let whatSelect = document.createElement('select');
  allOption = document.createElement('option');
  allOption.value = '';
  allOption.innerText = '--';
  whatSelect.appendChild(allOption);
  CONTROL.appendChild(whatSelect);
  whatSelect.addEventListener('change', (ev) => {
    key = ev.target.value;
    setData(map, states, key);
  });

  let states = {};
  table.forEach((r) => {
    // Group by states
    // only include public
    if (r['sector'].includes('Public')) {
      parseStates(r['location']).forEach((state) => {
        if (!(state in states)) {
          states[state] = {};
          states[state]['all'] = 0;
          Object.keys(categories).forEach((c) => {
            states[state][`${c}.all`] = 0
            categories[c].forEach((w) => {
              states[state][`${c}.${w}`] = 0;
            });
          });
        }
        states[state]['all'] += 1;
        states[state][`${r['category']}.all`] += 1;
        let whats = r['what'].split(',');
        whats.forEach((w) => {
          states[state][`${r['category']}.${w}`] += 1;
        });
      });
    }
  });

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/frnsys/ck8krklr80qb21in3kwaii4nl?fresh=true',
    center: [-98, 38.88],
    minZoom: 2,
    maxZoom: 5,
    zoom: 3
  });

  map.on('load', () => {
    setData(map, states, key);
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
        return `<div class="state-info">
          ${props.NAME}<br />
          ${(states[state] || {})[key] || 0} policies found.
        </div>`;
      }).join('<br />');

    } else {
      TOOLTIP.style.display = 'none';
    }
  });
}

export default setupMap;
