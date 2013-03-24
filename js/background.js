// background.js

var Background = {

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

$(Background.initialize.bind(Background));
