import * as d3 from 'd3';

const parent = document.getElementById('time-wrapper');
const tooltip = document.getElementById('time-tooltip');
const CONTROL = document.getElementById('time-control');
const START_COLUMN = 'startdate';
const END_COLUMN = 'enddate';
const COLORS = [
  'rgb(  0, 153, 102)',
  'rgb(230,   0,   0)',
  'rgb( 26, 102, 230)',
  'rgb(102,  26, 230)',
  'rgb(230,  77,   0)',
  'rgb(254, 192,   7)',
  'rgb( 21, 211, 125)'
];
const trailingDays = 20;
const padding = 5;
const barHeight = 20;
const barMargin = 1;

// Format: 3/15
// Optional note: 3/15 (note)
// One date per line
const DATE_REGEX = /(\d{1,2}\/\d{1,2})(\s\(([A-Za-z\s]+)\))?/;
const DURATION_REGEX = /(\d+)\s(days|months)/;

function msToDays(ms) {
  return ms / 1000 / 60 / 60 / 24;
}
function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

function color(i) {
  return COLORS[i%COLORS.length]
}

function parseDates(input) {
  return input.split('\n')
    .map((d) => {
      d = d.trim();
      let matches = d.match(DATE_REGEX);
      if (matches && matches.length > 1) {
        return {
          'date': Date.parse(`${matches[1]}/2020`),
          'note': matches[3]
        };
      }
    }).filter((d) => d);
}

function parseEndDates(input) {
  if (input == 'Unspecified' || input == 'Until crisis ends') {
    return null;
  } else {
    // Try date, e.g. 3/30
    let matches = input.match(DATE_REGEX);
    if (matches && matches.length > 1) {
      return {
        'date': Date.parse(`${matches[1]}/2020`),
        'note': matches[3]
      };
    } else {
      // Try duration, e.g. 60 days
      let matches = input.match(DURATION_REGEX);
      if (matches && matches.length > 1) {
        return {
          'duration': parseInt(matches[1]),
          'unit': matches[2]
        }
      } else {
        // Fallback to nothing
        return null;
      }
    }
  }
}

const width = 800;
const extraPadding = 25;

function renderData(data, xScale, all) {
  // Setup y coords
  data.forEach((d, i) => {
    d.y = i * (barHeight + barMargin);
  });

  const height = data.length*(barHeight+barMargin) + extraPadding;
  d3.select('#time').selectAll('svg').remove();
  const svg = d3.select('#time')
    .append('svg')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', `0 0 ${width} ${height}`)

  const mouseEnter = (d, i) => {
    let bbox = d3.event.target.getBoundingClientRect();
    let pbbox = parent.getBoundingClientRect();
    let y = bbox.top - pbbox.top;
    let x = bbox.left - pbbox.left;

    d3.select(d3.event.target).style('fill', d.duration ? '#FFC107' : 'url(#linear-gradient-hover)');

    let start = d['startDate']
      .toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'});
    let end = d['endDate'] ?
      d['endDate'].toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'}) : '?';

    tooltip.style.display = 'block';
    tooltip.style.left = `calc(${x + padding}px + 1em)`;
    tooltip.style.top = `${y + bbox.height}px`;
    tooltip.innerHTML = `<div>
      <div class="header">
        <div>${start} - ${end}</div>
        <div>${d['location']}</div>
      </div>
      <h5>Who</h5>
      <div>${d['who']}</div>
      <h5>What</h5>
      <div>${d['what'].replace('\n', '<br />')}</div>
    </div>`;
  };
  const mouseOut = (d, i) => {
    d3.select(d3.event.target).style('fill', d.duration ? COLORS[0] : 'url(#linear-gradient)');
    tooltip.style.display = 'none';
  };

  const linearGradient = svg.append('defs')
    .append('linearGradient')
    .attr('id', 'linear-gradient');
  linearGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', COLORS[0]);
  linearGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(0,0,255,0)');

  const linearGradientHover = svg.append('defs')
    .append('linearGradient')
    .attr('id', 'linear-gradient-hover');
  linearGradientHover.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', '#FFC107');
  linearGradientHover.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', 'rgba(0,0,255,0)');

  svg.append('g')
      .attr('stroke-width', 0)
    .selectAll('rect')
    .data(data)
    .enter().append('rect')
      .attr('height', barHeight)
      .attr('fill', (d, i) => d.duration ? COLORS[0] : 'url(#linear-gradient)')
      .attr('x', (d, i) => xScale(d.start))
      .attr('y', (d, i) => d.y)
      .attr('width', (d, i) => d.duration ? xScale(d.end) - xScale(d.start) : '80%')
      .on('mouseenter', mouseEnter)
      .on('mouseout', mouseOut);

  svg.append('g')
    .selectAll('text')
    .data(data)
    .enter()
      .append('text')
        .attr('font-size', '0.6em')
        .attr('x', (d, i) => xScale(d.start) + padding)
        .attr('y', (d, i) => d.y + barHeight/1.5)
        .attr('pointer-events', 'none')
    .text((d, i) => {
      let desc = d['sector'] == 'Private' ? d['who'] : d['location'];
      if (all) {
        return `[${desc}] ${d['what'].length > 36 ? `${d['what'].substring(0, 36)}...` : d['what']}`
      } else {
        return `${desc}`;
      }
    });

  d3.select('#time-axis').selectAll('svg').remove();
  const axisSvg = d3.select('#time-axis')
    .append('svg')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr('viewBox', `0 0 ${width} ${height}`)

  let xAxis = d3.axisBottom(xScale)
    .ticks(10)
    .tickSize(height)
    .tickFormat(d3.timeFormat('%-m/%-d'));
  xAxis = axisSvg.append('g')
    .call(xAxis);
  xAxis.selectAll('.tick line')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.2);
  xAxis.select('.domain').remove();
  xAxis.selectAll('.tick text')
    .attr('font-size', '0.8em');

  let today = new Date();
  axisSvg.append('line')
    .attr('x1', xScale(today))
    .attr('y1', 0)
    .attr('x2', xScale(today))
    .attr('y2', height+extraPadding)
    .attr('opacity', 0.5)
    .attr('stroke-width', 2)
    .attr('stroke', 'black');
}

