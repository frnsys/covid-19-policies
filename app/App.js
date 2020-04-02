import sheet from './Sheet';
import React, {Component} from 'react';
import ReactTooltip from 'react-tooltip'
import {BrowserRouter as Router, Route, Link} from 'react-router-dom';

const TITLE = 'COVID-19 Policy Response';
const SPREADSHEET_ID = '14bQKgxOJdEFdaXuOj9HEaQlkxC1VvmK35zlWx3rmuYc';
const SPREADSHEET_NUM = 1;
const MAX_SUMMARY_LENGTH = 60;

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
      sortReverse: false
    };
  }

  componentWillMount() {
    const table = [];
    const columns = [];
    sheet.load(SPREADSHEET_ID, SPREADSHEET_NUM, rows => {
      const columns = Object.keys(rows[0]);
      rows.map(r => {
        r.visible = true;
        table.push(r);
        console.log(r);
      });
      this.setState({ columns, table });
    });
    this.setState({ columns, table });
  }

  componentDidUpdate() {
     ReactTooltip.rebuild();
  }

  updateFilter(filter) {
    // filter = filter.toLowerCase();
    // this.setState({ industries });
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
              <h1>COVID-19 Policy Response</h1>
              <div id="results-meta">
                <span className="n-results">{this.state.table.filter((r) => r.visible).length} results</span>
                <a className="download-results" onClick={() => this.downloadCsv()}>Download as CSV</a>
              </div>
              <div id="search-filter">
                <input autoFocus placeholder="Search or filter" type="text" onChange={(ev) => this.updateFilter(ev.target.value)} />
              </div>
            </header>
            <Route path='/' exact render={() => (
              <table>
                <tbody>
                  <tr>{this.state.columns.map((c, i) => (
                    <th key={i}
                        onClick={() => this.setSort(c)}
                        className={this.state.sort == c ? 'sorting' : ''}>{c}</th>
                  ))}</tr>
                  {this.state.table.map((r, i) => (
                    <tr key={i}>{
                      this.state.columns.map((c, j) => {
                        if (c == 'references') {
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
            )}/>
          </div>
        )}/>
      </Router>
    )
  }
}

export default App;
