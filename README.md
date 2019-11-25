# super-res2

[![Build Status](https://travis-ci.org/qt911025/super-res2.svg?branch=master)](https://travis-ci.org/qt911025/super-res2)
[![codecov](https://codecov.io/gh/qt911025/super-res2/branch/master/graph/badge.svg)](https://codecov.io/gh/qt911025/super-res2)
[![dependencies Status](https://david-dm.org/qt911025/super-res2/status.svg?style=flat-square)](https://david-dm.org/qt911025/super-res2)
[![devDependencies Status](https://david-dm.org/qt911025/super-res2/dev-status.svg?style=flat-square)](https://david-dm.org/qt911025/super-res2?type=dev)

This is patterned off of Angular's $resource service, except that it does not depend on Angular and uses superagent instead of $http. Route parsing is done with the route-parser module.

## Usage

> Node module only. Use Webpack, Browserify or other packer to build your frontend app.

### Resource

Create a resource instance by invoke `resource()`, like
```js
  import superRes from 'super-res2'

  const myResource = superRes.resource('/my-endpoint/:id');

  myResource.get({id: 1})
  .then(function (responseData) {
    console.log(responseData);
  });

  myResource.save({id: 1}, {content: 'some sort of content'})
  .then(function (responseData) {
    console.log(responseData);
  });
```

#### `resource(url, [defaultParams], [actions], [commonOptions], [enforceFixMethod=true])`

##### `url`

Type: `string`

Url template. Use `:` to define a template parameter.

```
/user/:id
```

##### `defaultParams`

Type: `object`

Default values for `url` parameters. These can be overridden in `actions` methods. If the parameter is not defined in url template, it will be add to query parameters.
You can also use `@` and function like ngResource do. `@` means get parameter from request data. Function must be a simple synchronized function.

```js
superRes.resource('/user/:id', { id: 'foo' }) // will request GET '/user/foo'
```

```js
const myResource = superRes.resource('/user/:id', { id: '@_id' })
myResource.save({ _id: 'foo' }) // will request PUT '/user/foo'
```

```js
myResource.save({ page: 1 }, { _id: 'foo' }) // will request PUT '/user/foo?page=1'
```

```js
const anotherResource = superRes.resource('/user/:id', { id: (params, data) => params.foo+data._id }) // generage default parameter from more data
myResource.save({ foo: 'bar' }, { _id: '_myId' }) // will request PUT '/user/bar_myId'
```

You can even use an asynchronous function to generate default parameters.

However, error thrown from here won't be catched by catchRequestError hooks.
The factory function should be guaranteed as simple as possible.

```js
const anotherResource = superRes.resource('/user/:id', { id: (params, data) => params.id+data._id }) // generage default parameter from more data
myResource.save({ id: 'bar' }, { _id: '_myId' }) // will request PUT '/user/bar', not PUT '/user/bar_myId'.

```

NOTE THAT this is not an preprocessor function to preprocess query options!
The factory function should not reference the field itself!

```js
const anotherResource = superRes.resource('/user/:id', {
  id: async (params, data) => {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve()
      }, 500)
    })
    return params.foo+data._id
  }
})
myResource.save({ foo: 'bar' }, { _id: '_myId' }) // will request PUT '/user/bar_myId'

```

##### `actions`

Type: `object<object>`

Define custom action. If any reserved action is not defined, it will bind to the defined action,
 or create a default one.

```js
{
  actionName: {
    method: 'PUT', // Default: 'GET'
    params: {foo: '@bar'}, // Default parameter of this action. This will override defaultParams of resource
    url: '',
    responseType: 'json',
    headers: {},
    paramPreprocessors: {}
    transformRequest: [],
    catchRequestError: [],
    transformResponse: [],
    catchResponseError: [],
    withCredentials: false,
    cache: null, //You can set true to enable default cache, or specify a custom cache.
    timeout: 0
  }
}
```

**paramPreprocessors**

Only for resource. Preprocessor for parameters will cast data of the field. async function is supported.

```js
const pp = superRes.resource('/user/:id', {}, {
  fetchData: {
    method: 'GET',
    paramPreprocessors: {
      id: async (param) => {
        return param+param
      }
    }
  }
})
myResource.fetchData({ id: 'bar' }) // will request GET '/user/barbar'
```

##### `commonOptions`

Type: `object`

Default options of this resource, will be override by action options. `param` is invalid.

##### `enforceFixMethod`

Type: `boolean`

Default: `true`

Decide if the method of reserved action will be corrected, and equivalent action will be forced to assign as one.

Actions `get` and `query` are equivalent. They will be restrict to method `GET`.

`post` --> `POST`

`put` = `save` --> `PUT` Notice that `save` is not equivalent to `post`.

`remove` = `delete` --> `DELETE`

##### returns

`resource(...)` will returns an resource instance that contains actions.

`resourceIns[action](params, data)`

`params` is parameters of this request.
`data` is request data.

In actions of `GET` method, `data` will be merged into `params`.

Action functions will return a SuperAgent request, which supports hooks and cache.

You can use all the methods that SuperAgent request provided.

### Request

You can create such a single request by calling `request`, or use wrapped method.

#### `request(method, url, [opts])`

```js
import superRes from 'super-res2'

superRes.request('GET', '/my-endpoint')
.then(function (responseData) {
  console.log(responseData);
});

```

##### `method`

Type: `string`

Method should be uppercase.

##### `url`

Type: `string`

Just url. `@` and function transform is not supported,
and request data will not be merged into query parameters.

##### `opts`

Type: `object`

Same as `commonOptions` of request.

##### returns

This will returns a SuperAgent request instance, same as resource action.

#### `request[method](url, [data], [options])`

Wrappers of `request`.

```js
import superRes from 'super-res2'

superRes.request.get('/my-endpoint')
.then(function (responseData) {
  console.log(responseData);
});

```

### Hooks

There are 4 hooks to pre-process request data(and errors thrown during that), response body and response errors.

#### transformRequest(sync only yet)

```js
function(data) { // request data
  this; // The context is SuperAgent request object. You can set header by calling this.set() .
  return data; // This is a reduce hook so you should return a result.
}

```

#### catchRequestError

```js
function(err) { // no context
  throw err; // Throw to pass error to next hook.
  return err; // Return to skip next hooks.
}
```

#### transformResponse(sync only yet)

```js
function(body) { // response data
  this; // The context is SuperAgent response object.
  return body;
}
```

#### catchResponseError

```js
function(err) { // Just SuperAgent response error, not errors thrown by transformResponse. No context.
  err.original; // Error occured when SA parsing response.
  err.response; // No error occured. The status is a failure.
  err.status = res.status;

  throw err; // pass
  return err; // skip
}
```

### Options

There are 3 level options you can set:

- global: Default options of `request`, set in `require('super-res').config`
- resource: Set in `commonOptions` of `resource`
- action: Set in each action options.

Priority: action > response > global

High priority options will override low ones, except for hooks,
where higher priority hooks will concat after lower hooks.

If higher options has set `cache` to `true`, It will use the one in lower options.

If there is no cache in lower options, a default cache will be used.

### Cache

Cache will use [cache-manager](https://www.npmjs.com/package/cache-manager) by default.

If you want to assign a custom one, make sure what you are using has the same get/set api as `cache-manager`.

## Differences from angular-resource

- It's just a wrapper of [superagent](https://www.npmjs.com/package/superagent).
Always returns a thennnable superagent request.
- It's lightweight. Every request will return a plain object, with no method included.
It needs dirty check to implement that feature, which is complicated.
- Default "save" action will be the alias of "put", while "post" is much like "save as".
- `isArray` is useless.
- Other differences mentioned in usages.

## To contribute
- Post issue before solving it, in case there is no need to solve.
- Fork the master branch, then new a branch naming by issue.
- Make sure the commit is fully tested.
- Don't commit built files.
