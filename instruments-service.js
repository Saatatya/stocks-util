class instrumentService {
  
  constructor(obj={}) {
    this.url = obj.url || "http://192.168.0.53:8081/instruments";
    this.dbName = obj.dbName || "instrument-db";
    
    /**
     * Cached data which used for fast response
     * @type Object
     * @default {}
     */
    this.fullInstrumentList = [];
    this.init();
  }
  
  /**
   * Performs PouchDb setup and fetch instrument list if its not available in local db.
   * It fetch list from remote server once in a day 
   */
  init(){
    if(this.fullInstrumentList && !this.fullInstrumentList.length){
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
        let instrumentList = JSON.parse(this.responseText);
        let today = new Date().getTime();
        
        self.fullInstrumentList = _.filter(instrumentList, function(item){
          if(!item.expiry){
            return true;
          }
          
          let expiryDate = new Date(item.expiry).getTime();
          return today < expiryDate;
        });
      }
    };
    
    xhttp.open("GET", this.url, true);
    xhttp.send();
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
    
    let item = _.filter(this.fullInstrumentList, function(item){
      return item.tradingsymbol === symbol;
    });
    
    return item[0] && item[0].instrument_token;
  }
  
  /**
   * This method is used to get list of instruments
   * 
   * @param {String} type of exchange e.g NSE
   * @returns {Array} instrument list
   */
  getInstrumentList(exchange){
    if(!exchange){
      return this.fullInstrumentList;
    }
    
    return _.filter(this.fullInstrumentList, function(item){
      return item.exchange === exchange;
    });
  }
  
}
