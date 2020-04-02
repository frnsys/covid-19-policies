// First publish your spreadsheet:
//    File > Publish to the web
// then click "Publish"

const spreadsheet = {
  load: function(id, num, onLoad) {
    // Note that this takes the first row to be headers
    let url = `https://spreadsheets.google.com/feeds/list/${id}/${num}/public/values?alt=json`;
    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
      .then(res => res.json())
      .then(data => onLoad(data.feed.entry.map(this.parseRow)))
      .catch(err => { console.log(err) });
  },

  parseRow: function(row) {
    // parse a GSX (Google Spreadsheet)
    // row into something nicer
    let obj = {};
    Object.keys(row).forEach((k) => {
      let v = row[k];
      if (k.startsWith('gsx$')) {
        let field = k.replace('gsx$', '');
        obj[field] = v.$t;
      }
    });
    return obj;
  }
}

export default spreadsheet;