function setupGantt(table) {
  // Create separate entries for each start date
  let data = table.flatMap((row) => {
    // If end date is N/A, assume this is
    // a one-off thing
    if (row[END_COLUMN] == 'N/A') return [];

    // Multiple start dates ok,
    // but only one end date
    let start_dates = parseDates(row[START_COLUMN]);
    let end_date = parseEndDates(row[END_COLUMN]);
    return start_dates.map((d) => {
      let duration = null;
      if (!end_date) {
        // pass
      } else if ('date' in end_date) {
        duration = msToDays(end_date['date'] - d['date']);
      } else if ('duration' in end_date) {
        if (end_date['unit'].startsWith('days')) {
          duration = end_date['duration'];
        } else if (end_date['unit'].startsWith('month')) {
          let end = new Date(d['date']);
          end.setMonth(end.getMonth() + end_date['duration']);
          duration = msToDays(end - d['date']);
        }
      }
      let startDate = new Date(d['date']);
      let endDate = duration;
      if (duration) {
        endDate = new Date(d['date'] + daysToMs(duration));
      }
      let r = {
        startDate: startDate,
        endDate: endDate,
        start: msToDays(d['date']),
        note: d['note'],
        duration: duration
      };
      Object.keys(row).forEach((k) => r[k] = row[k]);
      return r;
    });
  });

  // Setup x coords
  let minStartDate = Math.min(...data.map((d) => d.start));
  let maxEndDate = Math.max(...data.map((d) => d.duration ? d.start + d.duration - minStartDate : -1)) + trailingDays;
  data.forEach((d, i) => {
    let end = new Date(daysToMs(d.start));
    end.setDate(end.getDate() + d.duration);
    d.start = new Date(daysToMs(d.start));
    d.end = end;
  });

  let categories = {};
  let subcats = {};
  data.forEach((r) => {
    let cat = r['category'];
    let key = `${cat}.all`;
    if (!(key in categories)) {
      categories[key] = [];
      subcats[cat] = new Set();
    }
    categories[key].push(r);
    r['what'].split(',').forEach((w) => {
      let key = `${cat}.${w}`;
      if (!(key in categories)) {
        categories[key] = [];
      }
      subcats[cat].add(w);
      categories[key].push(r);
    });
  });

  // Setup gantt controls
  let catSelect = document.createElement('select');
  Object.keys(subcats).forEach((c) => {
    let opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    catSelect.appendChild(opt);
  });
  CONTROL.appendChild(catSelect);

  function setWhatSelect(cat) {
    while (whatSelect.firstChild) {
      whatSelect.removeChild(whatSelect.lastChild);
    }
    let allOption = document.createElement('option');
    allOption.value = `${cat}.all`;
    allOption.innerText = 'All';
    whatSelect.appendChild(allOption);

    subcats[cat].forEach((w) => {
      let opt = document.createElement('option');
      opt.value = `${cat}.${w}`;
      opt.innerText = w;
      whatSelect.appendChild(opt);
    });
  }

  catSelect.addEventListener('change', (ev) => {
    let cat = ev.target.value;
    setWhatSelect(cat);
    key = `${cat}.all`
    renderData(categories[key], xScale, true);
  });

  let whatSelect = document.createElement('select');
  CONTROL.appendChild(whatSelect);
  whatSelect.addEventListener('change', (ev) => {
    key = ev.target.value;
    renderData(categories[key], xScale, key.endsWith('.all'));
  });

  // Setup axis
  let xScale = d3.scaleTime()
    .domain([
      new Date(daysToMs(minStartDate)),
      new Date(daysToMs(minStartDate + maxEndDate))])
    .range([0, width]).nice();

  // Initial selection
  let key = Object.keys(categories)[0];
  renderData(categories[key], xScale, key.endsWith('.all'));
  let cat = key.split('.')[0];
  setWhatSelect(cat);
}

export default setupGantt;
