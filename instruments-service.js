class instrumentService {
  
  constructor(obj={}) {
    this.url = obj.url || "http://192.168.0.53:8080/instruments";
    this.dbName = obj.dbName || "instrument-db";
    this.init();
  }
  
  init(){
    let timeStamp = new Date().toDateString();
    let bFetched = localStorage.getItem(timeStamp);
    
    this.db = new PouchDB(this.dbName);
    if(!bFetched){
      this._fetchInstrumentList();
    }
  }
  
  _fetchInstrumentList(){
    let self = this;
    let xhttp = new XMLHttpRequest();
    
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        self._storeListInDb(JSON.parse(this.responseText));
      }
    };
    
    xhttp.open("GET", this.url, true);
    xhttp.send();
  }
  
  _storeListInDb(instrumentList){
    this.db.destroy().then(e => {
      this.db = new PouchDB(this.dbName);
      this.db.bulkDocs(instrumentList).then((result) => {
        this._createIndex();
      });
    });
  }
  
  _createIndex(){
    this.db.createIndex({
      index: {
        fields: ['tradingsymbol'],
        name: 'indexOnSymbol'
      }
    });
    
    this.db.createIndex({
      index: {
        fields: ['exchange'],
        name: 'indexOnExchange'
      }
    }).then(e => {
      let timeStamp = new Date().toDateString();
      
      localStorage.setItem(timeStamp, 'fetched');
    });
  }
  
  getInstrumentToken(symbol){
    return new Promise((resolve, reject) => {
      this.db.find({
        selector: {tradingsymbol: symbol},
        fields: ['tradingsymbol', 'instrument_token'],
        use_index: 'indexOnSymbol'
      }).then(result => {
        resolve(result.docs[0].instrument_token);
      }).catch(err => {
        reject(err);
      });
    });
  }
  
  getInstrumentList(exchange){
    return new Promise((resolve, reject) => {
      if(exchange){
        this.db.find({
          selector: {exchange: exchange},
          fields: ['instrument_token','tradingsymbol', 'name', 'lot_size', 'exchange'],
          use_index: 'indexOnExchange'
        }).then(result => {
          resolve(result.docs);
        });
        return;
      }
      
      this.db.allDocs({include_docs: true}).then(result => {
        resolve(result.rows);
      });
      
    });
  }
}
