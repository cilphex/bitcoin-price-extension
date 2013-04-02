// Utilities
var Util = {
	devmode: true,
	currencies: ['USD', 'AUD', 'CAD', 'CHF', 'CNY', 'DKK', 'EUR', 'GBP', 'HKD', 'JPY', 'NZD', 'PLN', 'RUB', 'SEK', 'SGD', 'THB'],
	capitalize: function(text) {
		return text.charAt(0).toUpperCase() + text.slice(1)
	},
	log: function() {
		if (this.devmode)
			console.log.apply(console, arguments);
	}
};

/*
var Blockchain = {
	data:           {},
	old_data:       {},
	ticker_url:     'http://blockchain.info/ticker',
	poll_id:        null,
	poll_interval:  60000,

	startPolling: function() {
		this.pausePolling();
		this.poll_id = setInterval(this.poll.bind(this), this.poll_interval);
		this.poll();
	},
	pausePolling: function() {
		clearTimeout(this.poll_id);
	},
	poll: function() {
		if (!navigator.onLine)
			return;
		$.ajax({
			url:     this.ticker_url,
			success: this.poll_success.bind(this),
			error:   this.poll_error.bind(this)
		});
	},
	poll_success: function(data) {
		for (var key in this.data) {
			this.old_data[key] = this.data[key];
			delete this.data[key];
		}
		for (var key in data) {
			this.data[key] = data[key];
		}
		chrome.extension.sendMessage('update');
	},
	poll_error: function(jqXHR, textStatus, errorThrown) {
		Util.log('BitAwesome polling error:', errorThrown);
	},
	initialize: function() {
		this.startPolling();
	}
};
*/



// Possibly do polling in a web worker?

var Gox = {

	socket: null,
	socket_url: 'ws://websocket.mtgox.com:80/mtgox?Currency=USD',
	
	retry: true,
	retry_seconds: 1,
	retry_countdown: 0,
	retry_interval: null,

	currency: localStorage.getItem('currency') || 'USD',
	ticker_data: {},

	initialize: function() {
		this.connect();
	},

	connect: function() {
		Util.log('connecting...');
		this.socket = new WebSocket(this.socket_url);
		this.retry = true;
		var handlers = ['open', 'error', 'close', 'message'];
		for (var i = 0; h = handlers[i]; i++) {
			this.socket['on'+h] = this['onSocket'+Util.capitalize(h)].bind(this);
		}
		chrome.extension.sendMessage({type: 'update'});
	},
	disconnect: function() {
		this.retry = false;
		if (this.socket)
			this.socket.close();
		chrome.extension.sendMessage({type: 'countdown', countdown: null});
	},
	retryCountdown: function() {
		Util.log('retryCountdown');
		if (!this.retry_interval) {
			Util.log('no interval, so make one');
			this.retry_interval = setInterval(this.retryCountdown.bind(this), 1000);
		}
		else if (this.retry_countdown == 0) {
			Util.log('countdown over');
			clearInterval(this.retry_interval);
			this.retry_interval = null;
			this.connect();
			return;
		}
		chrome.extension.sendMessage({type: 'countdown', countdown: this.retry_countdown});
		this.retry_countdown = this.retry_countdown - 1;
		Util.log('tick:', this.retry_countdown);
	},

	getConnectionStatus: function() {
		return this.socket
			? ['connecting', 'open', 'closing', 'closed'][this.socket.readyState]
			: 'closed';
	},

	onSocketOpen: function(e) {
		Util.log('socket opened');
		this.retry_seconds = 1;
		chrome.extension.sendMessage({type: 'update'});
	},
	onSocketClose: function() {
		Util.log('socket close');
		if (this.retry) {
			if (this.retry_seconds < 64)
				this.retry_seconds = this.retry_seconds * 2;
			this.retry_countdown = this.retry_seconds;
			this.retryCountdown();
		}
		chrome.extension.sendMessage({type: 'update'});
	},
	onSocketError: function(error) {
		Util.log('socket error:', error);
		chrome.extension.sendMessage({type: 'update'});
	},
	onSocketMessage: function(e) {
		var data = JSON.parse(e.data);
		this['op' + Util.capitalize(data.op)](data);
		chrome.extension.sendMessage({type: 'update'});
	},

	opSubscribe: function(data) {},
	opUnsubscribe: function(data) {},
	opRemark: function(data) {},
	opResult: function(data) {},

	opPrivate: function(data) {
		this['private' + Util.capitalize(data.private)](data);
	},

	privateTicker: function(data) {
		Util.log('ticker', data);
		// Ticker contains:
		// avg, buy, high, last, last_all, last_local, last_orig, low, sell, vwop
		// now: timestamp, voll: unique check it out
		var currency = data.ticker.last.currency;
		var old_data = this.ticker_data[currency];
		this.ticker_data[currency] = {};

		for (var key in data.ticker) {
			var old_val = old_data && old_data[key];
			this.ticker_data[currency][key] = data.ticker[key];
			if (old_val && parseInt(old_val.value_int) < this.ticker_data[currency][key].value_int) {
				this.ticker_data[currency][key].change = 'up';
				this.ticker_data[currency][key].movement = 1;
			}
			else if (old_val && parseInt(old_val.value_int) > this.ticker_data[currency][key].value_int) {
				this.ticker_data[currency][key].change = 'down';
				this.ticker_data[currency][key].movement = -1;
			}
			else {
				this.ticker_data[currency][key].change = ((old_val && old_val.change) || '').replace(/\s*old/g,'') + ' old';
				this.ticker_data[currency][key].movement = 0;
			}
		}

		this.updateBadge();
	},
	privateTrade: function(data) {},
	privateDepth: function(data) {},
	privateResult: function(data) {},

	updateBadge: function() {
		chrome.browserAction.setBadgeText({text: this.ticker_data[this.currency].last.value.substr(0,4).replace(/\.$/,'')});
		chrome.browserAction.setBadgeBackgroundColor({color: ['#da000f','#aaa','#00c700'][this.ticker_data[this.currency].last.movement+1]});
	}
	
};

$(function() {
	//Blockchain.initialize();
	Gox.initialize();
});
