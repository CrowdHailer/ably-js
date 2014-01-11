var CometTransport = (function() {
	var messagetypes = (typeof(clientmessage_refs) == 'object') ? clientmessage_refs : require('../nodejs/lib/protocol/clientmessage_types');

	/*
	 * A base comet transport class
	 */
	function CometTransport(connectionManager, auth, params) {
		Transport.call(this, connectionManager, auth, params);
		this.binary = this.params.binary;
		this.sendRequest = null;
		this.recvRequest = null;
		this.pendingCallback = null;
		this.pendingItems = null;
	}
	(Utils || require('util')).inherits(CometTransport, Transport);

	CometTransport.paramStr = function(params, baseUri) {
		var paramCount = 0, result = baseUri || '';
		if(params) {
			for(var key in params)
				result += (paramCount++ ? '&' : '?') + key + '=' + params[key];
		}
		return result;
	};

	/* public instance methods */
	CometTransport.prototype.connect = function() {
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'starting');
		Transport.prototype.connect.call(this);
		var self = this, params = this.params, options = params.options;
		var host = Defaults.getHost(options, params.host);
		var port = Defaults.getPort(options);
		var cometScheme = options.tls ? 'https://' : 'http://';

		this.baseUri = cometScheme + host + ':' + port + '/comet/';
		var connectUri = this.baseUri + 'connect';
		Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'uri: ' + connectUri);
		this.auth.getAuthParams(function(err, authParams) {
			if(err) {
				self.abort(UIMessages.FAIL_REASON_REFUSED);
				return;
			}
			self.authParams = authParams;
			var connectParams = self.params.getConnectParams(authParams);
			Logger.logAction(Logger.LOG_MINOR, 'CometTransport.connect()', 'connectParams:' + CometTransport.paramStr(connectParams));
			try {
				self.request(connectUri, connectParams, null, false, function(err, response) {
					if(err) {
						self.emit('error', err);
						return;
					}
					self.emit('preconnect');
					self.onResponseData(response);
				});
			} catch(e) { self.emit('error', e); }
		});
	};

	CometTransport.prototype.sendClose = function(closing) {
		if(this.closeUri) {
			var self = this;
			this.request(this.closeUri(closing), this.authParams, null, false, function(err, response) {
				if(err) {
					self.emit('error', err);
					return;
				}
			});
		}
	};

	CometTransport.prototype.dispose = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}
	};

	CometTransport.prototype.onConnect = function(message) {
		/* the connectionId in a comet connected response is really
		 * <instId>-<connectionId> */
		var connectionStr = message.connectionId;
		message.connectionId = connectionStr.split('-').pop();
		Transport.prototype.onConnect.call(this, message);

		var baseConnectionUri =  this.baseUri + connectionStr;
		Logger.logAction(Logger.LOG_MICRO, 'CometTransport.onConnect()', 'baseUri = ' + baseConnectionUri + '; connectionId = ' + message.connectionId);
		this.sendUri = baseConnectionUri + '/send';
		this.recvUri = baseConnectionUri + '/recv';
		this.closeUri = function(closing) { return baseConnectionUri + (closing ? '/close' : '/disconnect'); };
		this.recv();
	};

	CometTransport.prototype.send = function(msg, callback) {
		if(this.sendRequest) {
			/* there is a pending send, so queue this message */
			this.pendingItems = this.pendingItems || [];
			this.pendingItems.push(msg);

			this.pendingCallback = this.pendingCallback || new Multicaster();
			this.pendingCallback.push(callback);
			return;
		}
		/* send this, plus any pending, now */
		var pendingItems = this.pendingItems || [];
		pendingItems.push(msg);
		this.pendingItems = null;

		var pendingCallback = this.pendingCallback;
		if(pendingCallback) {
			pendingCallback.push(callback);
			callback = pendingCallback;
			this.pendingCallback = null;
		}

		this.sendItems(pendingItems, callback);
	};

	CometTransport.prototype.sendItems = function(items, callback) {
		var self = this;
		try {
			this.sendRequest = self.request(self.sendUri, self.authParams, this.encodeRequest(items), false, function(err, response) {
				self.sendRequest = null;
				if(self.pendingItems) {
					self.sendItems(self.pendingItems, self.pendingCallback);
					self.pendingItems = null;
					self.pendingCallback = null;
				}
				if(err) {
					callback(err);
					return;
				}
				self.onResponseData(response);
				callback(null);
			});
		} catch (e) {
			var msg = 'Unexpected send exception: ' + e;
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.sendItems()', msg);
			callback(new Error(msg));
		}
	};

	CometTransport.prototype.recv = function() {
		if(this.recvRequest) {
			this.recvRequest.abort();
			this.recvRequest = null;
		}

		if(!this.isConnected)
			return;

		var self = this;
		this.recvRequest = this.request(this.recvUri, this.authParams, null, true, function(err, response) {
			if(err) {
				self.emit('error', err);
				return;
			}
			self.onRecvResponse(response);
			self.recvRequest = null;
			self.recv();
		});
	};

	CometTransport.prototype.onResponseData = function(responseData) {
		try {
			var items = this.decodeResponse(responseData);
			if(items && items.length)
				for(var i = 0; i < items.length; i++)
					this.onChannelMessage(items[i]);
		} catch (e) {
			Logger.logAction(Logger.LOG_ERROR, 'CometTransport.onResponseData()', 'Unexpected exception handing channel event: ' + e.stack);
		}
	};

	CometTransport.prototype.onRecvResponse = function(responseData) {
		this.onResponseData(responseData);
	};

	CometTransport.prototype.encodeRequest = function(requestItems) {
		return Serialize.TMessageBundle.encode(requestItems, this.binary);
	};

	CometTransport.prototype.decodeResponse = function(responseData) {
		return Serialize.TMessageBundle.decode(responseData, this.binary);
	};

	return CometTransport;
})();
