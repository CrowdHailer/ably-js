var Utils = (function() {
	var isBrowser = (typeof(window) == 'object');

	function Utils() {}

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.mixin = function(target, src) {
		for(var prop in src) {
			if(src.hasOwnProperty(prop))
				target[prop] = src[prop];
		}
		return target;
	};

	/*
	 * Add a set of properties to a target object
	 * target: the target object
	 * props:  an object whose enumerable properties are
	 *         added, by reference only
	 */
	Utils.copy = function(src) {
		return Utils.mixin({}, src);
	};

	/*
	 * Determine whether or not a given object is
	 * an array.
	 */
	Utils.isArray = Array.isArray || function(ob) {
		return Object.prototype.toString.call(ob) == '[object Array]';
	};

	/*
	 * Ensures that an Array object is always returned
	 * returning the original Array of obj is an Array
	 * else wrapping the obj in a single element Array
	 */
	Utils.ensureArray = function(obj) {
		if (Utils.isArray(obj)) {
			return ob;
		} else {
			return [obj];
		}
	}

	/* ...Or an Object (in the narrow sense) */
	Utils.isObject = function(ob) {
		return Object.prototype.toString.call(ob) == '[object Object]';
	};

	/*
	 * Determine whether or not an object contains
	 * any enumerable properties.
	 * ob: the object
	 */
	Utils.isEmpty = function(ob) {
		for(var prop in ob)
			return false;
		return true;
	};

	/*
	 * Determine whether or not an argument to an overloaded function is
	 * undefined (missing) or null.
	 * This method is useful when constructing functions such as (WebIDL terminology):
	 *   off([TreatUndefinedAs=Null] DOMString? event)
	 * as you can then confirm the argument using:
	 *   Utils.isEmptyArg(event)
	 */

	Utils.isEmptyArg = function(arg) {
		return arg === null || arg === undefined;
	}

	/*
	 * Perform a simple shallow clone of an object.
	 * Result is an object irrespective of whether
	 * the input is an object or array. All
	 * enumerable properties are copied.
	 * ob: the object
	 */
	Utils.shallowClone = function(ob) {
		var result = new Object();
		for(var prop in ob)
			result[prop] = ob[prop];
		return result;
	};

	/*
	 * Clone an object by creating a new object with the
	 * given object as its prototype. Optionally
	 * a set of additional own properties can be
	 * supplied to be added to the newly created clone.
	 * ob:            the object to be cloned
	 * ownProperties: optional object with additional
	 *                properties to add
	 */
	Utils.prototypicalClone = function(ob, ownProperties) {
		function F() {}
		F.prototype = ob;
		var result = new F();
		if(ownProperties)
			Utils.mixin(result, ownProperties);
		return result;
	};

	/*
	 * Declare a constructor to represent a subclass
	 * of another constructor
	 * See node.js util.inherits
	 */
	Utils.inherits = (typeof(require) !== 'undefined' && require('util').inherits) || function(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Utils.prototypicalClone(superCtor.prototype, { constructor: ctor });
	};

	/*
	 * Determine whether or not an object has an enumerable
	 * property whose value equals a given value.
	 * ob:  the object
	 * val: the value to find
	 */
	Utils.containsValue = function(ob, val) {
		for(var i in ob) {
			if(ob[i] == val)
				return true;
		}
		return false;
	};

	Utils.intersect = function(arr, ob) { return Utils.isArray(ob) ? Utils.arrIntersect(arr, ob) : Utils.arrIntersectOb(arr, ob); };

	Utils.arrIntersect = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var member = arr1[i];
			if(Utils.arrIndexOf(arr2, member) != -1)
				result.push(member);
		}
		return result;
	};

	Utils.arrIntersectOb = function(arr, ob) {
		var result = [];
		for(var i = 0; i < arr.length; i++) {
			var member = arr[i];
			if(member in ob)
				result.push(member);
		}
		return result;
	};

	Utils.arrSubtract = function(arr1, arr2) {
		var result = [];
		for(var i = 0; i < arr1.length; i++) {
			var element = arr1[i];
			if(Utils.arrIndexOf(arr2, element) == -1)
				result.push(element);
		}
		return result;
	};

	Utils.arrIndexOf = Array.prototype.indexOf
		? function(arr, elem, fromIndex) {
			return arr.indexOf(elem,  fromIndex);
		}
		: function(arr, elem, fromIndex) {
			fromIndex = fromIndex || 0;
			var len = arr.length;
			for(;fromIndex < len; fromIndex++) {
				if(arr[fromIndex] === elem) {
					return fromIndex;
				}
			}
			return -1;
		};

	Utils.arrIn = function(arr, val) {
		return Utils.arrIndexOf(arr, val) !== -1;
	};

	Utils.arrDeleteValue = function(arr, val) {
		var idx = Utils.arrIndexOf(arr, val);
		var res = (idx != -1);
		if(res)
			arr.splice(idx, 1);
		return res;
	};

	/*
	 * Construct an array of the keys of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.keysArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(prop);
		}
		return result;
	};

	/*
	 * Construct an array of the values of the enumerable
	 * properties of a given object, optionally limited
	 * to only the own properties.
	 * ob:      the object
	 * ownOnly: boolean, get own properties only
	 */
	Utils.valuesArray = function(ob, ownOnly) {
		var result = [];
		for(var prop in ob) {
			if(ownOnly && !ob.hasOwnProperty(prop)) continue;
			result.push(ob[prop]);
		}
		return result.length ? result : undefined;
	};

	Utils.arrForEach = Array.prototype.forEach ?
		function(arr, fn) {
			arr.forEach(fn);
		} :
		function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				fn(arr[i], i, arr);
			}
		};

	Utils.arrMap = Array.prototype.map ?
		function(arr, fn) {
			return arr.map(fn);
		} :
		function(arr, fn)	{
			var result = [],
				len = arr.length;
			for(var i = 0; i < len; i++) {
				result.push(fn(arr[i], i, arr));
			}
			return result;
		};

	Utils.arrEvery = Array.prototype.every ?
		function(arr, fn) {
			return arr.every(fn);
		} : function(arr, fn) {
			var len = arr.length;
			for(var i = 0; i < len; i++) {
				if(!fn(arr[i], i, arr)) {
					return false;
				};
			}
			return true;
		};

	Utils.nextTick = isBrowser ? function(f) { setTimeout(f, 0); } : process.nextTick;

	var contentTypes = {
		json:   'application/json',
		jsonp:  'application/javascript',
		xml:    'application/xml',
		html:   'text/html',
		msgpack: 'application/x-msgpack'
	};

	Utils.defaultGetHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json;
		return {
			accept: accept,
			'X-Ably-Version': Defaults.apiVersion
		};
	};

	Utils.defaultPostHeaders = function(format) {
		format = format || 'json';
		var accept = (format === 'json') ? contentTypes.json : contentTypes[format] + ',' + contentTypes.json,
			contentType = (format === 'json') ? contentTypes.json : contentTypes[format];

		return {
			accept: accept,
			'content-type': contentType,
			'X-Ably-Version': Defaults.apiVersion
		};
	};

	Utils.arrRandomElement = function(arr) {
		return arr.splice(Math.floor(Math.random() * arr.length));
	};

	Utils.toQueryString = function(params) {
		var parts = [];
		if(params) {
			for(var key in params)
				parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
		}
		return parts.length ? '?' + parts.join('&') : '';
	};

	Utils.parseQueryString = function(query) {
		var match,
			search = /([^?&=]+)=?([^&]*)/g,
			result = {};

		while (match = search.exec(query))
			result[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);

 		return result;
	};

	Utils.now = Date.now || function() {
		/* IE 8 */
		return new Date().getTime();
	};

	Utils.inspect = function(x) {
		return JSON.stringify(x);
	};

	Utils.inspectError = function(x) {
		return (x && x.constructor.name == 'ErrorInfo') ? x.toString() : Utils.inspect(x);
	};

	Utils.randStr = function() {
		return String(Math.random()).substr(2);
	};

	return Utils;
})();
