;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
window.     vlSchema = {
  "oneOf": [
    {
      "$ref": "#/definitions/ExtendedUnitSpec",
      "description": "Schema for a unit Vega-Lite specification, with the syntactic sugar extensions:\n\n- `row` and `column` are included in the encoding.\n\n- (Future) label, box plot\n\n\n\nNote: the spec could contain facet."
    },
    {
      "$ref": "#/definitions/FacetSpec"
    },
    {
      "$ref": "#/definitions/LayerSpec"
    }
  ],
  "definitions": {
    "ExtendedUnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/Encoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "Mark": {
      "type": "string",
      "enum": [
        "area",
        "bar",
        "line",
        "point",
        "text",
        "tick",
        "rule",
        "circle",
        "square",
        "errorBar"
      ]
    },
    "Encoding": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Vertical facets for trellis plots."
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Horizontal facets for trellis plots."
        },
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    },
    "PositionChannelDef": {
      "type": "object",
      "properties": {
        "axis": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Axis"
            }
          ]
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Axis": {
      "type": "object",
      "properties": {
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "format": {
          "description": "The formatting pattern for axis labels.",
          "type": "string"
        },
        "orient": {
          "$ref": "#/definitions/AxisOrient",
          "description": "The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart)."
        },
        "title": {
          "description": "A title for the axis. Shows field name and its function by default.",
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "AxisOrient": {
      "type": "string",
      "enum": [
        "top",
        "right",
        "left",
        "bottom"
      ]
    },
    "Scale": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/ScaleType"
        },
        "domain": {
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values.",
          "oneOf": [
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "range": {
          "description": "The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "round": {
          "description": "If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.",
          "type": "boolean"
        },
        "bandSize": {
          "minimum": 0,
          "type": "number"
        },
        "padding": {
          "description": "Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).",
          "type": "number"
        },
        "clamp": {
          "description": "If true, values that exceed the data domain are clamped to either the minimum or maximum range value",
          "type": "boolean"
        },
        "nice": {
          "description": "If specified, modifies the scale domain to use a more human-friendly value range. If specified as a true boolean, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96). If specified as a string, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/NiceTime"
            }
          ]
        },
        "exponent": {
          "description": "Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.",
          "type": "number"
        },
        "zero": {
          "description": "If `true`, ensures that a zero baseline value is included in the scale domain.\n\nDefault value: `true` for `x` and `y` channel if the quantitative field is not binned\n\nand no custom `domain` is provided; `false` otherwise.",
          "type": "boolean"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        }
      }
    },
    "ScaleType": {
      "type": "string",
      "enum": [
        "linear",
        "log",
        "pow",
        "sqrt",
        "quantile",
        "quantize",
        "ordinal",
        "time",
        "utc"
      ]
    },
    "NiceTime": {
      "type": "string",
      "enum": [
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year"
      ]
    },
    "SortField": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field name to aggregate over.",
          "type": "string"
        },
        "op": {
          "$ref": "#/definitions/AggregateOp",
          "description": "The sort aggregation operator"
        },
        "order": {
          "$ref": "#/definitions/SortOrder"
        }
      },
      "required": [
        "field",
        "op"
      ]
    },
    "AggregateOp": {
      "type": "string",
      "enum": [
        "values",
        "count",
        "valid",
        "missing",
        "distinct",
        "sum",
        "mean",
        "average",
        "variance",
        "variancep",
        "stdev",
        "stdevp",
        "median",
        "q1",
        "q3",
        "modeskew",
        "min",
        "max",
        "argmin",
        "argmax"
      ]
    },
    "SortOrder": {
      "type": "string",
      "enum": [
        "ascending",
        "descending",
        "none"
      ]
    },
    "Type": {
      "type": "string",
      "enum": [
        "quantitative",
        "ordinal",
        "temporal",
        "nominal"
      ]
    },
    "TimeUnit": {
      "type": "string",
      "enum": [
        "year",
        "month",
        "day",
        "date",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "yearmonth",
        "yearmonthdate",
        "yearmonthdatehours",
        "yearmonthdatehoursminutes",
        "yearmonthdatehoursminutesseconds",
        "hoursminutes",
        "hoursminutesseconds",
        "minutesseconds",
        "secondsmilliseconds",
        "quarter",
        "yearquarter",
        "quartermonth",
        "yearquartermonth"
      ]
    },
    "Bin": {
      "type": "object",
      "properties": {
        "min": {
          "description": "The minimum bin value to consider. If unspecified, the minimum value of the specified field is used.",
          "type": "number"
        },
        "max": {
          "description": "The maximum bin value to consider. If unspecified, the maximum value of the specified field is used.",
          "type": "number"
        },
        "base": {
          "description": "The number base to use for automatic bin determination (default is base 10).",
          "type": "number"
        },
        "step": {
          "description": "An exact step size to use between bins. If provided, options such as maxbins will be ignored.",
          "type": "number"
        },
        "steps": {
          "description": "An array of allowable step sizes to choose from.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "minstep": {
          "description": "A minimum allowable step size (particularly useful for integer values).",
          "type": "number"
        },
        "div": {
          "description": "Scale factors indicating allowable subdivisions. The default value is [5, 2], which indicates that for base 10 numbers (the default base), the method may consider dividing bin sizes by 5 and/or 2. For example, for an initial step size of 10, the method can check if bin sizes of 2 (= 10/5), 5 (= 10/2), or 1 (= 10/(5*2)) might also satisfy the given constraints.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "maxbins": {
          "description": "Maximum number of bins.",
          "minimum": 2,
          "type": "number"
        }
      }
    },
    "ChannelDefWithLegend": {
      "type": "object",
      "properties": {
        "legend": {
          "$ref": "#/definitions/Legend"
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Legend": {
      "type": "object",
      "properties": {
        "format": {
          "description": "An optional formatting pattern for legend labels. Vega uses D3\\'s format pattern.",
          "type": "string"
        },
        "title": {
          "description": "A title for the legend. (Shows field name and its function by default.)",
          "type": "string"
        },
        "values": {
          "description": "Explicitly set the visible legend values.",
          "type": "array",
          "items": {}
        },
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FieldDef": {
      "type": "object",
      "properties": {
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "OrderChannelDef": {
      "type": "object",
      "properties": {
        "sort": {
          "$ref": "#/definitions/SortOrder"
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Data": {
      "type": "object",
      "properties": {
        "format": {
          "$ref": "#/definitions/DataFormat",
          "description": "An object that specifies the format for the data file or values."
        },
        "url": {
          "description": "A URL from which to load the data set. Use the format.type property\n\nto ensure the loaded data is correctly parsed.",
          "type": "string"
        },
        "values": {
          "description": "Pass array of objects instead of a url to a file.",
          "type": "array",
          "items": {}
        }
      }
    },
    "DataFormat": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/DataFormatType",
          "description": "Type of input data: `\"json\"`, `\"csv\"`, `\"tsv\"`.\n\nThe default format type is determined by the extension of the file url.\n\nIf no extension is detected, `\"json\"` will be used by default."
        },
        "property": {
          "description": "JSON only) The JSON property containing the desired data.\n\nThis parameter can be used when the loaded JSON file may have surrounding structure or meta-data.\n\nFor example `\"property\": \"values.features\"` is equivalent to retrieving `json.values.features`\n\nfrom the loaded JSON object.",
          "type": "string"
        },
        "feature": {
          "description": "The name of the TopoJSON object set to convert to a GeoJSON feature collection.\n\nFor example, in a map of the world, there may be an object set named `\"countries\"`.\n\nUsing the feature property, we can extract this set and generate a GeoJSON feature object for each country.",
          "type": "string"
        },
        "mesh": {
          "description": "The name of the TopoJSON object set to convert to a mesh.\n\nSimilar to the `feature` option, `mesh` extracts a named TopoJSON object set.\n\nUnlike the `feature` option, the corresponding geo data is returned as a single, unified mesh instance, not as inidividual GeoJSON features.\n\nExtracting a mesh is useful for more efficiently drawing borders or other geographic elements that you do not need to associate with specific regions such as individual countries, states or counties.",
          "type": "string"
        }
      }
    },
    "DataFormatType": {
      "type": "string",
      "enum": [
        "json",
        "csv",
        "tsv",
        "topojson"
      ]
    },
    "Transform": {
      "type": "object",
      "properties": {
        "filter": {
          "description": "A string containing the filter Vega expression. Use `datum` to refer to the current data object.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/definitions/EqualFilter"
            },
            {
              "$ref": "#/definitions/RangeFilter"
            },
            {
              "$ref": "#/definitions/InFilter"
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/EqualFilter"
                  },
                  {
                    "$ref": "#/definitions/RangeFilter"
                  },
                  {
                    "$ref": "#/definitions/InFilter"
                  }
                ]
              }
            }
          ]
        },
        "filterInvalid": {
          "description": "Whether to filter invalid values (`null` and `NaN`) from the data. By default (`undefined`), only quantitative and temporal fields are filtered. If set to `true`, all data items with null values are filtered. If `false`, all data items are included.",
          "type": "boolean"
        },
        "calculate": {
          "description": "Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/Formula",
            "description": "Formula object for calculate."
          }
        }
      }
    },
    "EqualFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered.",
          "type": "string"
        },
        "equal": {
          "description": "Value that the field should be equal to.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/DateTime",
              "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
            }
          ]
        }
      },
      "required": [
        "field",
        "equal"
      ]
    },
    "DateTime": {
      "type": "object",
      "properties": {
        "year": {
          "description": "Integer value representing the year.",
          "type": "number"
        },
        "quarter": {
          "description": "Integer value representing the quarter of the year (from 1-4).",
          "type": "number"
        },
        "month": {
          "description": "One of: (1) integer value representing the month from `1`-`12`. `1` represents January;  (2) case-insensitive month name (e.g., `\"January\"`);  (3) case-insensitive, 3-character short month name (e.g., `\"Jan\"`).",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "date": {
          "description": "Integer value representing the date from 1-31.",
          "type": "number"
        },
        "day": {
          "description": "Value representing the day of week.  This can be one of: (1) integer value -- `1` represents Monday; (2) case-insensitive day name (e.g., `\"Monday\"`);  (3) case-insensitive, 3-character short day name (e.g., `\"Mon\"`).   <br/> **Warning:** A DateTime definition object with `day`** should not be combined with `year`, `quarter`, `month`, or `date`.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "hours": {
          "description": "Integer value representing the hour of day from 0-23.",
          "type": "number"
        },
        "minutes": {
          "description": "Integer value representing minute segment of a time from 0-59.",
          "type": "number"
        },
        "seconds": {
          "description": "Integer value representing second segment of a time from 0-59.",
          "type": "number"
        },
        "milliseconds": {
          "description": "Integer value representing millisecond segment of a time.",
          "type": "number"
        }
      }
    },
    "RangeFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "range": {
          "description": "Array of inclusive minimum and maximum values\n\nfor a field value of a data item to be included in the filtered data.",
          "maxItems": 2,
          "minItems": 2,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "range"
      ]
    },
    "InFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "in": {
          "description": "A set of values that the `field`'s value should be a member of,\n\nfor a data item included in the filtered data.",
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "in"
      ]
    },
    "Formula": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field in which to store the computed formula value.",
          "type": "string"
        },
        "expr": {
          "description": "A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.",
          "type": "string"
        }
      },
      "required": [
        "field",
        "expr"
      ]
    },
    "Config": {
      "type": "object",
      "properties": {
        "viewport": {
          "description": "The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.",
          "type": "number"
        },
        "background": {
          "description": "CSS color property to use as background of visualization. Default is `\"transparent\"`.",
          "type": "string"
        },
        "numberFormat": {
          "description": "D3 Number format for axis labels and text tables. For example \"s\" for SI units.",
          "type": "string"
        },
        "timeFormat": {
          "description": "Default datetime format for axis and legend labels. The format can be set directly on each axis and legend.",
          "type": "string"
        },
        "countTitle": {
          "description": "Default axis and legend title for count fields.",
          "type": "string"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Cell Config"
        },
        "mark": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Mark Config"
        },
        "overlay": {
          "$ref": "#/definitions/OverlayConfig",
          "description": "Mark Overlay Config"
        },
        "scale": {
          "$ref": "#/definitions/ScaleConfig",
          "description": "Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Axis Config"
        },
        "legend": {
          "$ref": "#/definitions/LegendConfig",
          "description": "Legend Config"
        },
        "facet": {
          "$ref": "#/definitions/FacetConfig",
          "description": "Facet Config"
        }
      }
    },
    "CellConfig": {
      "type": "object",
      "properties": {
        "width": {
          "type": "number"
        },
        "height": {
          "type": "number"
        },
        "clip": {
          "type": "boolean"
        },
        "fill": {
          "description": "The fill color.",
          "format": "color",
          "type": "string"
        },
        "fillOpacity": {
          "description": "The fill opacity (value between [0,1]).",
          "type": "number"
        },
        "stroke": {
          "description": "The stroke color.",
          "type": "string"
        },
        "strokeOpacity": {
          "description": "The stroke opacity (value between [0,1]).",
          "type": "number"
        },
        "strokeWidth": {
          "description": "The stroke width, in pixels.",
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        }
      }
    },
    "MarkConfig": {
      "type": "object",
      "properties": {
        "filled": {
          "description": "Whether the shape\\'s color should be used as fill color instead of stroke color.\n\nThis is only applicable for \"bar\", \"point\", and \"area\".\n\nAll marks except \"point\" marks are filled by default.\n\nSee Mark Documentation (http://vega.github.io/vega-lite/docs/marks.html)\n\nfor usage example.",
          "type": "boolean"
        },
        "color": {
          "description": "Default color.",
          "format": "color",
          "type": "string"
        },
        "fill": {
          "description": "Default Fill Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "stroke": {
          "description": "Default Stroke Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "fillOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeWidth": {
          "minimum": 0,
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        },
        "stacked": {
          "$ref": "#/definitions/StackOffset"
        },
        "orient": {
          "$ref": "#/definitions/Orient",
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored."
        },
        "interpolate": {
          "$ref": "#/definitions/Interpolate",
          "description": "The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, cardinal, cardinal-open, monotone."
        },
        "tension": {
          "description": "Depending on the interpolation type, sets the tension parameter.",
          "type": "number"
        },
        "lineSize": {
          "description": "Size of line mark.",
          "type": "number"
        },
        "ruleSize": {
          "description": "Size of rule mark.",
          "type": "number"
        },
        "barSize": {
          "description": "The size of the bars.  If unspecified, the default size is  `bandSize-1`,\n\nwhich provides 1 pixel offset between bars.",
          "type": "number"
        },
        "barThinSize": {
          "description": "The size of the bars on continuous scales.",
          "type": "number"
        },
        "shape": {
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down, or a custom SVG path.",
          "oneOf": [
            {
              "$ref": "#/definitions/Shape"
            },
            {
              "type": "string"
            }
          ]
        },
        "size": {
          "description": "The pixel area each the point. For example: in the case of circles, the radius is determined in part by the square root of the size value.",
          "type": "number"
        },
        "tickSize": {
          "description": "The width of the ticks.",
          "type": "number"
        },
        "tickThickness": {
          "description": "Thickness of the tick mark.",
          "type": "number"
        },
        "align": {
          "$ref": "#/definitions/HorizontalAlign",
          "description": "The horizontal alignment of the text. One of left, right, center."
        },
        "angle": {
          "description": "The rotation angle of the text, in degrees.",
          "type": "number"
        },
        "baseline": {
          "$ref": "#/definitions/VerticalAlign",
          "description": "The vertical alignment of the text. One of top, middle, bottom."
        },
        "dx": {
          "description": "The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "dy": {
          "description": "The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "radius": {
          "description": "Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.",
          "type": "number"
        },
        "theta": {
          "description": "Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating \"north\".",
          "type": "number"
        },
        "font": {
          "description": "The typeface to set the text in (e.g., Helvetica Neue).",
          "type": "string"
        },
        "fontSize": {
          "description": "The font size, in pixels.",
          "type": "number"
        },
        "fontStyle": {
          "$ref": "#/definitions/FontStyle",
          "description": "The font style (e.g., italic)."
        },
        "fontWeight": {
          "$ref": "#/definitions/FontWeight",
          "description": "The font weight (e.g., bold)."
        },
        "format": {
          "description": "The formatting pattern for text value. If not defined, this will be determined automatically.",
          "type": "string"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "text": {
          "description": "Placeholder Text",
          "type": "string"
        },
        "applyColorToBackground": {
          "description": "Apply color field to background color instead of the text.",
          "type": "boolean"
        }
      }
    },
    "StackOffset": {
      "type": "string",
      "enum": [
        "zero",
        "center",
        "normalize",
        "none"
      ]
    },
    "Orient": {
      "type": "string",
      "enum": [
        "horizontal",
        "vertical"
      ]
    },
    "Interpolate": {
      "type": "string",
      "enum": [
        "linear",
        "linear-closed",
        "step",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "bundle",
        "monotone"
      ]
    },
    "Shape": {
      "type": "string",
      "enum": [
        "circle",
        "square",
        "cross",
        "diamond",
        "triangle-up",
        "triangle-down"
      ]
    },
    "HorizontalAlign": {
      "type": "string",
      "enum": [
        "left",
        "right",
        "center"
      ]
    },
    "VerticalAlign": {
      "type": "string",
      "enum": [
        "top",
        "middle",
        "bottom"
      ]
    },
    "FontStyle": {
      "type": "string",
      "enum": [
        "normal",
        "italic"
      ]
    },
    "FontWeight": {
      "type": "string",
      "enum": [
        "normal",
        "bold"
      ]
    },
    "OverlayConfig": {
      "type": "object",
      "properties": {
        "line": {
          "description": "Whether to overlay line with point.",
          "type": "boolean"
        },
        "area": {
          "$ref": "#/definitions/AreaOverlay",
          "description": "Type of overlay for area mark (line or linepoint)"
        },
        "pointStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        },
        "lineStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        }
      }
    },
    "AreaOverlay": {
      "type": "string",
      "enum": [
        "line",
        "linepoint",
        "none"
      ]
    },
    "ScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "description": "If true, rounds numeric output values to integers.\n\nThis can be helpful for snapping to the pixel grid.\n\n(Only available for `x`, `y`, `size`, `row`, and `column` scales.)",
          "type": "boolean"
        },
        "textBandWidth": {
          "description": "Default band width for `x` ordinal scale when is mark is `text`.",
          "minimum": 0,
          "type": "number"
        },
        "bandSize": {
          "description": "Default band size for (1) `y` ordinal scale,\n\nand (2) `x` ordinal scale when the mark is not `text`.",
          "minimum": 0,
          "type": "number"
        },
        "opacity": {
          "description": "Default range for opacity.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "padding": {
          "description": "Default padding for `x` and `y` ordinal scales.",
          "type": "number"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        },
        "nominalColorRange": {
          "description": "Default range for nominal color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "sequentialColorRange": {
          "description": "Default range for ordinal / continuous color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "shapeRange": {
          "description": "Default range for shape",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "barSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "fontSizeRange": {
          "description": "Default range for font size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "ruleSizeRange": {
          "description": "Default range for rule stroke widths",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "tickSizeRange": {
          "description": "Default range for tick spans",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "pointSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "AxisConfig": {
      "type": "object",
      "properties": {
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "LegendConfig": {
      "type": "object",
      "properties": {
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FacetConfig": {
      "type": "object",
      "properties": {
        "scale": {
          "$ref": "#/definitions/FacetScaleConfig",
          "description": "Facet Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Facet Axis Config"
        },
        "grid": {
          "$ref": "#/definitions/FacetGridConfig",
          "description": "Facet Grid Config"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Facet Cell Config"
        }
      }
    },
    "FacetScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "type": "boolean"
        },
        "padding": {
          "type": "number"
        }
      }
    },
    "FacetGridConfig": {
      "type": "object",
      "properties": {
        "color": {
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "type": "number"
        },
        "offset": {
          "type": "number"
        }
      }
    },
    "FacetSpec": {
      "type": "object",
      "properties": {
        "facet": {
          "$ref": "#/definitions/Facet"
        },
        "spec": {
          "oneOf": [
            {
              "$ref": "#/definitions/LayerSpec"
            },
            {
              "$ref": "#/definitions/UnitSpec"
            }
          ]
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "facet",
        "spec"
      ]
    },
    "Facet": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef"
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef"
        }
      }
    },
    "LayerSpec": {
      "type": "object",
      "properties": {
        "layers": {
          "description": "Unit specs that will be layered.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/UnitSpec"
          }
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "layers"
      ]
    },
    "UnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/UnitEncoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "UnitEncoding": {
      "type": "object",
      "properties": {
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
};
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics',
    'angular-sortable-view',
    'angular-websql',
    'ui-rangeSlider',
    //modified by Zhe
    'infinite-scroll'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('vl', window.vl)
  .constant('cql', window.cql)
  .constant('vlSchema', window.vlSchema)
  .constant('vg', window.vg)
  .constant('util', window.vg.util)
  // other libraries
  .constant('jQuery', window.$)
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  .constant('ANY', '__ANY__')
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    logLevel: 'INFO',
    logPrintLevel: 'INFO',
    logToWebSql: false, // in user studies, set this to true
    hideMoreFn: true, // hide belowFold functions and "more" & "less" toggles in functionselect during user studies
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year',
    wildcardFn: true,
    hideOrdinalTypeSelect: true
  })
  .config(['cql', function(cql) {
    cql.config.DEFAULT_QUERY_CONFIG.channels = ['x', 'y', 'column', 'size', 'color'];
    cql.config.DEFAULT_QUERY_CONFIG.stylize = false;
  }]);
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("components/alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("components/bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button close-action=\"Bookmarks.logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.list.length }})</h2><a class=\"bookmark-list-util\" ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a> <a class=\"bookmark-list-util\" ng-click=\"Bookmarks.export()\"><i class=\"fa fa-clipboard\"></i> Export</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.list.length > 0\" class=\"hflex flex-wrap\" sv-root=\"\" sv-part=\"Bookmarks.list\" sv-on-sort=\"Bookmarks.reorder()\"><vl-plot-group ng-repeat=\"bookmark in Bookmarks.list | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" list-title=\"\'Bookmark\'\" chart=\"bookmark.chart\" field-set=\"bookmark.chart.fieldSet\" show-filter-info=\"true\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\" show-select=\"true\" sv-element=\"\"></vl-plot-group><div sv-placeholder=\"\"></div></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.list.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("components/channelproperty/channelproperty.html","<div class=\"channel-property mb5\"><div class=\"scale-type\" ng-if=\"fieldDef.type === \'quantitative\' && !fieldDef.bin\"><h4>Scale Type</h4><label class=\"channel-prop-radio-label\"><input type=\"radio\" ng-value=\"undefined\" ng-model=\"fieldDef.scale.type\" ng-change=\"typeChanged()\"> Linear</label> <label class=\"channel-prop-radio-label\"><input type=\"radio\" ng-value=\"\'log\'\" ng-model=\"fieldDef.scale.type\" ng-change=\"typeChanged()\"> Log</label></div><div class=\"scale-domain\" ng-if=\"fieldDef.type === \'quantitative\' && fieldDef.aggregate !== \'count\'\"><h4>Scale Domain</h4><label><input type=\"checkbox\" ng-model=\"useRawDomain\" ng-change=\"useRawDomainChange(useRawDomain)\"> Always include raw min & max values</label></div></div>");
$templateCache.put("components/channelshelf/channelshelf.html","<div class=\"shelf-group\"><div class=\"shelf\" ng-class=\"{disabled: disabled || !supportMark(channelId, mark), \'any\': isAnyChannel}\"><div class=\"shelf-label\" ng-class=\"{expanded: propsExpanded}\">{{ isAnyChannel ? \'any\' : channelId }}</div><div class=\"field-drop\" ng-model=\"pills[channelId]\" data-drop=\"!disabled && supportMark(channelId, mark)\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"encoding[channelId].field\" ng-class=\"{ expanded: funcsExpanded, any: isAnyField || isAnyFunction, \'enumerated-field\': isEnumeratedField, \'enumerated-channel\': isEnumeratedChannel, highlighted: isHighlighted(channelId) }\" field-def=\"encoding[channelId]\" show-type=\"true\" show-caret=\"true\" show-enum-spec-fn=\"true\" disable-caret=\"encoding[channelId].aggregate===\'count\' || !hasFunctions\" popup-content=\"fieldInfoPopupContent\" show-remove=\"true\" remove-action=\"removeField()\" class=\"selected draggable full-width\" data-drag=\"true\" ng-model=\"pills[channelId]\" jqyoui-draggable=\"{onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info><span class=\"placeholder\" ng-if=\"!encoding[channelId].field\">drop a field here</span></div></div><div class=\"drop-container\"><div class=\"popup-menu shelf-properties shelf-properties-{{channelId}}\" ng-show=\"false\"></div><div class=\"popup-menu shelf-functions shelf-functions-{{channelId}}\" ng-hide=\"!hasFunctions\"><function-select ng-if=\"!preview\" field-def=\"encoding[channelId]\" channel-id=\"channelId\" support-any=\"supportAny && consts.wildcardFn\"></function-select></div></div></div>");
$templateCache.put("components/fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCaret}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeName}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" title=\"{{ func(fieldDef) }}\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ (fieldDef.title || fieldTitle(fieldDef)) | underscore2space }}</span> <span class=\"wildcard-field-count\">{{ fieldCount(fieldDef.field) }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\' || fieldDef.autoCount\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span><span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"no-shrink filter\" ng-show=\"showFilter\"><a class=\"filter-field\" ng-click=\"filterAction()\"><i class=\"fa fa-filter\"></i></a></span> <span class=\"no-shrink add\" ng-show=\"showAdd\"><a class=\"add-field\" ng-click=\"addAction()\"><i class=\"fa fa-plus\"></i></a></span></span></span>");
$templateCache.put("components/functionselect/functionselect.html","<div class=\"function-select mb5\" ng-if=\"func.list.aboveFold.length > 1 || func.list.aboveFold[0] !== undefined\" ng-class=\"{wildcard: func.isAny}\"><div class=\"right\" ng-if=\"supportAny\"><label><input type=\"checkbox\" ng-model=\"func.isAny\" ng-change=\"isAnyChanged()\"> Wildcard</label></div><h4>Function</h4><div class=\"radios\" ng-if=\"!func.isAny || !supportAny\"><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f}}</label></div></div><div class=\"checkboxes\" ng-if=\"func.isAny && supportAny\"><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\"><input type=\"checkbox\" ng-model=\"func.checked[f]\" ng-change=\"checkChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"checkbox\" ng-model=\"func.checked[f]\" ng-change=\"checkChanged()\"> {{f}}</label></div></div><div ng-hide=\"hideMoreFn || func.isCount || func.list.belowFold.length == 0\" class=\"expand-collapse\"><a ng-click=\"showAllFunctions=!showAllFunctions\"><span ng-show=\"!showAllFunctions\">more <i class=\"fa fa-angle-down\" aria-hidden=\"true\"></i></span> <span ng-show=\"showAllFunctions\">less <i class=\"fa fa-angle-up\" aria-hidden=\"true\"></i></span></a></div></div>");
$templateCache.put("components/filter/categoricalfilter.html","<div class=\"categorical-filter-box filter-box\"><div class=\"actions\"><div class=\"right selected-status\">({{filter.in.length}}/{{values.length}} selected)</div><a ng-click=\"selectAll()\" class=\"select-all\">Select All</a></div><div class=\"values scroll-y no-scroll-x\"><div ng-repeat=\"val in values\" ng-mouseenter=\"showKeepOnly=true\" ng-mouseleave=\"showKeepOnly=false\"><label><input type=\"checkbox\" ng-model=\"include[stringify(val)]\" ng-change=\"filterChange()\"> {{val+\'\'}}</label> <a ng-show=\"showKeepOnly\" ng-init=\"showKeepOnly=false\" class=\"right keep-only\" ng-click=\"keepOnly(val)\">Keep Only</a></div></div></div>");
$templateCache.put("components/filter/filtershelves.html","<div class=\"right\"><select name=\"singleSelect\" ng-model=\"spec.transform.filterInvalid\" ng-options=\"opt.value as opt.label for opt in filterInvalidOptions\" ng-change=\"filterInvalidChanged()\"></select></div><h2>Filter</h2><div class=\"filter-absolute-container scroll-y no-scroll-x\"><div class=\"shelf-group\" ng-repeat=\"(field, filter) in filterManager.filterIndex\" ng-if=\"filter.enabled\"><div class=\"shelf filter-shelf\"><div class=\"field-drop\"><field-info ng-class=\"{expanded: funcsExpanded}\" field-def=\"{field: field}\" show-type=\"true\" show-remove=\"true\" remove-action=\"removeFilter(field)\" class=\"selected full-width\"></field-info></div><categorical-filter field=\"field\" filter=\"filter\" ng-if=\"filterType(field) === \'categorical\'\"></categorical-filter><quantitative-filter field=\"field\" filter=\"filter\" ng-if=\"filterType(field) === \'quantitative\'\"></quantitative-filter></div></div><div class=\"filter-drop\" ng-model=\"droppedFieldDef\" data-drop=\"true\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\">Drop a field here.</div></div>");
$templateCache.put("components/filter/quantitativefilter.html","<div ng-class=\"{time: type===\'temporal\'}\"><div><span class=\"right domain-label\">{{ domainMaxText || domainMax}}</span> <span class=\"domain-label\">{{ domainMinText || domainMin}}</span></div><div range-slider=\"\" min=\"domainMin\" max=\"domainMax\" model-min=\"localMin\" model-max=\"localMax\" show-values=\"true\" attach-handle-values=\"true\" on-handle-up=\"updateRange()\"></div><div ng-show=\"type===\'temporal\'\"><span class=\"right value-label\">{{ localMaxText }}</span> <span class=\"value-label\">{{ localMinText }}</span></div></div>");
$templateCache.put("components/modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("components/propertyeditor/propertyeditor.html","<div><label class=\"prop-label\" for=\"{{ id }}\"><span class=\"name\" title=\"{{ propName }}\">{{ propName }}</span> <span ng-if=\"description\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<strong>{{ propName }}</strong><div class=\'tooltip-content\'>{{ description }}</div>\" tooltip-side=\"right\"></span></label><form class=\"inline-block\" ng-switch=\"type + (enum !== undefined ? \'list\' : \'\')\"><input id=\"{{ id }}\" ng-switch-when=\"boolean\" type=\"checkbox\" ng-model=\"group[propName]\" ng-hide=\"automodel.value\"><select id=\"{{ id }}\" ng-switch-when=\"stringlist\" ng-model=\"group[propName]\" ng-options=\"choice for choice in enum track by choice\" ng-hide=\"automodel.value\"></select><input id=\"{{ id }}\" ng-switch-when=\"integer\" ng-attr-type=\"{{ isRange ? \'range\' : \'number\'}}\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 200}\" ng-attr-min=\"{{min}}\" ng-attr-max=\"{{max}}\" ng-hide=\"automodel.value\" ng-attr-title=\"{{ isRange ? group[propName] : undefined }}\"> <input id=\"{{ id }}\" ng-attr-type=\"{{ role === \'color\' ? \'color\' : \'string\' }}\" ng-switch-when=\"string\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 500}\" ng-hide=\"automodel.value\"> <small ng-if=\"hasAuto\"><label>Auto <input ng-model=\"automodel.value\" type=\"checkbox\"></label></small></form></div>");
$templateCache.put("components/schemalist/schemalist.html","<div class=\"schema no-top-margin full-width\"><schema-list-item ng-repeat=\"fieldDef in fieldDefs | orderBy : orderBy\" field-def=\"fieldDef\" filter-manager=\"filterManager\" show-add=\"showAdd\"></schema-list-item><schema-list-item ng-if=\"showCount\" field-def=\"countFieldDef\" show-add=\"true\"></schema-list-item><div class=\"schema-list-drop\" ng-show=\"showDrop\" ng-model=\"droppedFieldDef\" data-drop=\"true\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\">Create a new wildcard.</div></div>");
$templateCache.put("components/schemalist/schemalistitem.html","<div class=\"schema-list-item\" ng-model=\"droppedFieldDef\" data-drop=\"isAnyField && fieldDef.field !== \'?\'\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"!isAnyField || fieldDef.field === \'?\' || fieldDef.field.enum.length > 0\" class=\"pill draggable full-width no-right-margin\" ng-class=\"{any: isEnumSpec(fieldDef.field)}\" ng-dblclick=\"fieldAdd(fieldDef)\" field-def=\"fieldDef\" ng-model=\"pill\" data-drag=\"true\" jqyoui-draggable=\"{placeholder: \'keep\', deepCopy: true, onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\" show-add=\"showAdd\" show-caret=\"true\" disable-caret=\"fieldDef.immutable || fieldDef.aggregate === \'count\' || allowedTypes.length<=1\" show-type=\"true\" add-action=\"fieldAdd(fieldDef)\" show-filter=\"!filterManager\" filter-action=\"toggleFilter()\" use-title=\"true\" popup-content=\"fieldInfoPopupContent\"></field-info></div><div class=\"drop-container\"><div class=\"popup-menu schema-menu\" ng-hide=\"!allowedTypes || allowedTypes.length<=1\"><div class=\"mb5 field-type\" ng-if=\"allowedTypes.length>1 && !isAnyField\"><h4>Type</h4><label class=\"type-label\" ng-repeat=\"type in allowedTypes\" ng-if=\"type !== \'ordinal\' || !consts.hideOrdinalTypeSelect\"><input type=\"radio\" ng-value=\"type\" ng-model=\"fieldDef.type\"> {{type}}</label></div><div class=\"wildcard-menu\" ng-show=\"isAnyField && fieldDef.field.enum\"><div><label class=\"wildcard-title-label\"><h4>Name</h4><input type=\"text\" ng-model=\"fieldDef.title\" placeholder=\"{{fieldTitle(fieldDef.field)}}\"></label></div><h4>Wildcard Fields</h4><div class=\"wildcard-fields\"><field-info ng-repeat=\"field in fieldDef.field.enum\" class=\"pill list-item full-width no-right-margin\" field-def=\"field === \'*\' ? countFieldDef : Dataset.schema.fieldSchema(field)\" show-type=\"true\" show-remove=\"true\" remove-action=\"removeWildcardField($index)\"></field-info></div><a class=\"remove-action\" ng-click=\"removeWildcard()\"><i class=\"fa fa-times\"></i> Delete Wildcard</a></div></div></div>");
$templateCache.put("components/shelves/shelves.html","<div class=\"card vflex shelves no-top-margin no-right-margin abs-100\"><div class=\"shelf-pane shelf-encoding-pane full-width\"><a class=\"right\" ng-click=\"clear()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Encoding</h2><div class=\"shelf-pane shelf-positional-pane full-width\"><channel-shelf channel-id=\"\'x\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'y\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'column\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\" disabled=\"!spec.encoding.x.field\">></channel-shelf><channel-shelf channel-id=\"\'row\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\" disabled=\"!spec.encoding.y.field\"></channel-shelf></div><div class=\"shelf-pane shelf-marks-pane full-width\"><div class=\"right\"><select class=\"markselect\" ng-model=\"spec.mark\" ng-class=\"{auto: spec.mark === ANY}\" ng-options=\"(type === ANY ? \'auto\' : type) for type in (supportAny || supportAutoMark ? marksWithAny : marks)\" ng-change=\"markChange()\"></select></div><h3>Marks</h3><channel-shelf channel-id=\"\'size\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'color\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'shape\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'detail\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'text\'\" preview=\"preview\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-any-pane full-width\" ng-if=\"supportAny && (!preview || spec.encoding[\'__ANY__0\'])\"><br><channel-shelf ng-repeat=\"channelId in anyChannelIds\" preview=\"preview\" channel-id=\"channelId\" encoding=\"spec.encoding\" support-any=\"supportAny\" mark=\"spec.mark\"></channel-shelf></div></div><div class=\"shelf-pane shelf-filter-pane full-width\" ng-if=\"!preview\"><filter-shelves spec=\"spec\"></filter-shelves></div></div>");
$templateCache.put("components/tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("components/tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && height > vlPlotHeight() && width > vlPlotWidth(), \'overflow-y\': (alwaysScrollable || overflow) && height > vlPlotHeight(), \'overflow-x\': (alwaysScrollable || overflow) && width > vlPlotWidth(), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseenter=\"mouseenter()\" ng-mouseleave=\"mouseleave()\"></div>");
$templateCache.put("components/vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\" ng-mouseenter=\"enablePreview()\" ng-mouseleave=\"disablePreview()\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet && (fieldDef.field || fieldDef.autoCount)\" field-def=\"fieldDef\" enum-spec-index=\"chart.enumSpecIndex\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field], \'enumerated-field\': isEnumeratedField(chart, $index), \'enumerated-channel\': isEnumeratedChannel(chart, $index) }\" ng-mouseenter=\"fieldInfoMouseover(fieldDef, $index)\" ng-mouseleave=\"fieldInfoMouseout(fieldDef, $index)\"></field-info></div><i ng-if=\"showFilterInfo && hasFilter\" title=\"{{filterInfo}}\" class=\"fa fa-filter filter-info\"></i><div style=\"flex-grow:1\"></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" title=\"Toggle X-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" title=\"Toggle Y-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-show=\"showAxisProp && (((chart.vlSpec || {}).encoding||{}).x||{}).type === \'quantitative\'\" class=\"command x-prop-toggle\" title=\"X-Axis Properties\" ng-click=\"\"><i class=\"fa fa-long-arrow-right\"></i> <small ng-if=\"showLabel\">X-Axis</small> <i class=\"fa fa-caret-down\"></i></a> <a ng-show=\"showAxisProp && (((chart.vlSpec || {}).encoding||{}).y||{}).type === \'quantitative\'\" class=\"command y-prop-toggle\" title=\"Y-Axis Properties\" ng-click=\"\"><i class=\"fa fa-long-arrow-up\"></i> <small ng-if=\"showLabel\">Y-Axis</small> <i class=\"fa fa-caret-down\"></i></a><div class=\"drop-container\"><div class=\"popup-menu x-prop-popup axis-prop-popup\" ng-show=\"(((chart.vlSpec || {}).encoding||{}).x||{}).type === \'quantitative\'\"><channel-property ng-if=\"((chart.vlSpec || {}).encoding||{}).x\" channel-id=\"\'x\'\" field-def=\"chart.vlSpec.encoding.x\" toggle-shelf=\"toggleShelf\"></channel-property></div></div><div class=\"drop-container\"><div class=\"popup-menu y-prop-popup axis-prop-popup\" ng-show=\"(((chart.vlSpec || {}).encoding||{}).y||{}).type === \'quantitative\'\"><channel-property ng-if=\"((chart.vlSpec || {}).encoding||{}).y\" channel-id=\"\'y\'\" field-def=\"chart.vlSpec.encoding.y\" toggle-shelf=\"toggleShelf\"></channel-property></div></div><a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\" title=\"Sort\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" title=\"Filter Invalid Values\" ng-class=\"{active: chart.vlSpec && (chart.vlSpec.transform||{}).filterInvalid}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>Invalids</small></a><a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" title=\"Bookmark\" ng-click=\"toggleBookmark(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a> <a ng-if=\"showSelect\" title=\"Specify this chart\" ng-click=\"select(chart)\" ng-mouseenter=\"enablePreview()\" ng-mouseleave=\"disablePreview()\" class=\"command select\"><i class=\"fa fa-server flip\"></i></a><div ng-if=\"showBookmarkAlert\" class=\"bookmark-alert\"><div>Remove bookmark?</div><small>Your notes will be lost.</small><div><a ng-click=\"removeBookmark(chart)\"><i class=\"fa fa-trash-o\"></i> remove it</a> <a ng-click=\"keepBookmark()\"><i class=\"fa fa-bookmark\"></i> keep it</a></div></div></div></div><vl-plot class=\"flex-grow-1\" chart=\"chart\" mouse-enter-action=\"disablePreview\" disabled=\"disabled\" is-in-list=\"isInList\" list-title=\"listTitle\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\" render=\"renderChart\"></vl-plot></div>");
$templateCache.put("components/vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");
$templateCache.put("components/vlplotgrouplist/vlplotgrouplist.html","<div class=\"vl-plot-group-list-container\"><div class=\"vis-list-header\" ng-show=\"listTitle && !hideListTitle\"><h3 ng-click=\"showVis()\">{{listTitle}}</h3><span class=\"description\"></span></div><div class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in charts | limitTo: limit\" ng-show=\"showChart\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" is-in-list=\"isInList\" list-title=\"listTitle\" enable-pills-preview=\"enablePillsPreview\" field-set=\"chart.fieldSet\" show-filter-info=\"true\" show-bookmark=\"true\" show-debug=\"consts.debug && consts.debugInList\" show-filter-null=\"true\" show-select=\"showSpecify\" show-axis-prop=\"true\" show-sort=\"true\" render-chart=\"showChart\" overflow=\"true\" tooltip=\"true\" highlighted=\"Pills.highlighted\" priority=\"priority + $index\"></vl-plot-group></div><a ng-click=\"increaseLimit()\"><div class=\"vis-list-more\" ng-show=\"limit < charts.length\">Load more...</div></a></div>");}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.filter(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.filter(Dataset.datasets, {
          group: 'sample'
        });

        var datasetWatcher = scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };

        scope.$on('$destroy', function() {
          // Clean up watchers
          datasetWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'util', 'vl', 'cql', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, util, vl, cql, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = util.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          updateFromData(dataset, data);
        });
      }

      // modified by Zhe
      Dataset.updateFromData = function(dataset, data) {
        Dataset.data = data.values;
        Dataset.currentDataset = dataset;

        Dataset.schema = cql.schema.Schema.build(data.values);
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    function getFieldDefs(schema, order) {
      var fieldDefs = schema.fields().map(function(field) {
        return {
          field: field,
          type: schema.type(field),
          primitiveType: schema.primitiveType(field)
        };
      });

      fieldDefs = util.stablesort(fieldDefs, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      fieldDefs.push({ field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE, title: 'Count' });
      return fieldDefs;
    }

    function updateFromData(dataset, data) {
      Dataset.data = data;
      Dataset.currentDataset = dataset;

      Dataset.schema = cql.schema.Schema.build(data);
      // TODO: find all reference of Dataset.stats.sample and replace
    }

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'vg', function (Dataset, Logger, Config, _, vg) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = vg.util.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', function (Bookmarks, consts) {
    return {
      templateUrl: 'components/bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '=', // This one is really two-way binding.
        postSelectAction: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelProperty', ['consts', 'Pills', 'Logger', function(consts, Pills, Logger) {
    return {
      templateUrl: 'components/channelproperty/channelproperty.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '=',

        /** Whether the channel property cause side effect to the shelf  */
        toggleShelf: '<',
      },
      link: function(scope /*,element, attrs*/) {
        scope.consts = consts;
        scope.useRawDomain = false;

        // FIXME have option to hide log for in applicable mark

        scope.typeChanged = function() {
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, (scope.fieldDef.scale || {}).type);
          if (scope.toggleShelf) {
            Pills.set(scope.channelId, scope.fieldDef, true);
          }
        };

        scope.useRawDomainChange = function(useRawDomain) {
          var scale = scope.fieldDef.scale || {};
          scale.useRawDomain = useRawDomain;
          scope.fieldDef.scale = scale;

          Logger.logInteraction(Logger.actions.USE_RAW_DOMAIN_TOGGLE, useRawDomain);

          if (scope.toggleShelf) {
            Pills.set(scope.channelId, scope.fieldDef, true);
          }
        };

        var unwatchFieldDef = scope.$watch('fieldDef', function(fieldDef) {
          scope.useRawDomain = (fieldDef.scale || {}).useRawDomain !== false;
        });

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          unwatchFieldDef();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelShelf', ['ANY', 'Dataset', 'Pills', '_', 'Drop', 'Logger', 'vl', 'cql', 'Schema', 'consts', function(ANY, Dataset, Pills, _, Drop, Logger, vl, cql, Schema, consts) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '<',
        encoding: '=',
        mark: '<',
        preview: '<',
        disabled: '<',
        supportAny: '<',
      },
      link: function(scope, element /*, attrs*/) {
        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.pills = Pills.pills;
        scope.consts = consts;

        scope.isHighlighted = function (channelId) {
          var highlighted = Pills.highlighted || {};
          return highlighted[scope.encoding[channelId].field] ||
            highlighted['f' + channelId];
        };

        // These will get updated in the watcher
        scope.isAnyChannel = false;
        scope.isAnyField = false;
        scope.isAnyFunction = false;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {enum: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        var propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_REMOVED, scope.channelId, {fieldDef: scope.encoding[scope.channelId]});
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);
          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type) && !cql.enumSpec.isEnumSpec(pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill);
        };

        var channelIdWatcher = scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // FIXME: remove this confusing 2-way binding logics
        // If some external action changes the fieldDef, we also need to update the pill
        var channelEncodingWatcher = scope.$watch('encoding[channelId]', function(fieldDef) {
          scope.hasFunctions = fieldDef.aggregate === 'count' ? false :
            (
              vl.util.contains(['quantitative', 'temporal'], fieldDef.type) ||
              (
                fieldDef.type && fieldDef.type.enum &&
                (vl.util.contains(fieldDef.type.enum, 'quantitative') || vl.util.contains(fieldDef.type.enum, 'temporal'))
              )
            );

          // Preview shelf should not cause side effect
          if (scope.preview) {
            scope.isEnumeratedField = Pills.isEnumeratedField(scope.channelId);
            scope.isEnumeratedChannel = Pills.isEnumeratedChannel(scope.channelId);
          } else {
            Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
            scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
            scope.isAnyFunction = cql.enumSpec.isEnumSpec(fieldDef.aggregate) ||
              cql.enumSpec.isEnumSpec(fieldDef.bin) ||
              cql.enumSpec.isEnumSpec(fieldDef.timeUnit);
          }
        }, true);


        scope.$on('$destroy', function() {
          if (propsPopup && propsPopup.destroy) {
            propsPopup.destroy();
          }

          // Clean up watchers
          channelIdWatcher();
          channelEncodingWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['ANY', 'Drop', 'vl', 'cql', 'Dataset', function (ANY, Drop, vl, cql, Dataset) {
    return {
      templateUrl: 'components/fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '<',
        filterAction: '&',
        showAdd: '<',
        showCaret: '<',
        showFilter: '=',
        showRemove: '<',
        showType: '<',
        showEnumSpecFn: '<',
        popupContent: '<',
        action: '&',
        addAction: '&',
        removeAction: '&',
        disableCaret: '<'
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;

        // Properties that are created by a watcher later
        scope.typeName = null;
        scope.icon = null;
        scope.null = null;

        scope.fieldTitle = function(fieldDef) {
          var field = fieldDef.field;
          if (cql.enumSpec.isEnumSpec(field)) {
            if (field.enum) {
              return field.enum.map(function(field) {
                return field === '*' ? 'COUNT' : field;
              }).join(',');
            } else {
              // FIXME sync with Wildcards
              if (fieldDef.type === 'temporal') {
                return 'Temporal Fields';
              } else if (fieldDef.type === 'quantitative') {
                return 'Quantitative Fields';
              } else if (fieldDef.type === 'nominal') {
                return 'Categorical Fields';
              } else {
                return 'Any Fields';
              }
            }

          }
          return field;
        };

        scope.fieldCount = function(field) {
          if (cql.enumSpec.isEnumSpec(field)) {
            return field.enum ? ' (' + field.enum.length + ')' : '';
          }
          return '';
        };

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        var isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.func = function(fieldDef) {
          if (fieldDef.aggregate) {
            if (!isEnumSpec(fieldDef.aggregate)) {
              return fieldDef.aggregate;
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }
          if (fieldDef.timeUnit) {
            if (!isEnumSpec(fieldDef.timeUnit)) {
              return fieldDef.timeUnit;
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }
          if (fieldDef.bin) {
            if (!isEnumSpec(fieldDef.bin)) {
              return 'bin';
            } else if (scope.showEnumSpecFn) {
              return '?';
            }
          }

          return fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto') || '';
        };

        var popupContentWatcher = scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        var TYPE_NAMES = {
          nominal: 'text',
          ordinal: 'text-ordinal',
          quantitative: 'number',
          temporal: 'time',
          geographic: 'geo'
        };

        var TYPE_ICONS = {
          nominal: 'fa-font',
          ordinal: 'fa-font',
          quantitative: 'icon-hash',
          temporal: 'fa-calendar',
        };
        TYPE_ICONS[ANY] = 'fa-asterisk'; // separate line because we might change what's the string for ANY

        function getTypeDictValue(type, dict) {
          if (cql.enumSpec.isEnumSpec(type)) { // is enumSpec
            if (!type.enum) {
              return ANY; // enum spec without specific values
            }

            var val = null;
            for (var i = 0; i < type.enum.length; i++) {
              var _type = type.enum[i];
              var v = dict ? dict[_type] : _type;
              if (val === null) {
                val = v;
              } else {
                if (val !== v) {
                  return ANY; // If there are many conflicting types
                }
              }
            }
            return val;
          }
          return dict ? dict[type] : type;
        }

        var fieldDefWatcher = scope.$watch('fieldDef.type', function(type) {
          scope.icon = getTypeDictValue(type, TYPE_ICONS);
          var typeName = type;
          if (typeName === 'ordinal' || typeName === 'nominal') {
            typeName += (' (' + Dataset.schema.primitiveType(scope.fieldDef.field) + ')');
          } else if (type && type.enum) {
            typeName = type.enum[0]; // FIXME join them if we support many types
          }
          scope.typeName = typeName;
        });

        scope.$on('$destroy', function() {
          if (funcsPopup && funcsPopup.destroy) {
            funcsPopup.destroy();
          }

          // unregister watchers
          popupContentWatcher();
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('categoricalFilter', ['Dataset', 'vg', 'util', 'Logger', function (Dataset, vg, util, Logger) {
    return {
      templateUrl: 'components/filter/categoricalfilter.html',
      restrict: 'E',
      replace: true,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        scope.values = [];
        scope.include = {};

        scope.selectAll = selectAll;
        scope.selectNone = selectNone;
        scope.keepOnly = keepOnly;
        scope.stringify = JSON.stringify;

        scope.filterChange = function() {
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        function selectAll() {
          setInclude(scope.values);
          scope.filterChange();
        }

        function selectNone() {
          setInclude([]);
          scope.filterChange();
        }

        function keepOnly(onlyValue) {
          setInclude([onlyValue]);
          scope.filterChange();
        }

        function setInclude(list) {
          scope.include = list.reduce(function(include, x) {
            include[JSON.stringify(x)] = true;
            return include;
          }, {});
        }

        scope.$watch('field', function(field) {
          scope.values = Dataset.schema.domain({field: field});
        });

        scope.$watch('filter', function(filter) {
          setInclude(filter.in);
        });

        scope.$watch('include', function(include) {
          scope.filter.in = util.keys(include).filter(function(val) {
            return include[val];
          }).map(function(x) {
            return JSON.parse(x);
            // if (+x === +x) { return +x; }
            // return x;
          }).sort(vg.util.cmp); // Use Vega
        }, true);
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('filterShelves', ['FilterManager', 'Dataset', 'Logger', 'cql', 'vl', 'Alerts', function (FilterManager, Dataset, Logger, cql, vl, Alerts) {
    return {
      templateUrl: 'components/filter/filtershelves.html',
      restrict: 'E',
      replace: false,
      scope: {
        spec: '='
      },
      link: function(scope) {
        scope.Dataset = Dataset;
        scope.filterManager = FilterManager;
        scope.clearFilter = clearFilter;
        scope.removeFilter = removeFilter;
        scope.filterType = filterType;

        scope.filterInvalidOptions = [
          {value: true, label: 'Filter all invalid values'},
          {value: undefined, label: 'Filter invalid numbers'},
          {value: false, label: 'Show all invalid values'},
        ];

        scope.filterInvalidChanged = function() {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.spec.transform.filterInvalid);
        };

        function filterType(field) {
          switch (Dataset.schema.type(field)) {
            case 'nominal':
            case 'ordinal':
              return 'categorical';
            case 'quantitative':
              return 'quantitative';
            case 'temporal':
              return vl.timeUnit.defaultScaleType(field) === 'ordinal' ? 'categorical' : 'quantitative';
          }
        };

        function clearFilter() {
          FilterManager.reset();
          Logger.logInteraction(Logger.actions.FILTER_CLEAR);
        }

        function removeFilter(field) {
          FilterManager.toggle(field);
        }

        scope.fieldDropped = function() {
          if (scope.droppedFieldDef.aggregate === 'count') {
            Alerts.add('Cannot add filter for count field');
          } else if (cql.enumSpec.isEnumSpec(scope.droppedFieldDef.field)) {
            Alerts.add('Cannot add filter for wildcard field');
          } else {
            var added = FilterManager.add(scope.droppedFieldDef.field);
            if (!added) {
              Alerts.add('Already have filter for ' + scope.droppedFieldDef.field + '.');
            }
          }
          scope.droppedFieldDef = {};
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('quantitativeFilter', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'components/filter/quantitativefilter.html',
      restrict: 'E',
      replace: false,
      scope: {
        field: '=',
        filter: '='
      },
      link: function(scope) {
        var domain = Dataset.schema.domain({field: scope.field});

        // don't update until range slider handle released
        scope.localMin = scope.filter.range[0];
        scope.localMax = scope.filter.range[1];
        scope.type = Dataset.schema.type(scope.field);
        scope.updateRange = function() {
          scope.filter.range[0] = scope.localMin;
          scope.filter.range[1] = scope.localMax;
          if (scope.type === 'temporal') {
            scope.localMinText = new Date(scope.localMin).toDateString();
            scope.localMaxText = new Date(scope.localMax).toDateString();
          } else {
            scope.localMinText = scope.localMaxText = null;
          }

          scope.$apply(); // Force watcher to observe change
          Logger.logInteraction(Logger.actions.FILTER_CHANGE, scope.field, scope.filter);
        };

        if (scope.type === 'temporal') {
          // convert dates to numerical types
          var min = new Date(domain[0]);
          var max = new Date(domain[1]);
          scope.domainMin = min.getTime();
          scope.domainMax = max.getTime();
          scope.domainMinText = min.toDateString();
          scope.domainMaxText = max.toDateString();
        } else {
          scope.domainMin = domain[0];
          scope.domainMax = domain[1];
          scope.domainMinText = null;
          scope.domainMaxText = null;
        }
      }
    };
  }]);

// for formatting dates according to the selected timeUnit (just for display purposes)
// angular.module('vlui')
//   .filter('timeUnitFilter', function() {
//     return function(dateNumber) {
//       var timeUnit = 'year'; // testing purposes
//       var date = new Date(dateNumber);
//       switch (timeUnit) {
//         case 'year':
//           return date.getFullYear();
//         case 'date':
//           return date.getDate();
//       }
//       return new Date(dateNumber);
//     };
//   });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('functionSelect', ['_', 'consts', 'vl', 'cql', 'Pills', 'Logger', 'Dataset', function(_, consts, vl, cql, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '=',
        supportAny: '<'
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.hideMoreFn = consts.hideMoreFn;

        scope.func = {
          selected: undefined,
          checked: {undefined: true},
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isAny: false,
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'yearmonthdate',
            'year', 'month', // hide 'quarter' for user study because it's buggy
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        var timeUnitHasVariationFilter = function(timeUnit) {

          var pill =  Pills.get(scope.channelId);
          if (!pill) {
            return true;
          }
          var field = pill.field;
          // Convert 'any' channel to '?'.
          var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;

          if (cql.enumSpec.isEnumSpec(field)) {
            // If field is ?, we can't really filter timeUnit
            return true;
          }

          return !timeUnit || // Don't filter undefined
            // Remove timeUnits that do not have variation (cardinality <= 1).
            Dataset.schema.timeUnitHasVariation({field: field, channel: channel, timeUnit: timeUnit});
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, 'quarter', temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        function isPillQ(pill) {
          return pill && pill.type && (pill.type === vl.type.QUANTITATIVE || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.QUANTITATIVE)));
        }

        function isPillT(pill) {
          return pill && pill.type && (pill.type === vl.type.TEMPORAL || (pill.type.enum && vl.util.contains(pill.type.enum,vl.type.TEMPORAL)));
        }

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected, {
            channel: scope.channelId
          });

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          // FIXME temporal can actually have aggregation in practice too
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        scope.isAnyChanged = function () {
          if (scope.func.isAny) {
            var checked = {};
            checked[scope.func.selected] = true;
            scope.func.checked = checked;
            scope.checkChanged();
          } else {
            scope.selectChanged();
          }
        };

        scope.checkChanged = function() {
          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            isQ = isPillQ(pill),
            isT = isPillT(pill);

          if (!pill) {
            return; // not ready
          }

          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.checked, {
            channel: scope.channelId
          });

          // store checked nofn, aggregates, timeUnits but exclude bin as we will check for bin directly
          var fns = Object.keys(scope.func.checked)
            .filter(function(f) { return f !== 'bin' && scope.func.checked[f]; })
            .map(function(f) { return f === 'undefined' ? undefined : f; });

          // FIXME temporal / ordinal / nominal can actually have aggregation in practice too
          if (isQ) {
            pill.bin = scope.func.checked.bin ?
              (fns.length > 0 ? {enum: [false, true]} : true) :
              undefined;
            pill.aggregate = {enum: scope.func.checked.bin ? fns.concat([undefined]) : fns};
            pill.hasFn = scope.func.checked['undefined'] ? undefined : true;

            pill.timeUnit = undefined;
          } else if (isT) {
            pill.aggregate = undefined;
            pill.bin = undefined;
            pill.timeUnit = {enum: fns};
            pill.hasFn = undefined;
          }

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        var fieldDefWatcher = scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
              isQ = isPillQ(pill),
              isT = isPillT(pill);

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(timeUnitHasVariationFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(timeUnitHasVariationFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            scope.func.isAny = cql.enumSpec.isEnumSpec(pill.aggregate) ||
              cql.enumSpec.isEnumSpec(pill.bin) ||
              cql.enumSpec.isEnumSpec(pill.timeUnit);

            if (scope.func.isAny) {
              var checked = {};
              if (isQ) {
                var disallowUndefined = false;
                if (pill.bin) {
                  checked.bin = true;
                  if (cql.enumSpec.isEnumSpec(pill.bin)) {
                    if (pill.bin.enum) {
                      pill.bin.enum.forEach(function(bin) {
                        if (!bin) {
                          disallowUndefined = true;
                        }
                      });
                    }
                  } else {
                    disallowUndefined = true;
                  }
                }
                if (pill.aggregate) {
                  if (cql.enumSpec.isEnumSpec(pill.aggregate)) {
                    var aggregates = pill.aggregate.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    aggregates.forEach(function(aggregate) {
                      checked[aggregate] = true;
                    });
                    if (!checked['undefined']) {
                      disallowUndefined = true;
                    }
                  } else {
                    checked[pill.aggregate] = true;
                  }
                }

                if (disallowUndefined) {
                  delete checked['undefined'];
                } else {
                  checked['undefined'] = true;
                }
              } else if (isT) {
                if (pill.timeUnit) {
                  if (cql.enumSpec.isEnumSpec(pill.timeUnit)) {
                    var timeUnits = pill.timeUnit.enum || cql.config.DEFAULT_QUERY_CONFIG.aggregates;
                    timeUnits.forEach(function(timeUnit) {
                      checked[timeUnit] = true;
                    });
                  } else {
                    // Non-enum spec
                    checked[pill.timeUnit] = true;
                  }
                } else {
                  checked['undefined'] = true;
                }
              }
              scope.func.checked = checked;
            } else {
              var selected = pill.bin ? 'bin' :
                pill.aggregate || pill.timeUnit;

              if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
                scope.func.selected = selected;
              } else {
                scope.func.selected = defaultVal;
              }
            }
          }
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'components/modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '<',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:propertyEditor
 * @description
 * # propertyEditor
 */
angular.module('vlui')
  .directive('propertyEditor', function () {
    return {
      templateUrl: 'components/propertyeditor/propertyeditor.html',
      restrict: 'E',
      scope: {
        id: '=',
        type: '=',
        enum: '=',
        propName: '=',
        group: '=',
        description: '=',
        default: '=',
        min: '=',
        max: '=',
        role: '=' // for example 'color'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.hasAuto = scope.default === undefined;

        //TODO(kanitw): consider renaming
        scope.automodel = { value: false };

        if (scope.hasAuto) {
          scope.automodel.value = scope.group[scope.propName] === undefined;

          // change the value to undefined if auto is true
          var autoModelWatcher = scope.$watch('automodel.value', function() {
            if (scope.automodel.value === true) {
              scope.group[scope.propName] = undefined;
            }
          });

          scope.$on('$destroy', function() {
            // Clean up watcher
            autoModelWatcher();
          });

        }

        scope.isRange = scope.max !== undefined && scope.min !== undefined;
      }
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('schemaList', ['vl', 'cql', 'Logger', 'Pills', function(vl, cql, Logger, Pills) {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        filterManager: '=',
        showAdd: '<',
        showCount: '<',
        showDrop: '<'
      },
      replace: true,
      link: function(scope) {
        scope.Pills = Pills;
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.droppedFieldDef = {};
        scope.countFieldDef = Pills.countFieldDef;

        scope.fieldDropped = function() {
          Logger.logInteraction(Logger.actions.ADD_WILDCARD, scope.droppedFieldDef);
          Pills.addWildcard(scope.droppedFieldDef);
          scope.droppedFieldDef = {};
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:schemaListItem
 * @description
 * # schemaListItem
 */
angular.module('vlui')
  .directive('schemaListItem', ['Dataset', 'Drop', 'Logger', 'Pills', 'cql', 'vl', 'consts', function (Dataset, Drop, Logger, Pills, cql, vl, consts) {
    return {
      templateUrl: 'components/schemalist/schemalistitem.html',
      restrict: 'E',
      replace: false,
      scope: {
        fieldDef: '=', // Two-way
        showAdd:  '<',
        filterManager: '='
      },
      link: function postLink(scope, element) {
        scope.Dataset = Dataset;
        scope.consts = consts;
        scope.countFieldDef = Pills.countFieldDef;

        scope.isAnyField = false;
        scope.droppedFieldDef = null;
        scope.fieldInfoPopupContent =  element.find('.schema-menu')[0];

        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.fieldAdd = function(fieldDef) {
          Pills.add(fieldDef);
        };

        scope.toggleFilter = function() {
          if (!scope.filterManager) return;
          scope.filterManager.toggle(scope.fieldDef.field);
        };

        scope.fieldDragStart = function() {
          var fieldDef = scope.fieldDef;

          scope.pill = {
            field: fieldDef.field,
            title: fieldDef.title,
            type: fieldDef.type,
            aggregate: fieldDef.aggregate
          };
          Pills.dragStart(scope.pill, null);
        };

        scope.fieldDragStop = Pills.dragStop;

        scope.fieldDropped = function() {
          Pills.addWildcardField(scope.fieldDef, scope.droppedFieldDef);
          Logger.logInteraction(Logger.actions.ADD_WILDCARD_FIELD, scope.fieldDef, {
            addedField: scope.droppedFieldDef
          });
          scope.droppedFieldDef = null;
        };

        scope.removeWildcardField = function(index) {
          var field = scope.fieldDef.field;
          Logger.logInteraction(Logger.actions.REMOVE_WILDCARD_FIELD, scope.fieldDef, {
            removedField: field.enum[index] === '*' ? 'COUNT' : field.enum[index]
          });
          Pills.removeWildcardField(scope.fieldDef, index);
        };

        scope.removeWildcard = function() {
          Logger.logInteraction(Logger.actions.REMOVE_WILDCARD, scope.fieldDef);
          Pills.removeWildcard(scope.fieldDef);
        };

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        var allowedCasting = {
          integer: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          number: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          date: [vl.TEMPORAL],
          string: [vl.type.NOMINAL],
          boolean: [vl.type.NOMINAL],
          all: [vl.type.QUANTITATIVE, vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        var unwatchFieldDef = scope.$watch('fieldDef', function(fieldDef){
          if (cql.enumSpec.isEnumSpec(fieldDef.field)) {
            scope.allowedTypes = allowedCasting.all;
          } else {
            scope.allowedTypes = allowedCasting[fieldDef.primitiveType];
          }

          scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
        });

        scope.fieldTitle = function(field) {
          if (cql.enumSpec.isEnumSpec(field)) {
            return (field.enum || ['Wildcard'])
              .map(function(field) {
                return field === '*' ? 'COUNT' : field;
              }).join(',');
          }
          return field;
        };

        scope.$on('$destroy', function() {
          scope.fieldAdd = null;
          scope.fieldDragStop = null;
          scope.isEnumSpec = null;

          unwatchFieldDef();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        preview: '<',
        supportAny: '<',
        supportAutoMark: '<',
        filterManager: '='
      },
      replace: true,
      controller: ['$scope', 'ANY', 'util', 'vl', 'Config', 'Dataset', 'Logger', 'Pills', function($scope, ANY, util, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;
        $scope.anyChannelIds = [];
        $scope.Dataset = Dataset;

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Logger.logInteraction(Logger.actions.SPEC_CLEAN, $scope.spec);
          Pills.reset();
        };

        var specWatcher = $scope.$watch('spec', function(spec) {
          // populate anyChannelIds so we show all or them
          if ($scope.supportAny) {
            $scope.anyChannelIds = util.keys(spec.encoding).reduce(function(anyChannelIds, channelId) {
              if (Pills.isAnyChannel(channelId)) {
                anyChannelIds.push(channelId);
              }
              return anyChannelIds;
            }, []);
          }
          // Only call Pills.update, which will trigger Spec.spec to update if it's not a preview.
          if (!$scope.preview) {
            var Spec = Pills.update(spec);
            var logData = null;
            if (Spec) {
              if (Spec.charts) {
                logData = {specific: false, numCharts: Spec.charts.length};
              } else if (Spec.chart) {
                logData = {specific: true};
              } else {
                logData = {specific: false, numCharts: 0};
              }
            }
            Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec, logData);
          }
        }, true); //, true /* watch equality rather than reference */);


        $scope.$on('$destroy', function() {
          // Clean up watcher
          specWatcher();
        });
      }]
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'components/tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'components/tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['vl', 'vg', 'cql', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '<',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',
        mouseEnterAction: '=',
        render: '='
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500;
        var view;
        var tooltip;
        var TOOLTIP_DELAY = 200;

        scope.vlPlotHeight = function() {
          return element.height();
        };

        scope.vlPlotWidth = function() {
          return element.width();
        };

        function destroyView() {
          if (view) {
            tooltip.destroy(); // destroy tooltip (promise and event listners)
            view.off('mouseover');
            view.off('mouseout');
            view.destroy();
            view = null;

            var shorthand = getShorthand();
            if (consts.debug && $window.views) {
              delete $window.views[shorthand];
            }
          }
        }

        scope.visId = (counter++);

        var hoverPromise = null;
        var renderQueueNextPromise = null;

        scope.hoverFocus = false;
        scope.destroyed = false;

        scope.mouseenter = function() {
          hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand,{
              list: scope.listTitle
            });
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);

          if (scope.mouseEnterAction) {
            scope.mouseEnterAction();
          }
        };

        scope.mouseleave = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand, {
              list: scope.listTitle
            });
          }

          $timeout.cancel(hoverPromise);
          hoverPromise = null;

          scope.hoverFocus = scope.unlocked = false;
        };

        function onTooltipAppear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function onTooltipDisappear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());

          // FIXME: use chart stats if available (for example from bookmarks)
          var schema = Dataset.schema;

          // Special Rules
          var encoding = vlSpec.encoding;
          if (encoding) {
            // put x-axis on top if too high-cardinality and there is no column
            if (encoding.y && encoding.y.field && [vl.type.NOMINAL, vl.type.ORDINAL].indexOf(encoding.y.type) > -1) {
              if (encoding.x && !encoding.column) {
                if (schema.cardinality(encoding.y) > 25) {
                  (encoding.x.axis = encoding.x.axis || {}).orient = 'top';
                }
              }
            }

            // Use smaller band size if has X or Y has cardinality > 10 or has a facet
            if ((encoding.row && encoding.y) ||
                (encoding.y && schema.cardinality(encoding.y) > 10)) {
              (encoding.y.scale = encoding.y.scale || {}).bandSize = 12;
            }

            if ((encoding.column && encoding.x) ||
                (encoding.x && schema.cardinality(encoding.x) > 10)) {
              (encoding.x.scale = encoding.x.scale || {}).bandSize = 12;
            }

            if (encoding.color && encoding.color.type === vl.type.NOMINAL) {
              if (schema.cardinality(encoding.color) > 10) {
                (encoding.color.scale = encoding.color.scale || {}).range = 'category20';
              }
              // Make sure we always set the same color to the same value
              (encoding.color.scale = encoding.color.scale || {}).domain = Dataset.schema.domain(encoding.color);
            }

            if ((encoding.x && encoding.x.scale && encoding.x.scale.type === 'log') &&
                (encoding.y && encoding.y.scale && encoding.y.scale.type === 'log')) {
              [encoding.x, encoding.y].forEach(function(fieldDef) {
                fieldDef.axis = fieldDef.axis || {};
                fieldDef.axis.properties = fieldDef.axis.properties || {};
                fieldDef.axis.properties.grid = fieldDef.axis.properties.grid || {};
                fieldDef.axis.properties.grid.opacity = {value: 0.5};
              });
            }
          }
          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }


        function render(spec) {

          if (!spec) {
            if (view) {
              destroyView();
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                destroyView();
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();

                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand, {
                  list: scope.listTitle
                });
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  // use vega-tooltip
                  tooltip = vl.tooltip(view, scope.chart.vlSpec, {
                    onAppear: onTooltipAppear,
                    onDisappear: onTooltipDisappear,
                    delay: TOOLTIP_DELAY
                  });
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var specWatcher = scope.$watch(function() {
          // Omit data property to speed up deep watch
        //   if(scope.render) {
        //   var spec = getVgSpec();
        //   render(spec);
        // }
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          // modified by Zhe
          if(scope.render) {
            render(spec);
          }
        }, true);

        // added by Zhe
        var renderWatcher = scope.$watch('render', function() {
          if(scope.render) {
          var spec = getVgSpec();
          render(spec);
        }
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            destroyView();
          }

          if (hoverPromise) {
            $timeout.cancel(hoverPromise);
            hoverPromise = null;
          }

          // if (renderQueueNextPromise) {
          //   $timeout.cancel(renderQueueNextPromise);
          //   renderQueueNextPromise = null;
          // }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.

          // Clean up watcher
          specWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', 'Pills', 'Chart', '$timeout', 'Modals', 'Drop', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout, Modals, Drop) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '<',
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        enablePillsPreview: '<',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',

        // added by Zhe
        renderChart : '<',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '<',
        showFilterInfo: '<',

        showAxisProp: '<',
        showBookmark: '<',
        showDebug: '<',
        showExpand: '<',
        showFilterNull: '<',
        showLabel: '<',
        showLog: '<',
        showSelect: '<',
        showSort: '<',
        showTranspose: '<',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '<',

        alwaysSelected: '<',
        isSelected: '<',
        highlighted: '<',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope, element) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        var xPopup = new Drop({
          content: element.find('.x-prop-popup')[0],
          target: element.find('.x-prop-toggle')[0],
          position: 'bottom right',
          openOn: 'click'
        });

        var yPopup = new Drop({
          content: element.find('.y-prop-popup')[0],
          target: element.find('.y-prop-toggle')[0],
          position: 'bottom right',
          openOn: 'click'
        });


        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart, scope.listTitle);
          }
        };

        var watchRender = scope.$watch(scope.renderChart, function() {
          if(scope.renderChart) {

          }
        });

        // Show filters (if any)
        var unwatchFilter = scope.$watch('chart.vlSpec.transform.filter', function(vlSpecFilter) {
          if (!vlSpecFilter) {
            scope.hasFilter = false;
            return;
          }

          scope.hasFilter = true;

          var filterInfo = "Filter";
          vlSpecFilter.forEach(function(filter) {
            // add filter field name
            filterInfo = filterInfo + "\n" + filter.field + " \u2208 ";

            // add Q or N filter range
            if (filter.range) {
              filterInfo = filterInfo + "[" + filter.range.join(', ') + "]";
            }
            else if (filter.in) {
              if (filter.in.length < 5) {
                filterInfo = filterInfo + "{" + filter.in.join(', ') + "}";
              }
              else {
                filterInfo = filterInfo + "{" + filter.in[0] + ", ..., " + filter.in[filter.in.length-1] + "}";
              }
            }
          });
          scope.filterInfo = filterInfo;
        });

        var fieldHoverPromise = null;
        var previewPromise = null;

        scope.enablePreview = function() {
          previewPromise = $timeout(function() {
            if (scope.enablePillsPreview) {
              Pills.preview(true, scope.chart, scope.listTitle);
            }
          }, 500);

        };

        scope.disablePreview = function() {
          if (previewPromise) {
            $timeout.cancel(previewPromise);
          }
          previewPromise = null;

          if (scope.enablePillsPreview) {
            Pills.preview(false, scope.chart, scope.listTitle);
          }
        };

        scope.fieldInfoMouseover = function(fieldDef, index) {
          fieldHoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;

            // Link to original field in the CQL-based spec
            if (scope.chart && scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                (scope.highlighted||{})[fieldEnumSpecName] = true;
              }
            }

            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef, index) {
          if (fieldHoverPromise) {
            // if we unhover within
            $timeout.cancel(fieldHoverPromise);
          }
          fieldHoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });

            (scope.highlighted||{})[fieldDef.field] = false;

            // Unlink Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                delete (scope.highlighted||{})[fieldEnumSpecName];
              }
            }
          }
        };

        scope.isEnumeratedField = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].field;
            }
          }
          return false;
        };

        scope.isEnumeratedChannel = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].channel;
            }
          }
          return false;
        };

        scope.select = function(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart.shorthand, {
            list: scope.listTitle
          });
          Pills.select(chart.vlSpec);
          if (scope.$parent.postSelectAction) {
            scope.$parent.postSelectAction();
          }
          Modals.close('bookmark-list'); // HACK: this line is only necessary when this function is called from bookmark list
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = Pills.get(channel),
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? undefined : 'log');
          } else {
            scale.type = scale.type === 'log' ? undefined : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });

          if (scope.toggleShelf) {
            Pills.toggleFilterInvalid();
          } else {
            spec.transform = spec.transform || {};
            spec.transform.filterInvalid = spec.transform.filterInvalid === true ? undefined : true;
          }
        };

        // scope.toggleFilterNull.support = function(spec) {
        //   var fieldDefs = vl.spec.fieldDefs(spec);
        //   for (var i in fieldDefs) {
        //     var fieldDef = fieldDefs[i];
        //     // FIXME call missing method directly
        //     if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
        //       return true;
        //     }
        //   }
        //   return false;
        // };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 3) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode,
            list: scope.listTitle
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.sort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (vg.util.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.encoding.isAggregate(spec.encoding)) { // FIXME replace this proper alwaysNoOcclusion method
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
        };

        scope.$on('$destroy', function() {
          unwatchFilter();
          scope.chart = null;
          if (xPopup && xPopup.destroy) {
            xPopup.destroy();
          }
          if (yPopup && yPopup.destroy) {
            yPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlotGroupList', ['vl', 'cql', 'jQuery', 'consts', '_', 'Logger', 'Pills', 'Chart', '$timeout', function (vl, cql, jQuery, consts, _, Logger, Pills, Chart, $timeout) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        enablePillsPreview: '<',
        initialLimit: '<',
        listTitle: '<',
        hideListTitle: '<',
        charts: '<',
        priority: '<',
        showMore: '<',
        postSelectAction: '&',
        showQuerySelect: '<',
        showSpecify: '<',
        query: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.consts = consts;
        scope.limit = scope.initialLimit || 4;

        // Functions
        scope.getChart = Chart.getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.Pills = Pills;

        scope.select = function() {
          Logger.logInteraction(Logger.actions.QUERY_SELECT, cql.query.shorthand.spec(scope.query), {
            list: scope.listTitle
          });
          Pills.selectQuery(scope.query);

          // scroll to top if parent action is provided.
          if (scope.postSelectAction) {
            scope.postSelectAction();
          }
        };

        var previewPromise = null;

        scope.enablePreview = function() {
          previewPromise = $timeout(function() {
            Pills.previewQuery(true, scope.query, scope.listTitle);
          }, 500);

        };

        scope.disablePreview = function() {
          if (previewPromise) {
            $timeout.cancel(previewPromise);
          }
          previewPromise = null;

          Pills.previewQuery(false, scope.query, scope.listTitle);
        };

        // element.bind('scroll', function(){
        //    if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
        //     if (scope.limit < scope.modelGroup.charts.length) {
        //       scope.increaseLimit();
        //     }
        //    }
        // });

        function increaseLimit() {
          scope.limit += 4;
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit, {
            list: scope.listTitle
          });
        }

        // modified by Zhe
        scope.showChart = false;
        scope.showVis = function() {
          scope.showChart = !scope.showChart;
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(chart) {
          for (var i = 0; i < scope.charts.length; i++) {
            if(chart.shorthand === scope.charts[i].shorthand) {
              return true;
            }
          }
          return false;
        }
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = []; // save to local storage
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = function(shorthand) {
      var annotation = this.dict[shorthand].annotation;
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = annotation;
      this.save();
      Logger.logInteraction(Logger.actions.BOOKMARK_ANNOTATE, shorthand, annotation);
    };

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart, listTitle) {
      var shorthand = chart.shorthand;
      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({
        shorthand: shorthand,
        list: listTitle,
        chart: _.cloneDeep(chart)
      });

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand, {
        list: listTitle
      });
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      var removed;
      if (index >= 0) {
        removed = this.list.splice(index, 1)[0];
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand, {
        list: (removed || {}).list
      });
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Chart', ['cql', '_', function (cql, _) {
    var Chart = {
      getChart: getChart,
      transpose: transpose
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = item instanceof cql.model.SpecQueryModelGroup ?
        item.getTopSpecQueryModel():
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand()
      };
    }

    function transpose(spec) {
      var encoding = _.clone(spec.encoding);
      var oldXEnc = encoding.x;
      var oldYEnc = encoding.y;
      encoding.y = oldXEnc;
      encoding.x = oldYEnc;

      var oldRowEnc = encoding.row;
      var oldColEnc = encoding.column;
      encoding.row = oldColEnc;
      encoding.column = oldRowEnc;

      spec.encoding = encoding;
    }

    return Chart;
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 300,
          height: 300
        },
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        },
        overlay: {line: true},
        scale: {useRawDomain: true}
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        },
        overlay: {line: true},
        scale: {useRawDomain: true}
      };
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('FilterManager', ['_', 'vl', 'Dataset', 'Logger', function (_, vl, Dataset, Logger) {
    var self = this;

    /** local object for this object */
    self.filterIndex = {};

    this.toggle = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
      } else {
        self.filterIndex[field].enabled = !self.filterIndex[field].enabled;
      }
      Logger.logInteraction(
        self.filterIndex[field].enabled ? Logger.actions.FILTER_ENABLED : Logger.actions.FILTER_DISABLED,
        field,
        self.filterIndex[field]
      );
    };

    this.add = function(field) {
      if (!self.filterIndex[field]) {
        self.filterIndex[field] = initFilter(field);
        Logger.logInteraction(Logger.actions.FILTER_ENABLED, field, self.filterIndex[field]);
        return true;
      } else if (!self.filterIndex[field].enabled) {
        self.filterIndex[field].enabled = true;
        return true;
      }
      return false;
    }

    this.reset = function(oldFilter, hard) {
      if (hard) {
        self.filterIndex = {};
      } else {
        _.forEach(self.filterIndex, function(value, field) {
          if (self.filterIndex[field].enabled) {
            self.filterIndex[field] = initFilter(field);
          }
        });
      }

      if (oldFilter) {
        oldFilter.forEach(function(filter) {
          self.filterIndex[filter.field] = vl.util.extend({enabled: true}, filter);
        });
      }

      return self.filterIndex;
    };

    this.getVlFilter = function() {
      var vlFilter = _.reduce(self.filterIndex, function (filters, filter) {
        var field = filter.field;
        var timeUnit = filter.timeUnit;

        if (filter.in) {
          if ( filter.in.length === 0 ||
               filter.in.length === Dataset.schema.cardinality({field: field}) ) {
            return filters;
          }
        } else if (filter.range) {
          var domain = Dataset.schema.domain({
            field: field,
            timeUnit: timeUnit
          });

          if (filter.range[0] === domain[0] && filter.range[1] === domain[1]) {
            return filters;
          }
        }

        if (filter.enabled) {
          filters.push(_.omit(filter, 'enabled'));
        }
        return filters;
      }, []);

      return vlFilter.length ? vlFilter : undefined;
    };

    function initFilter(field) {
      var type = Dataset.schema.type(field);

      switch (type) {
        case vl.type.NOMINAL:
        case vl.type.ORDINAL:
          return {
            enabled: true,
            field: field,
            in: Dataset.schema.domain({field: field})
          };
        case vl.type.QUANTITATIVE:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
        case vl.type.TEMPORAL:
          return {
            enabled: true,
            field: field,
            range: [
              Dataset.schema.stats({field: field}).min,
              Dataset.schema.stats({field: field}).max
            ]
          };
      }
    }
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', '$webSql', '_', 'consts', 'Analytics', 'Papa', 'Blob', 'URL', function ($location, $window, $webSql, _, consts, Analytics, Papa, Blob, URL) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      BOOKMARK_ANNOTATE: {category: 'BOOKMARK', id: 'BOOKMARK_ANNOTATE', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},
      USE_RAW_DOMAIN_TOGGLE: {category: 'CHART', id:'USE_RAW_DOMAIN_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},
      ADD_FIELD: {category: 'FIELDS', id: 'ADD_FIELD', level: service.levels.INFO},

      // Field Info
      FIELDDEF_HIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_HIGHLIGHTED', level: service.levels.INFO},
      FIELDDEF_UNHIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_UNHIGHLIGHTED', level: service.levels.INFO},

      // WILDCARD
      ADD_WILDCARD: {category: 'WILDCARD', id: 'ADD_WILDCARD', level: service.levels.INFO},
      ADD_WILDCARD_FIELD: {category: 'WILDCARD', id: 'ADD_WILDCARD_FIELD', level: service.levels.INFO},
      REMOVE_WILDCARD_FIELD: {category: 'WILDCARD', id: 'REMOVE_WILDCARD_FIELD', level: service.levels.INFO},
      REMOVE_WILDCARD: {category: 'WILDCARD', id: 'REMOVE_WILDCARD', level: service.levels.INFO},

      // POLESTAR
      SPEC_CLEAN: {category:'POLESTAR', id: 'SPEC_CLEAN', level: service.levels.INFO},
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.INFO},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.INFO},
      FIELD_REMOVED: {category: 'POLESTAR', id: 'FIELD_REMOVED', level: service.levels.INFO},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.INFO},

      // Filter
      FILTER_ENABLED: {category:'FILTER', id: 'FILTER_ENABLED', level: service.levels.INFO},
      FILTER_DISABLED: {category:'FILTER', id: 'FILTER_DISABLED', level: service.levels.INFO},
      FILTER_CHANGE: {category:'FILTER', id: 'FILTER_CHANGE', level: service.levels.INFO},
      FILTER_CLEAR: {category:'FILTER', id: 'FILTER_CLEAR', level: service.levels.INFO},

      // Voyager 2
      SPEC_SELECT: {category:'VOYAGER2', id: 'SPEC_SELECT', level: service.levels.INFO},
      QUERY_SELECT: {category:'VOYAGER2', id: 'QUERY_SELECT', level: service.levels.INFO},
      GROUP_BY_CHANGED: {category:'VOYAGER2', id: 'GROUP_BY_CHANGED', level: service.levels.INFO},
      AUTO_ADD_COUNT_CHANGED: {category:'VOYAGER2', id: 'AUTO_ADD_COUNT_CHANGED', level: service.levels.INFO},

      // Alternatives
      SET_ALTERNATIVES_TYPE: {category:'ALTERNATIVES', id: 'SET_ALTERNATIVES_TYPE', level: service.levels.INFO},
      TOGGLE_SHOW_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_SHOW_ALTERNATIVES', level: service.levels.INFO},
      TOGGLE_HIDE_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_HIDE_ALTERNATIVES', level: service.levels.INFO},

      // Preview
      SPEC_PREVIEW_ENABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_ENABLED', level: service.levels.INFO},
      SPEC_PREVIEW_DISABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_DISABLED', level: service.levels.INFO}
    };

    // create noop service if websql is not supported
    if ($window.openDatabase === undefined) {
      console.warn('No websql support and thus no logging.');
      service.logInteraction = function() {};
      return service;
    }

    // get user id once in the beginning
    var userid = service.userid = $location.search().userid;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'Logs_' + consts.appId;

    // (zening) TODO: check if the table is correct, do we really need time? will time be automatically added?
    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid': {
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time': {
          'type': 'TIMESTAMP',
          'null': 'NOT NULL'
        },
        'actionCategory': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'actionId': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'label': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }

        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '_' + userid + '_' + new Date().toISOString() + '.csv'
        })[0].click();
      });
    };


    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels[consts.logLevel || 'INFO'].rank) {
        Analytics.trackEvent(action.category, action.id, label, value);

        if (consts.logToWebSql) {
          var row = {
            userid: userid,
            time: new Date().toISOString(),
            actionCategory: action.category,
            actionId: action.id,
            label: _.isObject(label) ? JSON.stringify(label) : label,
            data: data ? JSON.stringify(data) : undefined
          };
          service.db.insert(service.tableName, row);
        }

        if (action.level.rank >= service.levels[consts.logPrintLevel || 'INFO'].rank) {
          console.log('[Logging] ', action.id, label, data);
        }
      }
    };

    service.createTableIfNotExists();
    console.log('app:', consts.appId, 'started');
    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Pills', ['ANY', 'consts', 'util', 'vl', 'cql', function (ANY, consts, util, vl, cql) {
    var Pills = {
      // Functions
      isAnyChannel: isAnyChannel,
      getNextAnyChannelId: getNextAnyChannelId,
      getEmptyAnyChannelId: getEmptyAnyChannelId,
      isEnumeratedChannel: isEnumeratedChannel,
      isEnumeratedField: isEnumeratedField,

      get: get,
      // Event
      dragDrop: dragDrop,
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener

      /** Set a fieldDef for a channel */
      set: set,

      reset: reset,

      /** Remove a fieldDef from a channel */
      remove: remove,

      countFieldDef: {field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE},

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      highlighted: {},
      /** pill being dragged */
      dragging: null,
      isDraggingWildcard: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    // Add listener type that Pills just pass arguments to its listener
    // FIXME: properly implement listener pattern
    [
      'add', 'parse', 'select', 'preview', 'update',
      'previewQuery', 'selectQuery',
      'rescale', 'sort', 'toggleFilterInvalid', 'transpose',
      'addWildcardField', 'addWildcard', 'removeWildcardField', 'removeWildcard'
    ].forEach(function(listenerType) {
      Pills[listenerType] = function() {
        if (Pills.listener && Pills.listener[listenerType]) {
          return Pills.listener[listenerType].apply(null, arguments);
        }
      };
    });

    /**
     * Returns whether the given channel id is an "any" channel
     *
     * @param {any} channelId
     */
    function isAnyChannel(channelId) {
      return channelId && channelId.indexOf(ANY) === 0; // prefix by ANY
    }

    function getEmptyAnyChannelId() {
      // FIXME this isn't always correct.
      // Currently I make it okay by adding ANY0 whenever we reset and it seems fine.
      var anyChannels = util.keys(Pills.pills).filter(function(channelId) {
        return channelId.indexOf(ANY) === 0;
      });
      for (var i=0 ; i < anyChannels.length; i++) {
        var channelId = anyChannels[i];
        if (!Pills.pills[channelId].field) {
          return channelId;
        }
      }
      return null;
    }

    function getNextAnyChannelId() {
      var i = 0;
      while (Pills.pills[ANY + i]) {
        i++;
      }

      if (!consts.maxAnyShelf || i >= consts.maxAnyShelf) {
        return null;
      }

      return ANY + i;
    }

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function isEnumeratedChannel(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedChannel) {
        return Pills.listener.isEnumeratedChannel(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function isEnumeratedField(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedField) {
        return Pills.listener.isEnumeratedField(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function reset() {
      // Clean Any Channel Shelf
      Object.keys(Pills.pills).forEach(function(channelId) {
        if (isAnyChannel(channelId)) {
          delete Pills.pills[channelId];
        }
      });

      // HACK this is a hack to get around incorrect logic in getEmptyAnyChannelId()
      Pills.pills[ANY+0] = {};

      if (Pills.listener && Pills.listener.reset) {
        Pills.listener.reset();
      }
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.isDraggingWildcard = cql.enumSpec.isEnumSpec(pill.field);
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', ['vg', 'vl', 'vlSchema', function(vg, vl, vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      // for detail, just get the flat version
      var ref = encodingChannelProp ?
        (encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref) :
        'FieldDef'; // just use the generic version for ANY channel
      def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuanMiLCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuanMiLCJjb21wb25lbnRzL2NoYW5uZWxwcm9wZXJ0eS9jaGFubmVscHJvcGVydHkuanMiLCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuanMiLCJjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb21wb25lbnRzL2ZpbHRlci9jYXRlZ29yaWNhbGZpbHRlci5qcyIsImNvbXBvbmVudHMvZmlsdGVyL2ZpbHRlcnNoZWx2ZXMuanMiLCJjb21wb25lbnRzL2ZpbHRlci9xdWFudGl0YXRpdmVmaWx0ZXIuanMiLCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0LmpzIiwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxzLnNlcnZpY2UuanMiLCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmpzIiwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuanMiLCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uanMiLCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5qcyIsImNvbXBvbmVudHMvdGFicy90YWIuanMiLCJjb21wb25lbnRzL3RhYnMvdGFic2V0LmpzIiwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90LmpzIiwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiLCJzZXJ2aWNlcy9hbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9ib29rbWFya3MvYm9va21hcmtzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jaGFydC9jaGFydC5zZXJ2aWNlLmpzIiwic2VydmljZXMvY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwic2VydmljZXMvZmlsdGVybWFuYWdlci9maWx0ZXJtYW5hZ2VyLmpzIiwic2VydmljZXMvbG9nZ2VyL2xvZ2dlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGlsbHMvcGlsbHMuc2VydmljZS5qcyIsInNlcnZpY2VzL3NjaGVtYS9zY2hlbWEuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJ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LFNBQVMsUUFBUTs7TUFFZixPQUFPLEtBQUssTUFBTSxPQUFPLFFBQVEsU0FBUyxXQUFXO1FBQ25ELElBQUksYUFBYSxZQUFZO1VBQzNCLE9BQU8sTUFBTSxNQUFNOzs7OztNQUt2QixNQUFNLE1BQU0sSUFBSSxLQUFLOztNQUVyQixJQUFJLE1BQU0sWUFBWSxNQUFNLFNBQVMsT0FBTztRQUMxQyxNQUFNLFNBQVM7Ozs7SUFJbkIsU0FBUyxPQUFPLFdBQVc7TUFDekIsT0FBTyxNQUFNLE1BQU07TUFDbkIsSUFBSSxNQUFNLFVBQVU7UUFDbEIsTUFBTSxTQUFTLE9BQU87Ozs7Ozs7O0lBUTFCLFNBQVMsVUFBVSxNQUFNLGFBQWE7TUFDcEMsTUFBTSxXQUFXO01BQ2pCLE1BQU0scUJBQXFCLElBQUksU0FBUyxXQUFXLEtBQUs7TUFDeEQsTUFBTSxjQUFjOzs7O0lBSXRCLFNBQVMsV0FBVztNQUNsQixNQUFNLFdBQVc7Ozs7Ozs7SUFPbkIsU0FBUyxTQUFTLFdBQVc7TUFDM0IsSUFBSSxNQUFNLFVBQVU7UUFDbEIsTUFBTSxTQUFTLFNBQVMsV0FBVyxNQUFNOzs7O0lBSTdDLE9BQU87O0FBRVg7OztBQ25MQTs7O0FBR0EsUUFBUSxPQUFPO0dBQ1osUUFBUSxtQ0FBVSxTQUFTLElBQUksSUFBSSxVQUFVO0lBQzVDLElBQUksU0FBUzs7SUFFYixPQUFPLFNBQVM7O0lBRWhCLE9BQU8sbUJBQW1CLFNBQVMsU0FBUztNQUMxQyxJQUFJLE1BQU07TUFDVixJQUFJLHNCQUFzQixPQUFPLE9BQU8sWUFBWSxTQUFTLFdBQVc7O01BRXhFLElBQUksTUFBTTtTQUNQLG9CQUFvQixRQUFRLG9CQUFvQixNQUFNLEdBQUc7UUFDMUQ7TUFDRixNQUFNLElBQUksTUFBTSxJQUFJLFlBQVksS0FBSztNQUNyQyxPQUFPLE9BQU8sT0FBTyxZQUFZOzs7SUFHbkMsT0FBTzs7QUFFWCIsImZpbGUiOiJ2bHVpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBKU09OMyB3aXRoIGNvbXBhY3Qgc3RyaW5naWZ5IC0tIE1vZGlmaWVkIGJ5IEthbml0IFdvbmdzdXBoYXNhd2F0LiAgIGh0dHBzOi8vZ2l0aHViLmNvbS9rYW5pdHcvanNvbjNcbiAqXG4gKiBGb3JrZWQgZnJvbSBKU09OIHYzLjMuMiB8IGh0dHBzOi8vYmVzdGllanMuZ2l0aHViLmlvL2pzb24zIHwgQ29weXJpZ2h0IDIwMTItMjAxNCwgS2l0IENhbWJyaWRnZSB8IGh0dHA6Ly9raXQubWl0LWxpY2Vuc2Uub3JnXG4gKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAodHJ1ZSkgeyAvLyB1c2VkIHRvIGJlICFoYXMoXCJqc29uXCIpXG4gICAgICAvLyBDb21tb24gYFtbQ2xhc3NdXWAgbmFtZSBhbGlhc2VzLlxuICAgICAgdmFyIGZ1bmN0aW9uQ2xhc3MgPSBcIltvYmplY3QgRnVuY3Rpb25dXCIsXG4gICAgICAgICAgZGF0ZUNsYXNzID0gXCJbb2JqZWN0IERhdGVdXCIsXG4gICAgICAgICAgbnVtYmVyQ2xhc3MgPSBcIltvYmplY3QgTnVtYmVyXVwiLFxuICAgICAgICAgIHN0cmluZ0NsYXNzID0gXCJbb2JqZWN0IFN0cmluZ11cIixcbiAgICAgICAgICBhcnJheUNsYXNzID0gXCJbb2JqZWN0IEFycmF5XVwiLFxuICAgICAgICAgIGJvb2xlYW5DbGFzcyA9IFwiW29iamVjdCBCb29sZWFuXVwiO1xuXG4gICAgICAvLyBEZXRlY3QgaW5jb21wbGV0ZSBzdXBwb3J0IGZvciBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgYnkgaW5kZXguXG4gICAgICB2YXIgY2hhckluZGV4QnVnZ3kgPSBoYXMoXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIik7XG5cbiAgICAgIC8vIERlZmluZSBhZGRpdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyBpZiB0aGUgYERhdGVgIG1ldGhvZHMgYXJlIGJ1Z2d5LlxuICAgICAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgICAgIC8vIEEgbWFwcGluZyBiZXR3ZWVuIHRoZSBtb250aHMgb2YgdGhlIHllYXIgYW5kIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuXG4gICAgICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgICAgIHZhciBNb250aHMgPSBbMCwgMzEsIDU5LCA5MCwgMTIwLCAxNTEsIDE4MSwgMjEyLCAyNDMsIDI3MywgMzA0LCAzMzRdO1xuICAgICAgICAvLyBJbnRlcm5hbDogQ2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlbiB0aGUgVW5peCBlcG9jaCBhbmQgdGhlXG4gICAgICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgICAgIHZhciBnZXREYXkgPSBmdW5jdGlvbiAoeWVhciwgbW9udGgpIHtcbiAgICAgICAgICByZXR1cm4gTW9udGhzW21vbnRoXSArIDM2NSAqICh5ZWFyIC0gMTk3MCkgKyBmbG9vcigoeWVhciAtIDE5NjkgKyAobW9udGggPSArKG1vbnRoID4gMSkpKSAvIDQpIC0gZmxvb3IoKHllYXIgLSAxOTAxICsgbW9udGgpIC8gMTAwKSArIGZsb29yKCh5ZWFyIC0gMTYwMSArIG1vbnRoKSAvIDQwMCk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIGlmIGEgcHJvcGVydHkgaXMgYSBkaXJlY3QgcHJvcGVydHkgb2YgdGhlIGdpdmVuXG4gICAgICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgICAgIGlmICghKGlzUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eSkpIHtcbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgICAgIGlmICgobWVtYmVycy5fX3Byb3RvX18gPSBudWxsLCBtZW1iZXJzLl9fcHJvdG9fXyA9IHtcbiAgICAgICAgICAgIC8vIFRoZSAqcHJvdG8qIHByb3BlcnR5IGNhbm5vdCBiZSBzZXQgbXVsdGlwbGUgdGltZXMgaW4gcmVjZW50XG4gICAgICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgICAgICBcInRvU3RyaW5nXCI6IDFcbiAgICAgICAgICB9LCBtZW1iZXJzKS50b1N0cmluZyAhPSBnZXRDbGFzcykge1xuICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgICAgIC8vIHN1cHBvcnRzIHRoZSBtdXRhYmxlICpwcm90byogcHJvcGVydHkuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgICAgIC8vIG9mIHRoZSBFUyA1LjEgc3BlYykuIFRoZSBwYXJlbnRoZXNpemVkIGV4cHJlc3Npb24gcHJldmVudHMgYW5cbiAgICAgICAgICAgICAgLy8gdW5zYWZlIHRyYW5zZm9ybWF0aW9uIGJ5IHRoZSBDbG9zdXJlIENvbXBpbGVyLlxuICAgICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIG9yaWdpbmFsIHByb3RvdHlwZSBjaGFpbi5cbiAgICAgICAgICAgICAgdGhpcy5fX3Byb3RvX18gPSBvcmlnaW5hbDtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICAgIGNvbnN0cnVjdG9yID0gbWVtYmVycy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSB0byBzaW11bGF0ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpblxuICAgICAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gKHRoaXMuY29uc3RydWN0b3IgfHwgY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGlzUHJvcGVydHkuY2FsbCh0aGlzLCBwcm9wZXJ0eSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIEludGVybmFsOiBOb3JtYWxpemVzIHRoZSBgZm9yLi4uaW5gIGl0ZXJhdGlvbiBhbGdvcml0aG0gYWNyb3NzXG4gICAgICAvLyBlbnZpcm9ubWVudHMuIEVhY2ggZW51bWVyYXRlZCBrZXkgaXMgeWllbGRlZCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHNpemUgPSAwLCBQcm9wZXJ0aWVzLCBtZW1iZXJzLCBwcm9wZXJ0eTtcblxuICAgICAgICAvLyBUZXN0cyBmb3IgYnVncyBpbiB0aGUgY3VycmVudCBlbnZpcm9ubWVudCdzIGBmb3IuLi5pbmAgYWxnb3JpdGhtLiBUaGVcbiAgICAgICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIGluIG9sZGVyIHZlcnNpb25zIG9mIElFLCBOZXRzY2FwZSwgYW5kIE1vemlsbGEuXG4gICAgICAgIChQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgICAgIH0pLnByb3RvdHlwZS52YWx1ZU9mID0gMDtcblxuICAgICAgICAvLyBJdGVyYXRlIG92ZXIgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIGBQcm9wZXJ0aWVzYCBjbGFzcy5cbiAgICAgICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gbWVtYmVycykge1xuICAgICAgICAgIC8vIElnbm9yZSBhbGwgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgUHJvcGVydGllcyA9IG1lbWJlcnMgPSBudWxsO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgaXRlcmF0aW9uIGFsZ29yaXRobS5cbiAgICAgICAgaWYgKCFzaXplKSB7XG4gICAgICAgICAgLy8gQSBsaXN0IG9mIG5vbi1lbnVtZXJhYmxlIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIG1lbWJlcnMgPSBbXCJ2YWx1ZU9mXCIsIFwidG9TdHJpbmdcIiwgXCJ0b0xvY2FsZVN0cmluZ1wiLCBcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsIFwiaXNQcm90b3R5cGVPZlwiLCBcImhhc093blByb3BlcnR5XCIsIFwiY29uc3RydWN0b3JcIl07XG4gICAgICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAgICAgLy8gcHJvcGVydGllcy5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBsZW5ndGg7XG4gICAgICAgICAgICB2YXIgaGFzUHJvcGVydHkgPSAhaXNGdW5jdGlvbiAmJiB0eXBlb2Ygb2JqZWN0LmNvbnN0cnVjdG9yICE9IFwiZnVuY3Rpb25cIiAmJiBvYmplY3RUeXBlc1t0eXBlb2Ygb2JqZWN0Lmhhc093blByb3BlcnR5XSAmJiBvYmplY3QuaGFzT3duUHJvcGVydHkgfHwgaXNQcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIEdlY2tvIDw9IDEuMCBlbnVtZXJhdGVzIHRoZSBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgdW5kZXJcbiAgICAgICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBtZW1iZXJzLmxlbmd0aDsgcHJvcGVydHkgPSBtZW1iZXJzWy0tbGVuZ3RoXTsgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiBjYWxsYmFjayhwcm9wZXJ0eSkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoc2l6ZSA9PSAyKSB7XG4gICAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC40IGVudW1lcmF0ZXMgc2hhZG93ZWQgcHJvcGVydGllcyB0d2ljZS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNldCBvZiBpdGVyYXRlZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eTtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIFN0b3JlIGVhY2ggcHJvcGVydHkgbmFtZSB0byBwcmV2ZW50IGRvdWJsZSBlbnVtZXJhdGlvbi4gVGhlXG4gICAgICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgICAgIC8vIGVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiAhaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSAmJiAobWVtYmVyc1twcm9wZXJ0eV0gPSAxKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIGJ1Z3MgZGV0ZWN0ZWQ7IHVzZSB0aGUgc3RhbmRhcmQgYGZvci4uLmluYCBhbGdvcml0aG0uXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgaXNDb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmICEoaXNDb25zdHJ1Y3RvciA9IHByb3BlcnR5ID09PSBcImNvbnN0cnVjdG9yXCIpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciB0aGUgYGNvbnN0cnVjdG9yYCBwcm9wZXJ0eSBkdWUgdG9cbiAgICAgICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgICAgIGlmIChpc0NvbnN0cnVjdG9yIHx8IGlzUHJvcGVydHkuY2FsbChvYmplY3QsIChwcm9wZXJ0eSA9IFwiY29uc3RydWN0b3JcIikpKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICAgICAgfTtcblxuICAgICAgLy8gUHVibGljOiBTZXJpYWxpemVzIGEgSmF2YVNjcmlwdCBgdmFsdWVgIGFzIGEgSlNPTiBzdHJpbmcuIFRoZSBvcHRpb25hbFxuICAgICAgLy8gYGZpbHRlcmAgYXJndW1lbnQgbWF5IHNwZWNpZnkgZWl0aGVyIGEgZnVuY3Rpb24gdGhhdCBhbHRlcnMgaG93IG9iamVjdCBhbmRcbiAgICAgIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAgICAgLy8gaW5kaWNhdGVzIHdoaWNoIHByb3BlcnRpZXMgc2hvdWxkIGJlIHNlcmlhbGl6ZWQuIFRoZSBvcHRpb25hbCBgd2lkdGhgXG4gICAgICAvLyBhcmd1bWVudCBtYXkgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIG51bWJlciB0aGF0IHNwZWNpZmllcyB0aGUgaW5kZW50YXRpb25cbiAgICAgIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgRXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXFxcXFwiJyxcbiAgICAgICAgICA4OiBcIlxcXFxiXCIsXG4gICAgICAgICAgMTI6IFwiXFxcXGZcIixcbiAgICAgICAgICAxMDogXCJcXFxcblwiLFxuICAgICAgICAgIDEzOiBcIlxcXFxyXCIsXG4gICAgICAgICAgOTogXCJcXFxcdFwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gICAgICAgIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gICAgICAgIHZhciBsZWFkaW5nWmVyb2VzID0gXCIwMDAwMDBcIjtcbiAgICAgICAgdmFyIHRvUGFkZGVkU3RyaW5nID0gZnVuY3Rpb24gKHdpZHRoLCB2YWx1ZSkge1xuICAgICAgICAgIC8vIFRoZSBgfHwgMGAgZXhwcmVzc2lvbiBpcyBuZWNlc3NhcnkgdG8gd29yayBhcm91bmQgYSBidWcgaW5cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgd2hlcmUgYDAgPT0gLTBgLCBidXQgYFN0cmluZygtMCkgIT09IFwiMFwiYC5cbiAgICAgICAgICByZXR1cm4gKGxlYWRpbmdaZXJvZXMgKyAodmFsdWUgfHwgMCkpLnNsaWNlKC13aWR0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IERvdWJsZS1xdW90ZXMgYSBzdHJpbmcgYHZhbHVlYCwgcmVwbGFjaW5nIGFsbCBBU0NJSSBjb250cm9sXG4gICAgICAgIC8vIGNoYXJhY3RlcnMgKGNoYXJhY3RlcnMgd2l0aCBjb2RlIHVuaXQgdmFsdWVzIGJldHdlZW4gMCBhbmQgMzEpIHdpdGhcbiAgICAgICAgLy8gdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFF1b3RlKHZhbHVlKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cbiAgICAgICAgdmFyIHVuaWNvZGVQcmVmaXggPSBcIlxcXFx1MDBcIjtcbiAgICAgICAgdmFyIHF1b3RlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCA9ICdcIicsIGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoLCB1c2VDaGFySW5kZXggPSAhY2hhckluZGV4QnVnZ3kgfHwgbGVuZ3RoID4gMTA7XG4gICAgICAgICAgdmFyIHN5bWJvbHMgPSB1c2VDaGFySW5kZXggJiYgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuc3BsaXQoXCJcIikgOiB2YWx1ZSk7XG4gICAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICB2YXIgY2hhckNvZGUgPSB2YWx1ZS5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICAgICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXIgaXMgYSBjb250cm9sIGNoYXJhY3RlciwgYXBwZW5kIGl0cyBVbmljb2RlIG9yXG4gICAgICAgICAgICAvLyBzaG9ydGhhbmQgZXNjYXBlIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDg6IGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMjogY2FzZSAxMzogY2FzZSAzNDogY2FzZSA5MjpcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gRXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1bmljb2RlUHJlZml4ICsgdG9QYWRkZWRTdHJpbmcoMiwgY2hhckNvZGUudG9TdHJpbmcoMTYpKTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gdXNlQ2hhckluZGV4ID8gc3ltYm9sc1tpbmRleF0gOiB2YWx1ZS5jaGFyQXQoaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgc2VyaWFsaXplcyBhbiBvYmplY3QuIEltcGxlbWVudHMgdGhlXG4gICAgICAgIC8vIGBTdHIoa2V5LCBob2xkZXIpYCwgYEpPKHZhbHVlKWAsIGFuZCBgSkEodmFsdWUpYCBvcGVyYXRpb25zLlxuICAgICAgICB2YXIgc2VyaWFsaXplID0gZnVuY3Rpb24gKHByb3BlcnR5LCBvYmplY3QsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2ssIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgdmFsdWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgcmVzdWx0O1xuXG4gICAgICAgICAgbWF4TGluZUxlbmd0aCA9IG1heExpbmVMZW5ndGggfHwgMDtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOZWNlc3NhcnkgZm9yIGhvc3Qgb2JqZWN0IHN1cHBvcnQuXG4gICAgICAgICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGRhdGVDbGFzcyAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGVzIGFyZSBzZXJpYWxpemVkIGFjY29yZGluZyB0byB0aGUgYERhdGUjdG9KU09OYCBtZXRob2RcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuOS41LjQ0LiBTZWUgc2VjdGlvbiAxNS45LjEuMTVcbiAgICAgICAgICAgICAgICAvLyBmb3IgdGhlIElTTyA4NjAxIGRhdGUgdGltZSBzdHJpbmcgZm9ybWF0LlxuICAgICAgICAgICAgICAgIGlmIChnZXREYXkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbXB1dGUgdGhlIHllYXIsIG1vbnRoLCBkYXRlLCBob3VycywgbWludXRlcyxcbiAgICAgICAgICAgICAgICAgIC8vIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgaWYgdGhlIGBnZXRVVEMqYCBtZXRob2RzIGFyZVxuICAgICAgICAgICAgICAgICAgLy8gYnVnZ3kuIEFkYXB0ZWQgZnJvbSBAWWFmZmxlJ3MgYGRhdGUtc2hpbWAgcHJvamVjdC5cbiAgICAgICAgICAgICAgICAgIGRhdGUgPSBmbG9vcih2YWx1ZSAvIDg2NGU1KTtcbiAgICAgICAgICAgICAgICAgIGZvciAoeWVhciA9IGZsb29yKGRhdGUgLyAzNjUuMjQyNSkgKyAxOTcwIC0gMTsgZ2V0RGF5KHllYXIgKyAxLCAwKSA8PSBkYXRlOyB5ZWFyKyspO1xuICAgICAgICAgICAgICAgICAgZm9yIChtb250aCA9IGZsb29yKChkYXRlIC0gZ2V0RGF5KHllYXIsIDApKSAvIDMwLjQyKTsgZ2V0RGF5KHllYXIsIG1vbnRoICsgMSkgPD0gZGF0ZTsgbW9udGgrKyk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gMSArIGRhdGUgLSBnZXREYXkoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGB0aW1lYCB2YWx1ZSBzcGVjaWZpZXMgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkgKHNlZSBFU1xuICAgICAgICAgICAgICAgICAgLy8gNS4xIHNlY3Rpb24gMTUuOS4xLjIpLiBUaGUgZm9ybXVsYSBgKEEgJSBCICsgQikgJSBCYCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAvLyB0byBjb21wdXRlIGBBIG1vZHVsbyBCYCwgYXMgdGhlIGAlYCBvcGVyYXRvciBkb2VzIG5vdFxuICAgICAgICAgICAgICAgICAgLy8gY29ycmVzcG9uZCB0byB0aGUgYG1vZHVsb2Agb3BlcmF0aW9uIGZvciBuZWdhdGl2ZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgICAgdGltZSA9ICh2YWx1ZSAlIDg2NGU1ICsgODY0ZTUpICUgODY0ZTU7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIGFuZCBtaWxsaXNlY29uZHMgYXJlIG9idGFpbmVkIGJ5XG4gICAgICAgICAgICAgICAgICAvLyBkZWNvbXBvc2luZyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheS4gU2VlIHNlY3Rpb24gMTUuOS4xLjEwLlxuICAgICAgICAgICAgICAgICAgaG91cnMgPSBmbG9vcih0aW1lIC8gMzZlNSkgJSAyNDtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSBmbG9vcih0aW1lIC8gNmU0KSAlIDYwO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IGZsb29yKHRpbWUgLyAxZTMpICUgNjA7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB0aW1lICUgMWUzO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB5ZWFyID0gdmFsdWUuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICAgICAgICAgIG1vbnRoID0gdmFsdWUuZ2V0VVRDTW9udGgoKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSB2YWx1ZS5nZXRVVENEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBob3VycyA9IHZhbHVlLmdldFVUQ0hvdXJzKCk7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gdmFsdWUuZ2V0VVRDTWludXRlcygpO1xuICAgICAgICAgICAgICAgICAgc2Vjb25kcyA9IHZhbHVlLmdldFVUQ1NlY29uZHMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHZhbHVlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBTZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMgY29ycmVjdGx5LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gKHllYXIgPD0gMCB8fCB5ZWFyID49IDFlNCA/ICh5ZWFyIDwgMCA/IFwiLVwiIDogXCIrXCIpICsgdG9QYWRkZWRTdHJpbmcoNiwgeWVhciA8IDAgPyAteWVhciA6IHllYXIpIDogdG9QYWRkZWRTdHJpbmcoNCwgeWVhcikpICtcbiAgICAgICAgICAgICAgICAgIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbW9udGggKyAxKSArIFwiLVwiICsgdG9QYWRkZWRTdHJpbmcoMiwgZGF0ZSkgK1xuICAgICAgICAgICAgICAgICAgLy8gTW9udGhzLCBkYXRlcywgaG91cnMsIG1pbnV0ZXMsIGFuZCBzZWNvbmRzIHNob3VsZCBoYXZlIHR3b1xuICAgICAgICAgICAgICAgICAgLy8gZGlnaXRzOyBtaWxsaXNlY29uZHMgc2hvdWxkIGhhdmUgdGhyZWUuXG4gICAgICAgICAgICAgICAgICBcIlRcIiArIHRvUGFkZGVkU3RyaW5nKDIsIGhvdXJzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgbWludXRlcykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHNlY29uZHMpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNS4wLCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgICAgXCIuXCIgKyB0b1BhZGRlZFN0cmluZygzLCBtaWxsaXNlY29uZHMpICsgXCJaXCI7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZS50b0pTT04gPT0gXCJmdW5jdGlvblwiICYmICgoY2xhc3NOYW1lICE9IG51bWJlckNsYXNzICYmIGNsYXNzTmFtZSAhPSBzdHJpbmdDbGFzcyAmJiBjbGFzc05hbWUgIT0gYXJyYXlDbGFzcykgfHwgaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkpIHtcbiAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIGFkZHMgbm9uLXN0YW5kYXJkIGB0b0pTT05gIG1ldGhvZHMgdG8gdGhlXG4gICAgICAgICAgICAgIC8vIGBOdW1iZXJgLCBgU3RyaW5nYCwgYERhdGVgLCBhbmQgYEFycmF5YCBwcm90b3R5cGVzLiBKU09OIDNcbiAgICAgICAgICAgICAgLy8gaWdub3JlcyBhbGwgYHRvSlNPTmAgbWV0aG9kcyBvbiB0aGVzZSBvYmplY3RzIHVubGVzcyB0aGV5IGFyZVxuICAgICAgICAgICAgICAvLyBkZWZpbmVkIGRpcmVjdGx5IG9uIGFuIGluc3RhbmNlLlxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnRvSlNPTihwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gSWYgYSByZXBsYWNlbWVudCBmdW5jdGlvbiB3YXMgcHJvdmlkZWQsIGNhbGwgaXQgdG8gb2J0YWluIHRoZSB2YWx1ZVxuICAgICAgICAgICAgLy8gZm9yIHNlcmlhbGl6YXRpb24uXG4gICAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrLmNhbGwob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBib29sZWFuQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW5zIGFyZSByZXByZXNlbnRlZCBsaXRlcmFsbHkuXG4gICAgICAgICAgICByZXR1cm4gXCJcIiArIHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAvLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIGBJbmZpbml0eWAgYW5kIGBOYU5gIGFyZSBzZXJpYWxpemVkIGFzXG4gICAgICAgICAgICAvLyBgXCJudWxsXCJgLlxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDAgPyBcIlwiICsgdmFsdWUgOiBcIm51bGxcIjtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgICAgICAgIHJldHVybiBxdW90ZShcIlwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGlzIGlzIGEgbGluZWFyIHNlYXJjaDsgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIC8vIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZiB1bmlxdWUgbmVzdGVkIG9iamVjdHMuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHN0YWNrLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgIGlmIChzdGFja1tsZW5ndGhdID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIEN5Y2xpYyBzdHJ1Y3R1cmVzIGNhbm5vdCBiZSBzZXJpYWxpemVkIGJ5IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0aGUgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIHN0YWNrLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbCBhbmQgaW5kZW50IG9uZSBhZGRpdGlvbmFsIGxldmVsLlxuICAgICAgICAgICAgcHJlZml4ID0gaW5kZW50YXRpb247XG4gICAgICAgICAgICBpbmRlbnRhdGlvbiArPSB3aGl0ZXNwYWNlO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgcmVzdWx0O1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudDtcbiAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4ID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIltcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwiXVwiIDpcbiAgICAgICAgICAgICAgICAgIFwiW1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwiXVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJbXVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCBpbmRleD0wO1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgb2JqZWN0IG1lbWJlcnMuIE1lbWJlcnMgYXJlIHNlbGVjdGVkIGZyb21cbiAgICAgICAgICAgICAgLy8gZWl0aGVyIGEgdXNlci1zcGVjaWZpZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcywgb3IgdGhlIG9iamVjdFxuICAgICAgICAgICAgICAvLyBpdHNlbGYuXG4gICAgICAgICAgICAgIGZvckVhY2gocHJvcGVydGllcyB8fCB2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCwgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFjY29yZGluZyB0byBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zOiBcIklmIGBnYXBgIHt3aGl0ZXNwYWNlfVxuICAgICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBlbXB0eSBzdHJpbmcsIGxldCBgbWVtYmVyYCB7cXVvdGUocHJvcGVydHkpICsgXCI6XCJ9XG4gICAgICAgICAgICAgICAgICAvLyBiZSB0aGUgY29uY2F0ZW5hdGlvbiBvZiBgbWVtYmVyYCBhbmQgdGhlIGBzcGFjZWAgY2hhcmFjdGVyLlwiXG4gICAgICAgICAgICAgICAgICAvLyBUaGUgXCJgc3BhY2VgIGNoYXJhY3RlclwiIHJlZmVycyB0byB0aGUgbGl0ZXJhbCBzcGFjZVxuICAgICAgICAgICAgICAgICAgLy8gY2hhcmFjdGVyLCBub3QgdGhlIGBzcGFjZWAge3dpZHRofSBhcmd1bWVudCBwcm92aWRlZCB0b1xuICAgICAgICAgICAgICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXgrKyA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHRzLmxlbmd0aCA/XG4gICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgd2hpdGVzcGFjZSAmJiAodG90YWxMZW5ndGggPiBtYXhMaW5lTGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgICBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDpcbiAgICAgICAgICAgICAgICAgIFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIDogXCJ7fVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBvYmplY3QgZnJvbSB0aGUgdHJhdmVyc2VkIG9iamVjdCBzdGFjay5cbiAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5zdHJpbmdpZnlgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMy5cblxuICAgICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgsIG1heExpbmVMZW5ndGgpIHtcbiAgICAgICAgICB2YXIgd2hpdGVzcGFjZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIGNsYXNzTmFtZTtcbiAgICAgICAgICBpZiAob2JqZWN0VHlwZXNbdHlwZW9mIGZpbHRlcl0gJiYgZmlsdGVyKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwoZmlsdGVyKSkgPT0gZnVuY3Rpb25DbGFzcykge1xuICAgICAgICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgcHJvcGVydHkgbmFtZXMgYXJyYXkgaW50byBhIG1ha2VzaGlmdCBzZXQuXG4gICAgICAgICAgICAgIHByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBmaWx0ZXIubGVuZ3RoLCB2YWx1ZTsgaW5kZXggPCBsZW5ndGg7IHZhbHVlID0gZmlsdGVyW2luZGV4KytdLCAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpKSwgY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzIHx8IGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykgJiYgKHByb3BlcnRpZXNbdmFsdWVdID0gMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAod2lkdGgpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh3aWR0aCkpID09IG51bWJlckNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgICAgd2hpdGVzcGFjZSA9IHdpZHRoLmxlbmd0aCA8PSAxMCA/IHdpZHRoIDogd2lkdGguc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPcGVyYSA8PSA3LjU0dTIgZGlzY2FyZHMgdGhlIHZhbHVlcyBhc3NvY2lhdGVkIHdpdGggZW1wdHkgc3RyaW5nIGtleXNcbiAgICAgICAgICAvLyAoYFwiXCJgKSBvbmx5IGlmIHRoZXkgYXJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGFuIG9iamVjdCBtZW1iZXIgbGlzdFxuICAgICAgICAgIC8vIChlLmcuLCBgIShcIlwiIGluIHsgXCJcIjogMX0pYCkuXG4gICAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZShcIlwiLCAodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSBzb3VyY2UsIHZhbHVlKSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIFwiXCIsIFtdLCBtYXhMaW5lTGVuZ3RoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBleHBvcnRzLmNvbXBhY3RTdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKXtcbiAgICAgICAgICByZXR1cm4gZXhwb3J0cy5zdHJpbmdpZnkoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCA2MCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUHVibGljOiBQYXJzZXMgYSBKU09OIHNvdXJjZSBzdHJpbmcuXG4gICAgICBpZiAoIWhhcyhcImpzb24tcGFyc2VcIikpIHtcbiAgICAgICAgdmFyIGZyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzIGFuZCB0aGVpciB1bmVzY2FwZWRcbiAgICAgICAgLy8gZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBVbmVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFwiLFxuICAgICAgICAgIDM0OiAnXCInLFxuICAgICAgICAgIDQ3OiBcIi9cIixcbiAgICAgICAgICA5ODogXCJcXGJcIixcbiAgICAgICAgICAxMTY6IFwiXFx0XCIsXG4gICAgICAgICAgMTEwOiBcIlxcblwiLFxuICAgICAgICAgIDEwMjogXCJcXGZcIixcbiAgICAgICAgICAxMTQ6IFwiXFxyXCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgIHZhciBJbmRleCwgU291cmNlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXNldHMgdGhlIHBhcnNlciBzdGF0ZSBhbmQgdGhyb3dzIGEgYFN5bnRheEVycm9yYC5cbiAgICAgICAgdmFyIGFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgICAgICAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gICAgICAgIC8vIGxpdGVyYWwsIG9yIEJvb2xlYW4gbGl0ZXJhbC5cbiAgICAgICAgdmFyIGxleCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgc291cmNlID0gU291cmNlLCBsZW5ndGggPSBzb3VyY2UubGVuZ3RoLCB2YWx1ZSwgYmVnaW4sIHBvc2l0aW9uLCBpc1NpZ25lZCwgY2hhckNvZGU7XG4gICAgICAgICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEzOiBjYXNlIDMyOlxuICAgICAgICAgICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgICAgICAgICAgLy8gZmVlZHMsIGFuZCBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIGNhc2UgMTIzOiBjYXNlIDEyNTogY2FzZSA5MTogY2FzZSA5MzogY2FzZSA1ODogY2FzZSA0NDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gKGB7YCwgYH1gLCBgW2AsIGBdYCwgYDpgLCBvciBgLGApIGF0XG4gICAgICAgICAgICAgICAgLy8gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBjaGFySW5kZXhCdWdneSA/IHNvdXJjZS5jaGFyQXQoSW5kZXgpIDogc291cmNlW0luZGV4XTtcbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgY2FzZSAzNDpcbiAgICAgICAgICAgICAgICAvLyBgXCJgIGRlbGltaXRzIGEgSlNPTiBzdHJpbmc7IGFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZFxuICAgICAgICAgICAgICAgIC8vIGJlZ2luIHBhcnNpbmcgdGhlIHN0cmluZy4gU3RyaW5nIHRva2VucyBhcmUgcHJlZml4ZWQgd2l0aCB0aGVcbiAgICAgICAgICAgICAgICAvLyBzZW50aW5lbCBgQGAgY2hhcmFjdGVyIHRvIGRpc3Rpbmd1aXNoIHRoZW0gZnJvbSBwdW5jdHVhdG9ycyBhbmRcbiAgICAgICAgICAgICAgICAvLyBlbmQtb2Ytc3RyaW5nIHRva2Vucy5cbiAgICAgICAgICAgICAgICBmb3IgKHZhbHVlID0gXCJAXCIsIEluZGV4Kys7IEluZGV4IDwgbGVuZ3RoOykge1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmVzY2FwZWQgQVNDSUkgY29udHJvbCBjaGFyYWN0ZXJzICh0aG9zZSB3aXRoIGEgY29kZSB1bml0XG4gICAgICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiB0aGUgc3BhY2UgY2hhcmFjdGVyKSBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhckNvZGUgPT0gOTIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSByZXZlcnNlIHNvbGlkdXMgKGBcXGApIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYW4gZXNjYXBlZFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250cm9sIGNoYXJhY3RlciAoaW5jbHVkaW5nIGBcImAsIGBcXGAsIGFuZCBgL2ApIG9yIFVuaWNvZGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSA5MjogY2FzZSAzNDogY2FzZSA0NzogY2FzZSA5ODogY2FzZSAxMTY6IGNhc2UgMTEwOiBjYXNlIDEwMjogY2FzZSAxMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBVbmVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTE3OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYFxcdWAgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgZmlyc3QgY2hhcmFjdGVyIGFuZCB2YWxpZGF0ZSB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgY29kZSBwb2ludC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZ2luID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgdmFsaWQgc2VxdWVuY2UgY29tcHJpc2VzIGZvdXIgaGV4ZGlnaXRzIChjYXNlLVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpbnNlbnNpdGl2ZSkgdGhhdCBmb3JtIGEgc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NyB8fCBjaGFyQ29kZSA+PSA5NyAmJiBjaGFyQ29kZSA8PSAxMDIgfHwgY2hhckNvZGUgPj0gNjUgJiYgY2hhckNvZGUgPD0gNzApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXZpdmUgdGhlIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZXNjYXBlZCBkb3VibGUtcXVvdGUgY2hhcmFjdGVyIG1hcmtzIHRoZSBlbmQgb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgLy8gc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGNvbW1vbiBjYXNlIHdoZXJlIGEgc3RyaW5nIGlzIHZhbGlkLlxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hhckNvZGUgPj0gMzIgJiYgY2hhckNvZGUgIT0gOTIgJiYgY2hhckNvZGUgIT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCB0aGUgc3RyaW5nIGFzLWlzLlxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSAzNCkge1xuICAgICAgICAgICAgICAgICAgLy8gQWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kIHJldHVybiB0aGUgcmV2aXZlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnRlcm1pbmF0ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgbnVtYmVycyBhbmQgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHBhc3QgdGhlIG5lZ2F0aXZlIHNpZ24sIGlmIG9uZSBpcyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBhbiBpbnRlZ2VyIG9yIGZsb2F0aW5nLXBvaW50IHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nykge1xuICAgICAgICAgICAgICAgICAgLy8gTGVhZGluZyB6ZXJvZXMgYXJlIGludGVycHJldGVkIGFzIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQ4ICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCArIDEpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgb2N0YWwgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgaW50ZWdlciBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICBmb3IgKDsgSW5kZXggPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgSW5kZXgrKyk7XG4gICAgICAgICAgICAgICAgICAvLyBGbG9hdHMgY2Fubm90IGNvbnRhaW4gYSBsZWFkaW5nIGRlY2ltYWwgcG9pbnQ7IGhvd2V2ZXIsIHRoaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDQ2KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGRlY2ltYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBQYXJzZSBleHBvbmVudHMuIFRoZSBgZWAgZGVub3RpbmcgdGhlIGV4cG9uZW50IGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlLlxuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMTAxIHx8IGNoYXJDb2RlID09IDY5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNraXAgcGFzdCB0aGUgc2lnbiBmb2xsb3dpbmcgdGhlIGV4cG9uZW50LCBpZiBvbmUgaXNcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDMgfHwgY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBleHBvbmVudGlhbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KHBvc2l0aW9uKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KTsgcG9zaXRpb24rKyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIElsbGVnYWwgZW1wdHkgZXhwb25lbnQuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICAgICAgICAgIHJldHVybiArc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgaWYgKGlzU2lnbmVkKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGFuZCBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcInRydWVcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDUpID09IFwiZmFsc2VcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVbnJlY29nbml6ZWQgdG9rZW4uXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmV0dXJuIHRoZSBzZW50aW5lbCBgJGAgY2hhcmFjdGVyIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIC8vIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLlxuICAgICAgICAgIHJldHVybiBcIiRcIjtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUGFyc2VzIGEgSlNPTiBgdmFsdWVgIHRva2VuLlxuICAgICAgICB2YXIgZ2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdHMsIGhhc01lbWJlcnM7XG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiJFwiKSB7XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgaWYgKChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSA9PSBcIkBcIikge1xuICAgICAgICAgICAgICAvLyBSZW1vdmUgdGhlIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFBhcnNlIG9iamVjdCBhbmQgYXJyYXkgbGl0ZXJhbHMuXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJbXCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBzcXVhcmUgYnJhY2tldCBtYXJrcyB0aGUgZW5kIG9mIHRoZSBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBhcnJheSBsaXRlcmFsIGNvbnRhaW5zIGVsZW1lbnRzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRpbmcgdGhlIHByZXZpb3VzIGVsZW1lbnQgZnJvbSB0aGVcbiAgICAgICAgICAgICAgICAvLyBuZXh0LlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggYXJyYXkgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRWxpc2lvbnMgYW5kIGxlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGdldCh2YWx1ZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PSBcIntcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIG9iamVjdCwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgb2JqZWN0LlxuICAgICAgICAgICAgICByZXN1bHRzID0ge307XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgICAgICAgIGlmIChoYXNNZW1iZXJzKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0cmFpbGluZyBgLGAgaW4gb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIG9iamVjdCBtZW1iZXIuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgY29tbWFzIGFyZSBub3QgcGVybWl0dGVkLCBvYmplY3QgcHJvcGVydHkgbmFtZXMgbXVzdCBiZVxuICAgICAgICAgICAgICAgIC8vIGRvdWJsZS1xdW90ZWQgc3RyaW5ncywgYW5kIGEgYDpgIG11c3Qgc2VwYXJhdGUgZWFjaCBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIC8vIG5hbWUgYW5kIHZhbHVlLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIiB8fCB0eXBlb2YgdmFsdWUgIT0gXCJzdHJpbmdcIiB8fCAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgIT0gXCJAXCIgfHwgbGV4KCkgIT0gXCI6XCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNbdmFsdWUuc2xpY2UoMSldID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgICAgICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBlbGVtZW50ID0gd2Fsayhzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmKSB7XG4gICAgICAgICAgICBkZWxldGUgc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XSA9IGVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSB0cmF2ZXJzZXMgYSBwYXJzZWQgSlNPTiBvYmplY3QsIGludm9raW5nIHRoZVxuICAgICAgICAvLyBgY2FsbGJhY2tgIGZ1bmN0aW9uIGZvciBlYWNoIHZhbHVlLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgV2Fsayhob2xkZXIsIG5hbWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICB2YXIgd2FsayA9IGZ1bmN0aW9uIChzb3VyY2UsIHByb3BlcnR5LCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IHNvdXJjZVtwcm9wZXJ0eV0sIGxlbmd0aDtcbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGBmb3JFYWNoYCBjYW4ndCBiZSB1c2VkIHRvIHRyYXZlcnNlIGFuIGFycmF5IGluIE9wZXJhIDw9IDguNTRcbiAgICAgICAgICAgIC8vIGJlY2F1c2UgaXRzIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGltcGxlbWVudGF0aW9uIHJldHVybnMgYGZhbHNlYFxuICAgICAgICAgICAgLy8gZm9yIGFycmF5IGluZGljZXMgKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICAgICAgaWYgKGdldENsYXNzLmNhbGwodmFsdWUpID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgZm9yIChsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgbGVuZ3RoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvckVhY2godmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSh2YWx1ZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHNvdXJjZSwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIGV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbiAoc291cmNlLCBjYWxsYmFjaykge1xuICAgICAgICAgIHZhciByZXN1bHQsIHZhbHVlO1xuICAgICAgICAgIEluZGV4ID0gMDtcbiAgICAgICAgICBTb3VyY2UgPSBcIlwiICsgc291cmNlO1xuICAgICAgICAgIHJlc3VsdCA9IGdldChsZXgoKSk7XG4gICAgICAgICAgLy8gSWYgYSBKU09OIHN0cmluZyBjb250YWlucyBtdWx0aXBsZSB0b2tlbnMsIGl0IGlzIGludmFsaWQuXG4gICAgICAgICAgaWYgKGxleCgpICE9IFwiJFwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXNldCB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2sgJiYgZ2V0Q2xhc3MuY2FsbChjYWxsYmFjaykgPT0gZnVuY3Rpb25DbGFzcyA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnRzW1wicnVuSW5Db250ZXh0XCJdID0gcnVuSW5Db250ZXh0O1xuICAgIHJldHVybiBleHBvcnRzO1xuICB9XG5cbiAgaWYgKGZyZWVFeHBvcnRzICYmICFpc0xvYWRlcikge1xuICAgIC8vIEV4cG9ydCBmb3IgQ29tbW9uSlMgZW52aXJvbm1lbnRzLlxuICAgIHJ1bkluQ29udGV4dChyb290LCBmcmVlRXhwb3J0cyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRXhwb3J0IGZvciB3ZWIgYnJvd3NlcnMgYW5kIEphdmFTY3JpcHQgZW5naW5lcy5cbiAgICB2YXIgbmF0aXZlSlNPTiA9IHJvb3QuSlNPTixcbiAgICAgICAgcHJldmlvdXNKU09OID0gcm9vdFtcIkpTT04zXCJdLFxuICAgICAgICBpc1Jlc3RvcmVkID0gZmFsc2U7XG5cbiAgICB2YXIgSlNPTjMgPSBydW5JbkNvbnRleHQocm9vdCwgKHJvb3RbXCJKU09OM1wiXSA9IHtcbiAgICAgIC8vIFB1YmxpYzogUmVzdG9yZXMgdGhlIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSBnbG9iYWwgYEpTT05gIG9iamVjdCBhbmRcbiAgICAgIC8vIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIGBKU09OM2Agb2JqZWN0LlxuICAgICAgXCJub0NvbmZsaWN0XCI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFpc1Jlc3RvcmVkKSB7XG4gICAgICAgICAgaXNSZXN0b3JlZCA9IHRydWU7XG4gICAgICAgICAgcm9vdC5KU09OID0gbmF0aXZlSlNPTjtcbiAgICAgICAgICByb290W1wiSlNPTjNcIl0gPSBwcmV2aW91c0pTT047XG4gICAgICAgICAgbmF0aXZlSlNPTiA9IHByZXZpb3VzSlNPTiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04zO1xuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJvb3QuSlNPTiA9IHtcbiAgICAgIFwicGFyc2VcIjogSlNPTjMucGFyc2UsXG4gICAgICBcInN0cmluZ2lmeVwiOiBKU09OMy5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgLy8gRXhwb3J0IGZvciBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuXG4gIGlmIChpc0xvYWRlcikge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gSlNPTjM7XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCJ3aW5kb3cuICAgICB2bFNjaGVtYSA9IHtcbiAgXCJvbmVPZlwiOiBbXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FeHRlbmRlZFVuaXRTcGVjXCIsXG4gICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NoZW1hIGZvciBhIHVuaXQgVmVnYS1MaXRlIHNwZWNpZmljYXRpb24sIHdpdGggdGhlIHN5bnRhY3RpYyBzdWdhciBleHRlbnNpb25zOlxcblxcbi0gYHJvd2AgYW5kIGBjb2x1bW5gIGFyZSBpbmNsdWRlZCBpbiB0aGUgZW5jb2RpbmcuXFxuXFxuLSAoRnV0dXJlKSBsYWJlbCwgYm94IHBsb3RcXG5cXG5cXG5cXG5Ob3RlOiB0aGUgc3BlYyBjb3VsZCBjb250YWluIGZhY2V0LlwiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0U3BlY1wiXG4gICAgfSxcbiAgICB7XG4gICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xheWVyU3BlY1wiXG4gICAgfVxuICBdLFxuICBcImRlZmluaXRpb25zXCI6IHtcbiAgICBcIkV4dGVuZGVkVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VuY29kaW5nXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEga2V5LXZhbHVlIG1hcHBpbmcgYmV0d2VlbiBlbmNvZGluZyBjaGFubmVscyBhbmQgZGVmaW5pdGlvbiBvZiBmaWVsZHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibWFya1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk1hcmtcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImFyZWFcIixcbiAgICAgICAgXCJiYXJcIixcbiAgICAgICAgXCJsaW5lXCIsXG4gICAgICAgIFwicG9pbnRcIixcbiAgICAgICAgXCJ0ZXh0XCIsXG4gICAgICAgIFwidGlja1wiLFxuICAgICAgICBcInJ1bGVcIixcbiAgICAgICAgXCJjaXJjbGVcIixcbiAgICAgICAgXCJzcXVhcmVcIixcbiAgICAgICAgXCJlcnJvckJhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkVuY29kaW5nXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3dcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZlcnRpY2FsIGZhY2V0cyBmb3IgdHJlbGxpcyBwbG90cy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbHVtblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSG9yaXpvbnRhbCBmYWNldHMgZm9yIHRyZWxsaXMgcGxvdHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkgY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieDJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlgyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWTIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGZpbGwgb3Igc3Ryb2tlIGNvbG9yIGJhc2VkIG9uIG1hcmsgdHlwZS5cXG5cXG4oQnkgZGVmYXVsdCwgZmlsbCBjb2xvciBmb3IgYGFyZWFgLCBgYmFyYCwgYHRpY2tgLCBgdGV4dGAsIGBjaXJjbGVgLCBhbmQgYHNxdWFyZWAgL1xcblxcbnN0cm9rZSBjb2xvciBmb3IgYGxpbmVgIGFuZCBgcG9pbnRgLilcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3BhY2l0eSBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBjYW4gYmUgYSB2YWx1ZSBvciBpbiBhIHJhbmdlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBwb2ludGAsIGBzcXVhcmVgIGFuZCBgY2lyY2xlYFxcblxcbuKAkyB0aGUgc3ltYm9sIHNpemUsIG9yIHBpeGVsIGFyZWEgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYGJhcmAgYW5kIGB0aWNrYCDigJMgdGhlIGJhciBhbmQgdGljaydzIHNpemUuXFxuXFxuLSBGb3IgYHRleHRgIOKAkyB0aGUgdGV4dCdzIGZvbnQgc2l6ZS5cXG5cXG4tIFNpemUgaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBgbGluZWAgYW5kIGBhcmVhYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wncyBzaGFwZSAob25seSBmb3IgYHBvaW50YCBtYXJrcykuIFRoZSBzdXBwb3J0ZWQgdmFsdWVzIGFyZVxcblxcbmBcXFwiY2lyY2xlXFxcImAgKGRlZmF1bHQpLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcImNyb3NzXFxcImAsIGBcXFwiZGlhbW9uZFxcXCJgLCBgXFxcInRyaWFuZ2xlLXVwXFxcImAsXFxuXFxub3IgYFxcXCJ0cmlhbmdsZS1kb3duXFxcImAsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV0YWlsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWRkaXRpb25hbCBsZXZlbHMgb2YgZGV0YWlsIGZvciBncm91cGluZyBkYXRhIGluIGFnZ3JlZ2F0ZSB2aWV3cyBhbmRcXG5cXG5pbiBsaW5lIGFuZCBhcmVhIG1hcmtzIHdpdGhvdXQgbWFwcGluZyBkYXRhIHRvIGEgc3BlY2lmaWMgdmlzdWFsIGNoYW5uZWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgb2YgdGhlIGB0ZXh0YCBtYXJrLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcmRlciBvZiBkYXRhIHBvaW50cyBpbiBsaW5lIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMYXllciBvcmRlciBmb3Igbm9uLXN0YWNrZWQgbWFya3MsIG9yIHN0YWNrIG9yZGVyIGZvciBzdGFja2VkIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiUG9zaXRpb25DaGFubmVsRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic29ydFwiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydEZpZWxkXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkF4aXNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxhYmVsQW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXhpc09yaWVudFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGF4aXMuIE9uZSBvZiB0b3AsIGJvdHRvbSwgbGVmdCBvciByaWdodC4gVGhlIG9yaWVudGF0aW9uIGNhbiBiZSB1c2VkIHRvIGZ1cnRoZXIgc3BlY2lhbGl6ZSB0aGUgYXhpcyB0eXBlIChlLmcuLCBhIHkgYXhpcyBvcmllbnRlZCBmb3IgdGhlIHJpZ2h0IGVkZ2Ugb2YgdGhlIGNoYXJ0KS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBmb3IgdGhlIGF4aXMuIFNob3dzIGZpZWxkIG5hbWUgYW5kIGl0cyBmdW5jdGlvbiBieSBkZWZhdWx0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2lkdGggb2YgdGhlIGF4aXMgbGluZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGF5ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBpbmRpY2F0aW5nIGlmIHRoZSBheGlzIChhbmQgYW55IGdyaWRsaW5lcykgc2hvdWxkIGJlIHBsYWNlZCBhYm92ZSBvciBiZWxvdyB0aGUgZGF0YSBtYXJrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGF4aXMgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgYXhpcyBsaW5lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZmxhZyBpbmRpY2F0ZSBpZiBncmlkbGluZXMgc2hvdWxkIGJlIGNyZWF0ZWQgaW4gYWRkaXRpb24gdG8gdGlja3MuIElmIGBncmlkYCBpcyB1bnNwZWNpZmllZCwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBST1cgYW5kIENPTC4gRm9yIFggYW5kIFksIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgcXVhbnRpdGF0aXZlIGFuZCB0aW1lIGZpZWxkcyBhbmQgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgZ3JpZGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZERhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBncmlkIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5IG9mIGdyaWQgKHZhbHVlIGJldHdlZW4gWzAsMV0pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZ3JpZCB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRW5hYmxlIG9yIGRpc2FibGUgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQWxpZ25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGFsaWdubWVudCBmb3IgdGhlIExhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYmFzZWxpbmUgZm9yIHRoZSBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHJ1bmNhdGUgbGFiZWxzIHRoYXQgYXJlIHRvbyBsb25nLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBhbmQgZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdWJkaXZpZGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBwcm92aWRlZCwgc2V0cyB0aGUgbnVtYmVyIG9mIG1pbm9yIHRpY2tzIGJldHdlZW4gbWFqb3IgdGlja3MgKHRoZSB2YWx1ZSA5IHJlc3VsdHMgaW4gZGVjaW1hbCBzdWJkaXZpc2lvbikuIE9ubHkgYXBwbGljYWJsZSBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja3NcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGRlc2lyZWQgbnVtYmVyIG9mIHRpY2tzLCBmb3IgYXhlcyB2aXN1YWxpemluZyBxdWFudGl0YXRpdmUgc2NhbGVzLiBUaGUgcmVzdWx0aW5nIG51bWJlciBtYXkgYmUgZGlmZmVyZW50IHNvIHRoYXQgdmFsdWVzIGFyZSBcXFwibmljZVxcXCIgKG11bHRpcGxlcyBvZiAyLCA1LCAxMCkgYW5kIGxpZSB3aXRoaW4gdGhlIHVuZGVybHlpbmcgc2NhbGUncyByYW5nZS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgYXhpcydzIHRpY2suXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgdGljayBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgdGljayBsYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsYWJlbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1BhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRpY2tzIGFuZCB0ZXh0IGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IsIG1pbm9yIGFuZCBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1ham9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWFqb3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZU1pbm9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgbWlub3IgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZUVuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCwgaW4gcGl4ZWxzLCBvZiB0aWNrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGb250IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldlaWdodCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgb2Zmc2V0IHZhbHVlIGZvciB0aGUgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlTWF4TGVuZ3RoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWF4IGxlbmd0aCBmb3IgYXhpcyB0aXRsZSBpZiB0aGUgdGl0bGUgaXMgYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgZnJvbSB0aGUgZmllbGQncyBkZXNjcmlwdGlvbi4gQnkgZGVmYXVsdCwgdGhpcyBpcyBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIGNlbGwgc2l6ZSBhbmQgY2hhcmFjdGVyV2lkdGggcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjaGFyYWN0ZXJXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNoYXJhY3RlciB3aWR0aCBmb3IgYXV0b21hdGljYWxseSBkZXRlcm1pbmluZyB0aXRsZSBtYXggbGVuZ3RoLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBheGlzIHN0eWxpbmcuXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzT3JpZW50XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ0b3BcIixcbiAgICAgICAgXCJyaWdodFwiLFxuICAgICAgICBcImxlZnRcIixcbiAgICAgICAgXCJib3R0b21cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTY2FsZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TY2FsZVR5cGVcIlxuICAgICAgICB9LFxuICAgICAgICBcImRvbWFpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBkb21haW4gb2YgdGhlIHNjYWxlLCByZXByZXNlbnRpbmcgdGhlIHNldCBvZiBkYXRhIHZhbHVlcy4gRm9yIHF1YW50aXRhdGl2ZSBkYXRhLCB0aGlzIGNhbiB0YWtlIHRoZSBmb3JtIG9mIGEgdHdvLWVsZW1lbnQgYXJyYXkgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlcy4gRm9yIG9yZGluYWwvY2F0ZWdvcmljYWwgZGF0YSwgdGhpcyBtYXkgYmUgYW4gYXJyYXkgb2YgdmFsaWQgaW5wdXQgdmFsdWVzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJhbmdlIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgdmlzdWFsIHZhbHVlcy4gRm9yIG51bWVyaWMgdmFsdWVzLCB0aGUgcmFuZ2UgY2FuIHRha2UgdGhlIGZvcm0gb2YgYSB0d28tZWxlbWVudCBhcnJheSB3aXRoIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzLiBGb3Igb3JkaW5hbCBvciBxdWFudGl6ZWQgZGF0YSwgdGhlIHJhbmdlIG1heSBieSBhbiBhcnJheSBvZiBkZXNpcmVkIG91dHB1dCB2YWx1ZXMsIHdoaWNoIGFyZSBtYXBwZWQgdG8gZWxlbWVudHMgaW4gdGhlIHNwZWNpZmllZCBkb21haW4uIEZvciBvcmRpbmFsIHNjYWxlcyBvbmx5LCB0aGUgcmFuZ2UgY2FuIGJlIGRlZmluZWQgdXNpbmcgYSBEYXRhUmVmOiB0aGUgcmFuZ2UgdmFsdWVzIGFyZSB0aGVuIGRyYXduIGR5bmFtaWNhbGx5IGZyb20gYSBiYWNraW5nIGRhdGEgc2V0LlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHJvdW5kcyBudW1lcmljIG91dHB1dCB2YWx1ZXMgdG8gaW50ZWdlcnMuIFRoaXMgY2FuIGJlIGhlbHBmdWwgZm9yIHNuYXBwaW5nIHRvIHRoZSBwaXhlbCBncmlkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJhbmRTaXplXCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcHBsaWVzIHNwYWNpbmcgYW1vbmcgb3JkaW5hbCBlbGVtZW50cyBpbiB0aGUgc2NhbGUgcmFuZ2UuIFRoZSBhY3R1YWwgZWZmZWN0IGRlcGVuZHMgb24gaG93IHRoZSBzY2FsZSBpcyBjb25maWd1cmVkLiBJZiB0aGUgX19wb2ludHNfXyBwYXJhbWV0ZXIgaXMgYHRydWVgLCB0aGUgcGFkZGluZyB2YWx1ZSBpcyBpbnRlcnByZXRlZCBhcyBhIG11bHRpcGxlIG9mIHRoZSBzcGFjaW5nIGJldHdlZW4gcG9pbnRzLiBBIHJlYXNvbmFibGUgdmFsdWUgaXMgMS4wLCBzdWNoIHRoYXQgdGhlIGZpcnN0IGFuZCBsYXN0IHBvaW50IHdpbGwgYmUgb2Zmc2V0IGZyb20gdGhlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWUgYnkgaGFsZiB0aGUgZGlzdGFuY2UgYmV0d2VlbiBwb2ludHMuIE90aGVyd2lzZSwgcGFkZGluZyBpcyB0eXBpY2FsbHkgaW4gdGhlIHJhbmdlIFswLCAxXSBhbmQgY29ycmVzcG9uZHMgdG8gdGhlIGZyYWN0aW9uIG9mIHNwYWNlIGluIHRoZSByYW5nZSBpbnRlcnZhbCB0byBhbGxvY2F0ZSB0byBwYWRkaW5nLiBBIHZhbHVlIG9mIDAuNSBtZWFucyB0aGF0IHRoZSByYW5nZSBiYW5kIHdpZHRoIHdpbGwgYmUgZXF1YWwgdG8gdGhlIHBhZGRpbmcgd2lkdGguIEZvciBtb3JlLCBzZWUgdGhlIFtEMyBvcmRpbmFsIHNjYWxlIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9tYm9zdG9jay9kMy93aWtpL09yZGluYWwtU2NhbGVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNsYW1wXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgdmFsdWVzIHRoYXQgZXhjZWVkIHRoZSBkYXRhIGRvbWFpbiBhcmUgY2xhbXBlZCB0byBlaXRoZXIgdGhlIG1pbmltdW0gb3IgbWF4aW11bSByYW5nZSB2YWx1ZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5pY2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBzcGVjaWZpZWQsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gSWYgc3BlY2lmaWVkIGFzIGEgdHJ1ZSBib29sZWFuLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgbnVtYmVyIHJhbmdlIChlLmcuLCA3IGluc3RlYWQgb2YgNi45NikuIElmIHNwZWNpZmllZCBhcyBhIHN0cmluZywgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IHZhbHVlIHJhbmdlLiBGb3IgdGltZSBhbmQgdXRjIHNjYWxlIHR5cGVzIG9ubHksIHRoZSBuaWNlIHZhbHVlIHNob3VsZCBiZSBhIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBkZXNpcmVkIHRpbWUgaW50ZXJ2YWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9OaWNlVGltZVwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImV4cG9uZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2V0cyB0aGUgZXhwb25lbnQgb2YgdGhlIHNjYWxlIHRyYW5zZm9ybWF0aW9uLiBGb3IgcG93IHNjYWxlIHR5cGVzIG9ubHksIG90aGVyd2lzZSBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiemVyb1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIGB0cnVlYCwgZW5zdXJlcyB0aGF0IGEgemVybyBiYXNlbGluZSB2YWx1ZSBpcyBpbmNsdWRlZCBpbiB0aGUgc2NhbGUgZG9tYWluLlxcblxcbkRlZmF1bHQgdmFsdWU6IGB0cnVlYCBmb3IgYHhgIGFuZCBgeWAgY2hhbm5lbCBpZiB0aGUgcXVhbnRpdGF0aXZlIGZpZWxkIGlzIG5vdCBiaW5uZWRcXG5cXG5hbmQgbm8gY3VzdG9tIGBkb21haW5gIGlzIHByb3ZpZGVkOyBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1c2VSYXdEb21haW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVc2VzIHRoZSBzb3VyY2UgZGF0YSByYW5nZSBhcyBzY2FsZSBkb21haW4gaW5zdGVhZCBvZiBhZ2dyZWdhdGVkIGRhdGEgZm9yIGFnZ3JlZ2F0ZSBheGlzLlxcblxcblRoaXMgcHJvcGVydHkgb25seSB3b3JrcyB3aXRoIGFnZ3JlZ2F0ZSBmdW5jdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyB3aXRoaW4gdGhlIHJhdyBkYXRhIGRvbWFpbiAoYFxcXCJtZWFuXFxcImAsIGBcXFwiYXZlcmFnZVxcXCJgLCBgXFxcInN0ZGV2XFxcImAsIGBcXFwic3RkZXZwXFxcImAsIGBcXFwibWVkaWFuXFxcImAsIGBcXFwicTFcXFwiYCwgYFxcXCJxM1xcXCJgLCBgXFxcIm1pblxcXCJgLCBgXFxcIm1heFxcXCJgKS4gRm9yIG90aGVyIGFnZ3JlZ2F0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIG91dHNpZGUgb2YgdGhlIHJhdyBkYXRhIGRvbWFpbiAoZS5nLiBgXFxcImNvdW50XFxcImAsIGBcXFwic3VtXFxcImApLCB0aGlzIHByb3BlcnR5IGlzIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiU2NhbGVUeXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsaW5lYXJcIixcbiAgICAgICAgXCJsb2dcIixcbiAgICAgICAgXCJwb3dcIixcbiAgICAgICAgXCJzcXJ0XCIsXG4gICAgICAgIFwicXVhbnRpbGVcIixcbiAgICAgICAgXCJxdWFudGl6ZVwiLFxuICAgICAgICBcIm9yZGluYWxcIixcbiAgICAgICAgXCJ0aW1lXCIsXG4gICAgICAgIFwidXRjXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiTmljZVRpbWVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInNlY29uZFwiLFxuICAgICAgICBcIm1pbnV0ZVwiLFxuICAgICAgICBcImhvdXJcIixcbiAgICAgICAgXCJkYXlcIixcbiAgICAgICAgXCJ3ZWVrXCIsXG4gICAgICAgIFwibW9udGhcIixcbiAgICAgICAgXCJ5ZWFyXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU29ydEZpZWxkXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWVsZCBuYW1lIHRvIGFnZ3JlZ2F0ZSBvdmVyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNvcnQgYWdncmVnYXRpb24gb3BlcmF0b3JcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yZGVyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcIm9wXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiQWdncmVnYXRlT3BcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInZhbHVlc1wiLFxuICAgICAgICBcImNvdW50XCIsXG4gICAgICAgIFwidmFsaWRcIixcbiAgICAgICAgXCJtaXNzaW5nXCIsXG4gICAgICAgIFwiZGlzdGluY3RcIixcbiAgICAgICAgXCJzdW1cIixcbiAgICAgICAgXCJtZWFuXCIsXG4gICAgICAgIFwiYXZlcmFnZVwiLFxuICAgICAgICBcInZhcmlhbmNlXCIsXG4gICAgICAgIFwidmFyaWFuY2VwXCIsXG4gICAgICAgIFwic3RkZXZcIixcbiAgICAgICAgXCJzdGRldnBcIixcbiAgICAgICAgXCJtZWRpYW5cIixcbiAgICAgICAgXCJxMVwiLFxuICAgICAgICBcInEzXCIsXG4gICAgICAgIFwibW9kZXNrZXdcIixcbiAgICAgICAgXCJtaW5cIixcbiAgICAgICAgXCJtYXhcIixcbiAgICAgICAgXCJhcmdtaW5cIixcbiAgICAgICAgXCJhcmdtYXhcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTb3J0T3JkZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImFzY2VuZGluZ1wiLFxuICAgICAgICBcImRlc2NlbmRpbmdcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwicXVhbnRpdGF0aXZlXCIsXG4gICAgICAgIFwib3JkaW5hbFwiLFxuICAgICAgICBcInRlbXBvcmFsXCIsXG4gICAgICAgIFwibm9taW5hbFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlRpbWVVbml0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ5ZWFyXCIsXG4gICAgICAgIFwibW9udGhcIixcbiAgICAgICAgXCJkYXlcIixcbiAgICAgICAgXCJkYXRlXCIsXG4gICAgICAgIFwiaG91cnNcIixcbiAgICAgICAgXCJtaW51dGVzXCIsXG4gICAgICAgIFwic2Vjb25kc1wiLFxuICAgICAgICBcIm1pbGxpc2Vjb25kc1wiLFxuICAgICAgICBcInllYXJtb250aFwiLFxuICAgICAgICBcInllYXJtb250aGRhdGVcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlaG91cnNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc3NlY29uZHNcIixcbiAgICAgICAgXCJob3Vyc21pbnV0ZXNcIixcbiAgICAgICAgXCJob3Vyc21pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwibWludXRlc3NlY29uZHNcIixcbiAgICAgICAgXCJzZWNvbmRzbWlsbGlzZWNvbmRzXCIsXG4gICAgICAgIFwicXVhcnRlclwiLFxuICAgICAgICBcInllYXJxdWFydGVyXCIsXG4gICAgICAgIFwicXVhcnRlcm1vbnRoXCIsXG4gICAgICAgIFwieWVhcnF1YXJ0ZXJtb250aFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkJpblwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1pbmltdW0gYmluIHZhbHVlIHRvIGNvbnNpZGVyLiBJZiB1bnNwZWNpZmllZCwgdGhlIG1pbmltdW0gdmFsdWUgb2YgdGhlIHNwZWNpZmllZCBmaWVsZCBpcyB1c2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1heGltdW0gYmluIHZhbHVlIHRvIGNvbnNpZGVyLiBJZiB1bnNwZWNpZmllZCwgdGhlIG1heGltdW0gdmFsdWUgb2YgdGhlIHNwZWNpZmllZCBmaWVsZCBpcyB1c2VkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFzZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBudW1iZXIgYmFzZSB0byB1c2UgZm9yIGF1dG9tYXRpYyBiaW4gZGV0ZXJtaW5hdGlvbiAoZGVmYXVsdCBpcyBiYXNlIDEwKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0ZXBcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBleGFjdCBzdGVwIHNpemUgdG8gdXNlIGJldHdlZW4gYmlucy4gSWYgcHJvdmlkZWQsIG9wdGlvbnMgc3VjaCBhcyBtYXhiaW5zIHdpbGwgYmUgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0ZXBzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWxsb3dhYmxlIHN0ZXAgc2l6ZXMgdG8gY2hvb3NlIGZyb20uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1pbnN0ZXBcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIG1pbmltdW0gYWxsb3dhYmxlIHN0ZXAgc2l6ZSAocGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgaW50ZWdlciB2YWx1ZXMpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGl2XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NhbGUgZmFjdG9ycyBpbmRpY2F0aW5nIGFsbG93YWJsZSBzdWJkaXZpc2lvbnMuIFRoZSBkZWZhdWx0IHZhbHVlIGlzIFs1LCAyXSwgd2hpY2ggaW5kaWNhdGVzIHRoYXQgZm9yIGJhc2UgMTAgbnVtYmVycyAodGhlIGRlZmF1bHQgYmFzZSksIHRoZSBtZXRob2QgbWF5IGNvbnNpZGVyIGRpdmlkaW5nIGJpbiBzaXplcyBieSA1IGFuZC9vciAyLiBGb3IgZXhhbXBsZSwgZm9yIGFuIGluaXRpYWwgc3RlcCBzaXplIG9mIDEwLCB0aGUgbWV0aG9kIGNhbiBjaGVjayBpZiBiaW4gc2l6ZXMgb2YgMiAoPSAxMC81KSwgNSAoPSAxMC8yKSwgb3IgMSAoPSAxMC8oNSoyKSkgbWlnaHQgYWxzbyBzYXRpc2Z5IHRoZSBnaXZlbiBjb25zdHJhaW50cy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibWF4Ymluc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heGltdW0gbnVtYmVyIG9mIGJpbnMuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJDaGFubmVsRGVmV2l0aExlZ2VuZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwibGVnZW5kXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xlZ2VuZFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVcIlxuICAgICAgICB9LFxuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRGaWVsZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJMZWdlbmRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGZvcm1hdHRpbmcgcGF0dGVybiBmb3IgbGVnZW5kIGxhYmVscy4gVmVnYSB1c2VzIEQzXFxcXCdzIGZvcm1hdCBwYXR0ZXJuLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIGZvciB0aGUgbGVnZW5kLiAoU2hvd3MgZmllbGQgbmFtZSBhbmQgaXRzIGZ1bmN0aW9uIGJ5IGRlZmF1bHQuKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRXhwbGljaXRseSBzZXQgdGhlIHZpc2libGUgbGVnZW5kIHZhbHVlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge31cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGxlZ2VuZC4gT25lIG9mIFxcXCJsZWZ0XFxcIiBvciBcXFwicmlnaHRcXFwiLiBUaGlzIGRldGVybWluZXMgaG93IHRoZSBsZWdlbmQgaXMgcG9zaXRpb25lZCB3aXRoaW4gdGhlIHNjZW5lLiBUaGUgZGVmYXVsdCBpcyBcXFwicmlnaHRcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgbGVnZW5kIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSBsZW5nZW5kIGFuZCBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFyZ2luXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmdpbiBhcm91bmQgdGhlIGxlZ2VuZCwgaW4gcGl4ZWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50SGVpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhlaWdodCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50V2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGFsaWdubWVudCBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgbGVmdCwgbWlkZGxlIG9yIHJpZ2h0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwb3NpdGlvbiBvZiB0aGUgYmFzZWxpbmUgb2YgbGVnZW5kIGxhYmVsLCBjYW4gYmUgdG9wLCBtaWRkbGUgb3IgYm90dG9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlbmdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsZW5nZW5kIGxhYmxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IG9mIHRoZSBsZWdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHN5bWJvbCxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNoYXBlIG9mIHRoZSBsZWdlbmQgc3ltYm9sLCBjYW4gYmUgdGhlICdjaXJjbGUnLCAnc3F1YXJlJywgJ2Nyb3NzJywgJ2RpYW1vbmQnLFxcblxcbid0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJywgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGxlbmdlbmQgc3ltYm9sLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgc3ltYm9sJ3Mgc3Ryb2tlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cXG5cXG5UaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmllbGREZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJPcmRlckNoYW5uZWxEZWZcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU29ydE9yZGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZm9ybWF0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFGb3JtYXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIHRoZSBmb3JtYXQgZm9yIHRoZSBkYXRhIGZpbGUgb3IgdmFsdWVzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXJsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBVUkwgZnJvbSB3aGljaCB0byBsb2FkIHRoZSBkYXRhIHNldC4gVXNlIHRoZSBmb3JtYXQudHlwZSBwcm9wZXJ0eVxcblxcbnRvIGVuc3VyZSB0aGUgbG9hZGVkIGRhdGEgaXMgY29ycmVjdGx5IHBhcnNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBhc3MgYXJyYXkgb2Ygb2JqZWN0cyBpbnN0ZWFkIG9mIGEgdXJsIHRvIGEgZmlsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge31cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJEYXRhRm9ybWF0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFGb3JtYXRUeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlR5cGUgb2YgaW5wdXQgZGF0YTogYFxcXCJqc29uXFxcImAsIGBcXFwiY3N2XFxcImAsIGBcXFwidHN2XFxcImAuXFxuXFxuVGhlIGRlZmF1bHQgZm9ybWF0IHR5cGUgaXMgZGV0ZXJtaW5lZCBieSB0aGUgZXh0ZW5zaW9uIG9mIHRoZSBmaWxlIHVybC5cXG5cXG5JZiBubyBleHRlbnNpb24gaXMgZGV0ZWN0ZWQsIGBcXFwianNvblxcXCJgIHdpbGwgYmUgdXNlZCBieSBkZWZhdWx0LlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJKU09OIG9ubHkpIFRoZSBKU09OIHByb3BlcnR5IGNvbnRhaW5pbmcgdGhlIGRlc2lyZWQgZGF0YS5cXG5cXG5UaGlzIHBhcmFtZXRlciBjYW4gYmUgdXNlZCB3aGVuIHRoZSBsb2FkZWQgSlNPTiBmaWxlIG1heSBoYXZlIHN1cnJvdW5kaW5nIHN0cnVjdHVyZSBvciBtZXRhLWRhdGEuXFxuXFxuRm9yIGV4YW1wbGUgYFxcXCJwcm9wZXJ0eVxcXCI6IFxcXCJ2YWx1ZXMuZmVhdHVyZXNcXFwiYCBpcyBlcXVpdmFsZW50IHRvIHJldHJpZXZpbmcgYGpzb24udmFsdWVzLmZlYXR1cmVzYFxcblxcbmZyb20gdGhlIGxvYWRlZCBKU09OIG9iamVjdC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZlYXR1cmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbmFtZSBvZiB0aGUgVG9wb0pTT04gb2JqZWN0IHNldCB0byBjb252ZXJ0IHRvIGEgR2VvSlNPTiBmZWF0dXJlIGNvbGxlY3Rpb24uXFxuXFxuRm9yIGV4YW1wbGUsIGluIGEgbWFwIG9mIHRoZSB3b3JsZCwgdGhlcmUgbWF5IGJlIGFuIG9iamVjdCBzZXQgbmFtZWQgYFxcXCJjb3VudHJpZXNcXFwiYC5cXG5cXG5Vc2luZyB0aGUgZmVhdHVyZSBwcm9wZXJ0eSwgd2UgY2FuIGV4dHJhY3QgdGhpcyBzZXQgYW5kIGdlbmVyYXRlIGEgR2VvSlNPTiBmZWF0dXJlIG9iamVjdCBmb3IgZWFjaCBjb3VudHJ5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBuYW1lIG9mIHRoZSBUb3BvSlNPTiBvYmplY3Qgc2V0IHRvIGNvbnZlcnQgdG8gYSBtZXNoLlxcblxcblNpbWlsYXIgdG8gdGhlIGBmZWF0dXJlYCBvcHRpb24sIGBtZXNoYCBleHRyYWN0cyBhIG5hbWVkIFRvcG9KU09OIG9iamVjdCBzZXQuXFxuXFxuVW5saWtlIHRoZSBgZmVhdHVyZWAgb3B0aW9uLCB0aGUgY29ycmVzcG9uZGluZyBnZW8gZGF0YSBpcyByZXR1cm5lZCBhcyBhIHNpbmdsZSwgdW5pZmllZCBtZXNoIGluc3RhbmNlLCBub3QgYXMgaW5pZGl2aWR1YWwgR2VvSlNPTiBmZWF0dXJlcy5cXG5cXG5FeHRyYWN0aW5nIGEgbWVzaCBpcyB1c2VmdWwgZm9yIG1vcmUgZWZmaWNpZW50bHkgZHJhd2luZyBib3JkZXJzIG9yIG90aGVyIGdlb2dyYXBoaWMgZWxlbWVudHMgdGhhdCB5b3UgZG8gbm90IG5lZWQgdG8gYXNzb2NpYXRlIHdpdGggc3BlY2lmaWMgcmVnaW9ucyBzdWNoIGFzIGluZGl2aWR1YWwgY291bnRyaWVzLCBzdGF0ZXMgb3IgY291bnRpZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJEYXRhRm9ybWF0VHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwianNvblwiLFxuICAgICAgICBcImNzdlwiLFxuICAgICAgICBcInRzdlwiLFxuICAgICAgICBcInRvcG9qc29uXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVHJhbnNmb3JtXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWx0ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBjb250YWluaW5nIHRoZSBmaWx0ZXIgVmVnYSBleHByZXNzaW9uLiBVc2UgYGRhdHVtYCB0byByZWZlciB0byB0aGUgY3VycmVudCBkYXRhIG9iamVjdC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXF1YWxGaWx0ZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9SYW5nZUZpbHRlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0luRmlsdGVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FcXVhbEZpbHRlclwiXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1JhbmdlRmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSW5GaWx0ZXJcIlxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWx0ZXJJbnZhbGlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0byBmaWx0ZXIgaW52YWxpZCB2YWx1ZXMgKGBudWxsYCBhbmQgYE5hTmApIGZyb20gdGhlIGRhdGEuIEJ5IGRlZmF1bHQgKGB1bmRlZmluZWRgKSwgb25seSBxdWFudGl0YXRpdmUgYW5kIHRlbXBvcmFsIGZpZWxkcyBhcmUgZmlsdGVyZWQuIElmIHNldCB0byBgdHJ1ZWAsIGFsbCBkYXRhIGl0ZW1zIHdpdGggbnVsbCB2YWx1ZXMgYXJlIGZpbHRlcmVkLiBJZiBgZmFsc2VgLCBhbGwgZGF0YSBpdGVtcyBhcmUgaW5jbHVkZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2FsY3VsYXRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2FsY3VsYXRlIG5ldyBmaWVsZChzKSB1c2luZyB0aGUgcHJvdmlkZWQgZXhwcmVzc3Npb24ocykuIENhbGN1bGF0aW9uIGFyZSBhcHBsaWVkIGJlZm9yZSBmaWx0ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9ybXVsYVwiLFxuICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvcm11bGEgb2JqZWN0IGZvciBjYWxjdWxhdGUuXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRXF1YWxGaWx0ZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgdGhlIGZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGaWVsZCB0byBiZSBmaWx0ZXJlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImVxdWFsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVmFsdWUgdGhhdCB0aGUgZmllbGQgc2hvdWxkIGJlIGVxdWFsIHRvLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJlcXVhbFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkRhdGVUaW1lXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ5ZWFyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIHllYXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJxdWFydGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIHF1YXJ0ZXIgb2YgdGhlIHllYXIgKGZyb20gMS00KS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1vbnRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT25lIG9mOiAoMSkgaW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIG1vbnRoIGZyb20gYDFgLWAxMmAuIGAxYCByZXByZXNlbnRzIEphbnVhcnk7ICAoMikgY2FzZS1pbnNlbnNpdGl2ZSBtb250aCBuYW1lIChlLmcuLCBgXFxcIkphbnVhcnlcXFwiYCk7ICAoMykgY2FzZS1pbnNlbnNpdGl2ZSwgMy1jaGFyYWN0ZXIgc2hvcnQgbW9udGggbmFtZSAoZS5nLiwgYFxcXCJKYW5cXFwiYCkuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIGRhdGUgZnJvbSAxLTMxLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVmFsdWUgcmVwcmVzZW50aW5nIHRoZSBkYXkgb2Ygd2Vlay4gIFRoaXMgY2FuIGJlIG9uZSBvZjogKDEpIGludGVnZXIgdmFsdWUgLS0gYDFgIHJlcHJlc2VudHMgTW9uZGF5OyAoMikgY2FzZS1pbnNlbnNpdGl2ZSBkYXkgbmFtZSAoZS5nLiwgYFxcXCJNb25kYXlcXFwiYCk7ICAoMykgY2FzZS1pbnNlbnNpdGl2ZSwgMy1jaGFyYWN0ZXIgc2hvcnQgZGF5IG5hbWUgKGUuZy4sIGBcXFwiTW9uXFxcImApLiAgIDxici8+ICoqV2FybmluZzoqKiBBIERhdGVUaW1lIGRlZmluaXRpb24gb2JqZWN0IHdpdGggYGRheWAqKiBzaG91bGQgbm90IGJlIGNvbWJpbmVkIHdpdGggYHllYXJgLCBgcXVhcnRlcmAsIGBtb250aGAsIG9yIGBkYXRlYC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImhvdXJzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgdGhlIGhvdXIgb2YgZGF5IGZyb20gMC0yMy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1pbnV0ZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBtaW51dGUgc2VnbWVudCBvZiBhIHRpbWUgZnJvbSAwLTU5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2Vjb25kc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHNlY29uZCBzZWdtZW50IG9mIGEgdGltZSBmcm9tIDAtNTkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtaWxsaXNlY29uZHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBtaWxsaXNlY29uZCBzZWdtZW50IG9mIGEgdGltZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlJhbmdlRmlsdGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJ0aW1lIHVuaXQgZm9yIHRoZSBmaWVsZCB0byBiZSBmaWx0ZXJlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmllbGQgdG8gYmUgZmlsdGVyZWRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXJyYXkgb2YgaW5jbHVzaXZlIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWVzXFxuXFxuZm9yIGEgZmllbGQgdmFsdWUgb2YgYSBkYXRhIGl0ZW0gdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGZpbHRlcmVkIGRhdGEuXCIsXG4gICAgICAgICAgXCJtYXhJdGVtc1wiOiAyLFxuICAgICAgICAgIFwibWluSXRlbXNcIjogMixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPYmplY3QgZm9yIGRlZmluaW5nIGRhdGV0aW1lIGluIFZlZ2EtTGl0ZSBGaWx0ZXIuXFxuXFxuSWYgYm90aCBtb250aCBhbmQgcXVhcnRlciBhcmUgcHJvdmlkZWQsIG1vbnRoIGhhcyBoaWdoZXIgcHJlY2VkZW5jZS5cXG5cXG5gZGF5YCBjYW5ub3QgYmUgY29tYmluZWQgd2l0aCBvdGhlciBkYXRlLlxcblxcbldlIGFjY2VwdCBzdHJpbmcgZm9yIG1vbnRoIGFuZCBkYXkgbmFtZXMuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwicmFuZ2VcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJJbkZpbHRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwidGltZSB1bml0IGZvciB0aGUgZmllbGQgdG8gYmUgZmlsdGVyZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpZWxkIHRvIGJlIGZpbHRlcmVkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc2V0IG9mIHZhbHVlcyB0aGF0IHRoZSBgZmllbGRgJ3MgdmFsdWUgc2hvdWxkIGJlIGEgbWVtYmVyIG9mLFxcblxcbmZvciBhIGRhdGEgaXRlbSBpbmNsdWRlZCBpbiB0aGUgZmlsdGVyZWQgZGF0YS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRlVGltZVwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPYmplY3QgZm9yIGRlZmluaW5nIGRhdGV0aW1lIGluIFZlZ2EtTGl0ZSBGaWx0ZXIuXFxuXFxuSWYgYm90aCBtb250aCBhbmQgcXVhcnRlciBhcmUgcHJvdmlkZWQsIG1vbnRoIGhhcyBoaWdoZXIgcHJlY2VkZW5jZS5cXG5cXG5gZGF5YCBjYW5ub3QgYmUgY29tYmluZWQgd2l0aCBvdGhlciBkYXRlLlxcblxcbldlIGFjY2VwdCBzdHJpbmcgZm9yIG1vbnRoIGFuZCBkYXkgbmFtZXMuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiaW5cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGb3JtdWxhXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWVsZCBpbiB3aGljaCB0byBzdG9yZSB0aGUgY29tcHV0ZWQgZm9ybXVsYSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImV4cHJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBjb250YWluaW5nIGFuIGV4cHJlc3Npb24gZm9yIHRoZSBmb3JtdWxhLiBVc2UgdGhlIHZhcmlhYmxlIGBkYXR1bWAgdG8gdG8gcmVmZXIgdG8gdGhlIGN1cnJlbnQgZGF0YSBvYmplY3QuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiZXhwclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkNvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidmlld3BvcnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgb24tc2NyZWVuIHZpZXdwb3J0LCBpbiBwaXhlbHMuIElmIG5lY2Vzc2FyeSwgY2xpcHBpbmcgYW5kIHNjcm9sbGluZyB3aWxsIGJlIGFwcGxpZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYWNrZ3JvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ1NTIGNvbG9yIHByb3BlcnR5IHRvIHVzZSBhcyBiYWNrZ3JvdW5kIG9mIHZpc3VhbGl6YXRpb24uIERlZmF1bHQgaXMgYFxcXCJ0cmFuc3BhcmVudFxcXCJgLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibnVtYmVyRm9ybWF0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRDMgTnVtYmVyIGZvcm1hdCBmb3IgYXhpcyBsYWJlbHMgYW5kIHRleHQgdGFibGVzLiBGb3IgZXhhbXBsZSBcXFwic1xcXCIgZm9yIFNJIHVuaXRzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZUZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgZGF0ZXRpbWUgZm9ybWF0IGZvciBheGlzIGFuZCBsZWdlbmQgbGFiZWxzLiBUaGUgZm9ybWF0IGNhbiBiZSBzZXQgZGlyZWN0bHkgb24gZWFjaCBheGlzIGFuZCBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb3VudFRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBheGlzIGFuZCBsZWdlbmQgdGl0bGUgZm9yIGNvdW50IGZpZWxkcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImNlbGxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2VsbENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDZWxsIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFya1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1hcmsgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvdmVybGF5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL092ZXJsYXlDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTWFyayBPdmVybGF5IENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2NhbGUgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXhpcyBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGVnZW5kIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmFjZXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQ29uZmlnXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJDZWxsQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ3aWR0aFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJoZWlnaHRcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2xpcFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWxsIGNvbG9yLlwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZpbGwgb3BhY2l0eSAodmFsdWUgYmV0d2VlbiBbMCwxXSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIGNvbG9yLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugb3BhY2l0eSAodmFsdWUgYmV0d2VlbiBbMCwxXSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugd2lkdGgsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBhcnJheSBvZiBhbHRlcm5hdGluZyBzdHJva2UsIHNwYWNlIGxlbmd0aHMgZm9yIGNyZWF0aW5nIGRhc2hlZCBvciBkb3R0ZWQgbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBzdHJva2UgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIk1hcmtDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZpbGxlZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgdGhlIHNoYXBlXFxcXCdzIGNvbG9yIHNob3VsZCBiZSB1c2VkIGFzIGZpbGwgY29sb3IgaW5zdGVhZCBvZiBzdHJva2UgY29sb3IuXFxuXFxuVGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgZm9yIFxcXCJiYXJcXFwiLCBcXFwicG9pbnRcXFwiLCBhbmQgXFxcImFyZWFcXFwiLlxcblxcbkFsbCBtYXJrcyBleGNlcHQgXFxcInBvaW50XFxcIiBtYXJrcyBhcmUgZmlsbGVkIGJ5IGRlZmF1bHQuXFxuXFxuU2VlIE1hcmsgRG9jdW1lbnRhdGlvbiAoaHR0cDovL3ZlZ2EuZ2l0aHViLmlvL3ZlZ2EtbGl0ZS9kb2NzL21hcmtzLmh0bWwpXFxuXFxuZm9yIHVzYWdlIGV4YW1wbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGNvbG9yLlwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IEZpbGwgQ29sb3IuICBUaGlzIGhhcyBoaWdoZXIgcHJlY2VkZW5jZSB0aGFuIGNvbmZpZy5jb2xvclwiLFxuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgU3Ryb2tlIENvbG9yLiAgVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBjb25maWcuY29sb3JcIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZU9wYWNpdHlcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwibWF4aW11bVwiOiAxLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsdGVybmF0aW5nIHN0cm9rZSwgc3BhY2UgbGVuZ3RocyBmb3IgY3JlYXRpbmcgZGFzaGVkIG9yIGRvdHRlZCBsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlRGFzaE9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIHN0cm9rZSBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3RhY2tlZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TdGFja09mZnNldFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yaWVudFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgYSBub24tc3RhY2tlZCBiYXIsIHRpY2ssIGFyZWEsIGFuZCBsaW5lIGNoYXJ0cy5cXG5cXG5UaGUgdmFsdWUgaXMgZWl0aGVyIGhvcml6b250YWwgKGRlZmF1bHQpIG9yIHZlcnRpY2FsLlxcblxcbi0gRm9yIGJhciwgcnVsZSBhbmQgdGljaywgdGhpcyBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNpemUgb2YgdGhlIGJhciBhbmQgdGlja1xcblxcbnNob3VsZCBiZSBhcHBsaWVkIHRvIHggb3IgeSBkaW1lbnNpb24uXFxuXFxuLSBGb3IgYXJlYSwgdGhpcyBwcm9wZXJ0eSBkZXRlcm1pbmVzIHRoZSBvcmllbnQgcHJvcGVydHkgb2YgdGhlIFZlZ2Egb3V0cHV0Llxcblxcbi0gRm9yIGxpbmUsIHRoaXMgcHJvcGVydHkgZGV0ZXJtaW5lcyB0aGUgc29ydCBvcmRlciBvZiB0aGUgcG9pbnRzIGluIHRoZSBsaW5lXFxuXFxuaWYgYGNvbmZpZy5zb3J0TGluZUJ5YCBpcyBub3Qgc3BlY2lmaWVkLlxcblxcbkZvciBzdGFja2VkIGNoYXJ0cywgdGhpcyBpcyBhbHdheXMgZGV0ZXJtaW5lZCBieSB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHN0YWNrO1xcblxcbnRoZXJlZm9yZSBleHBsaWNpdGx5IHNwZWNpZmllZCB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJpbnRlcnBvbGF0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbnRlcnBvbGF0ZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbGluZSBpbnRlcnBvbGF0aW9uIG1ldGhvZCB0byB1c2UuIE9uZSBvZiBsaW5lYXIsIHN0ZXAtYmVmb3JlLCBzdGVwLWFmdGVyLCBiYXNpcywgYmFzaXMtb3BlbiwgY2FyZGluYWwsIGNhcmRpbmFsLW9wZW4sIG1vbm90b25lLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGVuc2lvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlcGVuZGluZyBvbiB0aGUgaW50ZXJwb2xhdGlvbiB0eXBlLCBzZXRzIHRoZSB0ZW5zaW9uIHBhcmFtZXRlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxpbmVTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiBsaW5lIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJydWxlU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgcnVsZSBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzLiAgSWYgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHNpemUgaXMgIGBiYW5kU2l6ZS0xYCxcXG5cXG53aGljaCBwcm92aWRlcyAxIHBpeGVsIG9mZnNldCBiZXR3ZWVuIGJhcnMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJUaGluU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBiYXJzIG9uIGNvbnRpbnVvdXMgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sIHNoYXBlIHRvIHVzZS4gT25lIG9mIGNpcmNsZSAoZGVmYXVsdCksIHNxdWFyZSwgY3Jvc3MsIGRpYW1vbmQsIHRyaWFuZ2xlLXVwLCBvciB0cmlhbmdsZS1kb3duLCBvciBhIGN1c3RvbSBTVkcgcGF0aC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9TaGFwZVwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBpeGVsIGFyZWEgZWFjaCB0aGUgcG9pbnQuIEZvciBleGFtcGxlOiBpbiB0aGUgY2FzZSBvZiBjaXJjbGVzLCB0aGUgcmFkaXVzIGlzIGRldGVybWluZWQgaW4gcGFydCBieSB0aGUgc3F1YXJlIHJvb3Qgb2YgdGhlIHNpemUgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrVGhpY2tuZXNzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhpY2tuZXNzIG9mIHRoZSB0aWNrIG1hcmsuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbGlnblwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Ib3Jpem9udGFsQWxpZ25cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhvcml6b250YWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgbGVmdCwgcmlnaHQsIGNlbnRlci5cIlxuICAgICAgICB9LFxuICAgICAgICBcImFuZ2xlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJvdGF0aW9uIGFuZ2xlIG9mIHRoZSB0ZXh0LCBpbiBkZWdyZWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVmVydGljYWxBbGlnblwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdmVydGljYWwgYWxpZ25tZW50IG9mIHRoZSB0ZXh0LiBPbmUgb2YgdG9wLCBtaWRkbGUsIGJvdHRvbS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImR4XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhvcml6b250YWwgb2Zmc2V0LCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIHRleHQgbGFiZWwgYW5kIGl0cyBhbmNob3IgcG9pbnQuIFRoZSBvZmZzZXQgaXMgYXBwbGllZCBhZnRlciByb3RhdGlvbiBieSB0aGUgYW5nbGUgcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkeVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB2ZXJ0aWNhbCBvZmZzZXQsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgdGV4dCBsYWJlbCBhbmQgaXRzIGFuY2hvciBwb2ludC4gVGhlIG9mZnNldCBpcyBhcHBsaWVkIGFmdGVyIHJvdGF0aW9uIGJ5IHRoZSBhbmdsZSBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInJhZGl1c1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBvbGFyIGNvb3JkaW5hdGUgcmFkaWFsIG9mZnNldCwgaW4gcGl4ZWxzLCBvZiB0aGUgdGV4dCBsYWJlbCBmcm9tIHRoZSBvcmlnaW4gZGV0ZXJtaW5lZCBieSB0aGUgeCBhbmQgeSBwcm9wZXJ0aWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGhldGFcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQb2xhciBjb29yZGluYXRlIGFuZ2xlLCBpbiByYWRpYW5zLCBvZiB0aGUgdGV4dCBsYWJlbCBmcm9tIHRoZSBvcmlnaW4gZGV0ZXJtaW5lZCBieSB0aGUgeCBhbmQgeSBwcm9wZXJ0aWVzLiBWYWx1ZXMgZm9yIHRoZXRhIGZvbGxvdyB0aGUgc2FtZSBjb252ZW50aW9uIG9mIGFyYyBtYXJrIHN0YXJ0QW5nbGUgYW5kIGVuZEFuZ2xlIHByb3BlcnRpZXM6IGFuZ2xlcyBhcmUgbWVhc3VyZWQgaW4gcmFkaWFucywgd2l0aCAwIGluZGljYXRpbmcgXFxcIm5vcnRoXFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdHlwZWZhY2UgdG8gc2V0IHRoZSB0ZXh0IGluIChlLmcuLCBIZWx2ZXRpY2EgTmV1ZSkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvbnRTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Gb250U3R5bGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc3R5bGUgKGUuZy4sIGl0YWxpYykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZvbnRXZWlnaHRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IChlLmcuLCBib2xkKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIHRleHQgdmFsdWUuIElmIG5vdCBkZWZpbmVkLCB0aGlzIHdpbGwgYmUgZGV0ZXJtaW5lZCBhdXRvbWF0aWNhbGx5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlBsYWNlaG9sZGVyIFRleHRcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImFwcGx5Q29sb3JUb0JhY2tncm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBcHBseSBjb2xvciBmaWVsZCB0byBiYWNrZ3JvdW5kIGNvbG9yIGluc3RlYWQgb2YgdGhlIHRleHQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiU3RhY2tPZmZzZXRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInplcm9cIixcbiAgICAgICAgXCJjZW50ZXJcIixcbiAgICAgICAgXCJub3JtYWxpemVcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiT3JpZW50XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJob3Jpem9udGFsXCIsXG4gICAgICAgIFwidmVydGljYWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJJbnRlcnBvbGF0ZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibGluZWFyLWNsb3NlZFwiLFxuICAgICAgICBcInN0ZXBcIixcbiAgICAgICAgXCJzdGVwLWJlZm9yZVwiLFxuICAgICAgICBcInN0ZXAtYWZ0ZXJcIixcbiAgICAgICAgXCJiYXNpc1wiLFxuICAgICAgICBcImJhc2lzLW9wZW5cIixcbiAgICAgICAgXCJiYXNpcy1jbG9zZWRcIixcbiAgICAgICAgXCJjYXJkaW5hbFwiLFxuICAgICAgICBcImNhcmRpbmFsLW9wZW5cIixcbiAgICAgICAgXCJjYXJkaW5hbC1jbG9zZWRcIixcbiAgICAgICAgXCJidW5kbGVcIixcbiAgICAgICAgXCJtb25vdG9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNoYXBlXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJjaXJjbGVcIixcbiAgICAgICAgXCJzcXVhcmVcIixcbiAgICAgICAgXCJjcm9zc1wiLFxuICAgICAgICBcImRpYW1vbmRcIixcbiAgICAgICAgXCJ0cmlhbmdsZS11cFwiLFxuICAgICAgICBcInRyaWFuZ2xlLWRvd25cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJIb3Jpem9udGFsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxlZnRcIixcbiAgICAgICAgXCJyaWdodFwiLFxuICAgICAgICBcImNlbnRlclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlZlcnRpY2FsQWxpZ25cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInRvcFwiLFxuICAgICAgICBcIm1pZGRsZVwiLFxuICAgICAgICBcImJvdHRvbVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvbnRTdHlsZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiaXRhbGljXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9udFdlaWdodFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibm9ybWFsXCIsXG4gICAgICAgIFwiYm9sZFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk92ZXJsYXlDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRvIG92ZXJsYXkgbGluZSB3aXRoIHBvaW50LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImFyZWFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQXJlYU92ZXJsYXlcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVHlwZSBvZiBvdmVybGF5IGZvciBhcmVhIG1hcmsgKGxpbmUgb3IgbGluZXBvaW50KVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTdHlsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9NYXJrQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgc3R5bGUgZm9yIHRoZSBvdmVybGF5ZWQgcG9pbnQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsaW5lU3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHN0eWxlIGZvciB0aGUgb3ZlcmxheWVkIHBvaW50LlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXJlYU92ZXJsYXlcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVcIixcbiAgICAgICAgXCJsaW5lcG9pbnRcIixcbiAgICAgICAgXCJub25lXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2NhbGVDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgdHJ1ZSwgcm91bmRzIG51bWVyaWMgb3V0cHV0IHZhbHVlcyB0byBpbnRlZ2Vycy5cXG5cXG5UaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC5cXG5cXG4oT25seSBhdmFpbGFibGUgZm9yIGB4YCwgYHlgLCBgc2l6ZWAsIGByb3dgLCBhbmQgYGNvbHVtbmAgc2NhbGVzLilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0QmFuZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBiYW5kIHdpZHRoIGZvciBgeGAgb3JkaW5hbCBzY2FsZSB3aGVuIGlzIG1hcmsgaXMgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFuZFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGJhbmQgc2l6ZSBmb3IgKDEpIGB5YCBvcmRpbmFsIHNjYWxlLFxcblxcbmFuZCAoMikgYHhgIG9yZGluYWwgc2NhbGUgd2hlbiB0aGUgbWFyayBpcyBub3QgYHRleHRgLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9wYWNpdHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHBhZGRpbmcgZm9yIGB4YCBhbmQgYHlgIG9yZGluYWwgc2NhbGVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5vbWluYWxDb2xvclJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igbm9taW5hbCBjb2xvciBzY2FsZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXF1ZW50aWFsQ29sb3JSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG9yZGluYWwgLyBjb250aW51b3VzIGNvbG9yIHNjYWxlXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBzaGFwZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJiYXJTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgZm9udCBzaXplIHNjYWxlXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInJ1bGVTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBydWxlIHN0cm9rZSB3aWR0aHNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIHRpY2sgc3BhbnNcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicG9pbnRTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBiYXIgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJheGlzV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaWR0aCBvZiB0aGUgYXhpcyBsaW5lXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYXllclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgc3RyaW5nIGluZGljYXRpbmcgaWYgdGhlIGF4aXMgKGFuZCBhbnkgZ3JpZGxpbmVzKSBzaG91bGQgYmUgcGxhY2VkIGFib3ZlIG9yIGJlbG93IHRoZSBkYXRhIG1hcmtzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgYXhpcyBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBheGlzIGxpbmUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBmbGFnIGluZGljYXRlIGlmIGdyaWRsaW5lcyBzaG91bGQgYmUgY3JlYXRlZCBpbiBhZGRpdGlvbiB0byB0aWNrcy4gSWYgYGdyaWRgIGlzIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIFJPVyBhbmQgQ09MLiBGb3IgWCBhbmQgWSwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBxdWFudGl0YXRpdmUgYW5kIHRpbWUgZmllbGRzIGFuZCBgZmFsc2VgIG90aGVyd2lzZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiBncmlkbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkRGFzaFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQgKGluIHBpeGVscykgaW50byB3aGljaCB0byBiZWdpbiBkcmF3aW5nIHdpdGggdGhlIGdyaWQgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZE9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgb2YgZ3JpZCAodmFsdWUgYmV0d2VlbiBbMCwxXSlcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBncmlkIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJFbmFibGUgb3IgZGlzYWJsZSBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgYXhpcyBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBhbGlnbm1lbnQgZm9yIHRoZSBMYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGJhc2VsaW5lIGZvciB0aGUgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRydW5jYXRlIGxhYmVscyB0aGF0IGFyZSB0b28gbG9uZy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggYW5kIGRheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ViZGl2aWRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgcHJvdmlkZWQsIHNldHMgdGhlIG51bWJlciBvZiBtaW5vciB0aWNrcyBiZXR3ZWVuIG1ham9yIHRpY2tzICh0aGUgdmFsdWUgOSByZXN1bHRzIGluIGRlY2ltYWwgc3ViZGl2aXNpb24pLiBPbmx5IGFwcGxpY2FibGUgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBkZXNpcmVkIG51bWJlciBvZiB0aWNrcywgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy4gVGhlIHJlc3VsdGluZyBudW1iZXIgbWF5IGJlIGRpZmZlcmVudCBzbyB0aGF0IHZhbHVlcyBhcmUgXFxcIm5pY2VcXFwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlJ3MgcmFuZ2UuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGF4aXMncyB0aWNrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIHRpY2sgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIHRpY2sgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGFiZWwsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tQYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aWNrcyBhbmQgdGV4dCBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yLCBtaW5vciBhbmQgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNYWpvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNaW5vclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1pbm9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVFbmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGgsIGluIHBpeGVscywgb2YgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9udCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXZWlnaHQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkJ3MgZGVzY3JpcHRpb24uIEJ5IGRlZmF1bHQsIHRoaXMgaXMgYXV0b21hdGljYWxseSBiYXNlZCBvbiBjZWxsIHNpemUgYW5kIGNoYXJhY3RlcldpZHRoIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2hhcmFjdGVyV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDaGFyYWN0ZXIgd2lkdGggZm9yIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5pbmcgdGl0bGUgbWF4IGxlbmd0aC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJvcmllbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb3JpZW50YXRpb24gb2YgdGhlIGxlZ2VuZC4gT25lIG9mIFxcXCJsZWZ0XFxcIiBvciBcXFwicmlnaHRcXFwiLiBUaGlzIGRldGVybWluZXMgaG93IHRoZSBsZWdlbmQgaXMgcG9zaXRpb25lZCB3aXRoaW4gdGhlIHNjZW5lLiBUaGUgZGVmYXVsdCBpcyBcXFwicmlnaHRcXFwiLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCwgaW4gcGl4ZWxzLCBieSB3aGljaCB0byBkaXNwbGFjZSB0aGUgbGVnZW5kIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhZGRpbmdcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcGFkZGluZywgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSBsZW5nZW5kIGFuZCBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWFyZ2luXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmdpbiBhcm91bmQgdGhlIGxlZ2VuZCwgaW4gcGl4ZWxzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCBzdHJva2UsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50SGVpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGhlaWdodCBvZiB0aGUgZ3JhZGllbnQsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyYWRpZW50V2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGFsaWdubWVudCBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgbGVmdCwgbWlkZGxlIG9yIHJpZ2h0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxCYXNlbGluZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwb3NpdGlvbiBvZiB0aGUgYmFzZWxpbmUgb2YgbGVnZW5kIGxhYmVsLCBjYW4gYmUgdG9wLCBtaWRkbGUgb3IgYm90dG9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIGxlbmdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiBsZW5nZW5kIGxhYmxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IG9mIHRoZSBsZWdlbmQgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIG5hbWVzIGFuZCB3ZWVrZGF5IG5hbWVzIHNob3VsZCBiZSBhYmJyZXZpYXRlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgbGVnZW5kIHN5bWJvbCxcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN5bWJvbFNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNoYXBlIG9mIHRoZSBsZWdlbmQgc3ltYm9sLCBjYW4gYmUgdGhlICdjaXJjbGUnLCAnc3F1YXJlJywgJ2Nyb3NzJywgJ2RpYW1vbmQnLFxcblxcbid0cmlhbmdsZS11cCcsICd0cmlhbmdsZS1kb3duJywgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUgb2YgdGhlIGxlbmdlbmQgc3ltYm9sLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgc3ltYm9sJ3Mgc3Ryb2tlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cXG5cXG5UaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgc2l6ZSBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgd2VpZ2h0IG9mIHRoZSBsZWdlbmQgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGxlZ2VuZCBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRmFjZXRDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0U2NhbGVDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgU2NhbGUgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJheGlzXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQXhpcyBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRHcmlkQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IEdyaWQgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjZWxsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NlbGxDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmFjZXQgQ2VsbCBDb25maWdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0U2NhbGVDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInJvdW5kXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0R3JpZENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiZm9ybWF0XCI6IFwiY29sb3JcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib2Zmc2V0XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0U3BlY1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmFjZXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmFjZXRcIlxuICAgICAgICB9LFxuICAgICAgICBcInNwZWNcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0xheWVyU3BlY1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRTcGVjXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZhY2V0XCIsXG4gICAgICAgIFwic3BlY1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZhY2V0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3dcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2x1bW5cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJMYXllclNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxheWVyc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlVuaXQgc3BlY3MgdGhhdCB3aWxsIGJlIGxheWVyZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVW5pdFNwZWNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJuYW1lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgdmlzdWFsaXphdGlvbiBmb3IgbGF0ZXIgcmVmZXJlbmNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBkZXNjcmlwdGlvbiBvZiB0aGlzIG1hcmsgZm9yIGNvbW1lbnRpbmcgcHVycG9zZS5cXG5cXG5UaGlzIHByb3BlcnR5IGhhcyBubyBlZmZlY3Qgb24gdGhlIG91dHB1dCB2aXN1YWxpemF0aW9uLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0YVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIHRoZSBkYXRhIHNvdXJjZVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHJhbnNmb3JtXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RyYW5zZm9ybVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyBmaWx0ZXIgYW5kIG5ldyBmaWVsZCBjYWxjdWxhdGlvbi5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbmZpZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Db25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29uZmlndXJhdGlvbiBvYmplY3RcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwibGF5ZXJzXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVW5pdFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbWFyayB0eXBlLlxcblxcbk9uZSBvZiBgXFxcImJhclxcXCJgLCBgXFxcImNpcmNsZVxcXCJgLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcInRpY2tcXFwiYCwgYFxcXCJsaW5lXFxcImAsXFxuXFxuYFxcXCJhcmVhXFxcImAsIGBcXFwicG9pbnRcXFwiYCwgYFxcXCJydWxlXFxcImAsIGFuZCBgXFxcInRleHRcXFwiYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImVuY29kaW5nXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRFbmNvZGluZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGtleS12YWx1ZSBtYXBwaW5nIGJldHdlZW4gZW5jb2RpbmcgY2hhbm5lbHMgYW5kIGRlZmluaXRpb24gb2YgZmllbGRzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcIm1hcmtcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJVbml0RW5jb2RpbmdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInhcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlggY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWSBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ4MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWDIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcInkyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sb3JcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgZmlsbCBvciBzdHJva2UgY29sb3IgYmFzZWQgb24gbWFyayB0eXBlLlxcblxcbihCeSBkZWZhdWx0LCBmaWxsIGNvbG9yIGZvciBgYXJlYWAsIGBiYXJgLCBgdGlja2AsIGB0ZXh0YCwgYGNpcmNsZWAsIGFuZCBgc3F1YXJlYCAvXFxuXFxuc3Ryb2tlIGNvbG9yIGZvciBgbGluZWAgYW5kIGBwb2ludGAuKVwiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcGFjaXR5IG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGNhbiBiZSBhIHZhbHVlIG9yIGluIGEgcmFuZ2UuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaXplXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYHBvaW50YCwgYHNxdWFyZWAgYW5kIGBjaXJjbGVgXFxuXFxu4oCTIHRoZSBzeW1ib2wgc2l6ZSwgb3IgcGl4ZWwgYXJlYSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgYmFyYCBhbmQgYHRpY2tgIOKAkyB0aGUgYmFyIGFuZCB0aWNrJ3Mgc2l6ZS5cXG5cXG4tIEZvciBgdGV4dGAg4oCTIHRoZSB0ZXh0J3MgZm9udCBzaXplLlxcblxcbi0gU2l6ZSBpcyBjdXJyZW50bHkgdW5zdXBwb3J0ZWQgZm9yIGBsaW5lYCBhbmQgYGFyZWFgLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hhcGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCdzIHNoYXBlIChvbmx5IGZvciBgcG9pbnRgIG1hcmtzKS4gVGhlIHN1cHBvcnRlZCB2YWx1ZXMgYXJlXFxuXFxuYFxcXCJjaXJjbGVcXFwiYCAoZGVmYXVsdCksIGBcXFwic3F1YXJlXFxcImAsIGBcXFwiY3Jvc3NcXFwiYCwgYFxcXCJkaWFtb25kXFxcImAsIGBcXFwidHJpYW5nbGUtdXBcXFwiYCxcXG5cXG5vciBgXFxcInRyaWFuZ2xlLWRvd25cXFwiYCwgb3IgZWxzZSBhIGN1c3RvbSBTVkcgcGF0aCBzdHJpbmcuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXRhaWxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZGRpdGlvbmFsIGxldmVscyBvZiBkZXRhaWwgZm9yIGdyb3VwaW5nIGRhdGEgaW4gYWdncmVnYXRlIHZpZXdzIGFuZFxcblxcbmluIGxpbmUgYW5kIGFyZWEgbWFya3Mgd2l0aG91dCBtYXBwaW5nIGRhdGEgdG8gYSBzcGVjaWZpYyB2aXN1YWwgY2hhbm5lbC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBvZiB0aGUgYHRleHRgIG1hcmsuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGF0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9yZGVyIG9mIGRhdGEgcG9pbnRzIGluIGxpbmUgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxheWVyIG9yZGVyIGZvciBub24tc3RhY2tlZCBtYXJrcywgb3Igc3RhY2sgb3JkZXIgZm9yIHN0YWNrZWQgbWFya3MuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvT3JkZXJDaGFubmVsRGVmXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgXCIkc2NoZW1hXCI6IFwiaHR0cDovL2pzb24tc2NoZW1hLm9yZy9kcmFmdC0wNC9zY2hlbWEjXCJcbn07IiwiJ3VzZSBzdHJpY3QnO1xuLyogZ2xvYmFscyB3aW5kb3csIGFuZ3VsYXIgKi9cblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknLCBbXG4gICAgJ0xvY2FsU3RvcmFnZU1vZHVsZScsXG4gICAgJ2FuZ3VsYXItZ29vZ2xlLWFuYWx5dGljcycsXG4gICAgJ2FuZ3VsYXItc29ydGFibGUtdmlldycsXG4gICAgJ2FuZ3VsYXItd2Vic3FsJyxcbiAgICAndWktcmFuZ2VTbGlkZXInLFxuICAgIC8vbW9kaWZpZWQgYnkgWmhlXG4gICAgJ2luZmluaXRlLXNjcm9sbCdcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgnY3FsJywgd2luZG93LmNxbClcbiAgLmNvbnN0YW50KCd2bFNjaGVtYScsIHdpbmRvdy52bFNjaGVtYSlcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLmNvbnN0YW50KCd1dGlsJywgd2luZG93LnZnLnV0aWwpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ2pRdWVyeScsIHdpbmRvdy4kKVxuICAuY29uc3RhbnQoJ1BhcGEnLCB3aW5kb3cuUGFwYSlcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC5jb25zdGFudCgnQU5ZJywgJ19fQU5ZX18nKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBsb2dMZXZlbDogJ0lORk8nLFxuICAgIGxvZ1ByaW50TGV2ZWw6ICdJTkZPJyxcbiAgICBsb2dUb1dlYlNxbDogZmFsc2UsIC8vIGluIHVzZXIgc3R1ZGllcywgc2V0IHRoaXMgdG8gdHJ1ZVxuICAgIGhpZGVNb3JlRm46IHRydWUsIC8vIGhpZGUgYmVsb3dGb2xkIGZ1bmN0aW9ucyBhbmQgXCJtb3JlXCIgJiBcImxlc3NcIiB0b2dnbGVzIGluIGZ1bmN0aW9uc2VsZWN0IGR1cmluZyB1c2VyIHN0dWRpZXNcbiAgICBkZWZhdWx0Q29uZmlnU2V0OiAnbGFyZ2UnLFxuICAgIGFwcElkOiAndmx1aScsXG4gICAgLy8gZW1iZWRkZWQgcG9sZXN0YXIgYW5kIHZveWFnZXIgd2l0aCBrbm93biBkYXRhXG4gICAgZW1iZWRkZWREYXRhOiB3aW5kb3cudmd1aURhdGEgfHwgdW5kZWZpbmVkLFxuICAgIHByaW9yaXR5OiB7XG4gICAgICBib29rbWFyazogMCxcbiAgICAgIHBvcHVwOiAwLFxuICAgICAgdmlzbGlzdDogMTAwMFxuICAgIH0sXG4gICAgbXlyaWFSZXN0OiAnaHR0cDovL2VjMi01Mi0xLTM4LTE4Mi5jb21wdXRlLTEuYW1hem9uYXdzLmNvbTo4NzUzJyxcbiAgICBkZWZhdWx0VGltZUZuOiAneWVhcicsXG4gICAgd2lsZGNhcmRGbjogdHJ1ZSxcbiAgICBoaWRlT3JkaW5hbFR5cGVTZWxlY3Q6IHRydWVcbiAgfSlcbiAgLmNvbmZpZyhmdW5jdGlvbihjcWwpIHtcbiAgICBjcWwuY29uZmlnLkRFRkFVTFRfUVVFUllfQ09ORklHLmNoYW5uZWxzID0gWyd4JywgJ3knLCAnY29sdW1uJywgJ3NpemUnLCAnY29sb3InXTtcbiAgICBjcWwuY29uZmlnLkRFRkFVTFRfUVVFUllfQ09ORklHLnN0eWxpemUgPSBmYWxzZTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZShcInZsdWlcIikucnVuKFtcIiR0ZW1wbGF0ZUNhY2hlXCIsIGZ1bmN0aW9uKCR0ZW1wbGF0ZUNhY2hlKSB7JHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLW15cmlhLWRhdGFzZXRcXFwiPjxwPlNlbGVjdCBhIGRhdGFzZXQgZnJvbSB0aGUgTXlyaWEgaW5zdGFuY2UgYXQgPGlucHV0IG5nLW1vZGVsPVxcXCJteXJpYVJlc3RVcmxcXFwiPjxidXR0b24gbmctY2xpY2s9XFxcImxvYWREYXRhc2V0cyhcXCdcXCcpXFxcIj51cGRhdGU8L2J1dHRvbj4uPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldChteXJpYURhdGFzZXQpXFxcIj48ZGl2PjxzZWxlY3QgbmFtZT1cXFwibXlyaWEtZGF0YXNldFxcXCIgaWQ9XFxcInNlbGVjdC1teXJpYS1kYXRhc2V0XFxcIiBuZy1kaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIG5nLW1vZGVsPVxcXCJteXJpYURhdGFzZXRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdGlvbk5hbWUoZGF0YXNldCkgZm9yIGRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0cyB0cmFjayBieSBkYXRhc2V0LnJlbGF0aW9uTmFtZVxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj5TZWxlY3QgRGF0YXNldC4uLjwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLXVybC1kYXRhc2V0XFxcIj48cD5BZGQgdGhlIG5hbWUgb2YgdGhlIGRhdGFzZXQgYW5kIHRoZSBVUkwgdG8gYSA8Yj5KU09OPC9iPiBvciA8Yj5DU1Y8L2I+ICh3aXRoIGhlYWRlcikgZmlsZS4gTWFrZSBzdXJlIHRoYXQgdGhlIGZvcm1hdHRpbmcgaXMgY29ycmVjdCBhbmQgY2xlYW4gdGhlIGRhdGEgYmVmb3JlIGFkZGluZyBpdC4gVGhlIGFkZGVkIGRhdGFzZXQgaXMgb25seSB2aXNpYmxlIHRvIHlvdS48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGRGcm9tVXJsKGFkZGVkRGF0YXNldClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtdXJsXFxcIj5VUkw8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC51cmxcXFwiIGlkPVxcXCJkYXRhc2V0LXVybFxcXCIgdHlwZT1cXFwidXJsXFxcIj48cD5NYWtlIHN1cmUgdGhhdCB5b3UgaG9zdCB0aGUgZmlsZSBvbiBhIHNlcnZlciB0aGF0IGhhcyA8Y29kZT5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW46ICo8L2NvZGU+IHNldC48L3A+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjaGFuZ2UtbG9hZGVkLWRhdGFzZXRcXFwiPjxkaXYgbmctaWY9XFxcInVzZXJEYXRhLmxlbmd0aFxcXCI+PGgzPlVwbG9hZGVkIERhdGFzZXRzPC9oMz48dWw+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiB1c2VyRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHNwYW4gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9zcGFuPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+PC9saT48L3VsPjwvZGl2PjxoMz5FeHBsb3JlIGEgU2FtcGxlIERhdGFzZXQ8L2gzPjx1bCBjbGFzcz1cXFwibG9hZGVkLWRhdGFzZXQtbGlzdFxcXCI+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiBzYW1wbGVEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+IDxlbSBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L2VtPjwvbGk+PC91bD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImRhdGFzZXQtbW9kYWxcXFwiIG1heC13aWR0aD1cXFwiODAwcHhcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDI+QWRkIERhdGFzZXQ8L2gyPjwvZGl2PjxkaXYgY2xhc3M9XFxcIm1vZGFsLW1haW5cXFwiPjx0YWJzZXQ+PHRhYiBoZWFkaW5nPVxcXCJDaGFuZ2UgRGF0YXNldFxcXCI+PGNoYW5nZS1sb2FkZWQtZGF0YXNldD48L2NoYW5nZS1sb2FkZWQtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIlBhc3RlIG9yIFVwbG9hZCBEYXRhXFxcIj48cGFzdGUtZGF0YXNldD48L3Bhc3RlLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIFVSTFxcXCI+PGFkZC11cmwtZGF0YXNldD48L2FkZC11cmwtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gTXlyaWFcXFwiPjxhZGQtbXlyaWEtZGF0YXNldD48L2FkZC1teXJpYS1kYXRhc2V0PjwvdGFiPjwvdGFic2V0PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbFwiLFwiPGJ1dHRvbiBpZD1cXFwic2VsZWN0LWRhdGFcXFwiIGNsYXNzPVxcXCJzbWFsbC1idXR0b24gc2VsZWN0LWRhdGFcXFwiIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldCgpO1xcXCI+Q2hhbmdlPC9idXR0b24+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcHpvbmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicGFzdGUtZGF0YVxcXCI+PGZpbGUtZHJvcHpvbmUgZGF0YXNldD1cXFwiZGF0YXNldFxcXCIgbWF4LWZpbGUtc2l6ZT1cXFwiMTBcXFwiIHZhbGlkLW1pbWUtdHlwZXM9XFxcIlt0ZXh0L2NzdiwgdGV4dC9qc29uLCB0ZXh0L3Rzdl1cXFwiPjxkaXYgY2xhc3M9XFxcInVwbG9hZC1kYXRhXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LWZpbGVcXFwiPkZpbGU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwiZmlsZVxcXCIgaWQ9XFxcImRhdGFzZXQtZmlsZVxcXCIgYWNjZXB0PVxcXCJ0ZXh0L2Nzdix0ZXh0L3RzdlxcXCI+PC9kaXY+PHA+VXBsb2FkIGEgQ1NWLCBvciBwYXN0ZSBkYXRhIGluIDxhIGhyZWY9XFxcImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvbW1hLXNlcGFyYXRlZF92YWx1ZXNcXFwiPkNTVjwvYT4gZm9ybWF0IGludG8gdGhlIGZpZWxkcy48L3A+PGRpdiBjbGFzcz1cXFwiZHJvcHpvbmUtdGFyZ2V0XFxcIj48cD5Ecm9wIENTViBmaWxlIGhlcmU8L3A+PC9kaXY+PC9kaXY+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJuYW1lXFxcIiBuZy1tb2RlbD1cXFwiZGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48dGV4dGFyZWEgbmctbW9kZWw9XFxcImRhdGFzZXQuZGF0YVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwieyB1cGRhdGVPbjogXFwnZGVmYXVsdCBibHVyXFwnLCBkZWJvdW5jZTogeyBcXCdkZWZhdWx0XFwnOiAxNywgXFwnYmx1clxcJzogMCB9fVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuICAgICAgPC90ZXh0YXJlYT48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGE8L2J1dHRvbj48L2Zvcm0+PC9maWxlLWRyb3B6b25lPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImFsZXJ0LWJveFxcXCIgbmctc2hvdz1cXFwiQWxlcnRzLmFsZXJ0cy5sZW5ndGggPiAwXFxcIj48ZGl2IGNsYXNzPVxcXCJhbGVydC1pdGVtXFxcIiBuZy1yZXBlYXQ9XFxcImFsZXJ0IGluIEFsZXJ0cy5hbGVydHNcXFwiPnt7IGFsZXJ0Lm1zZyB9fSA8YSBjbGFzcz1cXFwiY2xvc2VcXFwiIG5nLWNsaWNrPVxcXCJBbGVydHMuY2xvc2VBbGVydCgkaW5kZXgpXFxcIj4mdGltZXM7PC9hPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImJvb2ttYXJrLWxpc3RcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlciBjYXJkIG5vLXRvcC1tYXJnaW4gbm8tcmlnaHQtbWFyZ2luXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uIGNsb3NlLWFjdGlvbj1cXFwiQm9va21hcmtzLmxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxpc3QubGVuZ3RoIH19KTwvaDI+PGEgY2xhc3M9XFxcImJvb2ttYXJrLWxpc3QtdXRpbFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy5jbGVhcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdHJhc2gtb1xcXCI+PC9pPiBDbGVhciBhbGw8L2E+IDxhIGNsYXNzPVxcXCJib29rbWFyay1saXN0LXV0aWxcXFwiIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuZXhwb3J0KClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jbGlwYm9hcmRcXFwiPjwvaT4gRXhwb3J0PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGlzdC5sZW5ndGggPiAwXFxcIiBjbGFzcz1cXFwiaGZsZXggZmxleC13cmFwXFxcIiBzdi1yb290PVxcXCJcXFwiIHN2LXBhcnQ9XFxcIkJvb2ttYXJrcy5saXN0XFxcIiBzdi1vbi1zb3J0PVxcXCJCb29rbWFya3MucmVvcmRlcigpXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcImJvb2ttYXJrIGluIEJvb2ttYXJrcy5saXN0IHwgb3JkZXJPYmplY3RCeSA6IFxcJ3RpbWVBZGRlZFxcJyA6IGZhbHNlXFxcIiBjbGFzcz1cXFwid3JhcHBlZC12bC1wbG90LWdyb3VwIGNhcmRcXFwiIGxpc3QtdGl0bGU9XFxcIlxcJ0Jvb2ttYXJrXFwnXFxcIiBjaGFydD1cXFwiYm9va21hcmsuY2hhcnRcXFwiIGZpZWxkLXNldD1cXFwiYm9va21hcmsuY2hhcnQuZmllbGRTZXRcXFwiIHNob3ctZmlsdGVyLWluZm89XFxcInRydWVcXFwiIHNob3ctYm9va21hcms9XFxcInRydWVcXFwiIHNob3ctZGVidWc9XFxcImNvbnN0cy5kZWJ1Z1xcXCIgc2hvdy1leHBhbmQ9XFxcImZhbHNlXFxcIiBhbHdheXMtc2VsZWN0ZWQ9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJoaWdobGlnaHRlZFxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIHByaW9yaXR5PVxcXCJjb25zdHMucHJpb3JpdHkuYm9va21hcmtcXFwiIHNob3ctc2VsZWN0PVxcXCJ0cnVlXFxcIiBzdi1lbGVtZW50PVxcXCJcXFwiPjwvdmwtcGxvdC1ncm91cD48ZGl2IHN2LXBsYWNlaG9sZGVyPVxcXCJcXFwiPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWVtcHR5XFxcIiBuZy1pZj1cXFwiQm9va21hcmtzLmxpc3QubGVuZ3RoID09PSAwXFxcIj5Zb3UgaGF2ZSBubyBib29rbWFya3M8L2Rpdj48L2Rpdj48L21vZGFsPlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvY2hhbm5lbHByb3BlcnR5L2NoYW5uZWxwcm9wZXJ0eS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjaGFubmVsLXByb3BlcnR5IG1iNVxcXCI+PGRpdiBjbGFzcz1cXFwic2NhbGUtdHlwZVxcXCIgbmctaWY9XFxcImZpZWxkRGVmLnR5cGUgPT09IFxcJ3F1YW50aXRhdGl2ZVxcJyAmJiAhZmllbGREZWYuYmluXFxcIj48aDQ+U2NhbGUgVHlwZTwvaDQ+PGxhYmVsIGNsYXNzPVxcXCJjaGFubmVsLXByb3AtcmFkaW8tbGFiZWxcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcInVuZGVmaW5lZFxcXCIgbmctbW9kZWw9XFxcImZpZWxkRGVmLnNjYWxlLnR5cGVcXFwiIG5nLWNoYW5nZT1cXFwidHlwZUNoYW5nZWQoKVxcXCI+IExpbmVhcjwvbGFiZWw+IDxsYWJlbCBjbGFzcz1cXFwiY2hhbm5lbC1wcm9wLXJhZGlvLWxhYmVsXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJcXCdsb2dcXCdcXFwiIG5nLW1vZGVsPVxcXCJmaWVsZERlZi5zY2FsZS50eXBlXFxcIiBuZy1jaGFuZ2U9XFxcInR5cGVDaGFuZ2VkKClcXFwiPiBMb2c8L2xhYmVsPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNjYWxlLWRvbWFpblxcXCIgbmctaWY9XFxcImZpZWxkRGVmLnR5cGUgPT09IFxcJ3F1YW50aXRhdGl2ZVxcJyAmJiBmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnXFxcIj48aDQ+U2NhbGUgRG9tYWluPC9oND48bGFiZWw+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBuZy1tb2RlbD1cXFwidXNlUmF3RG9tYWluXFxcIiBuZy1jaGFuZ2U9XFxcInVzZVJhd0RvbWFpbkNoYW5nZSh1c2VSYXdEb21haW4pXFxcIj4gQWx3YXlzIGluY2x1ZGUgcmF3IG1pbiAmIG1heCB2YWx1ZXM8L2xhYmVsPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvY2hhbm5lbHNoZWxmL2NoYW5uZWxzaGVsZi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJzaGVsZi1ncm91cFxcXCI+PGRpdiBjbGFzcz1cXFwic2hlbGZcXFwiIG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6IGRpc2FibGVkIHx8ICFzdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspLCBcXCdhbnlcXCc6IGlzQW55Q2hhbm5lbH1cXFwiPjxkaXYgY2xhc3M9XFxcInNoZWxmLWxhYmVsXFxcIiBuZy1jbGFzcz1cXFwie2V4cGFuZGVkOiBwcm9wc0V4cGFuZGVkfVxcXCI+e3sgaXNBbnlDaGFubmVsID8gXFwnYW55XFwnIDogY2hhbm5lbElkIH19PC9kaXY+PGRpdiBjbGFzcz1cXFwiZmllbGQtZHJvcFxcXCIgbmctbW9kZWw9XFxcInBpbGxzW2NoYW5uZWxJZF1cXFwiIGRhdGEtZHJvcD1cXFwiIWRpc2FibGVkICYmIHN1cHBvcnRNYXJrKGNoYW5uZWxJZCwgbWFyaylcXFwiIGpxeW91aS1kcm9wcGFibGU9XFxcIntvbkRyb3A6XFwnZmllbGREcm9wcGVkXFwnfVxcXCIgZGF0YS1qcXlvdWktb3B0aW9ucz1cXFwie2FjdGl2ZUNsYXNzOiBcXCdkcm9wLWFjdGl2ZVxcJ31cXFwiPjxmaWVsZC1pbmZvIG5nLXNob3c9XFxcImVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGRcXFwiIG5nLWNsYXNzPVxcXCJ7IGV4cGFuZGVkOiBmdW5jc0V4cGFuZGVkLCBhbnk6IGlzQW55RmllbGQgfHwgaXNBbnlGdW5jdGlvbiwgXFwnZW51bWVyYXRlZC1maWVsZFxcJzogaXNFbnVtZXJhdGVkRmllbGQsIFxcJ2VudW1lcmF0ZWQtY2hhbm5lbFxcJzogaXNFbnVtZXJhdGVkQ2hhbm5lbCwgaGlnaGxpZ2h0ZWQ6IGlzSGlnaGxpZ2h0ZWQoY2hhbm5lbElkKSB9XFxcIiBmaWVsZC1kZWY9XFxcImVuY29kaW5nW2NoYW5uZWxJZF1cXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1jYXJldD1cXFwidHJ1ZVxcXCIgc2hvdy1lbnVtLXNwZWMtZm49XFxcInRydWVcXFwiIGRpc2FibGUtY2FyZXQ9XFxcImVuY29kaW5nW2NoYW5uZWxJZF0uYWdncmVnYXRlPT09XFwnY291bnRcXCcgfHwgIWhhc0Z1bmN0aW9uc1xcXCIgcG9wdXAtY29udGVudD1cXFwiZmllbGRJbmZvUG9wdXBDb250ZW50XFxcIiBzaG93LXJlbW92ZT1cXFwidHJ1ZVxcXCIgcmVtb3ZlLWFjdGlvbj1cXFwicmVtb3ZlRmllbGQoKVxcXCIgY2xhc3M9XFxcInNlbGVjdGVkIGRyYWdnYWJsZSBmdWxsLXdpZHRoXFxcIiBkYXRhLWRyYWc9XFxcInRydWVcXFwiIG5nLW1vZGVsPVxcXCJwaWxsc1tjaGFubmVsSWRdXFxcIiBqcXlvdWktZHJhZ2dhYmxlPVxcXCJ7b25TdGFydDogXFwnZmllbGREcmFnU3RhcnRcXCcsIG9uU3RvcDpcXCdmaWVsZERyYWdTdG9wXFwnfVxcXCIgZGF0YS1qcXlvdWktb3B0aW9ucz1cXFwie3JldmVydDogXFwnaW52YWxpZFxcJywgaGVscGVyOiBcXCdjbG9uZVxcJ31cXFwiPjwvZmllbGQtaW5mbz48c3BhbiBjbGFzcz1cXFwicGxhY2Vob2xkZXJcXFwiIG5nLWlmPVxcXCIhZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZFxcXCI+ZHJvcCBhIGZpZWxkIGhlcmU8L3NwYW4+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgc2hlbGYtcHJvcGVydGllcyBzaGVsZi1wcm9wZXJ0aWVzLXt7Y2hhbm5lbElkfX1cXFwiIG5nLXNob3c9XFxcImZhbHNlXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHNoZWxmLWZ1bmN0aW9ucyBzaGVsZi1mdW5jdGlvbnMte3tjaGFubmVsSWR9fVxcXCIgbmctaGlkZT1cXFwiIWhhc0Z1bmN0aW9uc1xcXCI+PGZ1bmN0aW9uLXNlbGVjdCBuZy1pZj1cXFwiIXByZXZpZXdcXFwiIGZpZWxkLWRlZj1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXVxcXCIgY2hhbm5lbC1pZD1cXFwiY2hhbm5lbElkXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueSAmJiBjb25zdHMud2lsZGNhcmRGblxcXCI+PC9mdW5jdGlvbi1zZWxlY3Q+PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9maWVsZGluZm8vZmllbGRpbmZvLmh0bWxcIixcIjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1pbmZvXFxcIj48c3BhbiBjbGFzcz1cXFwiaGZsZXggZnVsbC13aWR0aFxcXCIgbmctY2xpY2s9XFxcImNsaWNrZWQoJGV2ZW50KVxcXCI+PHNwYW4gY2xhc3M9XFxcInR5cGUtY2FyZXRcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiAhZGlzYWJsZUNhcmV0fVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNhcmV0LWRvd25cXFwiIG5nLXNob3c9XFxcInNob3dDYXJldFxcXCI+PC9pPiA8c3BhbiBjbGFzcz1cXFwidHlwZSBmYSB7e2ljb259fVxcXCIgbmctc2hvdz1cXFwic2hvd1R5cGVcXFwiIHRpdGxlPVxcXCJ7e3R5cGVOYW1lfX1cXFwiPjwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ1xcXCIgY2xhc3M9XFxcImZpZWxkLWluZm8tdGV4dFxcXCI+PHNwYW4gbmctaWY9XFxcImZ1bmMoZmllbGREZWYpXFxcIiBjbGFzcz1cXFwiZmllbGQtZnVuY1xcXCIgdGl0bGU9XFxcInt7IGZ1bmMoZmllbGREZWYpIH19XFxcIiBuZy1jbGFzcz1cXFwie2FueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZ1bmMoZmllbGREZWYpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGREZWYpLCBhbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyAoZmllbGREZWYudGl0bGUgfHwgZmllbGRUaXRsZShmaWVsZERlZikpIHwgdW5kZXJzY29yZTJzcGFjZSB9fTwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIndpbGRjYXJkLWZpZWxkLWNvdW50XFxcIj57eyBmaWVsZENvdW50KGZpZWxkRGVmLmZpZWxkKSB9fTwvc3Bhbj48L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJyB8fCBmaWVsZERlZi5hdXRvQ291bnRcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+PHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwibm8tc2hyaW5rIGZpbHRlclxcXCIgbmctc2hvdz1cXFwic2hvd0ZpbHRlclxcXCI+PGEgY2xhc3M9XFxcImZpbHRlci1maWVsZFxcXCIgbmctY2xpY2s9XFxcImZpbHRlckFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+PC9hPjwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcIm5vLXNocmluayBhZGRcXFwiIG5nLXNob3c9XFxcInNob3dBZGRcXFwiPjxhIGNsYXNzPVxcXCJhZGQtZmllbGRcXFwiIG5nLWNsaWNrPVxcXCJhZGRBY3Rpb24oKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXBsdXNcXFwiPjwvaT48L2E+PC9zcGFuPjwvc3Bhbj48L3NwYW4+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9mdW5jdGlvbnNlbGVjdC9mdW5jdGlvbnNlbGVjdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJmdW5jdGlvbi1zZWxlY3QgbWI1XFxcIiBuZy1pZj1cXFwiZnVuYy5saXN0LmFib3ZlRm9sZC5sZW5ndGggPiAxIHx8IGZ1bmMubGlzdC5hYm92ZUZvbGRbMF0gIT09IHVuZGVmaW5lZFxcXCIgbmctY2xhc3M9XFxcInt3aWxkY2FyZDogZnVuYy5pc0FueX1cXFwiPjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIiBuZy1pZj1cXFwic3VwcG9ydEFueVxcXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImZ1bmMuaXNBbnlcXFwiIG5nLWNoYW5nZT1cXFwiaXNBbnlDaGFuZ2VkKClcXFwiPiBXaWxkY2FyZDwvbGFiZWw+PC9kaXY+PGg0PkZ1bmN0aW9uPC9oND48ZGl2IGNsYXNzPVxcXCJyYWRpb3NcXFwiIG5nLWlmPVxcXCIhZnVuYy5pc0FueSB8fCAhc3VwcG9ydEFueVxcXCI+PGRpdj48bGFiZWwgY2xhc3M9XFxcImZ1bmMtbGFiZWwgZmllbGQtZnVuY1xcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5hYm92ZUZvbGRcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcImZcXFwiIG5nLW1vZGVsPVxcXCJmdW5jLnNlbGVjdGVkXFxcIiBuZy1jaGFuZ2U9XFxcInNlbGVjdENoYW5nZWQoKVxcXCI+IHt7ZiB8fCBcXCdOT05FXFwnfX08L2xhYmVsPjwvZGl2PjxkaXYgbmctc2hvdz1cXFwic2hvd0FsbEZ1bmN0aW9uc1xcXCI+PGxhYmVsIGNsYXNzPVxcXCJmdW5jLWxhYmVsIGZpZWxkLWZ1bmNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnc2luZ2xlLWNvbHVtblxcJzogZnVuYy5pc1RlbXBvcmFsfVxcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5iZWxvd0ZvbGRcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcImZcXFwiIG5nLW1vZGVsPVxcXCJmdW5jLnNlbGVjdGVkXFxcIiBuZy1jaGFuZ2U9XFxcInNlbGVjdENoYW5nZWQoKVxcXCI+IHt7Zn19PC9sYWJlbD48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJjaGVja2JveGVzXFxcIiBuZy1pZj1cXFwiZnVuYy5pc0FueSAmJiBzdXBwb3J0QW55XFxcIj48ZGl2PjxsYWJlbCBjbGFzcz1cXFwiZnVuYy1sYWJlbCBmaWVsZC1mdW5jXFxcIiBuZy1yZXBlYXQ9XFxcImYgaW4gZnVuYy5saXN0LmFib3ZlRm9sZFxcXCI+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5jaGVja2VkW2ZdXFxcIiBuZy1jaGFuZ2U9XFxcImNoZWNrQ2hhbmdlZCgpXFxcIj4ge3tmIHx8IFxcJ05PTkVcXCd9fTwvbGFiZWw+PC9kaXY+PGRpdiBuZy1zaG93PVxcXCJzaG93QWxsRnVuY3Rpb25zXFxcIj48bGFiZWwgY2xhc3M9XFxcImZ1bmMtbGFiZWwgZmllbGQtZnVuY1xcXCIgbmctY2xhc3M9XFxcIntcXCdzaW5nbGUtY29sdW1uXFwnOiBmdW5jLmlzVGVtcG9yYWx9XFxcIiBuZy1yZXBlYXQ9XFxcImYgaW4gZnVuYy5saXN0LmJlbG93Rm9sZFxcXCI+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5jaGVja2VkW2ZdXFxcIiBuZy1jaGFuZ2U9XFxcImNoZWNrQ2hhbmdlZCgpXFxcIj4ge3tmfX08L2xhYmVsPjwvZGl2PjwvZGl2PjxkaXYgbmctaGlkZT1cXFwiaGlkZU1vcmVGbiB8fCBmdW5jLmlzQ291bnQgfHwgZnVuYy5saXN0LmJlbG93Rm9sZC5sZW5ndGggPT0gMFxcXCIgY2xhc3M9XFxcImV4cGFuZC1jb2xsYXBzZVxcXCI+PGEgbmctY2xpY2s9XFxcInNob3dBbGxGdW5jdGlvbnM9IXNob3dBbGxGdW5jdGlvbnNcXFwiPjxzcGFuIG5nLXNob3c9XFxcIiFzaG93QWxsRnVuY3Rpb25zXFxcIj5tb3JlIDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1kb3duXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9pPjwvc3Bhbj4gPHNwYW4gbmctc2hvdz1cXFwic2hvd0FsbEZ1bmN0aW9uc1xcXCI+bGVzcyA8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtdXBcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+PC9zcGFuPjwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2ZpbHRlci9jYXRlZ29yaWNhbGZpbHRlci5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjYXRlZ29yaWNhbC1maWx0ZXItYm94IGZpbHRlci1ib3hcXFwiPjxkaXYgY2xhc3M9XFxcImFjdGlvbnNcXFwiPjxkaXYgY2xhc3M9XFxcInJpZ2h0IHNlbGVjdGVkLXN0YXR1c1xcXCI+KHt7ZmlsdGVyLmluLmxlbmd0aH19L3t7dmFsdWVzLmxlbmd0aH19IHNlbGVjdGVkKTwvZGl2PjxhIG5nLWNsaWNrPVxcXCJzZWxlY3RBbGwoKVxcXCIgY2xhc3M9XFxcInNlbGVjdC1hbGxcXFwiPlNlbGVjdCBBbGw8L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmFsdWVzIHNjcm9sbC15IG5vLXNjcm9sbC14XFxcIj48ZGl2IG5nLXJlcGVhdD1cXFwidmFsIGluIHZhbHVlc1xcXCIgbmctbW91c2VlbnRlcj1cXFwic2hvd0tlZXBPbmx5PXRydWVcXFwiIG5nLW1vdXNlbGVhdmU9XFxcInNob3dLZWVwT25seT1mYWxzZVxcXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImluY2x1ZGVbc3RyaW5naWZ5KHZhbCldXFxcIiBuZy1jaGFuZ2U9XFxcImZpbHRlckNoYW5nZSgpXFxcIj4ge3t2YWwrXFwnXFwnfX08L2xhYmVsPiA8YSBuZy1zaG93PVxcXCJzaG93S2VlcE9ubHlcXFwiIG5nLWluaXQ9XFxcInNob3dLZWVwT25seT1mYWxzZVxcXCIgY2xhc3M9XFxcInJpZ2h0IGtlZXAtb25seVxcXCIgbmctY2xpY2s9XFxcImtlZXBPbmx5KHZhbClcXFwiPktlZXAgT25seTwvYT48L2Rpdj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2ZpbHRlci9maWx0ZXJzaGVsdmVzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInJpZ2h0XFxcIj48c2VsZWN0IG5hbWU9XFxcInNpbmdsZVNlbGVjdFxcXCIgbmctbW9kZWw9XFxcInNwZWMudHJhbnNmb3JtLmZpbHRlckludmFsaWRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdC52YWx1ZSBhcyBvcHQubGFiZWwgZm9yIG9wdCBpbiBmaWx0ZXJJbnZhbGlkT3B0aW9uc1xcXCIgbmctY2hhbmdlPVxcXCJmaWx0ZXJJbnZhbGlkQ2hhbmdlZCgpXFxcIj48L3NlbGVjdD48L2Rpdj48aDI+RmlsdGVyPC9oMj48ZGl2IGNsYXNzPVxcXCJmaWx0ZXItYWJzb2x1dGUtY29udGFpbmVyIHNjcm9sbC15IG5vLXNjcm9sbC14XFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1ncm91cFxcXCIgbmctcmVwZWF0PVxcXCIoZmllbGQsIGZpbHRlcikgaW4gZmlsdGVyTWFuYWdlci5maWx0ZXJJbmRleFxcXCIgbmctaWY9XFxcImZpbHRlci5lbmFibGVkXFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZiBmaWx0ZXItc2hlbGZcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLWRyb3BcXFwiPjxmaWVsZC1pbmZvIG5nLWNsYXNzPVxcXCJ7ZXhwYW5kZWQ6IGZ1bmNzRXhwYW5kZWR9XFxcIiBmaWVsZC1kZWY9XFxcIntmaWVsZDogZmllbGR9XFxcIiBzaG93LXR5cGU9XFxcInRydWVcXFwiIHNob3ctcmVtb3ZlPVxcXCJ0cnVlXFxcIiByZW1vdmUtYWN0aW9uPVxcXCJyZW1vdmVGaWx0ZXIoZmllbGQpXFxcIiBjbGFzcz1cXFwic2VsZWN0ZWQgZnVsbC13aWR0aFxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxjYXRlZ29yaWNhbC1maWx0ZXIgZmllbGQ9XFxcImZpZWxkXFxcIiBmaWx0ZXI9XFxcImZpbHRlclxcXCIgbmctaWY9XFxcImZpbHRlclR5cGUoZmllbGQpID09PSBcXCdjYXRlZ29yaWNhbFxcJ1xcXCI+PC9jYXRlZ29yaWNhbC1maWx0ZXI+PHF1YW50aXRhdGl2ZS1maWx0ZXIgZmllbGQ9XFxcImZpZWxkXFxcIiBmaWx0ZXI9XFxcImZpbHRlclxcXCIgbmctaWY9XFxcImZpbHRlclR5cGUoZmllbGQpID09PSBcXCdxdWFudGl0YXRpdmVcXCdcXFwiPjwvcXVhbnRpdGF0aXZlLWZpbHRlcj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmaWx0ZXItZHJvcFxcXCIgbmctbW9kZWw9XFxcImRyb3BwZWRGaWVsZERlZlxcXCIgZGF0YS1kcm9wPVxcXCJ0cnVlXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj5Ecm9wIGEgZmllbGQgaGVyZS48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2ZpbHRlci9xdWFudGl0YXRpdmVmaWx0ZXIuaHRtbFwiLFwiPGRpdiBuZy1jbGFzcz1cXFwie3RpbWU6IHR5cGU9PT1cXCd0ZW1wb3JhbFxcJ31cXFwiPjxkaXY+PHNwYW4gY2xhc3M9XFxcInJpZ2h0IGRvbWFpbi1sYWJlbFxcXCI+e3sgZG9tYWluTWF4VGV4dCB8fCBkb21haW5NYXh9fTwvc3Bhbj4gPHNwYW4gY2xhc3M9XFxcImRvbWFpbi1sYWJlbFxcXCI+e3sgZG9tYWluTWluVGV4dCB8fCBkb21haW5NaW59fTwvc3Bhbj48L2Rpdj48ZGl2IHJhbmdlLXNsaWRlcj1cXFwiXFxcIiBtaW49XFxcImRvbWFpbk1pblxcXCIgbWF4PVxcXCJkb21haW5NYXhcXFwiIG1vZGVsLW1pbj1cXFwibG9jYWxNaW5cXFwiIG1vZGVsLW1heD1cXFwibG9jYWxNYXhcXFwiIHNob3ctdmFsdWVzPVxcXCJ0cnVlXFxcIiBhdHRhY2gtaGFuZGxlLXZhbHVlcz1cXFwidHJ1ZVxcXCIgb24taGFuZGxlLXVwPVxcXCJ1cGRhdGVSYW5nZSgpXFxcIj48L2Rpdj48ZGl2IG5nLXNob3c9XFxcInR5cGU9PT1cXCd0ZW1wb3JhbFxcJ1xcXCI+PHNwYW4gY2xhc3M9XFxcInJpZ2h0IHZhbHVlLWxhYmVsXFxcIj57eyBsb2NhbE1heFRleHQgfX08L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJ2YWx1ZS1sYWJlbFxcXCI+e3sgbG9jYWxNaW5UZXh0IH19PC9zcGFuPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PGEgbmctY2xpY2s9XFxcImNsb3NlTW9kYWwoKVxcXCIgY2xhc3M9XFxcInJpZ2h0XFxcIj5DbG9zZTwvYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmh0bWxcIixcIjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJwcm9wLWxhYmVsXFxcIiBmb3I9XFxcInt7IGlkIH19XFxcIj48c3BhbiBjbGFzcz1cXFwibmFtZVxcXCIgdGl0bGU9XFxcInt7IHByb3BOYW1lIH19XFxcIj57eyBwcm9wTmFtZSB9fTwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImRlc2NyaXB0aW9uXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPHN0cm9uZz57eyBwcm9wTmFtZSB9fTwvc3Ryb25nPjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPnt7IGRlc2NyaXB0aW9uIH19PC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L3NwYW4+PC9sYWJlbD48Zm9ybSBjbGFzcz1cXFwiaW5saW5lLWJsb2NrXFxcIiBuZy1zd2l0Y2g9XFxcInR5cGUgKyAoZW51bSAhPT0gdW5kZWZpbmVkID8gXFwnbGlzdFxcJyA6IFxcJ1xcJylcXFwiPjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJib29sZWFuXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIj48c2VsZWN0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcInN0cmluZ2xpc3RcXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLW9wdGlvbnM9XFxcImNob2ljZSBmb3IgY2hvaWNlIGluIGVudW0gdHJhY2sgYnkgY2hvaWNlXFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiPjwvc2VsZWN0PjxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJpbnRlZ2VyXFxcIiBuZy1hdHRyLXR5cGU9XFxcInt7IGlzUmFuZ2UgPyBcXCdyYW5nZVxcJyA6IFxcJ251bWJlclxcJ319XFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDIwMH1cXFwiIG5nLWF0dHItbWluPVxcXCJ7e21pbn19XFxcIiBuZy1hdHRyLW1heD1cXFwie3ttYXh9fVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIiBuZy1hdHRyLXRpdGxlPVxcXCJ7eyBpc1JhbmdlID8gZ3JvdXBbcHJvcE5hbWVdIDogdW5kZWZpbmVkIH19XFxcIj4gPGlucHV0IGlkPVxcXCJ7eyBpZCB9fVxcXCIgbmctYXR0ci10eXBlPVxcXCJ7eyByb2xlID09PSBcXCdjb2xvclxcJyA/IFxcJ2NvbG9yXFwnIDogXFwnc3RyaW5nXFwnIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwic3RyaW5nXFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7ZGVib3VuY2U6IDUwMH1cXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCI+IDxzbWFsbCBuZy1pZj1cXFwiaGFzQXV0b1xcXCI+PGxhYmVsPkF1dG8gPGlucHV0IG5nLW1vZGVsPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIj48L2xhYmVsPjwvc21hbGw+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNjaGVtYSBuby10b3AtbWFyZ2luIGZ1bGwtd2lkdGhcXFwiPjxzY2hlbWEtbGlzdC1pdGVtIG5nLXJlcGVhdD1cXFwiZmllbGREZWYgaW4gZmllbGREZWZzIHwgb3JkZXJCeSA6IG9yZGVyQnlcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIGZpbHRlci1tYW5hZ2VyPVxcXCJmaWx0ZXJNYW5hZ2VyXFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCI+PC9zY2hlbWEtbGlzdC1pdGVtPjxzY2hlbWEtbGlzdC1pdGVtIG5nLWlmPVxcXCJzaG93Q291bnRcXFwiIGZpZWxkLWRlZj1cXFwiY291bnRGaWVsZERlZlxcXCIgc2hvdy1hZGQ9XFxcInRydWVcXFwiPjwvc2NoZW1hLWxpc3QtaXRlbT48ZGl2IGNsYXNzPVxcXCJzY2hlbWEtbGlzdC1kcm9wXFxcIiBuZy1zaG93PVxcXCJzaG93RHJvcFxcXCIgbmctbW9kZWw9XFxcImRyb3BwZWRGaWVsZERlZlxcXCIgZGF0YS1kcm9wPVxcXCJ0cnVlXFxcIiBqcXlvdWktZHJvcHBhYmxlPVxcXCJ7b25Ecm9wOlxcJ2ZpZWxkRHJvcHBlZFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcInthY3RpdmVDbGFzczogXFwnZHJvcC1hY3RpdmVcXCd9XFxcIj5DcmVhdGUgYSBuZXcgd2lsZGNhcmQuPC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNjaGVtYS1saXN0LWl0ZW1cXFwiIG5nLW1vZGVsPVxcXCJkcm9wcGVkRmllbGREZWZcXFwiIGRhdGEtZHJvcD1cXFwiaXNBbnlGaWVsZCAmJiBmaWVsZERlZi5maWVsZCAhPT0gXFwnP1xcJ1xcXCIganF5b3VpLWRyb3BwYWJsZT1cXFwie29uRHJvcDpcXCdmaWVsZERyb3BwZWRcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7YWN0aXZlQ2xhc3M6IFxcJ2Ryb3AtYWN0aXZlXFwnfVxcXCI+PGZpZWxkLWluZm8gbmctc2hvdz1cXFwiIWlzQW55RmllbGQgfHwgZmllbGREZWYuZmllbGQgPT09IFxcJz9cXCcgfHwgZmllbGREZWYuZmllbGQuZW51bS5sZW5ndGggPiAwXFxcIiBjbGFzcz1cXFwicGlsbCBkcmFnZ2FibGUgZnVsbC13aWR0aCBuby1yaWdodC1tYXJnaW5cXFwiIG5nLWNsYXNzPVxcXCJ7YW55OiBpc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKX1cXFwiIG5nLWRibGNsaWNrPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIG5nLW1vZGVsPVxcXCJwaWxsXFxcIiBkYXRhLWRyYWc9XFxcInRydWVcXFwiIGpxeW91aS1kcmFnZ2FibGU9XFxcIntwbGFjZWhvbGRlcjogXFwna2VlcFxcJywgZGVlcENvcHk6IHRydWUsIG9uU3RhcnQ6IFxcJ2ZpZWxkRHJhZ1N0YXJ0XFwnLCBvblN0b3A6XFwnZmllbGREcmFnU3RvcFxcJ31cXFwiIGRhdGEtanF5b3VpLW9wdGlvbnM9XFxcIntyZXZlcnQ6IFxcJ2ludmFsaWRcXCcsIGhlbHBlcjogXFwnY2xvbmVcXCd9XFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCIgc2hvdy1jYXJldD1cXFwidHJ1ZVxcXCIgZGlzYWJsZS1jYXJldD1cXFwiZmllbGREZWYuaW1tdXRhYmxlIHx8IGZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gXFwnY291bnRcXCcgfHwgYWxsb3dlZFR5cGVzLmxlbmd0aDw9MVxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBhZGQtYWN0aW9uPVxcXCJmaWVsZEFkZChmaWVsZERlZilcXFwiIHNob3ctZmlsdGVyPVxcXCIhZmlsdGVyTWFuYWdlclxcXCIgZmlsdGVyLWFjdGlvbj1cXFwidG9nZ2xlRmlsdGVyKClcXFwiIHVzZS10aXRsZT1cXFwidHJ1ZVxcXCIgcG9wdXAtY29udGVudD1cXFwiZmllbGRJbmZvUG9wdXBDb250ZW50XFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgc2NoZW1hLW1lbnVcXFwiIG5nLWhpZGU9XFxcIiFhbGxvd2VkVHlwZXMgfHwgYWxsb3dlZFR5cGVzLmxlbmd0aDw9MVxcXCI+PGRpdiBjbGFzcz1cXFwibWI1IGZpZWxkLXR5cGVcXFwiIG5nLWlmPVxcXCJhbGxvd2VkVHlwZXMubGVuZ3RoPjEgJiYgIWlzQW55RmllbGRcXFwiPjxoND5UeXBlPC9oND48bGFiZWwgY2xhc3M9XFxcInR5cGUtbGFiZWxcXFwiIG5nLXJlcGVhdD1cXFwidHlwZSBpbiBhbGxvd2VkVHlwZXNcXFwiIG5nLWlmPVxcXCJ0eXBlICE9PSBcXCdvcmRpbmFsXFwnIHx8ICFjb25zdHMuaGlkZU9yZGluYWxUeXBlU2VsZWN0XFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJ0eXBlXFxcIiBuZy1tb2RlbD1cXFwiZmllbGREZWYudHlwZVxcXCI+IHt7dHlwZX19PC9sYWJlbD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ3aWxkY2FyZC1tZW51XFxcIiBuZy1zaG93PVxcXCJpc0FueUZpZWxkICYmIGZpZWxkRGVmLmZpZWxkLmVudW1cXFwiPjxkaXY+PGxhYmVsIGNsYXNzPVxcXCJ3aWxkY2FyZC10aXRsZS1sYWJlbFxcXCI+PGg0Pk5hbWU8L2g0PjxpbnB1dCB0eXBlPVxcXCJ0ZXh0XFxcIiBuZy1tb2RlbD1cXFwiZmllbGREZWYudGl0bGVcXFwiIHBsYWNlaG9sZGVyPVxcXCJ7e2ZpZWxkVGl0bGUoZmllbGREZWYuZmllbGQpfX1cXFwiPjwvbGFiZWw+PC9kaXY+PGg0PldpbGRjYXJkIEZpZWxkczwvaDQ+PGRpdiBjbGFzcz1cXFwid2lsZGNhcmQtZmllbGRzXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkIGluIGZpZWxkRGVmLmZpZWxkLmVudW1cXFwiIGNsYXNzPVxcXCJwaWxsIGxpc3QtaXRlbSBmdWxsLXdpZHRoIG5vLXJpZ2h0LW1hcmdpblxcXCIgZmllbGQtZGVmPVxcXCJmaWVsZCA9PT0gXFwnKlxcJyA/IGNvdW50RmllbGREZWYgOiBEYXRhc2V0LnNjaGVtYS5maWVsZFNjaGVtYShmaWVsZClcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1yZW1vdmU9XFxcInRydWVcXFwiIHJlbW92ZS1hY3Rpb249XFxcInJlbW92ZVdpbGRjYXJkRmllbGQoJGluZGV4KVxcXCI+PC9maWVsZC1pbmZvPjwvZGl2PjxhIGNsYXNzPVxcXCJyZW1vdmUtYWN0aW9uXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlV2lsZGNhcmQoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRpbWVzXFxcIj48L2k+IERlbGV0ZSBXaWxkY2FyZDwvYT48L2Rpdj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjYXJkIHZmbGV4IHNoZWx2ZXMgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW4gYWJzLTEwMFxcXCI+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1lbmNvZGluZy1wYW5lIGZ1bGwtd2lkdGhcXFwiPjxhIGNsYXNzPVxcXCJyaWdodFxcXCIgbmctY2xpY2s9XFxcImNsZWFyKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1lcmFzZXJcXFwiPjwvaT4gQ2xlYXI8L2E+PGgyPkVuY29kaW5nPC9oMj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1wYW5lIHNoZWxmLXBvc2l0aW9uYWwtcGFuZSBmdWxsLXdpZHRoXFxcIj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCd4XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3lcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnY29sdW1uXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCIgZGlzYWJsZWQ9XFxcIiFzcGVjLmVuY29kaW5nLnguZmllbGRcXFwiPj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwncm93XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgc3VwcG9ydC1hbnk9XFxcInN1cHBvcnRBbnlcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCIgZGlzYWJsZWQ9XFxcIiFzcGVjLmVuY29kaW5nLnkuZmllbGRcXFwiPjwvY2hhbm5lbC1zaGVsZj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1wYW5lIHNoZWxmLW1hcmtzLXBhbmUgZnVsbC13aWR0aFxcXCI+PGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxzZWxlY3QgY2xhc3M9XFxcIm1hcmtzZWxlY3RcXFwiIG5nLW1vZGVsPVxcXCJzcGVjLm1hcmtcXFwiIG5nLWNsYXNzPVxcXCJ7YXV0bzogc3BlYy5tYXJrID09PSBBTll9XFxcIiBuZy1vcHRpb25zPVxcXCIodHlwZSA9PT0gQU5ZID8gXFwnYXV0b1xcJyA6IHR5cGUpIGZvciB0eXBlIGluIChzdXBwb3J0QW55IHx8IHN1cHBvcnRBdXRvTWFyayA/IG1hcmtzV2l0aEFueSA6IG1hcmtzKVxcXCIgbmctY2hhbmdlPVxcXCJtYXJrQ2hhbmdlKClcXFwiPjwvc2VsZWN0PjwvZGl2PjxoMz5NYXJrczwvaDM+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnc2l6ZVxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdjb2xvclxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdzaGFwZVxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdkZXRhaWxcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwndGV4dFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIHN1cHBvcnQtYW55PVxcXCJzdXBwb3J0QW55XFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJzaGVsZi1wYW5lIHNoZWxmLWFueS1wYW5lIGZ1bGwtd2lkdGhcXFwiIG5nLWlmPVxcXCJzdXBwb3J0QW55ICYmICghcHJldmlldyB8fCBzcGVjLmVuY29kaW5nW1xcJ19fQU5ZX18wXFwnXSlcXFwiPjxicj48Y2hhbm5lbC1zaGVsZiBuZy1yZXBlYXQ9XFxcImNoYW5uZWxJZCBpbiBhbnlDaGFubmVsSWRzXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBjaGFubmVsLWlkPVxcXCJjaGFubmVsSWRcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBzdXBwb3J0LWFueT1cXFwic3VwcG9ydEFueVxcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1maWx0ZXItcGFuZSBmdWxsLXdpZHRoXFxcIiBuZy1pZj1cXFwiIXByZXZpZXdcXFwiPjxmaWx0ZXItc2hlbHZlcyBzcGVjPVxcXCJzcGVjXFxcIj48L2ZpbHRlci1zaGVsdmVzPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWJzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidGFiLWNvbnRhaW5lclxcXCI+PGRpdj48YSBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3ZscGxvdC92bHBsb3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdFxcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIGhlaWdodCA+IHZsUGxvdEhlaWdodCgpICYmIHdpZHRoID4gdmxQbG90V2lkdGgoKSwgXFwnb3ZlcmZsb3cteVxcJzogKGFsd2F5c1Njcm9sbGFibGUgfHwgb3ZlcmZsb3cpICYmIGhlaWdodCA+IHZsUGxvdEhlaWdodCgpLCBcXCdvdmVyZmxvdy14XFwnOiAoYWx3YXlzU2Nyb2xsYWJsZSB8fCBvdmVyZmxvdykgJiYgd2lkdGggPiB2bFBsb3RXaWR0aCgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZWVudGVyPVxcXCJtb3VzZWVudGVyKClcXFwiIG5nLW1vdXNlbGVhdmU9XFxcIm1vdXNlbGVhdmUoKVxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIHZmbGV4XFxcIj48ZGl2IG5nLXNob3c9XFxcInNob3dFeHBhbmQgfHwgZmllbGRTZXQgfHwgc2hvd1RyYW5zcG9zZSB8fCBzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkIHx8IHNob3dUb2dnbGVcXFwiIGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwLWhlYWRlciBuby1zaHJpbmtcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLXNldC1pbmZvXFxcIiBuZy1tb3VzZWVudGVyPVxcXCJlbmFibGVQcmV2aWV3KClcXFwiIG5nLW1vdXNlbGVhdmU9XFxcImRpc2FibGVQcmV2aWV3KClcXFwiPjxmaWVsZC1pbmZvIG5nLXJlcGVhdD1cXFwiZmllbGREZWYgaW4gZmllbGRTZXRcXFwiIG5nLWlmPVxcXCJmaWVsZFNldCAmJiAoZmllbGREZWYuZmllbGQgfHwgZmllbGREZWYuYXV0b0NvdW50KVxcXCIgZmllbGQtZGVmPVxcXCJmaWVsZERlZlxcXCIgZW51bS1zcGVjLWluZGV4PVxcXCJjaGFydC5lbnVtU3BlY0luZGV4XFxcIiBzaG93LXR5cGU9XFxcInRydWVcXFwiIG5nLWNsYXNzPVxcXCJ7IHNlbGVjdGVkOiBhbHdheXNTZWxlY3RlZCB8fCAoaXNTZWxlY3RlZCAmJiBpc1NlbGVjdGVkKGZpZWxkRGVmLmZpZWxkKSksIHVuc2VsZWN0ZWQ6IGlzU2VsZWN0ZWQgJiYgIWlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpLCBoaWdobGlnaHRlZDogKGhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdLCBcXCdlbnVtZXJhdGVkLWZpZWxkXFwnOiBpc0VudW1lcmF0ZWRGaWVsZChjaGFydCwgJGluZGV4KSwgXFwnZW51bWVyYXRlZC1jaGFubmVsXFwnOiBpc0VudW1lcmF0ZWRDaGFubmVsKGNoYXJ0LCAkaW5kZXgpIH1cXFwiIG5nLW1vdXNlZW50ZXI9XFxcImZpZWxkSW5mb01vdXNlb3ZlcihmaWVsZERlZiwgJGluZGV4KVxcXCIgbmctbW91c2VsZWF2ZT1cXFwiZmllbGRJbmZvTW91c2VvdXQoZmllbGREZWYsICRpbmRleClcXFwiPjwvZmllbGQtaW5mbz48L2Rpdj48aSBuZy1pZj1cXFwic2hvd0ZpbHRlckluZm8gJiYgaGFzRmlsdGVyXFxcIiB0aXRsZT1cXFwie3tmaWx0ZXJJbmZvfX1cXFwiIGNsYXNzPVxcXCJmYSBmYS1maWx0ZXIgZmlsdGVyLWluZm9cXFwiPjwvaT48ZGl2IHN0eWxlPVxcXCJmbGV4LWdyb3c6MVxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwidG9vbGJveFxcXCI+PGEgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWdcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtd3JlbmNoXFxcIiBuZy1jbGljaz1cXFwic2hDb3BpZWQ9XFwnXFwnOyB2bENvcGllZD1cXCdcXCc7IHZnQ29waWVkPVxcJ1xcJztcXFwiIG5nLW1vdXNlb3Zlcj1cXFwiaW5pdGlhbGl6ZVBvcHVwKCk7XFxcIj48L2k+PC9hPjx2bC1wbG90LWdyb3VwLXBvcHVwIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnICYmIHJlbmRlclBvcHVwXFxcIj48L3ZsLXBsb3QtZ3JvdXAtcG9wdXA+PGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFgtU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TG9nIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFktU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneVxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy11cFxcXCI+PC9pPiA8c21hbGw+TG9nIFk8L3NtYWxsPjwvYT4gPGEgbmctc2hvdz1cXFwic2hvd0F4aXNQcm9wICYmICgoKGNoYXJ0LnZsU3BlYyB8fCB7fSkuZW5jb2Rpbmd8fHt9KS54fHx7fSkudHlwZSA9PT0gXFwncXVhbnRpdGF0aXZlXFwnXFxcIiBjbGFzcz1cXFwiY29tbWFuZCB4LXByb3AtdG9nZ2xlXFxcIiB0aXRsZT1cXFwiWC1BeGlzIFByb3BlcnRpZXNcXFwiIG5nLWNsaWNrPVxcXCJcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXJpZ2h0XFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5YLUF4aXM8L3NtYWxsPiA8aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCI+PC9pPjwvYT4gPGEgbmctc2hvdz1cXFwic2hvd0F4aXNQcm9wICYmICgoKGNoYXJ0LnZsU3BlYyB8fCB7fSkuZW5jb2Rpbmd8fHt9KS55fHx7fSkudHlwZSA9PT0gXFwncXVhbnRpdGF0aXZlXFwnXFxcIiBjbGFzcz1cXFwiY29tbWFuZCB5LXByb3AtdG9nZ2xlXFxcIiB0aXRsZT1cXFwiWS1BeGlzIFByb3BlcnRpZXNcXFwiIG5nLWNsaWNrPVxcXCJcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXVwXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5ZLUF4aXM8L3NtYWxsPiA8aSBjbGFzcz1cXFwiZmEgZmEtY2FyZXQtZG93blxcXCI+PC9pPjwvYT48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSB4LXByb3AtcG9wdXAgYXhpcy1wcm9wLXBvcHVwXFxcIiBuZy1zaG93PVxcXCIoKChjaGFydC52bFNwZWMgfHwge30pLmVuY29kaW5nfHx7fSkueHx8e30pLnR5cGUgPT09IFxcJ3F1YW50aXRhdGl2ZVxcJ1xcXCI+PGNoYW5uZWwtcHJvcGVydHkgbmctaWY9XFxcIigoY2hhcnQudmxTcGVjIHx8IHt9KS5lbmNvZGluZ3x8e30pLnhcXFwiIGNoYW5uZWwtaWQ9XFxcIlxcJ3hcXCdcXFwiIGZpZWxkLWRlZj1cXFwiY2hhcnQudmxTcGVjLmVuY29kaW5nLnhcXFwiIHRvZ2dsZS1zaGVsZj1cXFwidG9nZ2xlU2hlbGZcXFwiPjwvY2hhbm5lbC1wcm9wZXJ0eT48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSB5LXByb3AtcG9wdXAgYXhpcy1wcm9wLXBvcHVwXFxcIiBuZy1zaG93PVxcXCIoKChjaGFydC52bFNwZWMgfHwge30pLmVuY29kaW5nfHx7fSkueXx8e30pLnR5cGUgPT09IFxcJ3F1YW50aXRhdGl2ZVxcJ1xcXCI+PGNoYW5uZWwtcHJvcGVydHkgbmctaWY9XFxcIigoY2hhcnQudmxTcGVjIHx8IHt9KS5lbmNvZGluZ3x8e30pLnlcXFwiIGNoYW5uZWwtaWQ9XFxcIlxcJ3lcXCdcXFwiIGZpZWxkLWRlZj1cXFwiY2hhcnQudmxTcGVjLmVuY29kaW5nLnlcXFwiIHRvZ2dsZS1zaGVsZj1cXFwidG9nZ2xlU2hlbGZcXFwiPjwvY2hhbm5lbC1wcm9wZXJ0eT48L2Rpdj48L2Rpdj48YSBuZy1pZj1cXFwic2hvd1NvcnQgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZVNvcnQuc3VwcG9ydChjaGFydC52bFNwZWMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZVNvcnQudG9nZ2xlKGNoYXJ0LnZsU3BlYylcXFwiIHRpdGxlPVxcXCJTb3J0XFxcIj48aSBjbGFzcz1cXFwiZmEgc29ydFxcXCIgbmctY2xhc3M9XFxcInRvZ2dsZVNvcnRDbGFzcyhjaGFydC52bFNwZWMpXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Tb3J0PC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RmlsdGVyTnVsbCAmJiBjaGFydC52bFNwZWMgJiYgdG9nZ2xlRmlsdGVyTnVsbC5zdXBwb3J0KGNoYXJ0LnZsU3BlYylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlRmlsdGVyTnVsbChjaGFydC52bFNwZWMpXFxcIiB0aXRsZT1cXFwiRmlsdGVyIEludmFsaWQgVmFsdWVzXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogY2hhcnQudmxTcGVjICYmIChjaGFydC52bFNwZWMudHJhbnNmb3JtfHx7fSkuZmlsdGVySW52YWxpZH1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1maWx0ZXJcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkZpbHRlcjwvc21hbGw+IDxzbWFsbD5JbnZhbGlkczwvc21hbGw+PC9hPjxhIG5nLWlmPVxcXCJzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgdGl0bGU9XFxcIkJvb2ttYXJrXFxcIiBuZy1jbGljaz1cXFwidG9nZ2xlQm9va21hcmsoY2hhcnQpXFxcIiBuZy1jbGFzcz1cXFwie2Rpc2FibGVkOiAhY2hhcnQudmxTcGVjLmVuY29kaW5nLCBhY3RpdmU6IEJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1ib29rbWFya1xcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+Qm9va21hcms8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dFeHBhbmRcXFwiIG5nLWNsaWNrPVxcXCJleHBhbmRBY3Rpb24oKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1leHBhbmRcXFwiPjwvaT48L2E+IDxhIG5nLWlmPVxcXCJzaG93U2VsZWN0XFxcIiB0aXRsZT1cXFwiU3BlY2lmeSB0aGlzIGNoYXJ0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0KGNoYXJ0KVxcXCIgbmctbW91c2VlbnRlcj1cXFwiZW5hYmxlUHJldmlldygpXFxcIiBuZy1tb3VzZWxlYXZlPVxcXCJkaXNhYmxlUHJldmlldygpXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBzZWxlY3RcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1zZXJ2ZXIgZmxpcFxcXCI+PC9pPjwvYT48ZGl2IG5nLWlmPVxcXCJzaG93Qm9va21hcmtBbGVydFxcXCIgY2xhc3M9XFxcImJvb2ttYXJrLWFsZXJ0XFxcIj48ZGl2PlJlbW92ZSBib29rbWFyaz88L2Rpdj48c21hbGw+WW91ciBub3RlcyB3aWxsIGJlIGxvc3QuPC9zbWFsbD48ZGl2PjxhIG5nLWNsaWNrPVxcXCJyZW1vdmVCb29rbWFyayhjaGFydClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IHJlbW92ZSBpdDwvYT4gPGEgbmctY2xpY2s9XFxcImtlZXBCb29rbWFyaygpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYm9va21hcmtcXFwiPjwvaT4ga2VlcCBpdDwvYT48L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj48dmwtcGxvdCBjbGFzcz1cXFwiZmxleC1ncm93LTFcXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgbW91c2UtZW50ZXItYWN0aW9uPVxcXCJkaXNhYmxlUHJldmlld1xcXCIgZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgbGlzdC10aXRsZT1cXFwibGlzdFRpdGxlXFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG92ZXJmbG93PVxcXCJvdmVyZmxvd1xcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5XFxcIiByZXNjYWxlPVxcXCJyZXNjYWxlXFxcIiB0aHVtYm5haWw9XFxcInRodW1ibmFpbFxcXCIgdG9vbHRpcD1cXFwidG9vbHRpcFxcXCIgcmVuZGVyPVxcXCJyZW5kZXJDaGFydFxcXCI+PC92bC1wbG90PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBwb3B1cC1jb21tYW5kIG5vLXNocmluayBkZXYtdG9vbFxcXCI+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WbDwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZsQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuY2xlYW5TcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhLUxpdGVcXCcsIGNoYXJ0LmNsZWFuU3BlYyk7IHZsQ29waWVkPVxcJyhMb2dnZWQpXFwnO1xcXCI+TG9nPC9hPiA8c3Bhbj57e3ZsQ29waWVkfX08L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PHNwYW4gY2xhc3M9XFxcImRlYnVnXFxcIj5WZzwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInZnQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQudmdTcGVjIHwgY29tcGFjdEpTT05cXFwiPkNvcHk8L2E+IC8gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiBuZy1jbGljaz1cXFwibG9nQ29kZShcXCdWZWdhXFwnLCBjaGFydC52Z1NwZWMpOyB2Z0NvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2Z0NvcGllZH19PC9zcGFuPjwvZGl2PjxhIGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIiBuZy1ocmVmPVxcXCJ7eyB7dHlwZTpcXCd2bFxcJywgc3BlYzogY2hhcnQuY2xlYW5TcGVjfSB8IHJlcG9ydFVybCB9fVxcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiPlJlcG9ydCBCYWQgUmVuZGVyPC9hPiA8YSBuZy1jbGljaz1cXFwic2hvd0ZlYXR1cmU9IXNob3dGZWF0dXJlXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+e3tjaGFydC5zY29yZX19PC9hPjxkaXYgbmctcmVwZWF0PVxcXCJmIGluIGNoYXJ0LnNjb3JlRmVhdHVyZXMgdHJhY2sgYnkgZi5yZWFzb25cXFwiPlt7e2Yuc2NvcmV9fV0ge3tmLnJlYXNvbn19PC9kaXY+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cGxpc3QvdmxwbG90Z3JvdXBsaXN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInZsLXBsb3QtZ3JvdXAtbGlzdC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInZpcy1saXN0LWhlYWRlclxcXCIgbmctc2hvdz1cXFwibGlzdFRpdGxlICYmICFoaWRlTGlzdFRpdGxlXFxcIj48aDMgbmctY2xpY2s9XFxcInNob3dWaXMoKVxcXCI+e3tsaXN0VGl0bGV9fTwvaDM+PHNwYW4gY2xhc3M9XFxcImRlc2NyaXB0aW9uXFxcIj48L3NwYW4+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QgaGZsZXggZmxleC13cmFwXFxcIj48dmwtcGxvdC1ncm91cCBuZy1yZXBlYXQ9XFxcImNoYXJ0IGluIGNoYXJ0cyB8IGxpbWl0VG86IGxpbWl0XFxcIiBuZy1zaG93PVxcXCJzaG93Q2hhcnRcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgY2hhcnQ9XFxcImNoYXJ0XFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgbGlzdC10aXRsZT1cXFwibGlzdFRpdGxlXFxcIiBlbmFibGUtcGlsbHMtcHJldmlldz1cXFwiZW5hYmxlUGlsbHNQcmV2aWV3XFxcIiBmaWVsZC1zZXQ9XFxcImNoYXJ0LmZpZWxkU2V0XFxcIiBzaG93LWZpbHRlci1pbmZvPVxcXCJ0cnVlXFxcIiBzaG93LWJvb2ttYXJrPVxcXCJ0cnVlXFxcIiBzaG93LWRlYnVnPVxcXCJjb25zdHMuZGVidWcgJiYgY29uc3RzLmRlYnVnSW5MaXN0XFxcIiBzaG93LWZpbHRlci1udWxsPVxcXCJ0cnVlXFxcIiBzaG93LXNlbGVjdD1cXFwic2hvd1NwZWNpZnlcXFwiIHNob3ctYXhpcy1wcm9wPVxcXCJ0cnVlXFxcIiBzaG93LXNvcnQ9XFxcInRydWVcXFwiIHJlbmRlci1jaGFydD1cXFwic2hvd0NoYXJ0XFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcIlBpbGxzLmhpZ2hsaWdodGVkXFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHkgKyAkaW5kZXhcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48YSBuZy1jbGljaz1cXFwiaW5jcmVhc2VMaW1pdCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1tb3JlXFxcIiBuZy1zaG93PVxcXCJsaW1pdCA8IGNoYXJ0cy5sZW5ndGhcXFwiPkxvYWQgbW9yZS4uLjwvZGl2PjwvYT48L2Rpdj5cIik7fV0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBhdmFpbGFibGUgZGF0YXNldHMgZnJvbSBNeXJpYVxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMoJycpO1xuXG4gICAgICAgIHNjb3BlLm9wdGlvbk5hbWUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQudXNlck5hbWUgKyAnOicgKyBkYXRhc2V0LnByb2dyYW1OYW1lICsgJzonICsgZGF0YXNldC5yZWxhdGlvbk5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKG15cmlhRGF0YXNldCkge1xuICAgICAgICAgIHZhciBkYXRhc2V0ID0ge1xuICAgICAgICAgICAgZ3JvdXA6ICdteXJpYScsXG4gICAgICAgICAgICBuYW1lOiBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lLFxuICAgICAgICAgICAgdXJsOiBzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvdXNlci0nICsgbXlyaWFEYXRhc2V0LnVzZXJOYW1lICtcbiAgICAgICAgICAgICAgJy9wcm9ncmFtLScgKyBteXJpYURhdGFzZXQucHJvZ3JhbU5hbWUgK1xuICAgICAgICAgICAgICAnL3JlbGF0aW9uLScgKyBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lICsgJy9kYXRhP2Zvcm1hdD1qc29uJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRVcmxEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkVXJsRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZFVybERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgZGF0YXNldCB0byBhZGRcbiAgICAgICAgc2NvcGUuYWRkZWREYXRhc2V0ID0ge1xuICAgICAgICAgIGdyb3VwOiAndXNlcidcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGRGcm9tVXJsID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19VUkwsIGRhdGFzZXQudXJsKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gRmV0Y2ggJiBhY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmluR3JvdXBcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGluR3JvdXBcbiAqIEdldCBkYXRhc2V0cyBpbiBhIHBhcnRpY3VsYXIgZ3JvdXBcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YXNldEdyb3VwIE9uZSBvZiBcInNhbXBsZSxcIiBcInVzZXJcIiwgb3IgXCJteXJpYVwiXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2YgZGF0YXNldHMgaW4gdGhlIHNwZWNpZmllZCBncm91cFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2luR3JvdXAnLCBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgZGF0YXNldEdyb3VwKSB7XG4gICAgICByZXR1cm4gXy5maWx0ZXIoYXJyLCB7XG4gICAgICAgIGdyb3VwOiBkYXRhc2V0R3JvdXBcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmNoYW5nZUxvYWRlZERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbmdlTG9hZGVkRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHBvc2UgZGF0YXNldCBvYmplY3QgaXRzZWxmIHNvIGN1cnJlbnQgZGF0YXNldCBjYW4gYmUgbWFya2VkXG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2FtcGxlRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGRhdGFzZXRXYXRjaGVyID0gc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJzXG4gICAgICAgICAgZGF0YXNldFdhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgdXRpbCwgdmwsIGNxbCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIG5vbWluYWw6IDAsXG4gICAgICBvcmRpbmFsOiAwLFxuICAgICAgZ2VvZ3JhcGhpYzogMixcbiAgICAgIHRlbXBvcmFsOiAzLFxuICAgICAgcXVhbnRpdGF0aXZlOiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIGlmIChmaWVsZERlZi5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGREZWYudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZERlZikgKyAnXycgK1xuICAgICAgICAoZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGREZWYuZmllbGQudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBmaWVsZERlZi5maWVsZDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyID0gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gdXRpbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBtb2RpZmllZCBieSBaaGVcbiAgICAgIERhdGFzZXQudXBkYXRlRnJvbURhdGEgPSBmdW5jdGlvbihkYXRhc2V0LCBkYXRhKSB7XG4gICAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGEudmFsdWVzO1xuICAgICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcblxuICAgICAgICBEYXRhc2V0LnNjaGVtYSA9IGNxbC5zY2hlbWEuU2NoZW1hLmJ1aWxkKGRhdGEudmFsdWVzKTtcbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5vblVwZGF0ZS5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSB1cGRhdGVQcm9taXNlLnRoZW4obGlzdGVuZXIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENvcHkgdGhlIGRhdGFzZXQgaW50byB0aGUgY29uZmlnIHNlcnZpY2Ugb25jZSBpdCBpcyByZWFkeVxuICAgICAgdXBkYXRlUHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBDb25maWcudXBkYXRlRGF0YXNldChkYXRhc2V0LCBEYXRhc2V0LnR5cGUpO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB1cGRhdGVQcm9taXNlO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBnZXRGaWVsZERlZnMoc2NoZW1hLCBvcmRlcikge1xuICAgICAgdmFyIGZpZWxkRGVmcyA9IHNjaGVtYS5maWVsZHMoKS5tYXAoZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgdHlwZTogc2NoZW1hLnR5cGUoZmllbGQpLFxuICAgICAgICAgIHByaW1pdGl2ZVR5cGU6IHNjaGVtYS5wcmltaXRpdmVUeXBlKGZpZWxkKVxuICAgICAgICB9O1xuICAgICAgfSk7XG5cbiAgICAgIGZpZWxkRGVmcyA9IHV0aWwuc3RhYmxlc29ydChmaWVsZERlZnMsIG9yZGVyIHx8IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSwgRGF0YXNldC5maWVsZE9yZGVyQnkuZmllbGQpO1xuXG4gICAgICBmaWVsZERlZnMucHVzaCh7IGZpZWxkOiAnKicsIGFnZ3JlZ2F0ZTogdmwuYWdncmVnYXRlLkFnZ3JlZ2F0ZU9wLkNPVU5ULCB0eXBlOiB2bC50eXBlLlFVQU5USVRBVElWRSwgdGl0bGU6ICdDb3VudCcgfSk7XG4gICAgICByZXR1cm4gZmllbGREZWZzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUZyb21EYXRhKGRhdGFzZXQsIGRhdGEpIHtcbiAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGE7XG4gICAgICBEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID0gZGF0YXNldDtcblxuICAgICAgRGF0YXNldC5zY2hlbWEgPSBjcWwuc2NoZW1hLlNjaGVtYS5idWlsZChkYXRhKTtcbiAgICAgIC8vIFRPRE86IGZpbmQgYWxsIHJlZmVyZW5jZSBvZiBEYXRhc2V0LnN0YXRzLnNhbXBsZSBhbmQgcmVwbGFjZVxuICAgIH1cblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICBNb2RhbHMub3BlbignZGF0YXNldC1tb2RhbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpbGVEcm9wem9uZVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpbGVEcm9wem9uZVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC8vIEFkZCB0aGUgZmlsZSByZWFkZXIgYXMgYSBuYW1lZCBkZXBlbmRlbmN5XG4gIC5jb25zdGFudCgnRmlsZVJlYWRlcicsIHdpbmRvdy5GaWxlUmVhZGVyKVxuICAuZGlyZWN0aXZlKCdmaWxlRHJvcHpvbmUnLCBmdW5jdGlvbiAoTW9kYWxzLCBBbGVydHMsIEZpbGVSZWFkZXIpIHtcblxuICAgIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgICBmdW5jdGlvbiBpc1NpemVWYWxpZChzaXplLCBtYXhTaXplKSB7XG4gICAgICAvLyBTaXplIGlzIHByb3ZpZGVkIGluIGJ5dGVzOyBtYXhTaXplIGlzIHByb3ZpZGVkIGluIG1lZ2FieXRlc1xuICAgICAgLy8gQ29lcmNlIG1heFNpemUgdG8gYSBudW1iZXIgaW4gY2FzZSBpdCBjb21lcyBpbiBhcyBhIHN0cmluZyxcbiAgICAgIC8vICYgcmV0dXJuIHRydWUgd2hlbiBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSxcbiAgICAgIC8vIG9yIGlzIHN1ZmZpY2llbnRseSBsYXJnZVxuICAgICAgcmV0dXJuICFtYXhTaXplIHx8ICggc2l6ZSAvIDEwMjQgLyAxMDI0IDwgK21heFNpemUgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1R5cGVWYWxpZCh0eXBlLCB2YWxpZE1pbWVUeXBlcykge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgcmV0dXJuICF2YWxpZE1pbWVUeXBlcyB8fCAoIHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAvLyBQZXJtaXQgYXJiaXRyYXJ5IGNoaWxkIGNvbnRlbnRcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBtYXhGaWxlU2l6ZTogJ0AnLFxuICAgICAgICB2YWxpZE1pbWVUeXBlczogJ0AnLFxuICAgICAgICAvLyBFeHBvc2UgdGhpcyBkaXJlY3RpdmUncyBkYXRhc2V0IHByb3BlcnR5IHRvIHBhcmVudCBzY29wZXMgdGhyb3VnaFxuICAgICAgICAvLyB0d28td2F5IGRhdGFiaW5kaW5nXG4gICAgICAgIGRhdGFzZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSBzY29wZS5kYXRhc2V0IHx8IHt9O1xuXG4gICAgICAgIGVsZW1lbnQub24oJ2RyYWdvdmVyIGRyYWdlbnRlcicsIGZ1bmN0aW9uIG9uRHJhZ0VudGVyKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiByZWFkRmlsZShmaWxlKSB7XG4gICAgICAgICAgaWYgKCFpc1R5cGVWYWxpZChmaWxlLnR5cGUsIHNjb3BlLnZhbGlkTWltZVR5cGVzKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdJbnZhbGlkIGZpbGUgdHlwZS4gRmlsZSBtdXN0IGJlIG9uZSBvZiBmb2xsb3dpbmcgdHlwZXM6ICcgKyBzY29wZS52YWxpZE1pbWVUeXBlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBzY29wZS5tYXhGaWxlU2l6ZSArICcgTUInKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIsIENvbmZpZywgXywgdmcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IHZnLnV0aWwucmVhZChzY29wZS5kYXRhc2V0LmRhdGEsIHtcbiAgICAgICAgICAgIHR5cGU6ICdjc3YnXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgcGFzdGVkRGF0YXNldCA9IHtcbiAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLCAgLy8gdGltZSBhcyBpZFxuICAgICAgICAgICAgbmFtZTogc2NvcGUuZGF0YXNldC5uYW1lLFxuICAgICAgICAgICAgdmFsdWVzOiBkYXRhLFxuICAgICAgICAgICAgZ3JvdXA6ICdwYXN0ZWQnXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIExvZyB0aGF0IHdlIGhhdmUgcGFzdGVkIGRhdGFcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9ORVdfUEFTVEUsIHBhc3RlZERhdGFzZXQubmFtZSk7XG5cbiAgICAgICAgICAvLyBSZWdpc3RlciB0aGUgcGFzdGVkIGRhdGEgYXMgYSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKHBhc3RlZERhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIG5ld2x5LXJlZ2lzdGVyZWQgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQudXBkYXRlKERhdGFzZXQuZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBDbG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGNvbnRhaW5pbmcgbW9kYWxcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJykuY29uc3RhbnQoJ1NhbXBsZURhdGEnLCBbe1xuICBuYW1lOiAnQmFybGV5JyxcbiAgZGVzY3JpcHRpb246ICdCYXJsZXkgeWllbGQgYnkgdmFyaWV0eSBhY3Jvc3MgdGhlIHVwcGVyIG1pZHdlc3QgaW4gMTkzMSBhbmQgMTkzMicsXG4gIHVybDogJ2RhdGEvYmFybGV5Lmpzb24nLFxuICBpZDogJ2JhcmxleScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDYXJzJyxcbiAgZGVzY3JpcHRpb246ICdBdXRvbW90aXZlIHN0YXRpc3RpY3MgZm9yIGEgdmFyaWV0eSBvZiBjYXIgbW9kZWxzIGJldHdlZW4gMTk3MCAmIDE5ODInLFxuICB1cmw6ICdkYXRhL2NhcnMuanNvbicsXG4gIGlkOiAnY2FycycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdDcmltZWEnLFxuICB1cmw6ICdkYXRhL2NyaW1lYS5qc29uJyxcbiAgaWQ6ICdjcmltZWEnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnRHJpdmluZycsXG4gIHVybDogJ2RhdGEvZHJpdmluZy5qc29uJyxcbiAgaWQ6ICdkcml2aW5nJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0lyaXMnLFxuICB1cmw6ICdkYXRhL2lyaXMuanNvbicsXG4gIGlkOiAnaXJpcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdKb2JzJyxcbiAgdXJsOiAnZGF0YS9qb2JzLmpzb24nLFxuICBpZDogJ2pvYnMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnUG9wdWxhdGlvbicsXG4gIHVybDogJ2RhdGEvcG9wdWxhdGlvbi5qc29uJyxcbiAgaWQ6ICdwb3B1bGF0aW9uJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ01vdmllcycsXG4gIHVybDogJ2RhdGEvbW92aWVzLmpzb24nLFxuICBpZDogJ21vdmllcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCaXJkc3RyaWtlcycsXG4gIHVybDogJ2RhdGEvYmlyZHN0cmlrZXMuanNvbicsXG4gIGlkOiAnYmlyZHN0cmlrZXMnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQnVydGluJyxcbiAgdXJsOiAnZGF0YS9idXJ0aW4uanNvbicsXG4gIGlkOiAnYnVydGluJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhbXBhaWducycsXG4gIHVybDogJ2RhdGEvd2ViYWxsMjYuanNvbicsXG4gIGlkOiAnd2ViYWxsMjYnLFxuICBncm91cDogJ3NhbXBsZSdcbn1dKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhbGVydE1lc3NhZ2VzJywgZnVuY3Rpb24oQWxlcnRzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQWxlcnRzID0gQWxlcnRzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmJvb2ttYXJrTGlzdFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGJvb2ttYXJrTGlzdFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Jvb2ttYXJrTGlzdCcsIGZ1bmN0aW9uIChCb29rbWFya3MsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGlnaGxpZ2h0ZWQ6ICc9JywgLy8gVGhpcyBvbmUgaXMgcmVhbGx5IHR3by13YXkgYmluZGluZy5cbiAgICAgICAgcG9zdFNlbGVjdEFjdGlvbjogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbm5lbFByb3BlcnR5JywgZnVuY3Rpb24oY29uc3RzLCBQaWxscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jaGFubmVscHJvcGVydHkvY2hhbm5lbHByb3BlcnR5Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNoYW5uZWxJZDogJzwnLFxuICAgICAgICBmaWVsZERlZjogJz0nLFxuXG4gICAgICAgIC8qKiBXaGV0aGVyIHRoZSBjaGFubmVsIHByb3BlcnR5IGNhdXNlIHNpZGUgZWZmZWN0IHRvIHRoZSBzaGVsZiAgKi9cbiAgICAgICAgdG9nZ2xlU2hlbGY6ICc8JyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKixlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUudXNlUmF3RG9tYWluID0gZmFsc2U7XG5cbiAgICAgICAgLy8gRklYTUUgaGF2ZSBvcHRpb24gdG8gaGlkZSBsb2cgZm9yIGluIGFwcGxpY2FibGUgbWFya1xuXG4gICAgICAgIHNjb3BlLnR5cGVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPR19UT0dHTEUsIChzY29wZS5maWVsZERlZi5zY2FsZSB8fCB7fSkudHlwZSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy5zZXQoc2NvcGUuY2hhbm5lbElkLCBzY29wZS5maWVsZERlZiwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnVzZVJhd0RvbWFpbkNoYW5nZSA9IGZ1bmN0aW9uKHVzZVJhd0RvbWFpbikge1xuICAgICAgICAgIHZhciBzY2FsZSA9IHNjb3BlLmZpZWxkRGVmLnNjYWxlIHx8IHt9O1xuICAgICAgICAgIHNjYWxlLnVzZVJhd0RvbWFpbiA9IHVzZVJhd0RvbWFpbjtcbiAgICAgICAgICBzY29wZS5maWVsZERlZi5zY2FsZSA9IHNjYWxlO1xuXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlVTRV9SQVdfRE9NQUlOX1RPR0dMRSwgdXNlUmF3RG9tYWluKTtcblxuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgc2NvcGUuZmllbGREZWYsIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdW53YXRjaEZpZWxkRGVmID0gc2NvcGUuJHdhdGNoKCdmaWVsZERlZicsIGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgc2NvcGUudXNlUmF3RG9tYWluID0gKGZpZWxkRGVmLnNjYWxlIHx8IHt9KS51c2VSYXdEb21haW4gIT09IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlcihzKVxuICAgICAgICAgIHVud2F0Y2hGaWVsZERlZigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdjaGFubmVsU2hlbGYnLCBmdW5jdGlvbihBTlksIERhdGFzZXQsIFBpbGxzLCBfLCBEcm9wLCBMb2dnZXIsIHZsLCBjcWwsIFNjaGVtYSwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9jaGFubmVsc2hlbGYvY2hhbm5lbHNoZWxmLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBjaGFubmVsSWQ6ICc8JyxcbiAgICAgICAgZW5jb2Rpbmc6ICc9JyxcbiAgICAgICAgbWFyazogJzwnLFxuICAgICAgICBwcmV2aWV3OiAnPCcsXG4gICAgICAgIGRpc2FibGVkOiAnPCcsXG4gICAgICAgIHN1cHBvcnRBbnk6ICc8JyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCAvKiwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcbiAgICAgICAgc2NvcGUuc2NoZW1hID0gU2NoZW1hLmdldENoYW5uZWxTY2hlbWEoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgc2NvcGUucGlsbHMgPSBQaWxscy5waWxscztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuXG4gICAgICAgIHNjb3BlLmlzSGlnaGxpZ2h0ZWQgPSBmdW5jdGlvbiAoY2hhbm5lbElkKSB7XG4gICAgICAgICAgdmFyIGhpZ2hsaWdodGVkID0gUGlsbHMuaGlnaGxpZ2h0ZWQgfHwge307XG4gICAgICAgICAgcmV0dXJuIGhpZ2hsaWdodGVkW3Njb3BlLmVuY29kaW5nW2NoYW5uZWxJZF0uZmllbGRdIHx8XG4gICAgICAgICAgICBoaWdobGlnaHRlZFsnZicgKyBjaGFubmVsSWRdO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgZ2V0IHVwZGF0ZWQgaW4gdGhlIHdhdGNoZXJcbiAgICAgICAgc2NvcGUuaXNBbnlDaGFubmVsID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmlzQW55RmllbGQgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuaXNBbnlGdW5jdGlvbiA9IGZhbHNlO1xuXG4gICAgICAgIHNjb3BlLnN1cHBvcnRNYXJrID0gZnVuY3Rpb24oY2hhbm5lbElkLCBtYXJrKSB7XG4gICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hcmsgPT09IEFOWSkgeyAvLyBUT0RPOiBzdXBwb3J0IHtlbnVtOiBbLi4uXX1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmwuY2hhbm5lbC5zdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBwcm9wc1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLXByb3BlcnRpZXMnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLWxhYmVsJylbMF0sXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb1BvcHVwQ29udGVudCA9ICBlbGVtZW50LmZpbmQoJy5zaGVsZi1mdW5jdGlvbnMnKVswXTtcblxuICAgICAgICBzY29wZS5yZW1vdmVGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIFBpbGxzLnJlbW92ZShzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUVMRF9SRU1PVkVELCBzY29wZS5jaGFubmVsSWQsIHtmaWVsZERlZjogc2NvcGUuZW5jb2Rpbmdbc2NvcGUuY2hhbm5lbElkXX0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMuZHJhZ1N0YXJ0KFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLCBzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBQaWxscy5kcmFnU3RvcCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciBkcm9wcGluZyBwaWxsLlxuICAgICAgICAgKi9cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHBpbGwgPSBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICAvLyB2YWxpZGF0ZSB0eXBlXG4gICAgICAgICAgdmFyIHR5cGVzID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5UeXBlLmVudW07XG4gICAgICAgICAgaWYgKCFfLmluY2x1ZGVzKHR5cGVzLCBwaWxsLnR5cGUpICYmICFjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLnR5cGUpKSB7XG4gICAgICAgICAgICAvLyBpZiBleGlzdGluZyB0eXBlIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICAgICAgICAgIHBpbGwudHlwZSA9IHR5cGVzWzBdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgdGltZVVuaXQgLyBhZ2dyZWdhdGVcblxuICAgICAgICAgIFBpbGxzLmRyYWdEcm9wKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJRUxEX0RST1AsIHBpbGwpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjaGFubmVsSWRXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdjaGFubmVsSWQnLCBmdW5jdGlvbihjaGFubmVsSWQpIHtcbiAgICAgICAgICBzY29wZS5pc0FueUNoYW5uZWwgPSBQaWxscy5pc0FueUNoYW5uZWwoY2hhbm5lbElkKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gRklYTUU6IHJlbW92ZSB0aGlzIGNvbmZ1c2luZyAyLXdheSBiaW5kaW5nIGxvZ2ljc1xuICAgICAgICAvLyBJZiBzb21lIGV4dGVybmFsIGFjdGlvbiBjaGFuZ2VzIHRoZSBmaWVsZERlZiwgd2UgYWxzbyBuZWVkIHRvIHVwZGF0ZSB0aGUgcGlsbFxuICAgICAgICB2YXIgY2hhbm5lbEVuY29kaW5nV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnZW5jb2RpbmdbY2hhbm5lbElkXScsIGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgc2NvcGUuaGFzRnVuY3Rpb25zID0gZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gZmFsc2UgOlxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICB2bC51dGlsLmNvbnRhaW5zKFsncXVhbnRpdGF0aXZlJywgJ3RlbXBvcmFsJ10sIGZpZWxkRGVmLnR5cGUpIHx8XG4gICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICBmaWVsZERlZi50eXBlICYmIGZpZWxkRGVmLnR5cGUuZW51bSAmJlxuICAgICAgICAgICAgICAgICh2bC51dGlsLmNvbnRhaW5zKGZpZWxkRGVmLnR5cGUuZW51bSwgJ3F1YW50aXRhdGl2ZScpIHx8IHZsLnV0aWwuY29udGFpbnMoZmllbGREZWYudHlwZS5lbnVtLCAndGVtcG9yYWwnKSlcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgIC8vIFByZXZpZXcgc2hlbGYgc2hvdWxkIG5vdCBjYXVzZSBzaWRlIGVmZmVjdFxuICAgICAgICAgIGlmIChzY29wZS5wcmV2aWV3KSB7XG4gICAgICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRGaWVsZCA9IFBpbGxzLmlzRW51bWVyYXRlZEZpZWxkKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRDaGFubmVsID0gUGlsbHMuaXNFbnVtZXJhdGVkQ2hhbm5lbChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBQaWxscy5zZXQoc2NvcGUuY2hhbm5lbElkLCBmaWVsZERlZiA/IF8uY2xvbmVEZWVwKGZpZWxkRGVmKSA6IHt9KTtcbiAgICAgICAgICAgIHNjb3BlLmlzQW55RmllbGQgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZERlZi5maWVsZCk7XG4gICAgICAgICAgICBzY29wZS5pc0FueUZ1bmN0aW9uID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuYWdncmVnYXRlKSB8fFxuICAgICAgICAgICAgICBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZERlZi5iaW4pIHx8XG4gICAgICAgICAgICAgIGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkRGVmLnRpbWVVbml0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChwcm9wc1BvcHVwICYmIHByb3BzUG9wdXAuZGVzdHJveSkge1xuICAgICAgICAgICAgcHJvcHNQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlcnNcbiAgICAgICAgICBjaGFubmVsSWRXYXRjaGVyKCk7XG4gICAgICAgICAgY2hhbm5lbEVuY29kaW5nV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWVsZEluZm9cbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWVsZEluZm9cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmaWVsZEluZm8nLCBmdW5jdGlvbiAoQU5ZLCBEcm9wLCB2bCwgY3FsLCBEYXRhc2V0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9maWVsZGluZm8vZmllbGRpbmZvLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZERlZjogJzwnLFxuICAgICAgICBmaWx0ZXJBY3Rpb246ICcmJyxcbiAgICAgICAgc2hvd0FkZDogJzwnLFxuICAgICAgICBzaG93Q2FyZXQ6ICc8JyxcbiAgICAgICAgc2hvd0ZpbHRlcjogJz0nLFxuICAgICAgICBzaG93UmVtb3ZlOiAnPCcsXG4gICAgICAgIHNob3dUeXBlOiAnPCcsXG4gICAgICAgIHNob3dFbnVtU3BlY0ZuOiAnPCcsXG4gICAgICAgIHBvcHVwQ29udGVudDogJzwnLFxuICAgICAgICBhY3Rpb246ICcmJyxcbiAgICAgICAgYWRkQWN0aW9uOiAnJicsXG4gICAgICAgIHJlbW92ZUFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ2FyZXQ6ICc8J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHZhciBmdW5jc1BvcHVwO1xuICAgICAgICBzY29wZS52bFR5cGUgPSB2bC50eXBlO1xuXG4gICAgICAgIC8vIFByb3BlcnRpZXMgdGhhdCBhcmUgY3JlYXRlZCBieSBhIHdhdGNoZXIgbGF0ZXJcbiAgICAgICAgc2NvcGUudHlwZU5hbWUgPSBudWxsO1xuICAgICAgICBzY29wZS5pY29uID0gbnVsbDtcbiAgICAgICAgc2NvcGUubnVsbCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuZmllbGRUaXRsZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgdmFyIGZpZWxkID0gZmllbGREZWYuZmllbGQ7XG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkKSkge1xuICAgICAgICAgICAgaWYgKGZpZWxkLmVudW0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkLmVudW0ubWFwKGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkID09PSAnKicgPyAnQ09VTlQnIDogZmllbGQ7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJywnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIEZJWE1FIHN5bmMgd2l0aCBXaWxkY2FyZHNcbiAgICAgICAgICAgICAgaWYgKGZpZWxkRGVmLnR5cGUgPT09ICd0ZW1wb3JhbCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1RlbXBvcmFsIEZpZWxkcyc7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZmllbGREZWYudHlwZSA9PT0gJ3F1YW50aXRhdGl2ZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1F1YW50aXRhdGl2ZSBGaWVsZHMnO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkRGVmLnR5cGUgPT09ICdub21pbmFsJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnQ2F0ZWdvcmljYWwgRmllbGRzJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ0FueSBGaWVsZHMnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZpZWxkO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkQ291bnQgPSBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWVsZC5lbnVtID8gJyAoJyArIGZpZWxkLmVudW0ubGVuZ3RoICsgJyknIDogJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5jbGlja2VkID0gZnVuY3Rpb24oJGV2ZW50KXtcbiAgICAgICAgICBpZihzY29wZS5hY3Rpb24gJiYgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCcuZmEtY2FyZXQtZG93bicpWzBdICYmXG4gICAgICAgICAgICAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJ3NwYW4udHlwZScpWzBdKSB7XG4gICAgICAgICAgICBzY29wZS5hY3Rpb24oJGV2ZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5mdW5jID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICBpZiAoZmllbGREZWYuYWdncmVnYXRlKSB7XG4gICAgICAgICAgICBpZiAoIWlzRW51bVNwZWMoZmllbGREZWYuYWdncmVnYXRlKSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmllbGREZWYuYWdncmVnYXRlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS5zaG93RW51bVNwZWNGbikge1xuICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmllbGREZWYudGltZVVuaXQpIHtcbiAgICAgICAgICAgIGlmICghaXNFbnVtU3BlYyhmaWVsZERlZi50aW1lVW5pdCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLnRpbWVVbml0O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS5zaG93RW51bVNwZWNGbikge1xuICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZmllbGREZWYuYmluKSB7XG4gICAgICAgICAgICBpZiAoIWlzRW51bVNwZWMoZmllbGREZWYuYmluKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2Jpbic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnNob3dFbnVtU3BlY0ZuKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGZpZWxkRGVmLl9hZ2dyZWdhdGUgfHwgZmllbGREZWYuX3RpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuX2JpbiAmJiAnYmluJykgfHwgKGZpZWxkRGVmLl9hbnkgJiYgJ2F1dG8nKSB8fCAnJztcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcG9wdXBDb250ZW50V2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIFRZUEVfTkFNRVMgPSB7XG4gICAgICAgICAgbm9taW5hbDogJ3RleHQnLFxuICAgICAgICAgIG9yZGluYWw6ICd0ZXh0LW9yZGluYWwnLFxuICAgICAgICAgIHF1YW50aXRhdGl2ZTogJ251bWJlcicsXG4gICAgICAgICAgdGVtcG9yYWw6ICd0aW1lJyxcbiAgICAgICAgICBnZW9ncmFwaGljOiAnZ2VvJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBUWVBFX0lDT05TID0ge1xuICAgICAgICAgIG5vbWluYWw6ICdmYS1mb250JyxcbiAgICAgICAgICBvcmRpbmFsOiAnZmEtZm9udCcsXG4gICAgICAgICAgcXVhbnRpdGF0aXZlOiAnaWNvbi1oYXNoJyxcbiAgICAgICAgICB0ZW1wb3JhbDogJ2ZhLWNhbGVuZGFyJyxcbiAgICAgICAgfTtcbiAgICAgICAgVFlQRV9JQ09OU1tBTlldID0gJ2ZhLWFzdGVyaXNrJzsgLy8gc2VwYXJhdGUgbGluZSBiZWNhdXNlIHdlIG1pZ2h0IGNoYW5nZSB3aGF0J3MgdGhlIHN0cmluZyBmb3IgQU5ZXG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBkaWN0KSB7XG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHR5cGUpKSB7IC8vIGlzIGVudW1TcGVjXG4gICAgICAgICAgICBpZiAoIXR5cGUuZW51bSkge1xuICAgICAgICAgICAgICByZXR1cm4gQU5ZOyAvLyBlbnVtIHNwZWMgd2l0aG91dCBzcGVjaWZpYyB2YWx1ZXNcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhbCA9IG51bGw7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUuZW51bS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgX3R5cGUgPSB0eXBlLmVudW1baV07XG4gICAgICAgICAgICAgIHZhciB2ID0gZGljdCA/IGRpY3RbX3R5cGVdIDogX3R5cGU7XG4gICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSB2O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh2YWwgIT09IHYpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBBTlk7IC8vIElmIHRoZXJlIGFyZSBtYW55IGNvbmZsaWN0aW5nIHR5cGVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZGljdCA/IGRpY3RbdHlwZV0gOiB0eXBlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZpZWxkRGVmV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnZmllbGREZWYudHlwZScsIGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICBzY29wZS5pY29uID0gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBUWVBFX0lDT05TKTtcbiAgICAgICAgICB2YXIgdHlwZU5hbWUgPSB0eXBlO1xuICAgICAgICAgIGlmICh0eXBlTmFtZSA9PT0gJ29yZGluYWwnIHx8IHR5cGVOYW1lID09PSAnbm9taW5hbCcpIHtcbiAgICAgICAgICAgIHR5cGVOYW1lICs9ICgnICgnICsgRGF0YXNldC5zY2hlbWEucHJpbWl0aXZlVHlwZShzY29wZS5maWVsZERlZi5maWVsZCkgKyAnKScpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZSAmJiB0eXBlLmVudW0pIHtcbiAgICAgICAgICAgIHR5cGVOYW1lID0gdHlwZS5lbnVtWzBdOyAvLyBGSVhNRSBqb2luIHRoZW0gaWYgd2Ugc3VwcG9ydCBtYW55IHR5cGVzXG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLnR5cGVOYW1lID0gdHlwZU5hbWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCAmJiBmdW5jc1BvcHVwLmRlc3Ryb3kpIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVucmVnaXN0ZXIgd2F0Y2hlcnNcbiAgICAgICAgICBwb3B1cENvbnRlbnRXYXRjaGVyKCk7XG4gICAgICAgICAgZmllbGREZWZXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NhdGVnb3JpY2FsRmlsdGVyJywgZnVuY3Rpb24gKERhdGFzZXQsIHZnLCB1dGlsLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2ZpbHRlci9jYXRlZ29yaWNhbGZpbHRlci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGQ6ICc9JyxcbiAgICAgICAgZmlsdGVyOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSkge1xuICAgICAgICBzY29wZS52YWx1ZXMgPSBbXTtcbiAgICAgICAgc2NvcGUuaW5jbHVkZSA9IHt9O1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdEFsbCA9IHNlbGVjdEFsbDtcbiAgICAgICAgc2NvcGUuc2VsZWN0Tm9uZSA9IHNlbGVjdE5vbmU7XG4gICAgICAgIHNjb3BlLmtlZXBPbmx5ID0ga2VlcE9ubHk7XG4gICAgICAgIHNjb3BlLnN0cmluZ2lmeSA9IEpTT04uc3RyaW5naWZ5O1xuXG4gICAgICAgIHNjb3BlLmZpbHRlckNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUxURVJfQ0hBTkdFLCBzY29wZS5maWVsZCwgc2NvcGUuZmlsdGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBzZWxlY3RBbGwoKSB7XG4gICAgICAgICAgc2V0SW5jbHVkZShzY29wZS52YWx1ZXMpO1xuICAgICAgICAgIHNjb3BlLmZpbHRlckNoYW5nZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2VsZWN0Tm9uZSgpIHtcbiAgICAgICAgICBzZXRJbmNsdWRlKFtdKTtcbiAgICAgICAgICBzY29wZS5maWx0ZXJDaGFuZ2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGtlZXBPbmx5KG9ubHlWYWx1ZSkge1xuICAgICAgICAgIHNldEluY2x1ZGUoW29ubHlWYWx1ZV0pO1xuICAgICAgICAgIHNjb3BlLmZpbHRlckNoYW5nZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc2V0SW5jbHVkZShsaXN0KSB7XG4gICAgICAgICAgc2NvcGUuaW5jbHVkZSA9IGxpc3QucmVkdWNlKGZ1bmN0aW9uKGluY2x1ZGUsIHgpIHtcbiAgICAgICAgICAgIGluY2x1ZGVbSlNPTi5zdHJpbmdpZnkoeCldID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBpbmNsdWRlO1xuICAgICAgICAgIH0sIHt9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZmllbGQnLCBmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgIHNjb3BlLnZhbHVlcyA9IERhdGFzZXQuc2NoZW1hLmRvbWFpbih7ZmllbGQ6IGZpZWxkfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgnZmlsdGVyJywgZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgc2V0SW5jbHVkZShmaWx0ZXIuaW4pO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kd2F0Y2goJ2luY2x1ZGUnLCBmdW5jdGlvbihpbmNsdWRlKSB7XG4gICAgICAgICAgc2NvcGUuZmlsdGVyLmluID0gdXRpbC5rZXlzKGluY2x1ZGUpLmZpbHRlcihmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBpbmNsdWRlW3ZhbF07XG4gICAgICAgICAgfSkubWFwKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHgpO1xuICAgICAgICAgICAgLy8gaWYgKCt4ID09PSAreCkgeyByZXR1cm4gK3g7IH1cbiAgICAgICAgICAgIC8vIHJldHVybiB4O1xuICAgICAgICAgIH0pLnNvcnQodmcudXRpbC5jbXApOyAvLyBVc2UgVmVnYVxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpmaWVsZEluZm9cbiAqIEBkZXNjcmlwdGlvblxuICogIyBmaWVsZEluZm9cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmaWx0ZXJTaGVsdmVzJywgZnVuY3Rpb24gKEZpbHRlck1hbmFnZXIsIERhdGFzZXQsIExvZ2dlciwgY3FsLCB2bCwgQWxlcnRzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9maWx0ZXIvZmlsdGVyc2hlbHZlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiBmYWxzZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHNwZWM6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuICAgICAgICBzY29wZS5maWx0ZXJNYW5hZ2VyID0gRmlsdGVyTWFuYWdlcjtcbiAgICAgICAgc2NvcGUuY2xlYXJGaWx0ZXIgPSBjbGVhckZpbHRlcjtcbiAgICAgICAgc2NvcGUucmVtb3ZlRmlsdGVyID0gcmVtb3ZlRmlsdGVyO1xuICAgICAgICBzY29wZS5maWx0ZXJUeXBlID0gZmlsdGVyVHlwZTtcblxuICAgICAgICBzY29wZS5maWx0ZXJJbnZhbGlkT3B0aW9ucyA9IFtcbiAgICAgICAgICB7dmFsdWU6IHRydWUsIGxhYmVsOiAnRmlsdGVyIGFsbCBpbnZhbGlkIHZhbHVlcyd9LFxuICAgICAgICAgIHt2YWx1ZTogdW5kZWZpbmVkLCBsYWJlbDogJ0ZpbHRlciBpbnZhbGlkIG51bWJlcnMnfSxcbiAgICAgICAgICB7dmFsdWU6IGZhbHNlLCBsYWJlbDogJ1Nob3cgYWxsIGludmFsaWQgdmFsdWVzJ30sXG4gICAgICAgIF07XG5cbiAgICAgICAgc2NvcGUuZmlsdGVySW52YWxpZENoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTlVMTF9GSUxURVJfVE9HR0xFLCBzY29wZS5zcGVjLnRyYW5zZm9ybS5maWx0ZXJJbnZhbGlkKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBmaWx0ZXJUeXBlKGZpZWxkKSB7XG4gICAgICAgICAgc3dpdGNoIChEYXRhc2V0LnNjaGVtYS50eXBlKGZpZWxkKSkge1xuICAgICAgICAgICAgY2FzZSAnbm9taW5hbCc6XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsJzpcbiAgICAgICAgICAgICAgcmV0dXJuICdjYXRlZ29yaWNhbCc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUnOlxuICAgICAgICAgICAgICByZXR1cm4gJ3F1YW50aXRhdGl2ZSc7XG4gICAgICAgICAgICBjYXNlICd0ZW1wb3JhbCc6XG4gICAgICAgICAgICAgIHJldHVybiB2bC50aW1lVW5pdC5kZWZhdWx0U2NhbGVUeXBlKGZpZWxkKSA9PT0gJ29yZGluYWwnID8gJ2NhdGVnb3JpY2FsJyA6ICdxdWFudGl0YXRpdmUnO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBjbGVhckZpbHRlcigpIHtcbiAgICAgICAgICBGaWx0ZXJNYW5hZ2VyLnJlc2V0KCk7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJTFRFUl9DTEVBUik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW1vdmVGaWx0ZXIoZmllbGQpIHtcbiAgICAgICAgICBGaWx0ZXJNYW5hZ2VyLnRvZ2dsZShmaWVsZCk7XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5maWVsZERyb3BwZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuZHJvcHBlZEZpZWxkRGVmLmFnZ3JlZ2F0ZSA9PT0gJ2NvdW50Jykge1xuICAgICAgICAgICAgQWxlcnRzLmFkZCgnQ2Fubm90IGFkZCBmaWx0ZXIgZm9yIGNvdW50IGZpZWxkJyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhzY29wZS5kcm9wcGVkRmllbGREZWYuZmllbGQpKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdDYW5ub3QgYWRkIGZpbHRlciBmb3Igd2lsZGNhcmQgZmllbGQnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGFkZGVkID0gRmlsdGVyTWFuYWdlci5hZGQoc2NvcGUuZHJvcHBlZEZpZWxkRGVmLmZpZWxkKTtcbiAgICAgICAgICAgIGlmICghYWRkZWQpIHtcbiAgICAgICAgICAgICAgQWxlcnRzLmFkZCgnQWxyZWFkeSBoYXZlIGZpbHRlciBmb3IgJyArIHNjb3BlLmRyb3BwZWRGaWVsZERlZi5maWVsZCArICcuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLmRyb3BwZWRGaWVsZERlZiA9IHt9O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3F1YW50aXRhdGl2ZUZpbHRlcicsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2ZpbHRlci9xdWFudGl0YXRpdmVmaWx0ZXIuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogZmFsc2UsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZDogJz0nLFxuICAgICAgICBmaWx0ZXI6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHZhciBkb21haW4gPSBEYXRhc2V0LnNjaGVtYS5kb21haW4oe2ZpZWxkOiBzY29wZS5maWVsZH0pO1xuXG4gICAgICAgIC8vIGRvbid0IHVwZGF0ZSB1bnRpbCByYW5nZSBzbGlkZXIgaGFuZGxlIHJlbGVhc2VkXG4gICAgICAgIHNjb3BlLmxvY2FsTWluID0gc2NvcGUuZmlsdGVyLnJhbmdlWzBdO1xuICAgICAgICBzY29wZS5sb2NhbE1heCA9IHNjb3BlLmZpbHRlci5yYW5nZVsxXTtcbiAgICAgICAgc2NvcGUudHlwZSA9IERhdGFzZXQuc2NoZW1hLnR5cGUoc2NvcGUuZmllbGQpO1xuICAgICAgICBzY29wZS51cGRhdGVSYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmZpbHRlci5yYW5nZVswXSA9IHNjb3BlLmxvY2FsTWluO1xuICAgICAgICAgIHNjb3BlLmZpbHRlci5yYW5nZVsxXSA9IHNjb3BlLmxvY2FsTWF4O1xuICAgICAgICAgIGlmIChzY29wZS50eXBlID09PSAndGVtcG9yYWwnKSB7XG4gICAgICAgICAgICBzY29wZS5sb2NhbE1pblRleHQgPSBuZXcgRGF0ZShzY29wZS5sb2NhbE1pbikudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgICAgICBzY29wZS5sb2NhbE1heFRleHQgPSBuZXcgRGF0ZShzY29wZS5sb2NhbE1heCkudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjb3BlLmxvY2FsTWluVGV4dCA9IHNjb3BlLmxvY2FsTWF4VGV4dCA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuJGFwcGx5KCk7IC8vIEZvcmNlIHdhdGNoZXIgdG8gb2JzZXJ2ZSBjaGFuZ2VcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0NIQU5HRSwgc2NvcGUuZmllbGQsIHNjb3BlLmZpbHRlcik7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHNjb3BlLnR5cGUgPT09ICd0ZW1wb3JhbCcpIHtcbiAgICAgICAgICAvLyBjb252ZXJ0IGRhdGVzIHRvIG51bWVyaWNhbCB0eXBlc1xuICAgICAgICAgIHZhciBtaW4gPSBuZXcgRGF0ZShkb21haW5bMF0pO1xuICAgICAgICAgIHZhciBtYXggPSBuZXcgRGF0ZShkb21haW5bMV0pO1xuICAgICAgICAgIHNjb3BlLmRvbWFpbk1pbiA9IG1pbi5nZXRUaW1lKCk7XG4gICAgICAgICAgc2NvcGUuZG9tYWluTWF4ID0gbWF4LmdldFRpbWUoKTtcbiAgICAgICAgICBzY29wZS5kb21haW5NaW5UZXh0ID0gbWluLnRvRGF0ZVN0cmluZygpO1xuICAgICAgICAgIHNjb3BlLmRvbWFpbk1heFRleHQgPSBtYXgudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2NvcGUuZG9tYWluTWluID0gZG9tYWluWzBdO1xuICAgICAgICAgIHNjb3BlLmRvbWFpbk1heCA9IGRvbWFpblsxXTtcbiAgICAgICAgICBzY29wZS5kb21haW5NaW5UZXh0ID0gbnVsbDtcbiAgICAgICAgICBzY29wZS5kb21haW5NYXhUZXh0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuXG4vLyBmb3IgZm9ybWF0dGluZyBkYXRlcyBhY2NvcmRpbmcgdG8gdGhlIHNlbGVjdGVkIHRpbWVVbml0IChqdXN0IGZvciBkaXNwbGF5IHB1cnBvc2VzKVxuLy8gYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuLy8gICAuZmlsdGVyKCd0aW1lVW5pdEZpbHRlcicsIGZ1bmN0aW9uKCkge1xuLy8gICAgIHJldHVybiBmdW5jdGlvbihkYXRlTnVtYmVyKSB7XG4vLyAgICAgICB2YXIgdGltZVVuaXQgPSAneWVhcic7IC8vIHRlc3RpbmcgcHVycG9zZXNcbi8vICAgICAgIHZhciBkYXRlID0gbmV3IERhdGUoZGF0ZU51bWJlcik7XG4vLyAgICAgICBzd2l0Y2ggKHRpbWVVbml0KSB7XG4vLyAgICAgICAgIGNhc2UgJ3llYXInOlxuLy8gICAgICAgICAgIHJldHVybiBkYXRlLmdldEZ1bGxZZWFyKCk7XG4vLyAgICAgICAgIGNhc2UgJ2RhdGUnOlxuLy8gICAgICAgICAgIHJldHVybiBkYXRlLmdldERhdGUoKTtcbi8vICAgICAgIH1cbi8vICAgICAgIHJldHVybiBuZXcgRGF0ZShkYXRlTnVtYmVyKTtcbi8vICAgICB9O1xuLy8gICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdmdW5jdGlvblNlbGVjdCcsIGZ1bmN0aW9uKF8sIGNvbnN0cywgdmwsIGNxbCwgUGlsbHMsIExvZ2dlciwgRGF0YXNldCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZnVuY3Rpb25zZWxlY3QvZnVuY3Rpb25zZWxlY3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhbm5lbElkOiAnPCcsXG4gICAgICAgIGZpZWxkRGVmOiAnPScsXG4gICAgICAgIHN1cHBvcnRBbnk6ICc8J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlIC8qLGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgdmFyIEJJTj0nYmluJywgQ09VTlQ9J2NvdW50JywgbWF4YmlucztcblxuICAgICAgICBzY29wZS5oaWRlTW9yZUZuID0gY29uc3RzLmhpZGVNb3JlRm47XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IHtcbiAgICAgICAgICBzZWxlY3RlZDogdW5kZWZpbmVkLFxuICAgICAgICAgIGNoZWNrZWQ6IHt1bmRlZmluZWQ6IHRydWV9LFxuICAgICAgICAgIGxpc3Q6IHtcbiAgICAgICAgICAgIGFib3ZlRm9sZDogW10sXG4gICAgICAgICAgICBiZWxvd0ZvbGQ6IFtdIC8vIGNvdWxkIGJlIGVtcHR5XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpc0FueTogZmFsc2UsXG4gICAgICAgICAgaXNUZW1wb3JhbDogZmFsc2UsIC8vIGZvciBtYWtpbmcgYmVsb3dGb2xkIHRpbWVVbml0cyBzaW5nbGUtY29sdW1uXG4gICAgICAgICAgaXNDb3VudDogZmFsc2UgLy8gaGlkZSBcIm1vcmVcIiAmIFwibGVzc1wiIHRvZ2dsZSBmb3IgQ09VTlRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmdW5jdGlvbnMgZm9yIFQgPSB0aW1lVW5pdHMgKyB1bmRlZmluZWRcbiAgICAgICAgdmFyIHRlbXBvcmFsRnVuY3Rpb25zID0ge1xuICAgICAgICAgIGFib3ZlRm9sZDogW1xuICAgICAgICAgICAgdW5kZWZpbmVkLCAneWVhcm1vbnRoZGF0ZScsXG4gICAgICAgICAgICAneWVhcicsICdtb250aCcsIC8vIGhpZGUgJ3F1YXJ0ZXInIGZvciB1c2VyIHN0dWR5IGJlY2F1c2UgaXQncyBidWdneVxuICAgICAgICAgICAgJ2RhdGUnLCdkYXknLFxuICAgICAgICAgICAgJ2hvdXJzJywgJ21pbnV0ZXMnLFxuICAgICAgICAgICAgJ3NlY29uZHMnLCAnbWlsbGlzZWNvbmRzJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgYmVsb3dGb2xkOiBbXG4gICAgICAgICAgICAneWVhcnF1YXJ0ZXInLFxuICAgICAgICAgICAgJ3llYXJtb250aCcsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzJyxcbiAgICAgICAgICAgICd5ZWFybW9udGhkYXRlaG91cnNtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnaG91cnNtaW51dGVzJyxcbiAgICAgICAgICAgICdob3Vyc21pbnV0ZXNzZWNvbmRzJyxcbiAgICAgICAgICAgICdtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnc2Vjb25kc21pbGxpc2Vjb25kcydcbiAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHRpbWVVbml0SGFzVmFyaWF0aW9uRmlsdGVyID0gZnVuY3Rpb24odGltZVVuaXQpIHtcblxuICAgICAgICAgIHZhciBwaWxsID0gIFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgIGlmICghcGlsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBmaWVsZCA9IHBpbGwuZmllbGQ7XG4gICAgICAgICAgLy8gQ29udmVydCAnYW55JyBjaGFubmVsIHRvICc/Jy5cbiAgICAgICAgICB2YXIgY2hhbm5lbCA9IFBpbGxzLmlzQW55Q2hhbm5lbChzY29wZS5jaGFubmVsSWQpID8gJz8nIDogc2NvcGUuY2hhbm5lbElkO1xuXG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkKSkge1xuICAgICAgICAgICAgLy8gSWYgZmllbGQgaXMgPywgd2UgY2FuJ3QgcmVhbGx5IGZpbHRlciB0aW1lVW5pdFxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuICF0aW1lVW5pdCB8fCAvLyBEb24ndCBmaWx0ZXIgdW5kZWZpbmVkXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGltZVVuaXRzIHRoYXQgZG8gbm90IGhhdmUgdmFyaWF0aW9uIChjYXJkaW5hbGl0eSA8PSAxKS5cbiAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnRpbWVVbml0SGFzVmFyaWF0aW9uKHtmaWVsZDogZmllbGQsIGNoYW5uZWw6IGNoYW5uZWwsIHRpbWVVbml0OiB0aW1lVW5pdH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHRpbWVVbml0cyA9IFQgZnVuY3Rpb25zIC0gdW5kZWZpbmVkXG4gICAgICAgIHZhciB0aW1lVW5pdHMgPSBfLnB1bGwoXy5jb25jYXQodGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLCAncXVhcnRlcicsIHRlbXBvcmFsRnVuY3Rpb25zLmJlbG93Rm9sZCksIHVuZGVmaW5lZCk7XG5cbiAgICAgICAgLy8gZnVuY3Rpb25zIGZvciBRID0gYWdncmVnYXRlcyArIEJJTiArIHVuZGVmaW5lZCAtIENPVU5UXG4gICAgICAgIHZhciBxdWFudGl0YXRpdmVGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgYWJvdmVGb2xkOiBbXG4gICAgICAgICAgICB1bmRlZmluZWQsICdiaW4nLFxuICAgICAgICAgICAgJ21pbicsICdtYXgnLFxuICAgICAgICAgICAgJ21lYW4nLCAnbWVkaWFuJyxcbiAgICAgICAgICAgICdzdW0nXG4gICAgICAgICAgXSxcbiAgICAgICAgICBiZWxvd0ZvbGQ6IFtcbiAgICAgICAgICAgICd2YWxpZCcsICdtaXNzaW5nJyxcbiAgICAgICAgICAgICdkaXN0aW5jdCcsICdtb2Rlc2tldycsXG4gICAgICAgICAgICAncTEnLCAncTMnLFxuICAgICAgICAgICAgJ3N0ZGV2JywgJ3N0ZGV2cCcsXG4gICAgICAgICAgICAndmFyaWFuY2UnLCAndmFyaWFuY2VwJ1xuICAgICAgICAgIF0gLy8gaGlkZSBDT1VOVCBmb3IgUSBpbiB0aGUgVUkgYmVjYXVzZSB3ZSBkZWRpY2F0ZSBpdCB0byBhIHNwZWNpYWwgXCIjIENvdW50XCIgZmllbGRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBhZ2dyZWdhdGVzID0gUSBGdW5jdGlvbnMgKyBDT1VOVCAtIEJJTiAtIHVuZGVmaW5lZFxuICAgICAgICB2YXIgYWdncmVnYXRlcyA9IF8ucHVsbChfLmNvbmNhdChxdWFudGl0YXRpdmVGdW5jdGlvbnMuYWJvdmVGb2xkLCBxdWFudGl0YXRpdmVGdW5jdGlvbnMuYmVsb3dGb2xkLCBbQ09VTlRdKSxcbiAgICAgICAgICBCSU4sIHVuZGVmaW5lZCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNQaWxsUShwaWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHBpbGwgJiYgcGlsbC50eXBlICYmIChwaWxsLnR5cGUgPT09IHZsLnR5cGUuUVVBTlRJVEFUSVZFIHx8IChwaWxsLnR5cGUuZW51bSAmJiB2bC51dGlsLmNvbnRhaW5zKHBpbGwudHlwZS5lbnVtLHZsLnR5cGUuUVVBTlRJVEFUSVZFKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNQaWxsVChwaWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHBpbGwgJiYgcGlsbC50eXBlICYmIChwaWxsLnR5cGUgPT09IHZsLnR5cGUuVEVNUE9SQUwgfHwgKHBpbGwudHlwZS5lbnVtICYmIHZsLnV0aWwuY29udGFpbnMocGlsbC50eXBlLmVudW0sdmwudHlwZS5URU1QT1JBTCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLnNlbGVjdENoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRlVOQ19DSEFOR0UsIHNjb3BlLmZ1bmMuc2VsZWN0ZWQsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHNjb3BlLmNoYW5uZWxJZFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRnVuYyA9IHNjb3BlLmZ1bmMuc2VsZWN0ZWQ7XG5cbiAgICAgICAgICB2YXIgb2xkUGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLFxuICAgICAgICAgICAgcGlsbCA9IF8uY2xvbmUob2xkUGlsbCksXG4gICAgICAgICAgICBpc1EgPSBpc1BpbGxRKHBpbGwpLFxuICAgICAgICAgICAgaXNUID0gaXNQaWxsVChwaWxsKTtcblxuICAgICAgICAgIGlmKCFwaWxsKXtcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm90IHJlYWR5XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gcmVzZXQgZmllbGQgZGVmXG4gICAgICAgICAgLy8gSEFDSzogd2UncmUgdGVtcG9yYXJpbHkgc3RvcmluZyB0aGUgbWF4YmlucyBpbiB0aGUgcGlsbFxuICAgICAgICAgIC8vIEZJWE1FIHRlbXBvcmFsIGNhbiBhY3R1YWxseSBoYXZlIGFnZ3JlZ2F0aW9uIGluIHByYWN0aWNlIHRvb1xuICAgICAgICAgIHBpbGwuYmluID0gc2VsZWN0ZWRGdW5jID09PSBCSU4gPyB7fSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICBwaWxsLmFnZ3JlZ2F0ZSA9IChpc1EgJiYgYWdncmVnYXRlcy5pbmRleE9mKHNlbGVjdGVkRnVuYykgIT09IC0xKSA/IHNlbGVjdGVkRnVuYyA6IHVuZGVmaW5lZDtcbiAgICAgICAgICBwaWxsLnRpbWVVbml0ID0gKGlzVCAmJiB0aW1lVW5pdHMuaW5kZXhPZihzZWxlY3RlZEZ1bmMpICE9PSAtMSkgPyBzZWxlY3RlZEZ1bmMgOiB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBpZighXy5pc0VxdWFsKG9sZFBpbGwsIHBpbGwpKXtcbiAgICAgICAgICAgIFBpbGxzLnNldChzY29wZS5jaGFubmVsSWQsIHBpbGwsIHRydWUgLyogcHJvcGFnYXRlIGNoYW5nZSAqLyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmlzQW55Q2hhbmdlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoc2NvcGUuZnVuYy5pc0FueSkge1xuICAgICAgICAgICAgdmFyIGNoZWNrZWQgPSB7fTtcbiAgICAgICAgICAgIGNoZWNrZWRbc2NvcGUuZnVuYy5zZWxlY3RlZF0gPSB0cnVlO1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5jaGVja2VkID0gY2hlY2tlZDtcbiAgICAgICAgICAgIHNjb3BlLmNoZWNrQ2hhbmdlZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29wZS5zZWxlY3RDaGFuZ2VkKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmNoZWNrQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBvbGRQaWxsID0gUGlsbHMuZ2V0KHNjb3BlLmNoYW5uZWxJZCksXG4gICAgICAgICAgICBwaWxsID0gXy5jbG9uZShvbGRQaWxsKSxcbiAgICAgICAgICAgIGlzUSA9IGlzUGlsbFEocGlsbCksXG4gICAgICAgICAgICBpc1QgPSBpc1BpbGxUKHBpbGwpO1xuXG4gICAgICAgICAgaWYgKCFwaWxsKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIG5vdCByZWFkeVxuICAgICAgICAgIH1cblxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GVU5DX0NIQU5HRSwgc2NvcGUuZnVuYy5jaGVja2VkLCB7XG4gICAgICAgICAgICBjaGFubmVsOiBzY29wZS5jaGFubmVsSWRcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIHN0b3JlIGNoZWNrZWQgbm9mbiwgYWdncmVnYXRlcywgdGltZVVuaXRzIGJ1dCBleGNsdWRlIGJpbiBhcyB3ZSB3aWxsIGNoZWNrIGZvciBiaW4gZGlyZWN0bHlcbiAgICAgICAgICB2YXIgZm5zID0gT2JqZWN0LmtleXMoc2NvcGUuZnVuYy5jaGVja2VkKVxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihmKSB7IHJldHVybiBmICE9PSAnYmluJyAmJiBzY29wZS5mdW5jLmNoZWNrZWRbZl07IH0pXG4gICAgICAgICAgICAubWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGYgPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogZjsgfSk7XG5cbiAgICAgICAgICAvLyBGSVhNRSB0ZW1wb3JhbCAvIG9yZGluYWwgLyBub21pbmFsIGNhbiBhY3R1YWxseSBoYXZlIGFnZ3JlZ2F0aW9uIGluIHByYWN0aWNlIHRvb1xuICAgICAgICAgIGlmIChpc1EpIHtcbiAgICAgICAgICAgIHBpbGwuYmluID0gc2NvcGUuZnVuYy5jaGVja2VkLmJpbiA/XG4gICAgICAgICAgICAgIChmbnMubGVuZ3RoID4gMCA/IHtlbnVtOiBbZmFsc2UsIHRydWVdfSA6IHRydWUpIDpcbiAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgICAgICAgcGlsbC5hZ2dyZWdhdGUgPSB7ZW51bTogc2NvcGUuZnVuYy5jaGVja2VkLmJpbiA/IGZucy5jb25jYXQoW3VuZGVmaW5lZF0pIDogZm5zfTtcbiAgICAgICAgICAgIHBpbGwuaGFzRm4gPSBzY29wZS5mdW5jLmNoZWNrZWRbJ3VuZGVmaW5lZCddID8gdW5kZWZpbmVkIDogdHJ1ZTtcblxuICAgICAgICAgICAgcGlsbC50aW1lVW5pdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzVCkge1xuICAgICAgICAgICAgcGlsbC5hZ2dyZWdhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBwaWxsLmJpbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHBpbGwudGltZVVuaXQgPSB7ZW51bTogZm5zfTtcbiAgICAgICAgICAgIHBpbGwuaGFzRm4gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYoIV8uaXNFcXVhbChvbGRQaWxsLCBwaWxsKSl7XG4gICAgICAgICAgICBQaWxscy5zZXQoc2NvcGUuY2hhbm5lbElkLCBwaWxsLCB0cnVlIC8qIHByb3BhZ2F0ZSBjaGFuZ2UgKi8pO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyB3aGVuIHBhcmVudCBvYmplY3RzIG1vZGlmeSB0aGUgZmllbGRcbiAgICAgICAgdmFyIGZpZWxkRGVmV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnZmllbGREZWYnLCBmdW5jdGlvbihwaWxsKSB7XG4gICAgICAgICAgaWYgKCFwaWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaGFjazogc2F2ZSB0aGUgbWF4Ymluc1xuICAgICAgICAgIGlmIChwaWxsLmJpbikge1xuICAgICAgICAgICAgbWF4YmlucyA9IHBpbGwuYmluLm1heGJpbnM7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGlzT3JkaW5hbFNoZWxmID0gWydyb3cnLCdjb2x1bW4nLCdzaGFwZSddLmluZGV4T2Yoc2NvcGUuY2hhbm5lbElkKSAhPT0gLTEsXG4gICAgICAgICAgICAgIGlzUSA9IGlzUGlsbFEocGlsbCksXG4gICAgICAgICAgICAgIGlzVCA9IGlzUGlsbFQocGlsbCk7XG5cbiAgICAgICAgICAvLyBmb3IgbWFraW5nIGJlbG93Rm9sZCB0aW1lVW5pdHMgc2luZ2xlLWNvbHVtblxuICAgICAgICAgIHNjb3BlLmZ1bmMuaXNUZW1wb3JhbCA9IGlzVDtcblxuICAgICAgICAgIC8vIGhpZGUgXCJtb3JlXCIgJiBcImxlc3NcIiB0b2dnbGVzIGZvciBDT1VOVFxuICAgICAgICAgIHNjb3BlLmZ1bmMuaXNDb3VudCA9IHBpbGwuZmllbGQgPT09ICcqJztcblxuICAgICAgICAgIGlmKHBpbGwuZmllbGQgPT09ICcqJyAmJiBwaWxsLmFnZ3JlZ2F0ZSA9PT0gQ09VTlQpe1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmFib3ZlRm9sZD1bQ09VTlRdO1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZD1bXTtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMuc2VsZWN0ZWQgPSBDT1VOVDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgc3VwcG9ydGVkIHR5cGUgYmFzZWQgb24gcHJpbWl0aXZlIGRhdGE/XG4gICAgICAgICAgICBpZiAoaXNUKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQgPSB0ZW1wb3JhbEZ1bmN0aW9ucy5hYm92ZUZvbGQuZmlsdGVyKHRpbWVVbml0SGFzVmFyaWF0aW9uRmlsdGVyKTtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZCA9IHRlbXBvcmFsRnVuY3Rpb25zLmJlbG93Rm9sZC5maWx0ZXIodGltZVVuaXRIYXNWYXJpYXRpb25GaWx0ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXNRKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQgPSBxdWFudGl0YXRpdmVGdW5jdGlvbnMuYWJvdmVGb2xkO1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkID0gcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmJlbG93Rm9sZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRlZmF1bHRWYWwgPSAoaXNPcmRpbmFsU2hlbGYgJiZcbiAgICAgICAgICAgICAgKGlzUSAmJiBCSU4pIHx8IChpc1QgJiYgY29uc3RzLmRlZmF1bHRUaW1lRm4pXG4gICAgICAgICAgICApIHx8IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgc2NvcGUuZnVuYy5pc0FueSA9IGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwuYWdncmVnYXRlKSB8fFxuICAgICAgICAgICAgICBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLmJpbikgfHxcbiAgICAgICAgICAgICAgY3FsLmVudW1TcGVjLmlzRW51bVNwZWMocGlsbC50aW1lVW5pdCk7XG5cbiAgICAgICAgICAgIGlmIChzY29wZS5mdW5jLmlzQW55KSB7XG4gICAgICAgICAgICAgIHZhciBjaGVja2VkID0ge307XG4gICAgICAgICAgICAgIGlmIChpc1EpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGlzYWxsb3dVbmRlZmluZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAocGlsbC5iaW4pIHtcbiAgICAgICAgICAgICAgICAgIGNoZWNrZWQuYmluID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLmJpbikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpbGwuYmluLmVudW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICBwaWxsLmJpbi5lbnVtLmZvckVhY2goZnVuY3Rpb24oYmluKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWJpbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhbGxvd1VuZGVmaW5lZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpc2FsbG93VW5kZWZpbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHBpbGwuYWdncmVnYXRlKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY3FsLmVudW1TcGVjLmlzRW51bVNwZWMocGlsbC5hZ2dyZWdhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhZ2dyZWdhdGVzID0gcGlsbC5hZ2dyZWdhdGUuZW51bSB8fCBjcWwuY29uZmlnLkRFRkFVTFRfUVVFUllfQ09ORklHLmFnZ3JlZ2F0ZXM7XG4gICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZXMuZm9yRWFjaChmdW5jdGlvbihhZ2dyZWdhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkW2FnZ3JlZ2F0ZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjaGVja2VkWyd1bmRlZmluZWQnXSkge1xuICAgICAgICAgICAgICAgICAgICAgIGRpc2FsbG93VW5kZWZpbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFtwaWxsLmFnZ3JlZ2F0ZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChkaXNhbGxvd1VuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgZGVsZXRlIGNoZWNrZWRbJ3VuZGVmaW5lZCddO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBjaGVja2VkWyd1bmRlZmluZWQnXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzVCkge1xuICAgICAgICAgICAgICAgIGlmIChwaWxsLnRpbWVVbml0KSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY3FsLmVudW1TcGVjLmlzRW51bVNwZWMocGlsbC50aW1lVW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbWVVbml0cyA9IHBpbGwudGltZVVuaXQuZW51bSB8fCBjcWwuY29uZmlnLkRFRkFVTFRfUVVFUllfQ09ORklHLmFnZ3JlZ2F0ZXM7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVVbml0cy5mb3JFYWNoKGZ1bmN0aW9uKHRpbWVVbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFt0aW1lVW5pdF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vbi1lbnVtIHNwZWNcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFtwaWxsLnRpbWVVbml0XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGNoZWNrZWRbJ3VuZGVmaW5lZCddID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5jaGVja2VkID0gY2hlY2tlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9IHBpbGwuYmluID8gJ2JpbicgOlxuICAgICAgICAgICAgICAgIHBpbGwuYWdncmVnYXRlIHx8IHBpbGwudGltZVVuaXQ7XG5cbiAgICAgICAgICAgICAgaWYgKHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQuaW5kZXhPZihzZWxlY3RlZCkgPj0gMCB8fCBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkLmluZGV4T2Yoc2VsZWN0ZWQpID49IDApIHtcbiAgICAgICAgICAgICAgICBzY29wZS5mdW5jLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuZnVuYy5zZWxlY3RlZCA9IGRlZmF1bHRWYWw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyKHMpXG4gICAgICAgICAgZmllbGREZWZXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOm1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbCcsIGZ1bmN0aW9uICgkZG9jdW1lbnQsIE1vZGFscykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbW9kYWwvbW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGF1dG9PcGVuOiAnPCcsXG4gICAgICAgIG1heFdpZHRoOiAnQCdcbiAgICAgIH0sXG4gICAgICAvLyBQcm92aWRlIGFuIGludGVyZmFjZSBmb3IgY2hpbGQgZGlyZWN0aXZlcyB0byBjbG9zZSB0aGlzIG1vZGFsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAgICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgICAgdmFyIG1vZGFsSWQgPSBhdHRycy5pZDtcblxuICAgICAgICBpZiAoc2NvcGUubWF4V2lkdGgpIHtcbiAgICAgICAgICBzY29wZS53cmFwcGVyU3R5bGUgPSAnbWF4LXdpZHRoOicgKyBzY29wZS5tYXhXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gY2xvc2VkIHVubGVzcyBhdXRvT3BlbiBpcyBzZXRcbiAgICAgICAgc2NvcGUuaXNPcGVuID0gc2NvcGUuYXV0b09wZW47XG5cbiAgICAgICAgLy8gY2xvc2Ugb24gZXNjXG4gICAgICAgIGZ1bmN0aW9uIGVzY2FwZShlKSB7XG4gICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMjcgJiYgc2NvcGUuaXNPcGVuKSB7XG4gICAgICAgICAgICBzY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJGRvY3VtZW50KS5vbigna2V5ZG93bicsIGVzY2FwZSk7XG5cbiAgICAgICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2RhbCB3aXRoIHRoZSBzZXJ2aWNlXG4gICAgICAgIE1vZGFscy5yZWdpc3Rlcihtb2RhbElkLCBzY29wZSk7XG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBNb2RhbHMuZGVyZWdpc3Rlcihtb2RhbElkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxDbG9zZUJ1dHRvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsQ2xvc2VCdXR0b25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdtb2RhbENsb3NlQnV0dG9uJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9tb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGNsb3NlQWN0aW9uOiAnJidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICBzY29wZS5jbG9zZU1vZGFsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgaWYgKHNjb3BlLmNsb3NlQWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS5jbG9zZUFjdGlvbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZGlyZWN0aXZlOnByb3BlcnR5RWRpdG9yXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcHJvcGVydHlFZGl0b3JcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdwcm9wZXJ0eUVkaXRvcicsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGlkOiAnPScsXG4gICAgICAgIHR5cGU6ICc9JyxcbiAgICAgICAgZW51bTogJz0nLFxuICAgICAgICBwcm9wTmFtZTogJz0nLFxuICAgICAgICBncm91cDogJz0nLFxuICAgICAgICBkZXNjcmlwdGlvbjogJz0nLFxuICAgICAgICBkZWZhdWx0OiAnPScsXG4gICAgICAgIG1pbjogJz0nLFxuICAgICAgICBtYXg6ICc9JyxcbiAgICAgICAgcm9sZTogJz0nIC8vIGZvciBleGFtcGxlICdjb2xvcidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5oYXNBdXRvID0gc2NvcGUuZGVmYXVsdCA9PT0gdW5kZWZpbmVkO1xuXG4gICAgICAgIC8vVE9ETyhrYW5pdHcpOiBjb25zaWRlciByZW5hbWluZ1xuICAgICAgICBzY29wZS5hdXRvbW9kZWwgPSB7IHZhbHVlOiBmYWxzZSB9O1xuXG4gICAgICAgIGlmIChzY29wZS5oYXNBdXRvKSB7XG4gICAgICAgICAgc2NvcGUuYXV0b21vZGVsLnZhbHVlID0gc2NvcGUuZ3JvdXBbc2NvcGUucHJvcE5hbWVdID09PSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHZhbHVlIHRvIHVuZGVmaW5lZCBpZiBhdXRvIGlzIHRydWVcbiAgICAgICAgICB2YXIgYXV0b01vZGVsV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnYXV0b21vZGVsLnZhbHVlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoc2NvcGUuYXV0b21vZGVsLnZhbHVlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmdyb3VwW3Njb3BlLnByb3BOYW1lXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJcbiAgICAgICAgICAgIGF1dG9Nb2RlbFdhdGNoZXIoKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUuaXNSYW5nZSA9IHNjb3BlLm1heCAhPT0gdW5kZWZpbmVkICYmIHNjb3BlLm1pbiAhPT0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NjaGVtYUxpc3QnLCBmdW5jdGlvbih2bCwgY3FsLCBMb2dnZXIsIFBpbGxzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgb3JkZXJCeTogJzwnLFxuICAgICAgICBmaWVsZERlZnM6ICc8JyxcbiAgICAgICAgZmlsdGVyTWFuYWdlcjogJz0nLFxuICAgICAgICBzaG93QWRkOiAnPCcsXG4gICAgICAgIHNob3dDb3VudDogJzwnLFxuICAgICAgICBzaG93RHJvcDogJzwnXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgICAgIHNjb3BlLlBpbGxzID0gUGlsbHM7XG4gICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5kcm9wcGVkRmllbGREZWYgPSB7fTtcbiAgICAgICAgc2NvcGUuY291bnRGaWVsZERlZiA9IFBpbGxzLmNvdW50RmllbGREZWY7XG5cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkFERF9XSUxEQ0FSRCwgc2NvcGUuZHJvcHBlZEZpZWxkRGVmKTtcbiAgICAgICAgICBQaWxscy5hZGRXaWxkY2FyZChzY29wZS5kcm9wcGVkRmllbGREZWYpO1xuICAgICAgICAgIHNjb3BlLmRyb3BwZWRGaWVsZERlZiA9IHt9O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHBvbGVzdGFyLmRpcmVjdGl2ZTpzY2hlbWFMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHNjaGVtYUxpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnc2NoZW1hTGlzdEl0ZW0nLCBmdW5jdGlvbiAoRGF0YXNldCwgRHJvcCwgTG9nZ2VyLCBQaWxscywgY3FsLCB2bCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JywgLy8gVHdvLXdheVxuICAgICAgICBzaG93QWRkOiAgJzwnLFxuICAgICAgICBmaWx0ZXJNYW5hZ2VyOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCkge1xuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5jb3VudEZpZWxkRGVmID0gUGlsbHMuY291bnRGaWVsZERlZjtcblxuICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLmRyb3BwZWRGaWVsZERlZiA9IG51bGw7XG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb1BvcHVwQ29udGVudCA9ICBlbGVtZW50LmZpbmQoJy5zY2hlbWEtbWVudScpWzBdO1xuXG4gICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYztcblxuICAgICAgICBzY29wZS5maWVsZEFkZCA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICAgICAgUGlsbHMuYWRkKGZpZWxkRGVmKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmZpbHRlck1hbmFnZXIpIHJldHVybjtcbiAgICAgICAgICBzY29wZS5maWx0ZXJNYW5hZ2VyLnRvZ2dsZShzY29wZS5maWVsZERlZi5maWVsZCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzY29wZS5maWVsZERlZjtcblxuICAgICAgICAgIHNjb3BlLnBpbGwgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICB0aXRsZTogZmllbGREZWYudGl0bGUsXG4gICAgICAgICAgICB0eXBlOiBmaWVsZERlZi50eXBlLFxuICAgICAgICAgICAgYWdncmVnYXRlOiBmaWVsZERlZi5hZ2dyZWdhdGVcbiAgICAgICAgICB9O1xuICAgICAgICAgIFBpbGxzLmRyYWdTdGFydChzY29wZS5waWxsLCBudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZERyYWdTdG9wID0gUGlsbHMuZHJhZ1N0b3A7XG5cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMuYWRkV2lsZGNhcmRGaWVsZChzY29wZS5maWVsZERlZiwgc2NvcGUuZHJvcHBlZEZpZWxkRGVmKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQUREX1dJTERDQVJEX0ZJRUxELCBzY29wZS5maWVsZERlZiwge1xuICAgICAgICAgICAgYWRkZWRGaWVsZDogc2NvcGUuZHJvcHBlZEZpZWxkRGVmXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgc2NvcGUuZHJvcHBlZEZpZWxkRGVmID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5yZW1vdmVXaWxkY2FyZEZpZWxkID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICB2YXIgZmllbGQgPSBzY29wZS5maWVsZERlZi5maWVsZDtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuUkVNT1ZFX1dJTERDQVJEX0ZJRUxELCBzY29wZS5maWVsZERlZiwge1xuICAgICAgICAgICAgcmVtb3ZlZEZpZWxkOiBmaWVsZC5lbnVtW2luZGV4XSA9PT0gJyonID8gJ0NPVU5UJyA6IGZpZWxkLmVudW1baW5kZXhdXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUGlsbHMucmVtb3ZlV2lsZGNhcmRGaWVsZChzY29wZS5maWVsZERlZiwgaW5kZXgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZVdpbGRjYXJkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlJFTU9WRV9XSUxEQ0FSRCwgc2NvcGUuZmllbGREZWYpO1xuICAgICAgICAgIFBpbGxzLnJlbW92ZVdpbGRjYXJkKHNjb3BlLmZpZWxkRGVmKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0RPKGh0dHBzOi8vZ2l0aHViLmNvbS92ZWdhL3ZlZ2EtbGl0ZS11aS9pc3N1ZXMvMTg3KTpcbiAgICAgICAgLy8gY29uc2lkZXIgaWYgd2UgY2FuIHVzZSB2YWxpZGF0b3IgLyBjcWwgaW5zdGVhZFxuICAgICAgICB2YXIgYWxsb3dlZENhc3RpbmcgPSB7XG4gICAgICAgICAgaW50ZWdlcjogW3ZsLnR5cGUuUVVBTlRJVEFUSVZFLCB2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgbnVtYmVyOiBbdmwudHlwZS5RVUFOVElUQVRJVkUsIHZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSxcbiAgICAgICAgICBkYXRlOiBbdmwuVEVNUE9SQUxdLFxuICAgICAgICAgIHN0cmluZzogW3ZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgYm9vbGVhbjogW3ZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgYWxsOiBbdmwudHlwZS5RVUFOVElUQVRJVkUsIHZsLnR5cGUuVEVNUE9SQUwsIHZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB1bndhdGNoRmllbGREZWYgPSBzY29wZS4kd2F0Y2goJ2ZpZWxkRGVmJywgZnVuY3Rpb24oZmllbGREZWYpe1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhmaWVsZERlZi5maWVsZCkpIHtcbiAgICAgICAgICAgIHNjb3BlLmFsbG93ZWRUeXBlcyA9IGFsbG93ZWRDYXN0aW5nLmFsbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcGUuYWxsb3dlZFR5cGVzID0gYWxsb3dlZENhc3RpbmdbZmllbGREZWYucHJpbWl0aXZlVHlwZV07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkRGVmLmZpZWxkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuZmllbGRUaXRsZSA9IGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgaWYgKGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKGZpZWxkKSkge1xuICAgICAgICAgICAgcmV0dXJuIChmaWVsZC5lbnVtIHx8IFsnV2lsZGNhcmQnXSlcbiAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWVsZCA9PT0gJyonID8gJ0NPVU5UJyA6IGZpZWxkO1xuICAgICAgICAgICAgICB9KS5qb2luKCcsJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmaWVsZDtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuZmllbGRBZGQgPSBudWxsO1xuICAgICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBudWxsO1xuICAgICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBudWxsO1xuXG4gICAgICAgICAgdW53YXRjaEZpZWxkRGVmKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NoZWx2ZXMnLCBmdW5jdGlvbigpIHtcblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvc2hlbHZlcy9zaGVsdmVzLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHNwZWM6ICc9JyxcbiAgICAgICAgcHJldmlldzogJzwnLFxuICAgICAgICBzdXBwb3J0QW55OiAnPCcsXG4gICAgICAgIHN1cHBvcnRBdXRvTWFyazogJzwnLFxuICAgICAgICBmaWx0ZXJNYW5hZ2VyOiAnPSdcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBBTlksIHV0aWwsIHZsLCBDb25maWcsIERhdGFzZXQsIExvZ2dlciwgUGlsbHMpIHtcbiAgICAgICAgJHNjb3BlLkFOWSA9IEFOWTtcbiAgICAgICAgJHNjb3BlLmFueUNoYW5uZWxJZHMgPSBbXTtcbiAgICAgICAgJHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgICRzY29wZS5tYXJrcyA9IFsncG9pbnQnLCAndGljaycsICdiYXInLCAnbGluZScsICdhcmVhJywgJ3RleHQnXTtcbiAgICAgICAgJHNjb3BlLm1hcmtzV2l0aEFueSA9IFtBTlldLmNvbmNhdCgkc2NvcGUubWFya3MpO1xuXG4gICAgICAgICRzY29wZS5tYXJrQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk1BUktfQ0hBTkdFLCAkc2NvcGUuc3BlYy5tYXJrKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICB2bC5zcGVjLnRyYW5zcG9zZSgkc2NvcGUuc3BlYyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19DTEVBTiwgJHNjb3BlLnNwZWMpO1xuICAgICAgICAgIFBpbGxzLnJlc2V0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHNwZWNXYXRjaGVyID0gJHNjb3BlLiR3YXRjaCgnc3BlYycsIGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICAvLyBwb3B1bGF0ZSBhbnlDaGFubmVsSWRzIHNvIHdlIHNob3cgYWxsIG9yIHRoZW1cbiAgICAgICAgICBpZiAoJHNjb3BlLnN1cHBvcnRBbnkpIHtcbiAgICAgICAgICAgICRzY29wZS5hbnlDaGFubmVsSWRzID0gdXRpbC5rZXlzKHNwZWMuZW5jb2RpbmcpLnJlZHVjZShmdW5jdGlvbihhbnlDaGFubmVsSWRzLCBjaGFubmVsSWQpIHtcbiAgICAgICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55Q2hhbm5lbElkcy5wdXNoKGNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIGFueUNoYW5uZWxJZHM7XG4gICAgICAgICAgICB9LCBbXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9ubHkgY2FsbCBQaWxscy51cGRhdGUsIHdoaWNoIHdpbGwgdHJpZ2dlciBTcGVjLnNwZWMgdG8gdXBkYXRlIGlmIGl0J3Mgbm90IGEgcHJldmlldy5cbiAgICAgICAgICBpZiAoISRzY29wZS5wcmV2aWV3KSB7XG4gICAgICAgICAgICB2YXIgU3BlYyA9IFBpbGxzLnVwZGF0ZShzcGVjKTtcbiAgICAgICAgICAgIHZhciBsb2dEYXRhID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChTcGVjKSB7XG4gICAgICAgICAgICAgIGlmIChTcGVjLmNoYXJ0cykge1xuICAgICAgICAgICAgICAgIGxvZ0RhdGEgPSB7c3BlY2lmaWM6IGZhbHNlLCBudW1DaGFydHM6IFNwZWMuY2hhcnRzLmxlbmd0aH07XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoU3BlYy5jaGFydCkge1xuICAgICAgICAgICAgICAgIGxvZ0RhdGEgPSB7c3BlY2lmaWM6IHRydWV9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ0RhdGEgPSB7c3BlY2lmaWM6IGZhbHNlLCBudW1DaGFydHM6IDB9O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19DSEFOR0UsIHNwZWMsIGxvZ0RhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7IC8vLCB0cnVlIC8qIHdhdGNoIGVxdWFsaXR5IHJhdGhlciB0aGFuIHJlZmVyZW5jZSAqLyk7XG5cblxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJcbiAgICAgICAgICBzcGVjV2F0Y2hlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWInLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RhYnMvdGFiLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnRhYnNldCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGhlYWRpbmc6ICdAJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdGFic2V0Q29udHJvbGxlcikge1xuICAgICAgICB0YWJzZXRDb250cm9sbGVyLmFkZFRhYihzY29wZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFic2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFic2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFic2V0JywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy90YWJzL3RhYnNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuXG4gICAgICAvLyBJbnRlcmZhY2UgZm9yIHRhYnMgdG8gcmVnaXN0ZXIgdGhlbXNlbHZlc1xuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRhYnMgPSBbXTtcblxuICAgICAgICB0aGlzLmFkZFRhYiA9IGZ1bmN0aW9uKHRhYlNjb3BlKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGFiIGlzIGFsd2F5cyBhdXRvLWFjdGl2YXRlZDsgb3RoZXJzIGF1dG8tZGVhY3RpdmF0ZWRcbiAgICAgICAgICB0YWJTY29wZS5hY3RpdmUgPSBzZWxmLnRhYnMubGVuZ3RoID09PSAwO1xuICAgICAgICAgIHNlbGYudGFicy5wdXNoKHRhYlNjb3BlKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNob3dUYWIgPSBmdW5jdGlvbihzZWxlY3RlZFRhYikge1xuICAgICAgICAgIHNlbGYudGFicy5mb3JFYWNoKGZ1bmN0aW9uKHRhYikge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIHRhYiwgZGVhY3RpdmF0ZSBhbGwgb3RoZXJzXG4gICAgICAgICAgICB0YWIuYWN0aXZlID0gdGFiID09PSBzZWxlY3RlZFRhYjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEV4cG9zZSBjb250cm9sbGVyIHRvIHRlbXBsYXRlcyBhcyBcInRhYnNldFwiXG4gICAgICBjb250cm9sbGVyQXM6ICd0YWJzZXQnXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90JywgZnVuY3Rpb24odmwsIHZnLCBjcWwsICR0aW1lb3V0LCAkcSwgRGF0YXNldCwgQ29uZmlnLCBjb25zdHMsIF8sICRkb2N1bWVudCwgTG9nZ2VyLCBIZWFwLCAkd2luZG93KSB7XG4gICAgdmFyIGNvdW50ZXIgPSAwO1xuICAgIHZhciBNQVhfQ0FOVkFTX1NJWkUgPSAzMjc2Ny8yLCBNQVhfQ0FOVkFTX0FSRUEgPSAyNjg0MzU0NTYvNDtcblxuICAgIHZhciByZW5kZXJRdWV1ZSA9IG5ldyBIZWFwKGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgICByZXR1cm4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHk7XG4gICAgICB9KSxcbiAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZ2V0UmVuZGVyZXIod2lkdGgsIGhlaWdodCkge1xuICAgICAgLy8gdXNlIGNhbnZhcyBieSBkZWZhdWx0IGJ1dCB1c2Ugc3ZnIGlmIHRoZSB2aXN1YWxpemF0aW9uIGlzIHRvbyBiaWdcbiAgICAgIGlmICh3aWR0aCA+IE1BWF9DQU5WQVNfU0laRSB8fCBoZWlnaHQgPiBNQVhfQ0FOVkFTX1NJWkUgfHwgd2lkdGgqaGVpZ2h0ID4gTUFYX0NBTlZBU19BUkVBKSB7XG4gICAgICAgIHJldHVybiAnc3ZnJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAnY2FudmFzJztcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPCcsXG4gICAgICAgIC8qKiBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBpZiB0aGUgcGxvdCBpcyBzdGlsbCBpbiB0aGUgdmlldywgc28gaXQgbWlnaHQgYmUgb21pdHRlZCBmcm9tIHRoZSByZW5kZXIgcXVldWUgaWYgbmVjZXNzYXJ5LiAqL1xuICAgICAgICBpc0luTGlzdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPCcsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBvdmVyZmxvdzogJzwnLFxuICAgICAgICBwcmlvcml0eTogJzwnLFxuICAgICAgICByZXNjYWxlOiAnPCcsXG4gICAgICAgIHRodW1ibmFpbDogJzwnLFxuICAgICAgICB0b29sdGlwOiAnPCcsXG4gICAgICAgIG1vdXNlRW50ZXJBY3Rpb246ICc9JyxcbiAgICAgICAgcmVuZGVyOiAnPSdcbiAgICAgIH0sXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIEhPVkVSX1RJTUVPVVQgPSA1MDA7XG4gICAgICAgIHZhciB2aWV3O1xuICAgICAgICB2YXIgdG9vbHRpcDtcbiAgICAgICAgdmFyIFRPT0xUSVBfREVMQVkgPSAyMDA7XG5cbiAgICAgICAgc2NvcGUudmxQbG90SGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuaGVpZ2h0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudmxQbG90V2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC53aWR0aCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGRlc3Ryb3lWaWV3KCkge1xuICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICB0b29sdGlwLmRlc3Ryb3koKTsgLy8gZGVzdHJveSB0b29sdGlwIChwcm9taXNlIGFuZCBldmVudCBsaXN0bmVycylcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldy5kZXN0cm95KCk7XG4gICAgICAgICAgICB2aWV3ID0gbnVsbDtcblxuICAgICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuICAgICAgICAgICAgaWYgKGNvbnN0cy5kZWJ1ZyAmJiAkd2luZG93LnZpZXdzKSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc2NvcGUudmlzSWQgPSAoY291bnRlcisrKTtcblxuICAgICAgICB2YXIgaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgdmFyIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAgICAgc2NvcGUubW91c2VlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGhvdmVyUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVkVSLCBzY29wZS5jaGFydC5zaG9ydGhhbmQse1xuICAgICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9ICFzY29wZS50aHVtYm5haWw7XG4gICAgICAgICAgfSwgSE9WRVJfVElNRU9VVCk7XG5cbiAgICAgICAgICBpZiAoc2NvcGUubW91c2VFbnRlckFjdGlvbikge1xuICAgICAgICAgICAgc2NvcGUubW91c2VFbnRlckFjdGlvbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5tb3VzZWxlYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBzY29wZS51bmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uVG9vbHRpcEFwcGVhcihldmVudCwgaXRlbSkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtLCB7XG4gICAgICAgICAgICBzaG9ydGhhbmQ6IHNjb3BlLmNoYXJ0LnNob3J0aGFuZCxcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Ub29sdGlwRGlzYXBwZWFyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtLCB7XG4gICAgICAgICAgICBzaG9ydGhhbmQ6IHNjb3BlLmNoYXJ0LnNob3J0aGFuZCxcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB2bFNwZWMgPSBfLmNsb25lRGVlcChzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIHZnLnV0aWwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuXG4gICAgICAgICAgLy8gRklYTUU6IHVzZSBjaGFydCBzdGF0cyBpZiBhdmFpbGFibGUgKGZvciBleGFtcGxlIGZyb20gYm9va21hcmtzKVxuICAgICAgICAgIHZhciBzY2hlbWEgPSBEYXRhc2V0LnNjaGVtYTtcblxuICAgICAgICAgIC8vIFNwZWNpYWwgUnVsZXNcbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSB2bFNwZWMuZW5jb2Rpbmc7XG4gICAgICAgICAgaWYgKGVuY29kaW5nKSB7XG4gICAgICAgICAgICAvLyBwdXQgeC1heGlzIG9uIHRvcCBpZiB0b28gaGlnaC1jYXJkaW5hbGl0eSBhbmQgdGhlcmUgaXMgbm8gY29sdW1uXG4gICAgICAgICAgICBpZiAoZW5jb2RpbmcueSAmJiBlbmNvZGluZy55LmZpZWxkICYmIFt2bC50eXBlLk5PTUlOQUwsIHZsLnR5cGUuT1JESU5BTF0uaW5kZXhPZihlbmNvZGluZy55LnR5cGUpID4gLTEpIHtcbiAgICAgICAgICAgICAgaWYgKGVuY29kaW5nLnggJiYgIWVuY29kaW5nLmNvbHVtbikge1xuICAgICAgICAgICAgICAgIGlmIChzY2hlbWEuY2FyZGluYWxpdHkoZW5jb2RpbmcueSkgPiAyNSkge1xuICAgICAgICAgICAgICAgICAgKGVuY29kaW5nLnguYXhpcyA9IGVuY29kaW5nLnguYXhpcyB8fCB7fSkub3JpZW50ID0gJ3RvcCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzZSBzbWFsbGVyIGJhbmQgc2l6ZSBpZiBoYXMgWCBvciBZIGhhcyBjYXJkaW5hbGl0eSA+IDEwIG9yIGhhcyBhIGZhY2V0XG4gICAgICAgICAgICBpZiAoKGVuY29kaW5nLnJvdyAmJiBlbmNvZGluZy55KSB8fFxuICAgICAgICAgICAgICAgIChlbmNvZGluZy55ICYmIHNjaGVtYS5jYXJkaW5hbGl0eShlbmNvZGluZy55KSA+IDEwKSkge1xuICAgICAgICAgICAgICAoZW5jb2RpbmcueS5zY2FsZSA9IGVuY29kaW5nLnkuc2NhbGUgfHwge30pLmJhbmRTaXplID0gMTI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICgoZW5jb2RpbmcuY29sdW1uICYmIGVuY29kaW5nLngpIHx8XG4gICAgICAgICAgICAgICAgKGVuY29kaW5nLnggJiYgc2NoZW1hLmNhcmRpbmFsaXR5KGVuY29kaW5nLngpID4gMTApKSB7XG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnNjYWxlID0gZW5jb2RpbmcueC5zY2FsZSB8fCB7fSkuYmFuZFNpemUgPSAxMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLmNvbG9yICYmIGVuY29kaW5nLmNvbG9yLnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCkge1xuICAgICAgICAgICAgICBpZiAoc2NoZW1hLmNhcmRpbmFsaXR5KGVuY29kaW5nLmNvbG9yKSA+IDEwKSB7XG4gICAgICAgICAgICAgICAgKGVuY29kaW5nLmNvbG9yLnNjYWxlID0gZW5jb2RpbmcuY29sb3Iuc2NhbGUgfHwge30pLnJhbmdlID0gJ2NhdGVnb3J5MjAnO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBhbHdheXMgc2V0IHRoZSBzYW1lIGNvbG9yIHRvIHRoZSBzYW1lIHZhbHVlXG4gICAgICAgICAgICAgIChlbmNvZGluZy5jb2xvci5zY2FsZSA9IGVuY29kaW5nLmNvbG9yLnNjYWxlIHx8IHt9KS5kb21haW4gPSBEYXRhc2V0LnNjaGVtYS5kb21haW4oZW5jb2RpbmcuY29sb3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoKGVuY29kaW5nLnggJiYgZW5jb2RpbmcueC5zY2FsZSAmJiBlbmNvZGluZy54LnNjYWxlLnR5cGUgPT09ICdsb2cnKSAmJlxuICAgICAgICAgICAgICAgIChlbmNvZGluZy55ICYmIGVuY29kaW5nLnkuc2NhbGUgJiYgZW5jb2RpbmcueS5zY2FsZS50eXBlID09PSAnbG9nJykpIHtcbiAgICAgICAgICAgICAgW2VuY29kaW5nLngsIGVuY29kaW5nLnldLmZvckVhY2goZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICAgICAgICBmaWVsZERlZi5heGlzID0gZmllbGREZWYuYXhpcyB8fCB7fTtcbiAgICAgICAgICAgICAgICBmaWVsZERlZi5heGlzLnByb3BlcnRpZXMgPSBmaWVsZERlZi5heGlzLnByb3BlcnRpZXMgfHwge307XG4gICAgICAgICAgICAgICAgZmllbGREZWYuYXhpcy5wcm9wZXJ0aWVzLmdyaWQgPSBmaWVsZERlZi5heGlzLnByb3BlcnRpZXMuZ3JpZCB8fCB7fTtcbiAgICAgICAgICAgICAgICBmaWVsZERlZi5heGlzLnByb3BlcnRpZXMuZ3JpZC5vcGFjaXR5ID0ge3ZhbHVlOiAwLjV9O1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZsLmNvbXBpbGUodmxTcGVjKS5zcGVjO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmlzRWxlbWVudCgpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVzY2FsZUlmRW5hYmxlKCkge1xuICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZ2V0VmlzRWxlbWVudCgpO1xuICAgICAgICAgIGlmIChzY29wZS5yZXNjYWxlKSB7XG4gICAgICAgICAgICAvLyBoYXZlIHRvIGRpZ2VzdCB0aGUgc2NvcGUgdG8gZW5zdXJlIHRoYXRcbiAgICAgICAgICAgIC8vIGVsZW1lbnQud2lkdGgoKSBpcyBib3VuZCBieSBwYXJlbnQgZWxlbWVudCFcbiAgICAgICAgICAgIHNjb3BlLiRkaWdlc3QoKTtcblxuICAgICAgICAgICAgdmFyIHhSYXRpbyA9IE1hdGgubWF4KFxuICAgICAgICAgICAgICAgIDAuMixcbiAgICAgICAgICAgICAgICBlbGVtZW50LndpZHRoKCkgLyAgLyogd2lkdGggb2YgdmxwbG90IGJvdW5kaW5nIGJveCAqL1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoIC8qIHdpZHRoIG9mIHRoZSB2aXMgKi9cbiAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHhSYXRpbyA8IDEpIHtcbiAgICAgICAgICAgICAgdmlzRWxlbWVudC53aWR0aChzY29wZS53aWR0aCAqIHhSYXRpbylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5oZWlnaHQoc2NvcGUuaGVpZ2h0ICogeFJhdGlvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2aXNFbGVtZW50LmNzcygndHJhbnNmb3JtJywgbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAuY3NzKCd0cmFuc2Zvcm0tb3JpZ2luJywgbnVsbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U2hvcnRoYW5kKCkge1xuICAgICAgICAgIHJldHVybiBzY29wZS5jaGFydC5zaG9ydGhhbmQgfHwgKHNjb3BlLmNoYXJ0LnZsU3BlYyA/IGNxbC5xdWVyeS5zaG9ydGhhbmQudmxTcGVjKHNjb3BlLmNoYXJ0LnZsU3BlYykgOiAnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXJRdWV1ZU5leHQoKSB7XG4gICAgICAgICAgLy8gcmVuZGVyIG5leHQgaXRlbSBpbiB0aGUgcXVldWVcbiAgICAgICAgICBpZiAocmVuZGVyUXVldWUuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSByZW5kZXJRdWV1ZS5wb3AoKTtcbiAgICAgICAgICAgIG5leHQucGFyc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3Igc2F5IHRoYXQgbm8gb25lIGlzIHJlbmRlcmluZ1xuICAgICAgICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cblxuICAgICAgICBmdW5jdGlvbiByZW5kZXIoc3BlYykge1xuXG4gICAgICAgICAgaWYgKCFzcGVjKSB7XG4gICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHNwZWMuaGVpZ2h0O1xuICAgICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBmaW5kIHZpcyBlbGVtZW50Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuXG4gICAgICAgICAgZnVuY3Rpb24gcGFyc2VWZWdhKCkge1xuICAgICAgICAgICAgLy8gaWYgbm8gbG9uZ2VyIGEgcGFydCBvZiB0aGUgbGlzdCwgY2FuY2VsIVxuICAgICAgICAgICAgaWYgKHNjb3BlLmRlc3Ryb3llZCB8fCBzY29wZS5kaXNhYmxlZCB8fCAoc2NvcGUuaXNJbkxpc3QgJiYgc2NvcGUuY2hhcnQuZmllbGRTZXRLZXkgJiYgIXNjb3BlLmlzSW5MaXN0KHNjb3BlLmNoYXJ0KSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbmNlbCByZW5kZXJpbmcnLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHQoKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIC8vIHJlbmRlciBpZiBzdGlsbCBhIHBhcnQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIHZnLnBhcnNlLnNwZWMoc3BlYywgZnVuY3Rpb24oZXJyb3IsIGNoYXJ0KSB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSAkdGltZW91dChyZW5kZXJRdWV1ZU5leHQsIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBlbmRQYXJzZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGRlc3Ryb3lWaWV3KCk7XG4gICAgICAgICAgICAgICAgdmlldyA9IGNoYXJ0KHtlbDogZWxlbWVudFswXX0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHMudXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LmRhdGEoe3JhdzogRGF0YXNldC5kYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmlldy51cGRhdGUoKTtcblxuICAgICAgICAgICAgICAgIC8vIHJlYWQgd2lkdGggLyBoZWlnaHQgZnJvbSBsYXlvdXRcbiAgICAgICAgICAgICAgICB2YXIgbGF5b3V0ID0gdmlldy5kYXRhKCdsYXlvdXQnKS52YWx1ZXMoKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcmVuZGVyZXIgPSBnZXRSZW5kZXJlcihsYXlvdXQud2lkdGgsIGxheW91dC5oZWlnaHQpO1xuICAgICAgICAgICAgICAgIGlmIChyZW5kZXJlciA9PT0gJ3N2ZycpIHtcbiAgICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyZXIocmVuZGVyZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB2aXNFbGVtZW50ID0gZWxlbWVudC5maW5kKCcudmVnYSA+IDpmaXJzdC1jaGlsZCcpO1xuICAgICAgICAgICAgICAgIC8vIHJlYWQgIDxjYW52YXM+Lzxzdmc+4oCZcyB3aWR0aCBhbmQgaGVpZ2h0LCB3aGljaCBpcyB2ZWdhJ3Mgb3V0ZXIgd2lkdGggYW5kIGhlaWdodCB0aGF0IGluY2x1ZGVzIGF4ZXMgYW5kIGxlZ2VuZHNcbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCA9ICB2aXNFbGVtZW50LndpZHRoKCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuaGVpZ2h0ID0gdmlzRWxlbWVudC5oZWlnaHQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb25zdHMuZGVidWcpIHtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3MgPSAkd2luZG93LnZpZXdzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3c1tzaG9ydGhhbmRdID0gdmlldztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfUkVOREVSLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlc2NhbGVJZkVuYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVuZENoYXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlIHNwZWMnLCAoZW5kUGFyc2Utc3RhcnQpLCAnY2hhcnRpbmcnLCAoZW5kQ2hhcnQtZW5kUGFyc2UpLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS50b29sdGlwKSB7XG4gICAgICAgICAgICAgICAgICAvLyB1c2UgdmVnYS10b29sdGlwXG4gICAgICAgICAgICAgICAgICB0b29sdGlwID0gdmwudG9vbHRpcCh2aWV3LCBzY29wZS5jaGFydC52bFNwZWMsIHtcbiAgICAgICAgICAgICAgICAgICAgb25BcHBlYXI6IG9uVG9vbHRpcEFwcGVhcixcbiAgICAgICAgICAgICAgICAgICAgb25EaXNhcHBlYXI6IG9uVG9vbHRpcERpc2FwcGVhcixcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IFRPT0xUSVBfREVMQVlcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSwgSlNPTi5zdHJpbmdpZnkoc3BlYykpO1xuICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbmRlclF1ZXVlTmV4dFByb21pc2UgPSAkdGltZW91dChyZW5kZXJRdWV1ZU5leHQsIDEpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcmVuZGVyaW5nKSB7IC8vIGlmIG5vIGluc3RhbmNlIGlzIGJlaW5nIHJlbmRlciAtLSByZW5kZXJpbmcgbm93XG4gICAgICAgICAgICByZW5kZXJpbmc9dHJ1ZTtcbiAgICAgICAgICAgIHBhcnNlVmVnYSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgcXVldWUgaXRcbiAgICAgICAgICAgIHJlbmRlclF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICBwcmlvcml0eTogc2NvcGUucHJpb3JpdHkgfHwgMCxcbiAgICAgICAgICAgICAgcGFyc2U6IHBhcnNlVmVnYVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNwZWNXYXRjaGVyID0gc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgIC8vICAgaWYoc2NvcGUucmVuZGVyKSB7XG4gICAgICAgIC8vICAgdmFyIHNwZWMgPSBnZXRWZ1NwZWMoKTtcbiAgICAgICAgLy8gICByZW5kZXIoc3BlYyk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgICByZXR1cm4gXy5vbWl0KHNjb3BlLmNoYXJ0LnZsU3BlYywgJ2RhdGEnKTtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHNwZWMgPSBzY29wZS5jaGFydC52Z1NwZWMgPSBnZXRWZ1NwZWMoKTtcbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LmNsZWFuU3BlYykge1xuICAgICAgICAgICAgLy8gRklYTUVcbiAgICAgICAgICAgIHNjb3BlLmNoYXJ0LmNsZWFuU3BlYyA9IHNjb3BlLmNoYXJ0LnZsU3BlYztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gbW9kaWZpZWQgYnkgWmhlXG4gICAgICAgICAgaWYoc2NvcGUucmVuZGVyKSB7XG4gICAgICAgICAgICByZW5kZXIoc3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAvLyBhZGRlZCBieSBaaGVcbiAgICAgICAgdmFyIHJlbmRlcldhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ3JlbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmKHNjb3BlLnJlbmRlcikge1xuICAgICAgICAgIHZhciBzcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgcmVuZGVyKHNwZWMpO1xuICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygndmxwbG90IGRlc3Ryb3llZCcpO1xuICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChob3ZlclByb21pc2UpIHtcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChob3ZlclByb21pc2UpO1xuICAgICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiAocmVuZGVyUXVldWVOZXh0UHJvbWlzZSkge1xuICAgICAgICAgIC8vICAgJHRpbWVvdXQuY2FuY2VsKHJlbmRlclF1ZXVlTmV4dFByb21pc2UpO1xuICAgICAgICAgIC8vICAgcmVuZGVyUXVldWVOZXh0UHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG5cbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyXG4gICAgICAgICAgc3BlY1dhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXAnLCBmdW5jdGlvbiAoQm9va21hcmtzLCBjb25zdHMsIHZnLCB2bCwgRGF0YXNldCwgTG9nZ2VyLCBfLCBQaWxscywgQ2hhcnQsICR0aW1lb3V0LCBNb2RhbHMsIERyb3ApIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJzwnLFxuICAgICAgICBpc0luTGlzdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPCcsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBlbmFibGVQaWxsc1ByZXZpZXc6ICc8JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgcmVzY2FsZTogJzwnLFxuICAgICAgICB0aHVtYm5haWw6ICc8JyxcbiAgICAgICAgdG9vbHRpcDogJzwnLFxuXG4gICAgICAgIC8vIGFkZGVkIGJ5IFpoZVxuICAgICAgICByZW5kZXJDaGFydCA6ICc8JyxcblxuICAgICAgICAvKiB2bHBsb3Rncm91cCBzcGVjaWZpYyAqL1xuXG4gICAgICAgIC8qKiBTZXQgb2YgZmllbGREZWZzIGZvciBzaG93aW5nIGZpZWxkIGluZm8uICBGb3IgVm95YWdlcjIsIHRoaXMgbWlnaHQgYmUganVzdCBhIHN1YnNldCBvZiBmaWVsZHMgdGhhdCBhcmUgYW1iaWd1b3VzLiAqL1xuICAgICAgICBmaWVsZFNldDogJzwnLFxuICAgICAgICBzaG93RmlsdGVySW5mbzogJzwnLFxuXG4gICAgICAgIHNob3dBeGlzUHJvcDogJzwnLFxuICAgICAgICBzaG93Qm9va21hcms6ICc8JyxcbiAgICAgICAgc2hvd0RlYnVnOiAnPCcsXG4gICAgICAgIHNob3dFeHBhbmQ6ICc8JyxcbiAgICAgICAgc2hvd0ZpbHRlck51bGw6ICc8JyxcbiAgICAgICAgc2hvd0xhYmVsOiAnPCcsXG4gICAgICAgIHNob3dMb2c6ICc8JyxcbiAgICAgICAgc2hvd1NlbGVjdDogJzwnLFxuICAgICAgICBzaG93U29ydDogJzwnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnPCcsXG5cbiAgICAgICAgLyoqIFdoZXRoZXIgdGhlIGxvZyAvIHRyYW5zcG9zZSBzb3J0IGNhdXNlIHNpZGUgZWZmZWN0IHRvIHRoZSBzaGVsZiAgKi9cbiAgICAgICAgdG9nZ2xlU2hlbGY6ICc8JyxcblxuICAgICAgICBhbHdheXNTZWxlY3RlZDogJzwnLFxuICAgICAgICBpc1NlbGVjdGVkOiAnPCcsXG4gICAgICAgIGhpZ2hsaWdodGVkOiAnPCcsXG4gICAgICAgIGV4cGFuZEFjdGlvbjogJyYnLFxuICAgICAgICBzZWxlY3RBY3Rpb246ICcmJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHNjb3BlLkJvb2ttYXJrcyA9IEJvb2ttYXJrcztcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICB2YXIgeFBvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLngtcHJvcC1wb3B1cCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcueC1wcm9wLXRvZ2dsZScpWzBdLFxuICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0JyxcbiAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHlQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy55LXByb3AtcG9wdXAnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnktcHJvcC10b2dnbGUnKVswXSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gYm9va21hcmsgYWxlcnRcbiAgICAgICAgc2NvcGUuc2hvd0Jvb2ttYXJrQWxlcnQgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUudG9nZ2xlQm9va21hcmsgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIGlmIChCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCkpIHtcbiAgICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gIXNjb3BlLnNob3dCb29rbWFya0FsZXJ0OyAvLyB0b2dnbGUgYWxlcnRcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBCb29rbWFya3MuYWRkKGNoYXJ0LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgd2F0Y2hSZW5kZXIgPSBzY29wZS4kd2F0Y2goc2NvcGUucmVuZGVyQ2hhcnQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmKHNjb3BlLnJlbmRlckNoYXJ0KSB7XG5cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNob3cgZmlsdGVycyAoaWYgYW55KVxuICAgICAgICB2YXIgdW53YXRjaEZpbHRlciA9IHNjb3BlLiR3YXRjaCgnY2hhcnQudmxTcGVjLnRyYW5zZm9ybS5maWx0ZXInLCBmdW5jdGlvbih2bFNwZWNGaWx0ZXIpIHtcbiAgICAgICAgICBpZiAoIXZsU3BlY0ZpbHRlcikge1xuICAgICAgICAgICAgc2NvcGUuaGFzRmlsdGVyID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuaGFzRmlsdGVyID0gdHJ1ZTtcblxuICAgICAgICAgIHZhciBmaWx0ZXJJbmZvID0gXCJGaWx0ZXJcIjtcbiAgICAgICAgICB2bFNwZWNGaWx0ZXIuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICAgIC8vIGFkZCBmaWx0ZXIgZmllbGQgbmFtZVxuICAgICAgICAgICAgZmlsdGVySW5mbyA9IGZpbHRlckluZm8gKyBcIlxcblwiICsgZmlsdGVyLmZpZWxkICsgXCIgXFx1MjIwOCBcIjtcblxuICAgICAgICAgICAgLy8gYWRkIFEgb3IgTiBmaWx0ZXIgcmFuZ2VcbiAgICAgICAgICAgIGlmIChmaWx0ZXIucmFuZ2UpIHtcbiAgICAgICAgICAgICAgZmlsdGVySW5mbyA9IGZpbHRlckluZm8gKyBcIltcIiArIGZpbHRlci5yYW5nZS5qb2luKCcsICcpICsgXCJdXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChmaWx0ZXIuaW4pIHtcbiAgICAgICAgICAgICAgaWYgKGZpbHRlci5pbi5sZW5ndGggPCA1KSB7XG4gICAgICAgICAgICAgICAgZmlsdGVySW5mbyA9IGZpbHRlckluZm8gKyBcIntcIiArIGZpbHRlci5pbi5qb2luKCcsICcpICsgXCJ9XCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlsdGVySW5mbyA9IGZpbHRlckluZm8gKyBcIntcIiArIGZpbHRlci5pblswXSArIFwiLCAuLi4sIFwiICsgZmlsdGVyLmluW2ZpbHRlci5pbi5sZW5ndGgtMV0gKyBcIn1cIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHNjb3BlLmZpbHRlckluZm8gPSBmaWx0ZXJJbmZvO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZmllbGRIb3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICB2YXIgcHJldmlld1Byb21pc2UgPSBudWxsO1xuXG4gICAgICAgIHNjb3BlLmVuYWJsZVByZXZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBwcmV2aWV3UHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgICBQaWxscy5wcmV2aWV3KHRydWUsIHNjb3BlLmNoYXJ0LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIDUwMCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5kaXNhYmxlUHJldmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChwcmV2aWV3UHJvbWlzZSkge1xuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHByZXZpZXdQcm9taXNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJldmlld1Byb21pc2UgPSBudWxsO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLmVuYWJsZVBpbGxzUHJldmlldykge1xuICAgICAgICAgICAgUGlsbHMucHJldmlldyhmYWxzZSwgc2NvcGUuY2hhcnQsIHNjb3BlLmxpc3RUaXRsZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb01vdXNlb3ZlciA9IGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCkge1xuICAgICAgICAgIGZpZWxkSG92ZXJQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBMaW5rIHRvIG9yaWdpbmFsIGZpZWxkIGluIHRoZSBDUUwtYmFzZWQgc3BlY1xuICAgICAgICAgICAgaWYgKHNjb3BlLmNoYXJ0ICYmIHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgICAgdmFyIGVudW1TcGVjSW5kZXggPSBzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4O1xuICAgICAgICAgICAgICBpZiAoZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWVsZEVudW1TcGVjTmFtZSA9IGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZC5uYW1lO1xuICAgICAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRW51bVNwZWNOYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJRUxEREVGX0hJR0hMSUdIVEVELCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgaGlnaGxpZ2h0ZWRGaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZEluZm9Nb3VzZW91dCA9IGZ1bmN0aW9uKGZpZWxkRGVmLCBpbmRleCkge1xuICAgICAgICAgIGlmIChmaWVsZEhvdmVyUHJvbWlzZSkge1xuICAgICAgICAgICAgLy8gaWYgd2UgdW5ob3ZlciB3aXRoaW5cbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChmaWVsZEhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZpZWxkSG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIGlmICgoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0pIHtcbiAgICAgICAgICAgIC8vIGRpc2FibGUgcHJldmlldyBpZiBpdCdzIGVuYWJsZWRcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUVMRERFRl9VTkhJR0hMSUdIVEVELCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgICAgaGlnaGxpZ2h0ZWRGaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBVbmxpbmsgTGluayB0byBvcmlnaW5hbCBmaWVsZCBpbiB0aGUgQ1FMLWJhc2VkIHNwZWNcbiAgICAgICAgICAgIGlmIChzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICAgIHZhciBlbnVtU3BlY0luZGV4ID0gc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleDtcbiAgICAgICAgICAgICAgaWYgKGVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRFbnVtU3BlY05hbWUgPSBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQubmFtZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGRFbnVtU3BlY05hbWVdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZEZpZWxkID0gZnVuY3Rpb24oY2hhcnQsIGluZGV4KSB7XG4gICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5maWVsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmlzRW51bWVyYXRlZENoYW5uZWwgPSBmdW5jdGlvbihjaGFydCwgaW5kZXgpIHtcbiAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSkge1xuICAgICAgICAgICAgICByZXR1cm4gY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmNoYW5uZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5zZWxlY3QgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TUEVDX1NFTEVDVCwgY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBQaWxscy5zZWxlY3QoY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICBpZiAoc2NvcGUuJHBhcmVudC5wb3N0U2VsZWN0QWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS4kcGFyZW50LnBvc3RTZWxlY3RBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgTW9kYWxzLmNsb3NlKCdib29rbWFyay1saXN0Jyk7IC8vIEhBQ0s6IHRoaXMgbGluZSBpcyBvbmx5IG5lY2Vzc2FyeSB3aGVuIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYm9va21hcmsgbGlzdFxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBCb29rbWFya3MucmVtb3ZlKGNoYXJ0KTtcbiAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmtlZXBCb29rbWFyayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IFBpbGxzLmdldChjaGFubmVsKSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGREZWYuc2NhbGUgPSBmaWVsZERlZi5zY2FsZSB8fCB7fTtcblxuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMucmVzY2FsZShjaGFubmVsLCBzY2FsZS50eXBlID09PSAnbG9nJyA/IHVuZGVmaW5lZCA6ICdsb2cnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NhbGUudHlwZSA9IHNjYWxlLnR5cGUgPT09ICdsb2cnID8gdW5kZWZpbmVkIDogJ2xvZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPR19UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUubG9nLmFjdGl2ZSA9IGZ1bmN0aW9uKHNwZWMsIGNoYW5uZWwpIHtcbiAgICAgICAgICBpZiAoIXNjb3BlLmxvZy5zdXBwb3J0KHNwZWMsIGNoYW5uZWwpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgdmFyIGZpZWxkRGVmID0gc3BlYy5lbmNvZGluZ1tjaGFubmVsXSxcbiAgICAgICAgICAgIHNjYWxlID0gZmllbGREZWYuc2NhbGU7XG5cbiAgICAgICAgICByZXR1cm4gc2NhbGUgJiYgc2NhbGUudHlwZSA9PT0gJ2xvZyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVE9HR0xFIEZJTFRFUlxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZUZpbHRlck51bGwgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLk5VTExfRklMVEVSX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMudG9nZ2xlRmlsdGVySW52YWxpZCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzcGVjLnRyYW5zZm9ybSA9IHNwZWMudHJhbnNmb3JtIHx8IHt9O1xuICAgICAgICAgICAgc3BlYy50cmFuc2Zvcm0uZmlsdGVySW52YWxpZCA9IHNwZWMudHJhbnNmb3JtLmZpbHRlckludmFsaWQgPT09IHRydWUgPyB1bmRlZmluZWQgOiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBzY29wZS50b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgIC8vICAgdmFyIGZpZWxkRGVmcyA9IHZsLnNwZWMuZmllbGREZWZzKHNwZWMpO1xuICAgICAgICAvLyAgIGZvciAodmFyIGkgaW4gZmllbGREZWZzKSB7XG4gICAgICAgIC8vICAgICB2YXIgZmllbGREZWYgPSBmaWVsZERlZnNbaV07XG4gICAgICAgIC8vICAgICAvLyBGSVhNRSBjYWxsIG1pc3NpbmcgbWV0aG9kIGRpcmVjdGx5XG4gICAgICAgIC8vICAgICBpZiAoXy5pbmNsdWRlcyhbdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLCBmaWVsZERlZi50eXBlKSAmJiBEYXRhc2V0LnNjaGVtYS5zdGF0cyhmaWVsZERlZikubWlzc2luZyA+IDApIHtcbiAgICAgICAgLy8gICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgLy8gfTtcblxuICAgICAgICAvLyBUT0dHTEUgU09SVFxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZVNvcnQgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHZhciB0b2dnbGVTb3J0ID0gc2NvcGUudG9nZ2xlU29ydCA9IHt9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZXMgPSBbJ29yZGluYWwtYXNjZW5kaW5nJywgJ29yZGluYWwtZGVzY2VuZGluZycsXG4gICAgICAgICAgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnLCAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnLCAnY3VzdG9tJ107XG5cbiAgICAgICAgdG9nZ2xlU29ydC50b2dnbGUgPSBmdW5jdGlvbihzcGVjKSB7XG5cbiAgICAgICAgICB2YXIgY3VycmVudE1vZGUgPSB0b2dnbGVTb3J0Lm1vZGUoc3BlYyk7XG4gICAgICAgICAgdmFyIGN1cnJlbnRNb2RlSW5kZXggPSB0b2dnbGVTb3J0Lm1vZGVzLmluZGV4T2YoY3VycmVudE1vZGUpO1xuXG4gICAgICAgICAgdmFyIG5ld01vZGVJbmRleCA9IChjdXJyZW50TW9kZUluZGV4ICsgMykgJSAodG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxKTtcbiAgICAgICAgICB2YXIgbmV3TW9kZSA9IHRvZ2dsZVNvcnQubW9kZXNbbmV3TW9kZUluZGV4XTtcblxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TT1JUX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBjdXJyZW50TW9kZTogY3VycmVudE1vZGUsXG4gICAgICAgICAgICBuZXdNb2RlOiBuZXdNb2RlLFxuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy5zb3J0KGNoYW5uZWxzLm9yZGluYWwsIHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydCA9IHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqIEdldCBzb3J0IHByb3BlcnR5IGRlZmluaXRpb24gdGhhdCBtYXRjaGVzIGVhY2ggbW9kZS4gKi9cbiAgICAgICAgdG9nZ2xlU29ydC5nZXRTb3J0ID0gZnVuY3Rpb24obW9kZSwgc3BlYykge1xuICAgICAgICAgIGlmIChtb2RlID09PSAnb3JkaW5hbC1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWRlc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Rlc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgdmFyIHFFbmNEZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLnF1YW50aXRhdGl2ZV07XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBvcDogcUVuY0RlZi5hZ2dyZWdhdGUsXG4gICAgICAgICAgICAgIGZpZWxkOiBxRW5jRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBvcmRlcjogJ2FzY2VuZGluZydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnZGVzY2VuZGluZydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG4gICAgICAgICAgdmFyIHNvcnQgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxzLm9yZGluYWxdLnNvcnQ7XG5cbiAgICAgICAgICBpZiAoc29ydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ29yZGluYWwtYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvZ2dsZVNvcnQubW9kZXMubGVuZ3RoIC0gMSA7IGkrKykge1xuICAgICAgICAgICAgLy8gY2hlY2sgaWYgc29ydCBtYXRjaGVzIGFueSBvZiB0aGUgc29ydCBmb3IgZWFjaCBtb2RlIGV4Y2VwdCAnY3VzdG9tJy5cbiAgICAgICAgICAgIHZhciBtb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tpXTtcbiAgICAgICAgICAgIHZhciBzb3J0T2ZNb2RlID0gdG9nZ2xlU29ydC5nZXRTb3J0KG1vZGUsIHNwZWMpO1xuXG4gICAgICAgICAgICBpZiAoXy5pc0VxdWFsKHNvcnQsIHNvcnRPZk1vZGUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBtb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh2Zy51dGlsLmlzT2JqZWN0KHNvcnQpICYmIHNvcnQub3AgJiYgc29ydC5maWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdpbnZhbGlkIG1vZGUnKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LmNoYW5uZWxzID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHJldHVybiBzcGVjLmVuY29kaW5nLngudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwgP1xuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd4JywgcXVhbnRpdGF0aXZlOiAneSd9IDpcbiAgICAgICAgICAgICAgICAgIHtvcmRpbmFsOiAneScsIHF1YW50aXRhdGl2ZTogJ3gnfTtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGVuY29kaW5nID0gc3BlYy5lbmNvZGluZztcblxuICAgICAgICAgIGlmICh2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdyb3cnKSB8fCB2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICdjb2x1bW4nKSB8fFxuICAgICAgICAgICAgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3gnKSB8fCAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneScpIHx8XG4gICAgICAgICAgICAhdmwuZW5jb2RpbmcuaXNBZ2dyZWdhdGUoc3BlYy5lbmNvZGluZykpIHsgLy8gRklYTUUgcmVwbGFjZSB0aGlzIHByb3BlciBhbHdheXNOb09jY2x1c2lvbiBtZXRob2RcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy55KVxuICAgICAgICAgICAgKSA/ICd4JyA6XG4gICAgICAgICAgICAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy55LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLngpXG4gICAgICAgICAgICApID8gJ3knIDogZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudG9nZ2xlU29ydENsYXNzID0gZnVuY3Rpb24odmxTcGVjKSB7XG4gICAgICAgICAgaWYgKCF2bFNwZWMgfHwgIXRvZ2dsZVNvcnQuc3VwcG9ydCh2bFNwZWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ludmlzaWJsZSc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIG9yZGluYWxDaGFubmVsID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQuY2hhbm5lbHModmxTcGVjKS5vcmRpbmFsLFxuICAgICAgICAgICAgbW9kZSA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0Lm1vZGUodmxTcGVjKTtcblxuICAgICAgICAgIHZhciBkaXJlY3Rpb25DbGFzcyA9IG9yZGluYWxDaGFubmVsID09PSAneCcgPyAnc29ydC14ICcgOiAnJztcblxuICAgICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1hc2MnO1xuICAgICAgICAgICAgY2FzZSAnb3JkaW5hbC1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtZGVzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWFzYyc7XG4gICAgICAgICAgICBjYXNlICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1kZXNjJztcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIGN1c3RvbVxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydCc7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRyYW5zcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5UUkFOU1BPU0VfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGlmIChzY29wZS50b2dnbGVTaGVsZikge1xuICAgICAgICAgICAgUGlsbHMudHJhbnNwb3NlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENoYXJ0LnRyYW5zcG9zZShzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdW53YXRjaEZpbHRlcigpO1xuICAgICAgICAgIHNjb3BlLmNoYXJ0ID0gbnVsbDtcbiAgICAgICAgICBpZiAoeFBvcHVwICYmIHhQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICB4UG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoeVBvcHVwICYmIHlQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICB5UG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBQb3B1cCcsIGZ1bmN0aW9uIChEcm9wKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXnZsUGxvdEdyb3VwJyxcbiAgICAgIHNjb3BlOiBmYWxzZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgdmxQbG90R3JvdXBDb250cm9sbGVyKSB7XG4gICAgICAgIHZhciBkZWJ1Z1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLmRldi10b29sJylbMF0sXG4gICAgICAgICAgdGFyZ2V0OiB2bFBsb3RHcm91cENvbnRyb2xsZXIuZ2V0RHJvcFRhcmdldCgpLFxuICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIHJpZ2h0JyxcbiAgICAgICAgICBvcGVuT246ICdjbGljaycsXG4gICAgICAgICAgY29uc3RyYWluVG9XaW5kb3c6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlYnVnUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3RHcm91cExpc3QnLCBmdW5jdGlvbiAodmwsIGNxbCwgalF1ZXJ5LCBjb25zdHMsIF8sIExvZ2dlciwgUGlsbHMsIENoYXJ0LCAkdGltZW91dCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyoqIEFuIGluc3RhbmNlIG9mIHNwZWNRdWVyeU1vZGVsR3JvdXAgKi9cbiAgICAgICAgZW5hYmxlUGlsbHNQcmV2aWV3OiAnPCcsXG4gICAgICAgIGluaXRpYWxMaW1pdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcbiAgICAgICAgaGlkZUxpc3RUaXRsZTogJzwnLFxuICAgICAgICBjaGFydHM6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgc2hvd01vcmU6ICc8JyxcbiAgICAgICAgcG9zdFNlbGVjdEFjdGlvbjogJyYnLFxuICAgICAgICBzaG93UXVlcnlTZWxlY3Q6ICc8JyxcbiAgICAgICAgc2hvd1NwZWNpZnk6ICc8JyxcbiAgICAgICAgcXVlcnk6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUubGltaXQgPSBzY29wZS5pbml0aWFsTGltaXQgfHwgNDtcblxuICAgICAgICAvLyBGdW5jdGlvbnNcbiAgICAgICAgc2NvcGUuZ2V0Q2hhcnQgPSBDaGFydC5nZXRDaGFydDtcbiAgICAgICAgc2NvcGUuaW5jcmVhc2VMaW1pdCA9IGluY3JlYXNlTGltaXQ7XG4gICAgICAgIHNjb3BlLmlzSW5saXN0ID0gaXNJbkxpc3Q7XG4gICAgICAgIHNjb3BlLlBpbGxzID0gUGlsbHM7XG5cbiAgICAgICAgc2NvcGUuc2VsZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlFVRVJZX1NFTEVDVCwgY3FsLnF1ZXJ5LnNob3J0aGFuZC5zcGVjKHNjb3BlLnF1ZXJ5KSwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUGlsbHMuc2VsZWN0UXVlcnkoc2NvcGUucXVlcnkpO1xuXG4gICAgICAgICAgLy8gc2Nyb2xsIHRvIHRvcCBpZiBwYXJlbnQgYWN0aW9uIGlzIHByb3ZpZGVkLlxuICAgICAgICAgIGlmIChzY29wZS5wb3N0U2VsZWN0QWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS5wb3N0U2VsZWN0QWN0aW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBwcmV2aWV3UHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuZW5hYmxlUHJldmlldyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHByZXZpZXdQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBQaWxscy5wcmV2aWV3UXVlcnkodHJ1ZSwgc2NvcGUucXVlcnksIHNjb3BlLmxpc3RUaXRsZSk7XG4gICAgICAgICAgfSwgNTAwKTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmRpc2FibGVQcmV2aWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHByZXZpZXdQcm9taXNlKSB7XG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwocHJldmlld1Byb21pc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcmV2aWV3UHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgICBQaWxscy5wcmV2aWV3UXVlcnkoZmFsc2UsIHNjb3BlLnF1ZXJ5LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGVsZW1lbnQuYmluZCgnc2Nyb2xsJywgZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gICAgaWYoalF1ZXJ5KHRoaXMpLnNjcm9sbFRvcCgpICsgalF1ZXJ5KHRoaXMpLmlubmVySGVpZ2h0KCkgPj0galF1ZXJ5KHRoaXMpWzBdLnNjcm9sbEhlaWdodCl7XG4gICAgICAgIC8vICAgICBpZiAoc2NvcGUubGltaXQgPCBzY29wZS5tb2RlbEdyb3VwLmNoYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgLy8gICAgICAgc2NvcGUuaW5jcmVhc2VMaW1pdCgpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICB9XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGluY3JlYXNlTGltaXQoKSB7XG4gICAgICAgICAgc2NvcGUubGltaXQgKz0gNDtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9BRF9NT1JFLCBzY29wZS5saW1pdCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtb2RpZmllZCBieSBaaGVcbiAgICAgICAgc2NvcGUuc2hvd0NoYXJ0ID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnNob3dWaXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5zaG93Q2hhcnQgPSAhc2NvcGUuc2hvd0NoYXJ0O1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqIHJldHVybiBpZiB0aGUgcGxvdCBpcyBzdGlsbCBpbiB0aGUgdmlldywgc28gaXQgbWlnaHQgYmUgb21pdHRlZCBmcm9tIHRoZSByZW5kZXIgcXVldWUgaWYgbmVjZXNzYXJ5LiAqL1xuICAgICAgICBmdW5jdGlvbiBpc0luTGlzdChjaGFydCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2NvcGUuY2hhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihjaGFydC5zaG9ydGhhbmQgPT09IHNjb3BlLmNoYXJ0c1tpXS5zaG9ydGhhbmQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2NvbXBhY3RKU09OJywgZnVuY3Rpb24oSlNPTjMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBKU09OMy5zdHJpbmdpZnkoaW5wdXQsIG51bGwsICcgICcsIDgwKTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmVuY29kZVVyaVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZW5jb2RlVXJpXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdlbmNvZGVVUkknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5lbmNvZGVVUkkoaW5wdXQpO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSBmYWNldGVkdml6LmZpbHRlcjpyZXBvcnRVcmxcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHJlcG9ydFVybFxuICogRmlsdGVyIGluIHRoZSBmYWNldGVkdml6LlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3JlcG9ydFVybCcsIGZ1bmN0aW9uIChjb21wYWN0SlNPTkZpbHRlciwgXywgY29uc3RzKSB7XG4gICAgZnVuY3Rpb24gdm95YWdlclJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xVDlaQTE0RjNtbXpySFI3SkpWVUt5UFh6ck1xRjU0Q2pMSU9qdjJFN1pFTS92aWV3Zm9ybT8nO1xuXG4gICAgICBpZiAocGFyYW1zLmZpZWxkcykge1xuICAgICAgICB2YXIgcXVlcnkgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoXy52YWx1ZXMocGFyYW1zLmZpZWxkcykpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBxdWVyeSArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEzMjM2ODAxMzY9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYzIpIHtcbiAgICAgICAgdmFyIHNwZWMyID0gXy5vbWl0KHBhcmFtcy5zcGVjMiwgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjMikpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5Ljg1MzEzNzc4Nj0nICsgc3BlYzIgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIHZhciB0eXBlUHJvcCA9ICdlbnRyeS4xOTQwMjkyNjc3PSc7XG4gICAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3ZsJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnVmlzdWFsaXphdGlvbitSZW5kZXJpbmcrKFZlZ2FsaXRlKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd2cic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK0FsZ29yaXRobSsoVmlzcmVjKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK1VJKyhGYWNldGVkVml6KSYnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZsdWlSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMXhLcy1xR2FMWkVVZmJUbWhkbVNvUzEzT0tPRXB1dV9OTldFNVRBQW1sX1kvdmlld2Zvcm0/JztcbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uc3RzLmFwcElkID09PSAndm95YWdlcicgPyB2b3lhZ2VyUmVwb3J0IDogdmx1aVJlcG9ydDtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6dW5kZXJzY29yZTJzcGFjZVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdW5kZXJzY29yZTJzcGFjZVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigndW5kZXJzY29yZTJzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gaW5wdXQgPyBpbnB1dC5yZXBsYWNlKC9fKy9nLCAnICcpIDogJyc7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gW107IC8vIHNhdmUgdG8gbG9jYWwgc3RvcmFnZVxuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGxvY2FsU3RvcmFnZVNlcnZpY2Uuc2V0KCdib29rbWFya0xpc3QnLCB0aGlzLmxpc3QpO1xuICAgIH07XG5cbiAgICBwcm90by5zYXZlQW5ub3RhdGlvbnMgPSBmdW5jdGlvbihzaG9ydGhhbmQpIHtcbiAgICAgIHZhciBhbm5vdGF0aW9uID0gdGhpcy5kaWN0W3Nob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSlcbiAgICAgICAgLmNoYXJ0LmFubm90YXRpb24gPSBhbm5vdGF0aW9uO1xuICAgICAgdGhpcy5zYXZlKCk7XG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQU5OT1RBVEUsIHNob3J0aGFuZCwgYW5ub3RhdGlvbik7XG4gICAgfTtcblxuICAgIC8vIGV4cG9ydCBhbGwgYm9va21hcmtzIGFuZCBhbm5vdGF0aW9uc1xuICAgIHByb3RvLmV4cG9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRpY3Rpb25hcnkgPSB0aGlzLmRpY3Q7XG5cbiAgICAgIC8vIHByZXBhcmUgZXhwb3J0IGRhdGFcbiAgICAgIHZhciBleHBvcnRTcGVjcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgdmFyIHNwZWMgPSBib29rbWFyay5jaGFydC52bFNwZWM7XG4gICAgICAgIHNwZWMuZGVzY3JpcHRpb24gPSBkaWN0aW9uYXJ5W2Jvb2ttYXJrLnNob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgICAgZXhwb3J0U3BlY3MucHVzaChzcGVjKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB3cml0ZSBleHBvcnQgZGF0YSBpbiBhIG5ldyB0YWJcbiAgICAgIHZhciBleHBvcnRXaW5kb3cgPSB3aW5kb3cub3BlbigpO1xuICAgICAgZXhwb3J0V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgIGV4cG9ydFdpbmRvdy5kb2N1bWVudC53cml0ZSgnPGh0bWw+PGJvZHk+PHByZT4nICsgSlNPTi5zdHJpbmdpZnkoZXhwb3J0U3BlY3MsIG51bGwsIDIpICsgJzwvcHJlPjwvYm9keT48L2h0bWw+Jyk7XG4gICAgICBleHBvcnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoJ2Jvb2ttYXJrTGlzdCcpIHx8IFtdO1xuXG4gICAgICAvLyBwb3B1bGF0ZSB0aGlzLmRpY3RcbiAgICAgIHZhciBkaWN0aW9uYXJ5ID0gdGhpcy5kaWN0O1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgZGljdGlvbmFyeVtib29rbWFyay5zaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoYm9va21hcmsuY2hhcnQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxpc3Quc3BsaWNlKDAsIHRoaXMubGlzdC5sZW5ndGgpO1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uYWRkID0gZnVuY3Rpb24oY2hhcnQsIGxpc3RUaXRsZSkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcbiAgICAgIGNoYXJ0LnRpbWVBZGRlZCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgIC8vIEZJWE1FOiB0aGlzIGlzIG5vdCBhbHdheXMgYSBnb29kIGlkZWFcbiAgICAgIGNoYXJ0LnNjaGVtYSA9IERhdGFzZXQuc2NoZW1hO1xuXG4gICAgICB0aGlzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXSA9IF8uY2xvbmVEZWVwKGNoYXJ0KTtcblxuICAgICAgdGhpcy5saXN0LnB1c2goe1xuICAgICAgICBzaG9ydGhhbmQ6IHNob3J0aGFuZCxcbiAgICAgICAgbGlzdDogbGlzdFRpdGxlLFxuICAgICAgICBjaGFydDogXy5jbG9uZURlZXAoY2hhcnQpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19BREQsIHNob3J0aGFuZCwge1xuICAgICAgICBsaXN0OiBsaXN0VGl0bGVcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5saXN0XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3QuZmluZEluZGV4KGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSk7XG4gICAgICB2YXIgcmVtb3ZlZDtcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHJlbW92ZWQgPSB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxKVswXTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5kaWN0XG4gICAgICBkZWxldGUgdGhpcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF07XG5cbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfUkVNT1ZFLCBzaG9ydGhhbmQsIHtcbiAgICAgICAgbGlzdDogKHJlbW92ZWQgfHwge30pLmxpc3RcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWN0Lmhhc093blByb3BlcnR5KHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMT1NFKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0NoYXJ0JywgZnVuY3Rpb24gKGNxbCwgXykge1xuICAgIHZhciBDaGFydCA9IHtcbiAgICAgIGdldENoYXJ0OiBnZXRDaGFydCxcbiAgICAgIHRyYW5zcG9zZTogdHJhbnNwb3NlXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTcGVjUXVlcnlNb2RlbEdyb3VwIHwgU3BlY1F1ZXJ5TW9kZWx9IGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDaGFydChpdGVtKSB7XG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAvKiogQHR5cGUge09iamVjdH0gY29uY2lzZSBzcGVjIGdlbmVyYXRlZCAqL1xuICAgICAgICAgIHZsU3BlYzogbnVsbCxcbiAgICAgICAgICBmaWVsZFNldDogbnVsbCxcblxuICAgICAgICAgIC8qKiBAdHlwZSB7U3RyaW5nfSBnZW5lcmF0ZWQgdmwgc2hvcnRoYW5kICovXG4gICAgICAgICAgc2hvcnRoYW5kOiBudWxsLFxuICAgICAgICAgIGVudW1TcGVjSW5kZXg6IG51bGxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNwZWNNID0gaXRlbSBpbnN0YW5jZW9mIGNxbC5tb2RlbC5TcGVjUXVlcnlNb2RlbEdyb3VwID9cbiAgICAgICAgaXRlbS5nZXRUb3BTcGVjUXVlcnlNb2RlbCgpOlxuICAgICAgICBpdGVtO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW51bVNwZWNJbmRleDogc3BlY00uZW51bVNwZWNJbmRleCxcbiAgICAgICAgZmllbGRTZXQ6IHNwZWNNLnNwZWNRdWVyeS5lbmNvZGluZ3MsXG4gICAgICAgIHZsU3BlYzogc3BlY00udG9TcGVjKCksXG4gICAgICAgIHNob3J0aGFuZDogc3BlY00udG9TaG9ydGhhbmQoKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc3Bvc2Uoc3BlYykge1xuICAgICAgdmFyIGVuY29kaW5nID0gXy5jbG9uZShzcGVjLmVuY29kaW5nKTtcbiAgICAgIHZhciBvbGRYRW5jID0gZW5jb2RpbmcueDtcbiAgICAgIHZhciBvbGRZRW5jID0gZW5jb2RpbmcueTtcbiAgICAgIGVuY29kaW5nLnkgPSBvbGRYRW5jO1xuICAgICAgZW5jb2RpbmcueCA9IG9sZFlFbmM7XG5cbiAgICAgIHZhciBvbGRSb3dFbmMgPSBlbmNvZGluZy5yb3c7XG4gICAgICB2YXIgb2xkQ29sRW5jID0gZW5jb2RpbmcuY29sdW1uO1xuICAgICAgZW5jb2Rpbmcucm93ID0gb2xkQ29sRW5jO1xuICAgICAgZW5jb2RpbmcuY29sdW1uID0gb2xkUm93RW5jO1xuXG4gICAgICBzcGVjLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIENoYXJ0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHRoZSBzcGVjIGNvbmZpZy5cbi8vIFdlIGtlZXAgdGhpcyBzZXBhcmF0ZSBzbyB0aGF0IGNoYW5nZXMgYXJlIGtlcHQgZXZlbiBpZiB0aGUgc3BlYyBjaGFuZ2VzLlxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnQ29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLmRhdGEgPSB7fTtcbiAgICBDb25maWcuY29uZmlnID0ge307XG5cbiAgICBDb25maWcuZ2V0Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfTtcblxuICAgIENvbmZpZy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQ29uZmlnLmRhdGE7XG4gICAgfTtcblxuICAgIENvbmZpZy5sYXJnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2VsbDoge1xuICAgICAgICAgIHdpZHRoOiAzMDAsXG4gICAgICAgICAgaGVpZ2h0OiAzMDBcbiAgICAgICAgfSxcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMTUwLFxuICAgICAgICAgICAgaGVpZ2h0OiAxNTBcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG92ZXJsYXk6IHtsaW5lOiB0cnVlfSxcbiAgICAgICAgc2NhbGU6IHt1c2VSYXdEb21haW46IHRydWV9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBDb25maWcuc21hbGwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZhY2V0OiB7XG4gICAgICAgICAgY2VsbDoge1xuICAgICAgICAgICAgd2lkdGg6IDE1MCxcbiAgICAgICAgICAgIGhlaWdodDogMTUwXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvdmVybGF5OiB7bGluZTogdHJ1ZX0sXG4gICAgICAgIHNjYWxlOiB7dXNlUmF3RG9tYWluOiB0cnVlfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0LCB0eXBlKSB7XG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudmFsdWVzID0gZGF0YXNldC52YWx1ZXM7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS51cmw7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBDb25maWcuZGF0YS51cmwgPSBkYXRhc2V0LnVybDtcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnZhbHVlcztcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHR5cGU7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBDb25maWc7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdGaWx0ZXJNYW5hZ2VyJywgZnVuY3Rpb24gKF8sIHZsLCBEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvKiogbG9jYWwgb2JqZWN0IGZvciB0aGlzIG9iamVjdCAqL1xuICAgIHNlbGYuZmlsdGVySW5kZXggPSB7fTtcblxuICAgIHRoaXMudG9nZ2xlID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIGlmICghc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0pIHtcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0gPSBpbml0RmlsdGVyKGZpZWxkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuZmlsdGVySW5kZXhbZmllbGRdLmVuYWJsZWQgPSAhc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZDtcbiAgICAgIH1cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZCA/IExvZ2dlci5hY3Rpb25zLkZJTFRFUl9FTkFCTEVEIDogTG9nZ2VyLmFjdGlvbnMuRklMVEVSX0RJU0FCTEVELFxuICAgICAgICBmaWVsZCxcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF1cbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMuYWRkID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgIGlmICghc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0pIHtcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0gPSBpbml0RmlsdGVyKGZpZWxkKTtcbiAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkZJTFRFUl9FTkFCTEVELCBmaWVsZCwgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoIXNlbGYuZmlsdGVySW5kZXhbZmllbGRdLmVuYWJsZWQpIHtcbiAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMucmVzZXQgPSBmdW5jdGlvbihvbGRGaWx0ZXIsIGhhcmQpIHtcbiAgICAgIGlmIChoYXJkKSB7XG4gICAgICAgIHNlbGYuZmlsdGVySW5kZXggPSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF8uZm9yRWFjaChzZWxmLmZpbHRlckluZGV4LCBmdW5jdGlvbih2YWx1ZSwgZmllbGQpIHtcbiAgICAgICAgICBpZiAoc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0uZW5hYmxlZCkge1xuICAgICAgICAgICAgc2VsZi5maWx0ZXJJbmRleFtmaWVsZF0gPSBpbml0RmlsdGVyKGZpZWxkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsdGVyKSB7XG4gICAgICAgIG9sZEZpbHRlci5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgIHNlbGYuZmlsdGVySW5kZXhbZmlsdGVyLmZpZWxkXSA9IHZsLnV0aWwuZXh0ZW5kKHtlbmFibGVkOiB0cnVlfSwgZmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmLmZpbHRlckluZGV4O1xuICAgIH07XG5cbiAgICB0aGlzLmdldFZsRmlsdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdmxGaWx0ZXIgPSBfLnJlZHVjZShzZWxmLmZpbHRlckluZGV4LCBmdW5jdGlvbiAoZmlsdGVycywgZmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWVsZCA9IGZpbHRlci5maWVsZDtcbiAgICAgICAgdmFyIHRpbWVVbml0ID0gZmlsdGVyLnRpbWVVbml0O1xuXG4gICAgICAgIGlmIChmaWx0ZXIuaW4pIHtcbiAgICAgICAgICBpZiAoIGZpbHRlci5pbi5sZW5ndGggPT09IDAgfHxcbiAgICAgICAgICAgICAgIGZpbHRlci5pbi5sZW5ndGggPT09IERhdGFzZXQuc2NoZW1hLmNhcmRpbmFsaXR5KHtmaWVsZDogZmllbGR9KSApIHtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChmaWx0ZXIucmFuZ2UpIHtcbiAgICAgICAgICB2YXIgZG9tYWluID0gRGF0YXNldC5zY2hlbWEuZG9tYWluKHtcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIHRpbWVVbml0OiB0aW1lVW5pdFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKGZpbHRlci5yYW5nZVswXSA9PT0gZG9tYWluWzBdICYmIGZpbHRlci5yYW5nZVsxXSA9PT0gZG9tYWluWzFdKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVycztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmlsdGVyLmVuYWJsZWQpIHtcbiAgICAgICAgICBmaWx0ZXJzLnB1c2goXy5vbWl0KGZpbHRlciwgJ2VuYWJsZWQnKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcnM7XG4gICAgICB9LCBbXSk7XG5cbiAgICAgIHJldHVybiB2bEZpbHRlci5sZW5ndGggPyB2bEZpbHRlciA6IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdEZpbHRlcihmaWVsZCkge1xuICAgICAgdmFyIHR5cGUgPSBEYXRhc2V0LnNjaGVtYS50eXBlKGZpZWxkKTtcblxuICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgdmwudHlwZS5OT01JTkFMOlxuICAgICAgICBjYXNlIHZsLnR5cGUuT1JESU5BTDpcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIGluOiBEYXRhc2V0LnNjaGVtYS5kb21haW4oe2ZpZWxkOiBmaWVsZH0pXG4gICAgICAgICAgfTtcbiAgICAgICAgY2FzZSB2bC50eXBlLlFVQU5USVRBVElWRTpcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICAgIHJhbmdlOiBbXG4gICAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnN0YXRzKHtmaWVsZDogZmllbGR9KS5taW4sXG4gICAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnN0YXRzKHtmaWVsZDogZmllbGR9KS5tYXhcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9O1xuICAgICAgICBjYXNlIHZsLnR5cGUuVEVNUE9SQUw6XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICByYW5nZTogW1xuICAgICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS5zdGF0cyh7ZmllbGQ6IGZpZWxkfSkubWluLFxuICAgICAgICAgICAgICBEYXRhc2V0LnNjaGVtYS5zdGF0cyh7ZmllbGQ6IGZpZWxkfSkubWF4XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csICR3ZWJTcWwsIF8sIGNvbnN0cywgQW5hbHl0aWNzLCBQYXBhLCBCbG9iLCBVUkwpIHtcblxuICAgIHZhciBzZXJ2aWNlID0ge307XG5cbiAgICBzZXJ2aWNlLmxldmVscyA9IHtcbiAgICAgIE9GRjoge2lkOidPRkYnLCByYW5rOjB9LFxuICAgICAgVFJBQ0U6IHtpZDonVFJBQ0UnLCByYW5rOjF9LFxuICAgICAgREVCVUc6IHtpZDonREVCVUcnLCByYW5rOjJ9LFxuICAgICAgSU5GTzoge2lkOidJTkZPJywgcmFuazozfSxcbiAgICAgIFdBUk46IHtpZDonV0FSTicsIHJhbms6NH0sXG4gICAgICBFUlJPUjoge2lkOidFUlJPUicsIHJhbms6NX0sXG4gICAgICBGQVRBTDoge2lkOidGQVRBTCcsIHJhbms6Nn1cbiAgICB9O1xuXG4gICAgc2VydmljZS5hY3Rpb25zID0ge1xuICAgICAgLy8gREFUQVxuICAgICAgSU5JVElBTElaRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnSU5JVElBTElaRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBVTkRPOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdVTkRPJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnUkVETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfT1BFTjoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfUEFTVEU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfTkVXX1BBU1RFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgREFUQVNFVF9ORVdfVVJMOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19VUkwnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICAvLyBCT09LTUFSS1xuICAgICAgQk9PS01BUktfQUREOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19BREQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19SRU1PVkU6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX1JFTU9WRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEJPT0tNQVJLX09QRU46IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX09QRU4nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTE9TRToge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQ0xPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19DTEVBUjoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDogJ0JPT0tNQVJLX0NMRUFSJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQU5OT1RBVEU6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19BTk5PVEFURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVVNFX1JBV19ET01BSU5fVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidVU0VfUkFXX0RPTUFJTl9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIENMVVNURVJfU0VMRUNUOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDTFVTVEVSX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIExPQURfTU9SRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTE9BRF9NT1JFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGSUVMRFNcbiAgICAgIEZJRUxEU19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEU19SRVNFVDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGSUVMRFNfUkVTRVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGVU5DX0NIQU5HRToge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdGVU5DX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEFERF9GSUVMRDoge2NhdGVnb3J5OiAnRklFTERTJywgaWQ6ICdBRERfRklFTEQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEZpZWxkIEluZm9cbiAgICAgIEZJRUxEREVGX0hJR0hMSUdIVEVEOiB7Y2F0ZWdvcnk6ICdGSUVMRElORk8nLCBpZDogJ0ZJRUxEREVGX0hJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERERUZfVU5ISUdITElHSFRFRDoge2NhdGVnb3J5OiAnRklFTERJTkZPJywgaWQ6ICdGSUVMRERFRl9VTkhJR0hMSUdIVEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBXSUxEQ0FSRFxuICAgICAgQUREX1dJTERDQVJEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnQUREX1dJTERDQVJEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQUREX1dJTERDQVJEX0ZJRUxEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnQUREX1dJTERDQVJEX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVNT1ZFX1dJTERDQVJEX0ZJRUxEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnUkVNT1ZFX1dJTERDQVJEX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgUkVNT1ZFX1dJTERDQVJEOiB7Y2F0ZWdvcnk6ICdXSUxEQ0FSRCcsIGlkOiAnUkVNT1ZFX1dJTERDQVJEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBQT0xFU1RBUlxuICAgICAgU1BFQ19DTEVBTjoge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DTEVBTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEX0RST1A6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdGSUVMRF9EUk9QJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRklFTERfUkVNT1ZFRDoge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ0ZJRUxEX1JFTU9WRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGaWx0ZXJcbiAgICAgIEZJTFRFUl9FTkFCTEVEOiB7Y2F0ZWdvcnk6J0ZJTFRFUicsIGlkOiAnRklMVEVSX0VOQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUxURVJfRElTQUJMRUQ6IHtjYXRlZ29yeTonRklMVEVSJywgaWQ6ICdGSUxURVJfRElTQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUxURVJfQ0hBTkdFOiB7Y2F0ZWdvcnk6J0ZJTFRFUicsIGlkOiAnRklMVEVSX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJTFRFUl9DTEVBUjoge2NhdGVnb3J5OidGSUxURVInLCBpZDogJ0ZJTFRFUl9DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gVm95YWdlciAyXG4gICAgICBTUEVDX1NFTEVDVDoge2NhdGVnb3J5OidWT1lBR0VSMicsIGlkOiAnU1BFQ19TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBRVUVSWV9TRUxFQ1Q6IHtjYXRlZ29yeTonVk9ZQUdFUjInLCBpZDogJ1FVRVJZX1NFTEVDVCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEdST1VQX0JZX0NIQU5HRUQ6IHtjYXRlZ29yeTonVk9ZQUdFUjInLCBpZDogJ0dST1VQX0JZX0NIQU5HRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBBVVRPX0FERF9DT1VOVF9DSEFOR0VEOiB7Y2F0ZWdvcnk6J1ZPWUFHRVIyJywgaWQ6ICdBVVRPX0FERF9DT1VOVF9DSEFOR0VEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBBbHRlcm5hdGl2ZXNcbiAgICAgIFNFVF9BTFRFUk5BVElWRVNfVFlQRToge2NhdGVnb3J5OidBTFRFUk5BVElWRVMnLCBpZDogJ1NFVF9BTFRFUk5BVElWRVNfVFlQRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFRPR0dMRV9TSE9XX0FMVEVSTkFUSVZFUzoge2NhdGVnb3J5OidBTFRFUk5BVElWRVMnLCBpZDogJ1RPR0dMRV9TSE9XX0FMVEVSTkFUSVZFUycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFRPR0dMRV9ISURFX0FMVEVSTkFUSVZFUzoge2NhdGVnb3J5OidBTFRFUk5BVElWRVMnLCBpZDogJ1RPR0dMRV9ISURFX0FMVEVSTkFUSVZFUycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gUHJldmlld1xuICAgICAgU1BFQ19QUkVWSUVXX0VOQUJMRUQ6IHtjYXRlZ29yeTonUFJFVklFVycsIGlkOiAnU1BFQ19QUkVWSUVXX0VOQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBTUEVDX1BSRVZJRVdfRElTQUJMRUQ6IHtjYXRlZ29yeTonUFJFVklFVycsIGlkOiAnU1BFQ19QUkVWSUVXX0RJU0FCTEVEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99XG4gICAgfTtcblxuICAgIC8vIGNyZWF0ZSBub29wIHNlcnZpY2UgaWYgd2Vic3FsIGlzIG5vdCBzdXBwb3J0ZWRcbiAgICBpZiAoJHdpbmRvdy5vcGVuRGF0YWJhc2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc29sZS53YXJuKCdObyB3ZWJzcWwgc3VwcG9ydCBhbmQgdGh1cyBubyBsb2dnaW5nLicpO1xuICAgICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbiA9IGZ1bmN0aW9uKCkge307XG4gICAgICByZXR1cm4gc2VydmljZTtcbiAgICB9XG5cbiAgICAvLyBnZXQgdXNlciBpZCBvbmNlIGluIHRoZSBiZWdpbm5pbmdcbiAgICB2YXIgdXNlcmlkID0gc2VydmljZS51c2VyaWQgPSAkbG9jYXRpb24uc2VhcmNoKCkudXNlcmlkO1xuXG4gICAgc2VydmljZS5kYiA9ICR3ZWJTcWwub3BlbkRhdGFiYXNlKCdsb2dzJywgJzEuMCcsICdMb2dzJywgMiAqIDEwMjQgKiAxMDI0KTtcblxuICAgIHNlcnZpY2UudGFibGVOYW1lID0gJ0xvZ3NfJyArIGNvbnN0cy5hcHBJZDtcblxuICAgIC8vICh6ZW5pbmcpIFRPRE86IGNoZWNrIGlmIHRoZSB0YWJsZSBpcyBjb3JyZWN0LCBkbyB3ZSByZWFsbHkgbmVlZCB0aW1lPyB3aWxsIHRpbWUgYmUgYXV0b21hdGljYWxseSBhZGRlZD9cbiAgICBzZXJ2aWNlLmNyZWF0ZVRhYmxlSWZOb3RFeGlzdHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHNlcnZpY2UuZGIuY3JlYXRlVGFibGUoc2VydmljZS50YWJsZU5hbWUsIHtcbiAgICAgICAgJ3VzZXJpZCc6IHtcbiAgICAgICAgICAndHlwZSc6ICdJTlRFR0VSJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ3RpbWUnOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVElNRVNUQU1QJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2FjdGlvbkNhdGVnb3J5Jzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnYWN0aW9uSWQnOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdsYWJlbCc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCdcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHNlcnZpY2UuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByID0gJHdpbmRvdy5jb25maXJtKCdSZWFsbHkgY2xlYXIgdGhlIGxvZ3M/Jyk7XG4gICAgICBpZiAociA9PT0gdHJ1ZSkge1xuICAgICAgICBzZXJ2aWNlLmRiLmRyb3BUYWJsZShzZXJ2aWNlLnRhYmxlTmFtZSk7XG4gICAgICAgIHNlcnZpY2UuY3JlYXRlVGFibGVJZk5vdEV4aXN0cygpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmV4cG9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VydmljZS5kYi5zZWxlY3RBbGwoc2VydmljZS50YWJsZU5hbWUpLnRoZW4oZnVuY3Rpb24ocmVzdWx0cykge1xuICAgICAgICBpZiAocmVzdWx0cy5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGNvbnNvbGUud2FybignTm8gbG9ncycpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByb3dzID0gW107XG5cbiAgICAgICAgZm9yKHZhciBpPTA7IGkgPCByZXN1bHRzLnJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICByb3dzLnB1c2gocmVzdWx0cy5yb3dzLml0ZW0oaSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNzdiA9IFBhcGEudW5wYXJzZShyb3dzKTtcblxuICAgICAgICB2YXIgY3N2RGF0YSA9IG5ldyBCbG9iKFtjc3ZdLCB7IHR5cGU6ICd0ZXh0L2NzdicgfSk7XG4gICAgICAgIHZhciBjc3ZVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGNzdkRhdGEpO1xuXG4gICAgICAgIHZhciBlbGVtZW50ID0gYW5ndWxhci5lbGVtZW50KCc8YS8+Jyk7XG4gICAgICAgIGVsZW1lbnQuYXR0cih7XG4gICAgICAgICAgaHJlZjogY3N2VXJsLFxuICAgICAgICAgIHRhcmdldDogJ19ibGFuaycsXG4gICAgICAgICAgZG93bmxvYWQ6IHNlcnZpY2UudGFibGVOYW1lICsgJ18nICsgdXNlcmlkICsgJ18nICsgbmV3IERhdGUoKS50b0lTT1N0cmluZygpICsgJy5jc3YnXG4gICAgICAgIH0pWzBdLmNsaWNrKCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uLCBsYWJlbCwgZGF0YSkge1xuICAgICAgaWYgKCFjb25zdHMubG9nZ2luZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWUgPSBkYXRhID8gZGF0YS52YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzW2NvbnN0cy5sb2dMZXZlbCB8fCAnSU5GTyddLnJhbmspIHtcbiAgICAgICAgQW5hbHl0aWNzLnRyYWNrRXZlbnQoYWN0aW9uLmNhdGVnb3J5LCBhY3Rpb24uaWQsIGxhYmVsLCB2YWx1ZSk7XG5cbiAgICAgICAgaWYgKGNvbnN0cy5sb2dUb1dlYlNxbCkge1xuICAgICAgICAgIHZhciByb3cgPSB7XG4gICAgICAgICAgICB1c2VyaWQ6IHVzZXJpZCxcbiAgICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGFjdGlvbkNhdGVnb3J5OiBhY3Rpb24uY2F0ZWdvcnksXG4gICAgICAgICAgICBhY3Rpb25JZDogYWN0aW9uLmlkLFxuICAgICAgICAgICAgbGFiZWw6IF8uaXNPYmplY3QobGFiZWwpID8gSlNPTi5zdHJpbmdpZnkobGFiZWwpIDogbGFiZWwsXG4gICAgICAgICAgICBkYXRhOiBkYXRhID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkgOiB1bmRlZmluZWRcbiAgICAgICAgICB9O1xuICAgICAgICAgIHNlcnZpY2UuZGIuaW5zZXJ0KHNlcnZpY2UudGFibGVOYW1lLCByb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzW2NvbnN0cy5sb2dQcmludExldmVsIHx8ICdJTkZPJ10ucmFuaykge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTG9nZ2luZ10gJywgYWN0aW9uLmlkLCBsYWJlbCwgZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5jcmVhdGVUYWJsZUlmTm90RXhpc3RzKCk7XG4gICAgY29uc29sZS5sb2coJ2FwcDonLCBjb25zdHMuYXBwSWQsICdzdGFydGVkJyk7XG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbihzZXJ2aWNlLmFjdGlvbnMuSU5JVElBTElaRSwgY29uc3RzLmFwcElkKTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuc2VydmljZSgnUGlsbHMnLCBmdW5jdGlvbiAoQU5ZLCBjb25zdHMsIHV0aWwsIHZsLCBjcWwpIHtcbiAgICB2YXIgUGlsbHMgPSB7XG4gICAgICAvLyBGdW5jdGlvbnNcbiAgICAgIGlzQW55Q2hhbm5lbDogaXNBbnlDaGFubmVsLFxuICAgICAgZ2V0TmV4dEFueUNoYW5uZWxJZDogZ2V0TmV4dEFueUNoYW5uZWxJZCxcbiAgICAgIGdldEVtcHR5QW55Q2hhbm5lbElkOiBnZXRFbXB0eUFueUNoYW5uZWxJZCxcbiAgICAgIGlzRW51bWVyYXRlZENoYW5uZWw6IGlzRW51bWVyYXRlZENoYW5uZWwsXG4gICAgICBpc0VudW1lcmF0ZWRGaWVsZDogaXNFbnVtZXJhdGVkRmllbGQsXG5cbiAgICAgIGdldDogZ2V0LFxuICAgICAgLy8gRXZlbnRcbiAgICAgIGRyYWdEcm9wOiBkcmFnRHJvcCxcbiAgICAgIGRyYWdTdGFydDogZHJhZ1N0YXJ0LFxuICAgICAgZHJhZ1N0b3A6IGRyYWdTdG9wLFxuICAgICAgLy8gRXZlbnQsIHdpdGggaGFuZGxlciBpbiB0aGUgbGlzdGVuZXJcblxuICAgICAgLyoqIFNldCBhIGZpZWxkRGVmIGZvciBhIGNoYW5uZWwgKi9cbiAgICAgIHNldDogc2V0LFxuXG4gICAgICByZXNldDogcmVzZXQsXG5cbiAgICAgIC8qKiBSZW1vdmUgYSBmaWVsZERlZiBmcm9tIGEgY2hhbm5lbCAqL1xuICAgICAgcmVtb3ZlOiByZW1vdmUsXG5cbiAgICAgIGNvdW50RmllbGREZWY6IHtmaWVsZDogJyonLCBhZ2dyZWdhdGU6IHZsLmFnZ3JlZ2F0ZS5BZ2dyZWdhdGVPcC5DT1VOVCwgdHlwZTogdmwudHlwZS5RVUFOVElUQVRJVkV9LFxuXG4gICAgICAvLyBEYXRhXG4gICAgICAvLyBUT0RPOiBzcGxpdCBiZXR3ZWVuIGVuY29kaW5nIHJlbGF0ZWQgYW5kIG5vbi1lbmNvZGluZyByZWxhdGVkXG4gICAgICBwaWxsczoge30sXG4gICAgICBoaWdobGlnaHRlZDoge30sXG4gICAgICAvKiogcGlsbCBiZWluZyBkcmFnZ2VkICovXG4gICAgICBkcmFnZ2luZzogbnVsbCxcbiAgICAgIGlzRHJhZ2dpbmdXaWxkY2FyZDogbnVsbCxcbiAgICAgIC8qKiBjaGFubmVsSWQgdGhhdCdzIHRoZSBwaWxsIGlzIGJlaW5nIGRyYWdnZWQgZnJvbSAqL1xuICAgICAgY2lkRHJhZ0Zyb206IG51bGwsXG4gICAgICAvKiogTGlzdGVuZXIgICovXG4gICAgICBsaXN0ZW5lcjogbnVsbFxuICAgIH07XG5cbiAgICAvLyBBZGQgbGlzdGVuZXIgdHlwZSB0aGF0IFBpbGxzIGp1c3QgcGFzcyBhcmd1bWVudHMgdG8gaXRzIGxpc3RlbmVyXG4gICAgLy8gRklYTUU6IHByb3Blcmx5IGltcGxlbWVudCBsaXN0ZW5lciBwYXR0ZXJuXG4gICAgW1xuICAgICAgJ2FkZCcsICdwYXJzZScsICdzZWxlY3QnLCAncHJldmlldycsICd1cGRhdGUnLFxuICAgICAgJ3ByZXZpZXdRdWVyeScsICdzZWxlY3RRdWVyeScsXG4gICAgICAncmVzY2FsZScsICdzb3J0JywgJ3RvZ2dsZUZpbHRlckludmFsaWQnLCAndHJhbnNwb3NlJyxcbiAgICAgICdhZGRXaWxkY2FyZEZpZWxkJywgJ2FkZFdpbGRjYXJkJywgJ3JlbW92ZVdpbGRjYXJkRmllbGQnLCAncmVtb3ZlV2lsZGNhcmQnXG4gICAgXS5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyVHlwZSkge1xuICAgICAgUGlsbHNbbGlzdGVuZXJUeXBlXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXJbbGlzdGVuZXJUeXBlXSkge1xuICAgICAgICAgIHJldHVybiBQaWxscy5saXN0ZW5lcltsaXN0ZW5lclR5cGVdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIGNoYW5uZWwgaWQgaXMgYW4gXCJhbnlcIiBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gY2hhbm5lbElkXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNBbnlDaGFubmVsKGNoYW5uZWxJZCkge1xuICAgICAgcmV0dXJuIGNoYW5uZWxJZCAmJiBjaGFubmVsSWQuaW5kZXhPZihBTlkpID09PSAwOyAvLyBwcmVmaXggYnkgQU5ZXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RW1wdHlBbnlDaGFubmVsSWQoKSB7XG4gICAgICAvLyBGSVhNRSB0aGlzIGlzbid0IGFsd2F5cyBjb3JyZWN0LlxuICAgICAgLy8gQ3VycmVudGx5IEkgbWFrZSBpdCBva2F5IGJ5IGFkZGluZyBBTlkwIHdoZW5ldmVyIHdlIHJlc2V0IGFuZCBpdCBzZWVtcyBmaW5lLlxuICAgICAgdmFyIGFueUNoYW5uZWxzID0gdXRpbC5rZXlzKFBpbGxzLnBpbGxzKS5maWx0ZXIoZnVuY3Rpb24oY2hhbm5lbElkKSB7XG4gICAgICAgIHJldHVybiBjaGFubmVsSWQuaW5kZXhPZihBTlkpID09PSAwO1xuICAgICAgfSk7XG4gICAgICBmb3IgKHZhciBpPTAgOyBpIDwgYW55Q2hhbm5lbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWxJZCA9IGFueUNoYW5uZWxzW2ldO1xuICAgICAgICBpZiAoIVBpbGxzLnBpbGxzW2NoYW5uZWxJZF0uZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gY2hhbm5lbElkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROZXh0QW55Q2hhbm5lbElkKCkge1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgd2hpbGUgKFBpbGxzLnBpbGxzW0FOWSArIGldKSB7XG4gICAgICAgIGkrKztcbiAgICAgIH1cblxuICAgICAgaWYgKCFjb25zdHMubWF4QW55U2hlbGYgfHwgaSA+PSBjb25zdHMubWF4QW55U2hlbGYpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBBTlkgKyBpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqIEBwYXJhbSBjaGFubmVsSWQgY2hhbm5lbCBpZCBvZiB0aGUgcGlsbCB0byBiZSB1cGRhdGVkXG4gICAgICogQHBhcmFtIGZpZWxkRGVmIGZpZWxkRGVmIHRvIHRvIGJlIHVwZGF0ZWRcbiAgICAgKiBAcGFyYW0gdXBkYXRlIHdoZXRoZXIgdG8gcHJvcGFnYXRlIGNoYW5nZSB0byB0aGUgY2hhbm5lbCB1cGRhdGUgbGlzdGVuZXJcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXQoY2hhbm5lbElkLCBmaWVsZERlZiwgdXBkYXRlKSB7XG4gICAgICBQaWxscy5waWxsc1tjaGFubmVsSWRdID0gZmllbGREZWY7XG5cbiAgICAgIGlmICh1cGRhdGUgJiYgUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuc2V0KGNoYW5uZWxJZCwgZmllbGREZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhIGZpZWxkRGVmIG9mIGEgcGlsbCBvZiBhIGdpdmVuIGNoYW5uZWxJZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldChjaGFubmVsSWQpIHtcbiAgICAgIHJldHVybiBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZENoYW5uZWwoY2hhbm5lbElkKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbCkge1xuICAgICAgICByZXR1cm4gUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRW51bWVyYXRlZEZpZWxkKGNoYW5uZWxJZCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZEZpZWxkKSB7XG4gICAgICAgIHJldHVybiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRGaWVsZChjaGFubmVsSWQsIFBpbGxzLnBpbGxzW2NoYW5uZWxJZF0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgLy8gQ2xlYW4gQW55IENoYW5uZWwgU2hlbGZcbiAgICAgIE9iamVjdC5rZXlzKFBpbGxzLnBpbGxzKS5mb3JFYWNoKGZ1bmN0aW9uKGNoYW5uZWxJZCkge1xuICAgICAgICBpZiAoaXNBbnlDaGFubmVsKGNoYW5uZWxJZCkpIHtcbiAgICAgICAgICBkZWxldGUgUGlsbHMucGlsbHNbY2hhbm5lbElkXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEhBQ0sgdGhpcyBpcyBhIGhhY2sgdG8gZ2V0IGFyb3VuZCBpbmNvcnJlY3QgbG9naWMgaW4gZ2V0RW1wdHlBbnlDaGFubmVsSWQoKVxuICAgICAgUGlsbHMucGlsbHNbQU5ZKzBdID0ge307XG5cbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5yZXNldCkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5yZXNldCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZShjaGFubmVsSWQpIHtcbiAgICAgIGRlbGV0ZSBQaWxscy5waWxsc1tjaGFubmVsSWRdO1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnJlbW92ZShjaGFubmVsSWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7YW55fSBwaWxsIHBpbGwgYmVpbmcgZHJhZ2dlZFxuICAgICAqIEBwYXJhbSB7YW55fSBjaWREcmFnRnJvbSBjaGFubmVsIGlkIHRoYXQgdGhlIHBpbGwgaXMgZHJhZ2dlZCBmcm9tXG4gICAgICovXG4gICAgZnVuY3Rpb24gZHJhZ1N0YXJ0KHBpbGwsIGNpZERyYWdGcm9tKSB7XG4gICAgICBQaWxscy5kcmFnZ2luZyA9IHBpbGw7XG4gICAgICBQaWxscy5pc0RyYWdnaW5nV2lsZGNhcmQgPSBjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyhwaWxsLmZpZWxkKTtcbiAgICAgIFBpbGxzLmNpZERyYWdGcm9tID0gY2lkRHJhZ0Zyb207XG4gICAgfVxuXG4gICAgLyoqIFN0b3AgcGlsbCBkcmFnZ2luZyAqL1xuICAgIGZ1bmN0aW9uIGRyYWdTdG9wKCkge1xuICAgICAgUGlsbHMuZHJhZ2dpbmcgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFdoZW4gYSBwaWxsIGlzIGRyb3BwZWRcbiAgICAgKiBAcGFyYW0gY2lkRHJhZ1RvICBjaGFubmVsSWQgdGhhdCdzIHRoZSBwaWxsIGlzIGJlaW5nIGRyYWdnZWQgdG9cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkcmFnRHJvcChjaWREcmFnVG8pIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5kcmFnRHJvcChjaWREcmFnVG8sIFBpbGxzLmNpZERyYWdGcm9tKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUGlsbHM7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciBzZXJ2aW5nIFZMIFNjaGVtYVxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnU2NoZW1hJywgZnVuY3Rpb24odmcsIHZsLCB2bFNjaGVtYSkge1xuICAgIHZhciBTY2hlbWEgPSB7fTtcblxuICAgIFNjaGVtYS5zY2hlbWEgPSB2bFNjaGVtYTtcblxuICAgIFNjaGVtYS5nZXRDaGFubmVsU2NoZW1hID0gZnVuY3Rpb24oY2hhbm5lbCkge1xuICAgICAgdmFyIGRlZiA9IG51bGw7XG4gICAgICB2YXIgZW5jb2RpbmdDaGFubmVsUHJvcCA9IFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnMuRW5jb2RpbmcucHJvcGVydGllc1tjaGFubmVsXTtcbiAgICAgIC8vIGZvciBkZXRhaWwsIGp1c3QgZ2V0IHRoZSBmbGF0IHZlcnNpb25cbiAgICAgIHZhciByZWYgPSBlbmNvZGluZ0NoYW5uZWxQcm9wID9cbiAgICAgICAgKGVuY29kaW5nQ2hhbm5lbFByb3AuJHJlZiB8fCBlbmNvZGluZ0NoYW5uZWxQcm9wLm9uZU9mWzBdLiRyZWYpIDpcbiAgICAgICAgJ0ZpZWxkRGVmJzsgLy8ganVzdCB1c2UgdGhlIGdlbmVyaWMgdmVyc2lvbiBmb3IgQU5ZIGNoYW5uZWxcbiAgICAgIGRlZiA9IHJlZi5zbGljZShyZWYubGFzdEluZGV4T2YoJy8nKSsxKTtcbiAgICAgIHJldHVybiBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zW2RlZl07XG4gICAgfTtcblxuICAgIHJldHVybiBTY2hlbWE7XG4gIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
