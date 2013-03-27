/**
Various utility methods.

@module elastical
@submodule util
**/

/**
Iterates over all items in _obj_ if _obj_ is an array, or over all enumerable
properties if _obj_ is an object, calling the _callback_ for each one.

@method each
@param {Array|Object} obj Array or object to iterate over.
@param {callback}
  @param {mixed} value Value of the current array item or property.
  @param {Number|String} key Index (if _obj_ is an array) or key (if _obj_ is an
      object).
@static
**/
function each(obj, callback) {
    if (Array.isArray(obj)) {
        obj.forEach(callback);
    } else {
        Object.keys(obj).forEach(function (key) {
            callback(obj[key], key);
        });
    }
}
exports.each = each;

/**
Returns a new object containing a deep merge of the enumerable properties of all
passed objects. Properties in later arguments take precedence over properties
with the same name in earlier arguments. Object values are deep-cloned. Array and Date
values are _not_ deep-cloned.

@method merge
@param {object} obj* One or more objects to merge.
@return {object} New object with merged values from all other objects.
@static
**/
function merge() {
    var args   = Array.prototype.slice.call(arguments),
        target = {};

    args.unshift(target);
    mix.apply(this, args);

    return target;
}
exports.merge = merge;

/**
Like `merge()`, but augments the first passed object with a deep merge of the
enumerable properties of all other passed objects, rather than returning a
brand new object.

@method mix
@param {object} target Object to receive mixed-in properties.
@param {object} obj* One or more objects to mix into _target_.
@return {object} Reference to the same _target_ object that was passed in.
@static
**/
function mix() {
    var args   = Array.prototype.slice.call(arguments),
        target = args.shift(),
        i, key, keys, len, source, value;

    while ((source = args.shift())) {
        keys = Object.keys(source);

        for (i = 0, len = keys.length; i < len; ++i) {
            key   = keys[i];
            value = source[key];

            if(value == null){
                // if value is null or undefined keep the value intact.
                target[key] = value;
            }else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                typeof target[key] === 'object' || (target[key] = {});
                mix(target[key], value);
            } else {
                target[key] = value;
            }
        }
    }

    return target;
}
exports.mix = mix;

/**
Returns an array containing the values of all enumerable properties of _obj_. If
_obj_ is already an array, a copy of it will be returned.

@method values
@param {Array|Object} obj
@return {Array} values
@static
**/
function values(obj) {
    var i, items, keys, len;

    if (Array.isArray(obj)) {
        items = obj.concat();
    } else {
        keys  = Object.keys(obj);
        items = [];

        for (i = 0, len = keys.length; i < len; ++i) {
            items.push(obj[keys[i]]);
        }
    }

    return items;
}
exports.values = values;
