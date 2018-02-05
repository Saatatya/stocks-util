let ltpService = class ltpService {
  
  constructor(obj={}) {
    this.apiKey = obj.apiKey || "kitefront";
    this.userId = obj.userId || "ZQ5522";
    this.publicToken = obj.publicToken || "66461eadb414d9ad84158278af6526d4";
    
    // Subscribed list token
    this.tokensToBeSubscribe = [];
    this.symbolHash = {};
    this._ltpHash = {};
    
    this.init();
  }
  
  /**
   * Establishes connection and setup with web socket
   * Handles `subscribe-symbol` event
   */
  init(){
    this._basicSetup();
    this._handleSubscribeSymbolEvent();
  }
  
  /**
   * Establishes web socket connection
   */
  _basicSetup(){
    if(!window.instrumentService){
      window.instrumentService = new instrumentService();
    }
    
    this.ticker = new KiteTicker(this.apiKey, this.userId, this.publicToken);
    
    this.ticker.connect();
    this.ticker.on("tick", this._onTicks.bind(this));
    this.ticker.on("connect", this._subscribeToken.bind(this));
  }
  
  /**
   * `subscribe-symbol` event handler
   * Retries token from symbol and subscribes for live rate
   */
  _handleSubscribeSymbolEvent(){
    window.addEventListener('subscribe-symbol', e => {
      if(!window.instrumentService){
        console.warn("Instrument service is not yet ready");
        return;
      }
      
      console.log('this._ltpHash', this._ltpHash);
      
      if(this._ltpHash[e.detail]){
        var obj = [];
        obj[e.detail] = this._ltpHash[e.detail];
        
        let event = new CustomEvent('ltp-updated', {detail: obj});
        
        window.dispatchEvent(event);
        return;
      }
      
      let token = window.instrumentService.getInstrumentToken(e.detail);
      if(!token){
        setTimeout(() => {
          let token = window.instrumentService.getInstrumentToken(e.detail);
          this._updateSubscribedToken(token);
          this.symbolHash[token] = e.detail;
        }, 800);
        
        return;
      }
      
      this._updateSubscribedToken(token);
      this.symbolHash[token] = e.detail;
    });
  }
  
  /**
   * Updates tokensToBeSubscribe list and subscribe it for ltp
   */
  _updateSubscribedToken(token){
    if(this.tokensToBeSubscribe.indexOf(token) === -1){
      this.tokensToBeSubscribe.push(token);
      this._subscribeToken();
    }
  }
  
  /**
   * Listen for lip updates
   * On ltp updates triggers `ltp-updated` with ltp rate
   */
  _onTicks(tick){
    let eventData = this._parseEventData(tick);
    
    this._ltpHash = _.merge(this._ltpHash, eventData)
    let event = new CustomEvent('ltp-updated', {detail: eventData});
    
    window.dispatchEvent(event);
  }
  
  _parseEventData(eventData){
    var detail = {};
    
    _.forEach(eventData, data => {
      detail[this.symbolHash[data.Token]] = data.LastTradedPrice
    });
    
    return detail;
  }
  
  _subscribeToken(){
    this.ticker.subscribe(this.tokensToBeSubscribe);
    this.ticker.setMode(this.ticker.modeLTP, this.tokensToBeSubscribe);
  }
  
}
