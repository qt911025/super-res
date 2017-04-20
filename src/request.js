import sa from 'superagent';
import methods from 'methods';
import cacheManager from 'cache-manager';
import {assignOptions} from './utils';

const defaultCache = cacheManager.caching({store: 'memory', max: 100, ttl: 1200});

const defaultOpts = {
  responseType: 'json',
  headers: {},
  transformRequest: [],
  catchRequestError: [],
  transformResponse: [],
  catchResponseError: [],
  withCredentials: false,
  _cache: null,
  get cache() {
    return this._cache;
  },
  set cache(value) {
    if (value === true) {
      this._cache = defaultCache;
    } else {
      this._cache = value;
    }
  }
};

function getCacheKey(url, params, data) {
  return `${url}_${(typeof params === 'string') ? params : JSON.stringify(params || {})}_${(typeof data === 'string') ? data : JSON.stringify(data || {})}`;
}

/**
 * Make a SuperAgent request
 * @param method {String} Uppercase HTTP method
 * @param url{String}
 * @param opts{Object} With defaultOpts and SuperAgent options included
 * @returns SuperAgent request instance
 */
function request(method, url, opts) {
  const options = assignOptions(defaultOpts, opts);

  if (opts && opts.cache === true) {
    options.cache = (defaultOpts.cache || defaultCache);
  }

  const curReq = sa(method, url);
  curReq.accept(options.responseType);
  curReq.set(options.headers);

  if (options.timeout) {
    curReq.timeout(options.timeout);
  } else {
    curReq.clearTimeout();
  }

  if (options.withCredentials) {
    curReq.withCredentials();
  }

  const originalEnd = curReq.end;
  curReq.end = function (fn) {
    let key;
    if (options.cache) {
      key = getCacheKey(this.url, this._query, this._data);
    }

    const doRequest = () => {
      if (curReq._data && typeof curReq._data === 'object') {
        try {
          curReq._data = options.transformRequest.reduce(
            (data, transform) => transform.call(curReq, data),
            curReq._data
          );
        } catch (err) {
          options.catchRequestError.reduce(
            (promise, catchFunc) => promise.catch(catchFunc),
            Promise.reject(err)
          )
          .then(fn, fn); // To skip hooks, just return the error
          return this;
        }
      }

      return originalEnd.call(curReq, (err, res) => {
        if (err) {
          options.catchResponseError.reduce(
            (promise, catchFunc) => promise.catch(catchFunc),
            Promise.reject(err)
          )
          .then(fn, fn);
        } else {
          try {
            res.body = options.transformResponse.reduce(
              (body, transform) => transform.call(res, body),
              res.body
            );

            if (options.cache) {
              options.cache.set(key, res);
            }
          } catch (err) {
            fn(err);
            return;
          }
          fn(null, res);
        }
      });
    };

    if (options.cache && this.method === 'GET') {
      options.cache.get(key, (err, result) => {
        if (err || result) {
          process.nextTick(() => fn(err, result));
          return this;
        }
        return doRequest();
      });
    } else {
      return doRequest();
    }
  };

  return curReq;
}

/**
 * Request[method]
 * @param url{String}
 * @param data{Object} Form data
 * @param options{Object} With defaultOpts and SuperAgent options included
 * @returns SuperAgent request instance
 */
methods.forEach(method => {
  const name = method;
  const _method = method.toUpperCase();
  Object.defineProperty(request, name, {
    value(url, data, options) {
      const req = request(_method, url, options);
      if (data) {
        req.send(data);
      }
      return req;
    },
    enumerable: true
  });
});

Object.defineProperty(request, 'config', {
  value: defaultOpts
});

export default request;
