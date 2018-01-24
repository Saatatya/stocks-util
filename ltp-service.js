class ltpService {
  
  constructor(obj={}) {
    this.apiKey = obj.apiKey || "kitefront";
    this.userId = obj.userId || "ZQ5522";
    this.publicToken = obj.publicToken || "66461eadb414d9ad84158278af6526d4";
    
    // Subscribed list token
    this.tokensToBeSubscribe = [];
    this.symbolHash = {};
    
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
   * Listne for lip updates
   * On ltp updates triggers `ltp-updated` with ltp rate
   */
  _onTicks(tick){
    let eventData = {
        lastTradedPrice: tick[0].LastTradedPrice,
        symbol: this.symbolHash[tick[0].Token]
    };
    let event = new CustomEvent('ltp-updated', {detail: eventData});
    
    window.dispatchEvent(event);
  }
  
  _subscribeToken(){
    this.ticker.subscribe(this.tokensToBeSubscribe);
    this.ticker.setMode(this.ticker.modeLTP, this.tokensToBeSubscribe);
  }
  
}
