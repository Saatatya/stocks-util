class instrumentService {
  
  constructor(obj={}) {
    this.url = obj.url || "http://192.168.0.53:8080/instruments";
    this.dbName = obj.dbName || "instrument-db";
    
    /**
     * Cached data which used for fast response
     * @type Object
     * @default {}
     */
    this._cacheData = {};
    this.init();
  }
  
  /**
   * Performs PouchDb setup and fetch instrument list if its not available in local db.
   * It fetch list from remote server once in a day 
   */
  init(){
    let timeStamp = new Date().toDateString();
    let bFetched = localStorage.getItem(timeStamp);
    
    this.db = new PouchDB(this.dbName);
    if(!bFetched){
      this._fetchInstrumentList();
    }
  }
  
  /**
   * Fetches instrument list from server
   */
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
  
  /**
   * Stores instrument list in local db
   */
  _storeListInDb(instrumentList){
    this.db.destroy().then(e => {
      this.db = new PouchDB(this.dbName);
      this.db.bulkDocs(instrumentList).then((result) => {
        this._createIndex();
      });
    });
  }
  
  /**
   * Creates index based on symbol and exchange
   */
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
  
  /**
   * This method is used to get instrument token
   * 
   * @param {String} symbol
   * @returns {String} token
   */
  getInstrumentToken(symbol){
    if(!symbol){
      throw new Error("Please provide symbol as a argument");
      return;
    }
    
    return new Promise((resolve, reject) => {
      if(this._cacheData[symbol]){
        resolve(this._cacheData[symbol]);
        return;
      }
      
      this.db.find({
        selector: {tradingsymbol: symbol},
        fields: ['tradingsymbol', 'instrument_token'],
        use_index: 'indexOnSymbol'
      }).then(result => {
        var token = result.docs[0] && result.docs[0].instrument_token;
        this._cacheData[symbol] = token;
        resolve(token || null);
      }).catch(err => {
        reject(err);
      });
    });
  }
  
  /**
   * This method is used to get list of instruments
   * 
   * @param {String} type of exchange e.g NSE
   * @returns {Array} instrument list
   */
  getInstrumentList(exchange){
    return new Promise((resolve, reject) => {
      if(exchange){
        if(this._cacheData[exchange] && this._cacheData[exchange].length){
          resolve(this._cacheData[exchange]);
          return;
        }
        this.db.find({
          selector: {exchange: exchange},
          fields: ['instrument_token','tradingsymbol', 'name', 'lot_size', 'exchange'],
          use_index: 'indexOnExchange'
        }).then(result => {
          this._cacheData['exchange'] = result.docs;
          resolve(result.docs);
        });
        return;
      }
      
      if(this._cacheData.full && this._cacheData.full.length){
        resolve(this._cacheData.full);
        return;
      }
      
      this.db.allDocs({include_docs: true}).then(result => {
        this._cacheData['full'] = result.rows;
        resolve(result.rows);
      });
      
    });
  }
}
