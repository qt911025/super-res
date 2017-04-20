export function assignOptions(...opts) {
  const result = {};

  opts.reduce((result, opt) => {
    if (opt) {
      for (const i in opt) {
        if (typeof opt[i] === 'object' && opt[i] !== null) {
          if (Array.isArray(opt[i])) {
            if (!Array.isArray(result[i])) {
              result[i] = [];
            }
            result[i] = result[i].concat(opt[i]);
          } else {
            if (typeof result[i] !== 'object' || result[i] === null || Array.isArray(result[i])) {
              result[i] = {};
            }
            Object.assign(result[i], opt[i]); // 1 depth merging only.
          }
        } else if (opt[i] !== undefined) {
          result[i] = opt[i];
        }
      }
    }
    return result;
  }, result);

  return result;
}

function encodeUriSegment(val) {
  return encodeURIComponent(val)
    .replace(/%40/gi, '@')
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '%20')
    .replace(/%26/gi, '&')
    .replace(/%3D/gi, '=')
    .replace(/%2B/gi, '+');
}

function forEach(obj, iterator, context) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      iterator.call(context, obj[key], key, obj);
    }
  }
  return obj;
}

export function parseUrl(url, params) {
  const urlParams = {};
  let val;
  let query;
  let encodedVal;

  forEach(url.split(/\W/), param => {
    if (param === 'hasOwnProperty') {
      throw new Error('badname: hasOwnProperty is not a valid parameter name.');
    }
    if (!(new RegExp('^\\d+$').test(param)) && param &&
      (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url))) {
      urlParams[param] = true;
    }
  });
  url = url.replace(/\\:/g, ':');

  params = params || {};
  forEach(urlParams, (_, urlParam) => {
    val = params[urlParam];
    if (typeof val !== 'undefined' && val !== null) {
      encodedVal = encodeUriSegment(val);
      url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), (match, p1) => {
        return encodedVal + p1;
      });
    } else {
      url = url.replace(new RegExp('(/?):' + urlParam + '(\\W|$)', 'g'), (match, leadingSlashes, tail) => {
        if (tail.charAt(0) === '/') {
          return tail;
        }
        return leadingSlashes + tail;
      });
    }
  });

  // Strip trailing slashes and set the url (unless this behavior is specifically disabled)
  url = url.replace(/\/+$/, '') || '/';

  // Then replace collapse `/.` if found in the last URL path segment before the query
  // E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
  url = url.replace(/\/\.(?=\w+($|\?))/, '.');
  // Replace escaped `/\.` with `/.`
  url = url.replace(/\/\\\./, '/.');

  // Set params - delegate param encoding to $http
  forEach(params, (value, key) => {
    if (!urlParams[key]) {
      if (!query) {
        query = {};
      }
      query[key] = value;
    }
  });

  return {
    url,
    query
  };
}
