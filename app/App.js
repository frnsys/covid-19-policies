import sheet from './Sheet';
import setupMap from './Map';
import setupGantt from './Gantt';
import React, {Component} from 'react';
import ReactTooltip from 'react-tooltip'
import {BrowserRouter as Router, Route, Link} from 'react-router-dom';

const TITLE = 'COVID-19 Policy Response';
const SPREADSHEET_ID = '14bQKgxOJdEFdaXuOj9HEaQlkxC1VvmK35zlWx3rmuYc';
const SPREADSHEET_NUM = 1;
const MAX_SUMMARY_LENGTH = 60;
const DEFAULT_COLLAPSED = ['summary', 'duration', 'date', 'branch', 'level', 'sector'];
const SEARCH_HELP = `
Use quotes to combine terms, e.g. "criminal justice".
<br />
Specify columns like so: "category:telecoms".
`

function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '_')           // replace spaces with _
    .replace(/[^\w\-]+/g, '')       // remove all non-word chars
    .replace(/\-+/g, '_');          // replace - with single _
}

function domain(url) {
  return url.split('//')[1].split('/')[0].replace(/^www./, '');
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: '',
      sort: null,
      sortReverse: false,
      collapsed: DEFAULT_COLLAPSED
    };
  }

  componentWillMount() {
    const table = [];
    const columns = [];
    sheet.load(SPREADSHEET_ID, SPREADSHEET_NUM, rows => {
      const columns = Object.keys(rows[0]);
      rows.map(r => {
        // Clean up
        Object.keys(r).forEach((c) => r[c] = r[c].trim());
        r.visible = true;
        table.push(r);
      });
      setupMap(table);
      setupGantt(table);
      this.setState({ columns, table });
    });
    this.setState({ columns, table });
  }

  componentDidUpdate() {
     ReactTooltip.rebuild();
  }

  updateFilter(filter) {
    filter = filter.toLowerCase();
    // Could eventually support (nested) parentheses
    // with a recursive-descent parser
    // as well as boolean operators (specifically OR, since
    // AND is the default)
    let parts = filter.match(/(?:[^\s"']+|["'][^"']*["'])+/g) || [];

    // Separate into terms (all columns)
    // and filters (specific columns);
    let terms = [], filters = {};
    parts.forEach((p) => {
      if (p.includes(':')) {
        let i = p.indexOf(':');
        let [column, term] = [p.slice(0, i), p.slice(i+1)];
        if (!(column in filters)) {
          filters[column] = [];
        }
        term = term.replace('*', '[^\s]*'); // Asterisk as wildcard
        filters[column].push(new RegExp(term));
      } else {
        p = p.replace('*', '[^\s]*'); // Asterisk as wildcard
        terms.push(new RegExp(p));
      }
    });

    let table = this.state.table;
    table.forEach((r) => {
      // Ignore references column
      let text = this.state.columns
        .map((c) => c !== 'references' ? r[c] : '')
        .join('\n').toLowerCase();

      // By default, AND
      r.visible = parts.length == 0 || (
        terms.every((t) => t.test(text))
        &&
        Object.keys(filters).every(
          (c) => filters[c].every(
            (t) => t.test(r[c].toLowerCase())))
      );
    });
    this.setState({ table });
  }

  setSort(column) {
    let reverse = this.state.sortReverse;
    // Flip sort order
    // if same column selected again
    if (this.state.sort == column) {
      reverse = !reverse;
    }
    this.setState({
      sort: column,
      sortReverse: reverse
    });
    this.applySort(column, reverse);
  }

  applySort(column, reverse) {
    let table = this.state.table;
    table.sort((a, b) => (a[column] > b[column]) ? 1 : -1);
    if (reverse) {
      table.reverse();
    }
    this.setState({ table });
  }

  downloadCsv() {
    let header = 'data:text/csv;charset=utf-8,%EF%BB%BF';
    let columns = this.state.columns.join(',');
    let content = this.state.table.map((r) => (
      // Quote values, escape existing double quotes
      this.state.columns.map((c) => `"${r[c].trim().replace(/"/g, '""')}"`).join(',')
    )).join('\n');
    let csv = `${columns}\n${content}`;
    let data = `${header}${encodeURIComponent(csv)}`;

    let link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', 'covid19-policies.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  collapseColumn(ev, column) {
    let collapsed = this.state.collapsed;
    collapsed.push(column);
    this.setState({ collapsed });
    ev.preventDefault();
    ev.stopPropagation();
  }

  expandColumn(column) {
    let collapsed = this.state.collapsed;
    let idx = collapsed.indexOf(column);
    if (idx >= 0) {
      collapsed.splice(idx, 1);
    }
    this.setState({ collapsed });
  }

  render() {
    return (
      <Router>
        <Route path='/' render={(props) => (
          <div>
            <ReactTooltip
              className="tooltip"
              arrowColor="transparent"
            />
            <header>
              <div id="results-meta">
                <span className="n-results">{this.state.table.filter((r) => r.visible).length} results</span>
                <a className="download-results" onClick={() => this.downloadCsv()}>Download as CSV</a>
              </div>
              <div id="search-filter">
                <input autoFocus placeholder="Search or filter" type="text" onChange={(ev) => this.updateFilter(ev.target.value)} />
                <div id="search-help" data-place="left" data-multiline={true} data-tip={SEARCH_HELP}>?</div>
              </div>
            </header>
            <Route path='/' exact render={() => (
              <div id="table-container">
                <table>
                  <tbody>
                    <tr>{this.state.columns.map((c, i) => {
                      let sorting = this.state.sort == c;
                      return <th key={i}
                          className={sorting ? 'sorting' : ''}>
                            {this.state.collapsed.includes(c) ?
                              <div className="column-expand"
                                data-tip={c}
                                data-place="bottom"
                                data-offset="{'top': 15}"
                                onClick={() => this.expandColumn(c)}>▸</div>
                              :
                              <div onClick={() => this.setSort(c)}>
                                {c}{sorting ? (this.state.sortReverse ? ' ▾' : ' ▴') : ''}
                                <div className="column-collapse"
                                  onClick={(ev) => this.collapseColumn(ev, c)}>◂</div>
                              </div>}
                          </th>
                    })}</tr>
                    {this.state.table.filter((r) => r.visible).map((r, i) => (
                      <tr key={i}>{
                        this.state.columns.map((c, j) => {
                          if (this.state.collapsed.includes(c)) {
                            return <td key={j}></td>
                          } else if (c == 'references') {
                            let val = r[c].split('\n')
                              .filter((url) => url.length > 0)
                              .map((url, i) => <a className="ref" href={url} key={i}>{domain(url)}</a>)
                            return <td key={j}>{val}</td>
                          } else if (c == 'summary') {
                            let val = r[c];
                            if (val.length > MAX_SUMMARY_LENGTH) {
                              val = `${val.substring(0, MAX_SUMMARY_LENGTH)}...`;
                            }
                            return <td data-tip={r[c]} key={j}>{val}</td>
                          } else {
                            return <td key={j}>{r[c]}</td>
                          }
                        })
                      }</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}/>
          </div>
        )}/>
      </Router>
    )
  }
}

export default App;
