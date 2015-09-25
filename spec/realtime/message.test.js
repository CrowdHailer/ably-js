"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		displayError = helper.displayError,
		closeAndFinish = helper.closeAndFinish,
		monitorConnection = helper.monitorConnection,
		publishAtIntervals = function(numMessages, channel, dataFn, onPublish){
			for(var i = numMessages; i > 0; i--) {
				var helper = function(currentMessageNum) {
					console.log('sending: ' + currentMessageNum);
					channel.publish('event0', dataFn(), function(err) {
						console.log('publish callback called');
						onPublish();
					});
				};
				setTimeout(helper(i), 20*i);
			}
		};

	exports.setupMessage = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, displayError(err));
			} else {
				test.ok(true, 'setup app');
			}
			test.done();
		});
	};

	exports.publishonce = function(test) {
		var transport = 'binary';

		test.expect(2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var testMsg = 'Hello world';
				var rtChannel = realtime.channels.get('publishonce');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to event */
					rtChannel.subscribe('event0', function(msg) {
						test.ok(true, 'Received event0');
						test.equal(msg.data, testMsg, 'Unexpected msg text received');
						closeAndFinish(test, realtime);
					});

					/* publish event */
					var restChannel = rest.channels.get('publishonce');
					restChannel.publish('event0', testMsg);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishVariations = function(test) {
		var transport = 'binary';
		var testData = 'Some data'
		var errorCallback = function(testArgument){
			return function(err) {
				if(err) {
					test.ok(false, 'Error received by publish callback ' + err + ' for argument ' + testArgument);
					closeAndFinish(test, realtime);
					return;
				}
			};
		};
		var testArguments = [
			[{name: 'objectWithName'}],
			[{name: 'objectWithNameAndCallback'}],
			[{name: 'objectWithNameAndNullData', data: null}],
			[{name: 'objectWithNameAndUndefinedData', data: undefined}],
			[{name: 'objectWithNameAndEmptyStringData', data: ''}],
			['nameAndNullData', null],
			['nameAndUndefinedData', undefined],
			['nameAndEmptyStringData', ''],
			['nameAndData', testData],
			['nameAndDataAndCallback', testData],
			[{name: 'objectWithNameAndData', data: testData}],
			[{name: 'objectWithNameAndDataAndCallback', data: testData}],
			// 6 messages with null name,
			[null, testData],
			[null, testData],
			[{name: null, data: testData}],
			[null, null],
			[{name: null}],
			[{name: null, data: null}]
		];

		test.expect(testArguments.length * 2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishVariations');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
						return;
					}

					/* subscribe to different message types */
					var messagesReceived = 0
					rtChannel.subscribe(function(msg) {
						test.ok(true, 'Received ' + msg.name);
						++messagesReceived;
						switch(msg.name) {
							case 'objectWithName':
							case 'objectWithNameAndCallback':
							case 'objectWithNameAndNullData':
							case 'objectWithNameAndUndefinedData':
							case 'nameAndNullData':
							case 'nameAndUndefinedData':
								test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								break;
							case 'nameAndEmptyStringData':
							case 'objectWithNameAndEmptyStringData':
								test.strictEqual(msg.data, '', 'Msg data received was a ' + typeof(msg.data) + ' when should have been an empty string');
								break;
							case 'objectWithNameAndFalseData':
							case 'nameAndFalseData':
								test.strictEqual(msg.data, false, 'Msg data received was a ' + typeof(msg.data) + ' when should have been a bool false');
								break;
							case 'nameAndData':
							case 'nameAndDataAndCallback':
							case 'objectWithNameAndData':
							case 'objectWithNameAndDataAndCallback':
								test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								break;
							case undefined:
								if (msg.data) {
									// 3 messages: null name and data, null name and data and callback, object with null name and data
									test.equal(msg.data, testData, 'Msg data ' + msg.data + 'Unexpected message data received');
								} else {
									// 3 messages: null name and null data, object with null name and no data, object with null name and null data
									test.equal(typeof(msg.data), 'undefined', 'Msg data was received where none expected');
								}
								break;
							default:
								test.ok(false, 'Unexpected message ' + msg.name + 'received');
								closeAndFinish(test, realtime);
						}

						if (messagesReceived == testArguments.length) {
							closeAndFinish(test, realtime);
						}
					});

					/* publish events */
					var restChannel = rest.channels.get('publishVariations'),
							publishArgs;
					for(var i = 0; i < testArguments.length; i++) {
						publishArgs = testArguments[i].slice(0);
						publishArgs.push(errorCallback(testArguments[i]));
						restChannel.publish.apply(restChannel, publishArgs);
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishDisallowed = function(test) {
		var transport = 'binary';
		var testData = 'Some data'
		var testArguments = [
			[{name: 'objectAndBoolData', data: false}],
			['nameAndBoolData', false],
			[{name: 'objectAndNumericData', data: 0}],
			['nameAndNumericData', 0],
			[{name: 'objectAndOtherObjectData', data: new Date()}],
			['nameAndOtherObjectData', new Date()],
		];

		test.expect(testArguments.length * 2);
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishDisallowed');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
						return;
					}

					/* publish events */
					var restChannel = rest.channels.get('publishDisallowed');
					for(var i = 0; i < testArguments.length; i++) {
						try {
							restChannel.publish.apply(restChannel, testArguments[i]);
							test.ok(false, "Exception was not raised");
						} catch (e) {
							test.ok(true, "Exception correctly raised");
							test.equal(e.code, 40011, "Invalid data type exception raised");
						}
					}
					closeAndFinish(test, realtime);
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishEncodings = function(test) {
		var testData = 'testData'
		var testArguments = [
			// valid
			[{name: 'justJson', encoding: 'json', data: '{\"foo\":\"bar\"}'}],
			// invalid -- encoding ending in utf-8 implies data is binary
			[{name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{\"foo\":\"bar\"}'}],
			// valid
			[{name: 'utf8base64', encoding: 'utf-8/base64', data: 'dGVzdERhdGE='}],
			// invalid -- nonsense/corrupt encoding
			[{name: 'nonsense', encoding: 'choahofhpxf', data: testData}],
		];

		test.expect(testArguments.length * 4); // One for sending, one for receiving, one each for data & encoding
		try {
			/* set up realtime */
			var realtime = helper.AblyRealtime();
			var rest = helper.AblyRest();

			/* connect and attach */
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishEncodings');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
						return;
					}

					var messagesReceived = 0
					rtChannel.subscribe(function(msg) {
						test.ok(true, 'Received ' + msg.name);
						++messagesReceived;
						switch(msg.name) {
							case 'justJson':
								test.deepEqual(msg.data, {foo: "bar"}, 'justJson: correct decoded data');
								test.equal(msg.encoding, null, 'justJson: encoding stripped on decoding');
								break;
							case 'jsonUtf8string':
								test.equal(msg.data, '{\"foo\":\"bar\"}', 'justJsonUTF8string: data should be untouched');
								test.equal(msg.encoding, 'json/utf-8', 'justJsonUTF8string: encoding should be untouched');
								break;
							case 'utf8base64':
								test.equal(msg.data, "testData", 'utf8base64: correct decoded data');
								test.equal(msg.encoding, null, 'utf8base64: encoding stripped on decoding');
								break;
							case 'nonsense':
								test.deepEqual(msg.data, testData, 'nonsense: data untouched');
								test.equal(msg.encoding, 'choahofhpxf', 'nonsense: encoding untouched');
								break;
							default:
								test.ok(false, 'Unexpected message ' + msg.name + ' received');
								closeAndFinish(test, realtime);
						}
						if (messagesReceived == testArguments.length) {
							closeAndFinish(test, realtime);
						}
					});

					/* publish events */
					var restChannel = rest.channels.get('publishEncodings');
					for(var i = 0; i < testArguments.length; i++) {
						try {
							restChannel.publish.apply(restChannel, testArguments[i]);
							test.ok(true, "Successfully published");
						} catch (e) {
							test.ok(false, "Failed to publish");
						}
					}
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};

	exports.publishEncodingsErrorEmitted = function(test) {
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime();
			realtime.connection.on('connected', function() {
				var rtChannel = realtime.channels.get('publishEncodingsErrorEmitted0');

				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + err);
						closeAndFinish(test, realtime);
						return;
					}

					/* Add channel error event listeners */
					rtChannel.on('error', function(err) {
						test.equal(err.code, 40013, "Error emitted has correct error code");
						test.ok(err.message.indexOf("utf-8") > -1, "Error emitted contains correct encoding component");
						closeAndFinish(test, realtime);
					});

					rtChannel.publish({name: 'jsonUtf8string', encoding: 'json/utf-8', data: '{\"foo\":\"bar\"}'})
				});
			});
			monitorConnection(test, realtime);
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			closeAndFinish(test, realtime);
		}
	};


	exports.restpublish = function(test) {
		var count = 10;
		var rest = helper.AblyRest();
		var realtime = helper.AblyRealtime();
		test.expect(2 * count);
		var messagesSent = [];
		var sendchannel = rest.channels.get('restpublish');
		var recvchannel = realtime.channels.get('restpublish');
		/* subscribe to event */
		recvchannel.subscribe('event0', function(msg) {
			test.ok(true, 'Received event0');
			test.notEqual(-1, messagesSent.indexOf(msg.data), 'Received unexpected message text');
			if(!--count) {
				clearInterval(timer);
				closeAndFinish(test, realtime);
			}
		});
		var timer = setInterval(function() {
			// console.log('sending: ' + count);
			var msgText = 'Hello world at: ' + new Date();
			messagesSent.push(msgText);
			sendchannel.publish('event0', msgText);
		}, 500);
	};

	exports.wspublish = function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				closeAndFinish(test, realtime);
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var realtime = helper.AblyRealtime();
		test.expect(count);
		var channel = realtime.channels.get('wspublish');
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		});
		var dataFn = function() { return 'Hello world at: ' + new Date() };
		publishAtIntervals(count, channel, dataFn, onPublish);
	};

	if (isBrowser) {
		exports.wsxhrpublish = function(test) {
			var count = 5;
			var cbCount = 5;
			var checkFinish = function() {
				if(count <= 0 && cbCount <= 0) {
					closeAndFinish(test, realtime);
				}
			};
			var onPublish = function() {
				--cbCount;
				checkFinish();
			};
			var realtime = helper.AblyRealtime({ transports : ['xhr'] });
			test.expect(count);
			var channel = realtime.channels.get('wsxhrpublish');
			/* subscribe to event */
			channel.subscribe('event0', function() {
				test.ok(true, 'Received event0');
				--count;
				checkFinish();
			});
			var dataFn = function() { return 'Hello world at: ' + new Date() };
			publishAtIntervals(count, channel, dataFn, onPublish);
		};

		exports.wsjsonppublish = function(test) {
			var count = 5;
			var cbCount = 5;
			var checkFinish = function() {
				if(count <= 0 && cbCount <= 0) {
					closeAndFinish(test, realtime);
				}
			};
			var onPublish = function() {
				--cbCount;
				checkFinish();
			};
			var realtime = helper.AblyRealtime({ transports : ['jsonp'] });
			test.expect(count);
			var channel = realtime.channels.get('wsjsonppublish');
			/* subscribe to event */
			channel.subscribe('event0', function() {
				test.ok(true, 'Received event0');
				--count;
				checkFinish();
			});
			var dataFn = function() { return 'Hello world at: ' + new Date() };
			publishAtIntervals(count, channel, dataFn, onPublish);
		};
	} else {
		exports.wscometpublish = function(test) {
			var count = 5;
			var cbCount = 5;
			var checkFinish = function() {
				if(count <= 0 && cbCount <= 0) {
					closeAndFinish(test, realtime);
				}
			};
			var onPublish = function() {
				--cbCount;
				checkFinish();
			};
			var realtime = helper.AblyRealtime({ transports : ['comet'] });
			test.expect(count);
			var channel = realtime.channels.get('wscometpublish');
			/* subscribe to event */
			channel.subscribe('event0', function() {
				test.ok(true, 'Received event0');
				--count;
				checkFinish();
			});
			var dataFn = function() { return 'Hello world at: ' + new Date() };
			publishAtIntervals(count, channel, dataFn, onPublish);
		};
	}

	return module.exports = helper.withTimeout(exports);
});
