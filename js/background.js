// Utilities
var Util = {
	currencies: ['USD', 'AUD', 'CAD', 'CHF', 'CNY', 'DKK', 'EUR', 'GBP', 'HKD', 'JPY', 'NZD', 'PLN', 'RUB', 'SEK', 'SGD', 'THB'],
	capitalize: function(text) {
		return text.charAt(0).toUpperCase() + text.slice(1)
	}
};

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
		console.log('BitAwesome polling error:', errorThrown);
	},

	initialize: function() {
		this.startPolling();
	}
};

var MtGox = {

	api_url: 'http://socketio.mtgox.com/mtgox',
	connection:  null,
	ticker_data: {},

	initialize: function() {
		this.connect();
	},

	connect: function() {
		if (!this.connection) {
			var url = [this.api_url, '?Currency=', Util.currencies.join(',')].join('');
			var events = ['connect', 'disconnect', 'error', 'message'];
			this.connection = io.connect(url);
			for (var i = 0; i < events.length; i++) {
				var handler = 'on' + Util.capitalize(events[i]);
				this.connection.on(events[i], this[handler].bind(this));
			}
			chrome.extension.sendMessage('mtgox_update');
		}
	},
	disconnect: function() {
		this.connection.disconnect();
		chrome.extension.sendMessage('mtgox_update');
	},

	onConnect: function() {
		console.log('connected');
		chrome.extension.sendMessage('mtgox_update');
	},
	onDisconnect: function() {
		console.log('disconnected');
		chrome.extension.sendMessage('mtgox_update');
	},
	onError: function() {
		console.log('error');
		chrome.extension.sendMessage('mtgox_update');
	},
	onMessage: function(data) {
		this['op' + Util.capitalize(data.op)](data);
		chrome.extension.sendMessage('mtgox_update');
	},

	opSubscribe: function(data) {
		// Do nothing
	},
	opUnsubscribe: function(data) {
		// Do nothing
	},
	opRemark: function(data) {
		// Do nothing
	},
	opResult: function(data) {
		// Do nothing
	},

	opPrivate: function(data) {
		this['private' + Util.capitalize(data.private)](data);
	},

	privateTicker: function(data) {
		//console.log('ticker', data);
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
			}
			else if (old_val && parseInt(old_val.value_int) > this.ticker_data[currency][key].value_int) {
				this.ticker_data[currency][key].change = 'down';
			}
			else {
				this.ticker_data[currency][key].change = 'none';
			}
		}
	},
	privateTrade: function(data) {
		//console.log('trade', data);
	},
	privateDepth: function(data) {
		//console.log('depth', data);
	},
	privateResult: function(data) {
		//console.log('result', data);
	}
};

$(function() {
	Blockchain.initialize();
	MtGox.initialize();
});
