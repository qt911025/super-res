import proxyquire from 'proxyquire'
import test from '../_test.main'

test.beforeEach(t => {
  t.context.cacheStub = {
    get: t.context.stub(),
    set: t.context.stub()
  }

  // Original SuperAgent request
  t.context.requestIns = {
    set: t.context.stub().returnsThis(),
    send: t.context.stub().returnsThis(),
    query: t.context.stub().returnsThis(),
    accept: t.context.stub().returnsThis(),
    end: t.context.stub().returnsThis(),
    then (onFulfilled, onRejected) {
      return new Promise((resolve, reject) => {
        this.end((err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
      }).then(onFulfilled, onRejected)
    },
    catch (onRejected) {
      return this.then(undefined, onRejected)
    },
    clearTimeout: t.context.stub().returnsThis(),
    timeout: t.context.stub().returnsThis(),
    withCredentials: t.context.stub().returnsThis()
  }

  t.context.stubs = {
    superagent: t.context.stub().returns(t.context.requestIns),
    'cache-manager': {
      caching: t.context.stub().returns(t.context.cacheStub)
    }
  }

  t.context.request = proxyquire('../../src/request', t.context.stubs)
})

test('request with response type', t => {
  const url = 'http://example.com/posts/'
  t.context.request.post(url, null, { responseType: 'text/plain' })

  // Should have called accept with json
  t.true(t.context.requestIns.accept.calledWith('text/plain'))
})

test('request with headers', t => {
  const headers = { 'Content-Type': 'application/json' }
  const url = 'http://example.com/posts/'
  t.context.request.post(url, null, { headers })

  // Should have called set
  t.true(t.context.requestIns.set.calledWith(headers))
})

test('request with timeout', t => {
  const url = 'http://example.com/posts/'
  t.context.request.post(url, null, { timeout: 30 })

  // Should have called timeout
  t.true(t.context.requestIns.timeout.calledWith(30))
})

test('request without timeout', t => {
  const url = 'http://example.com/posts/'
  t.context.request.post(url)

  // Should not have called timeout
  t.false(t.context.requestIns.timeout.called)

  // Should have called clearTimeout
  t.true(t.context.requestIns.clearTimeout.called)
})

test('request with withCredentials', t => {
  const url = 'http://example.com/posts/'
  t.context.request.post(url, {}, { withCredentials: true })

  // Should have called withCredentials
  t.true(t.context.requestIns.withCredentials.called)
})

test('post request that is successful', async t => {
  const returnData = { body: { test: 'something', test2: 'something else' } }
  const url = 'http://example.com/posts/'
  t.context.requestIns.end = t.context.stub().yields(null, returnData).returnsThis()
  const originalEnd = t.context.requestIns.end
  const req = t.context.request.post(url)
  const result = await req

  // Should have called end
  t.true(originalEnd.called)

  // Should have resolved callback
  t.is(returnData, result)
})

test('post request with error', async t => {
  const errorData = { message: 'Some error' }
  const url = 'http://example.com/posts/'
  t.context.requestIns.end = t.context.stub().yields(errorData, {}).returnsThis()
  const originalEnd = t.context.requestIns.end
  try {
    await t.context.request.post(url, { foo: 'bar' })
  } catch (err) {
    // Should have rejected callback
    t.is(errorData, err)
  }

  // Should have called end
  t.true(originalEnd.called)
})

test('get with data', async t => {
  const transData = { data: 'something' }
  const url = 'http://example.com/get/'
  const sendSpy = t.context.spy()
  t.context.requestIns.send = function (data) {
    this._data = data
    sendSpy(data)
    return this
  }
  t.context.requestIns.end = t.context.stub().yields(null, {}).returnsThis()
  const req = t.context.request.get(url, transData, { transformRequest: [function (data) {
    this.query(data)
    return null
  }] })

  await req

  // Should have send called
  t.true(sendSpy.calledWith(transData))

  // Should have transformed request
  t.true(t.context.requestIns.query.calledWith(transData))

  // Should have _data cleared
  t.is(req._data, null)
})

test('post with request transform', async t => {
  const transData = { data: 'something' }
  const url = 'http://example.com/posts/'

  t.context.requestIns.send = function (data) {
    this._data = data
    return this
  }
  t.context.requestIns.end = t.context.stub().yields(null, {}).returnsThis()
  const req = t.context.request.post(url, { data: 1 }, { transformRequest: [function (data) {
    // This should be the SuperAgent request Instance
    t.is(t.context.requestIns, this)
    return Object.assign(data, transData)
  }] })

  await req

  // Should have transformed request
  t.deepEqual(req._data, transData)
})

test('post with request error transform', async t => {
  const req = { data: 'something' }

  const url = 'http://example.com/posts/'

  t.context.requestIns.send = function (data) {
    this._data = data
    return this
  }
  const catchSpy = t.context.spy()
  try {
    await t.context.request.post(url, req, {
      transformRequest: [function (req) {
        throw req
      }],
      catchRequestError: [function (e) {
        catchSpy(e)
        throw e
      }]
    })
  } catch (err) {
  // Should have returned error.
    t.is(err, req)
  }

  // Should have deal error.
  t.true(catchSpy.calledWith(req))
})

test('post with response transform', async t => {
  const originalBody = { myData: 1 }
  const originalResp = { body: originalBody }
  const transBody = { data: 'something' }

  const url = 'http://example.com/posts/'

  t.context.requestIns.end = t.context.stub().yields(null, originalResp)
  const result = await t.context.request.post(url, {}, { transformResponse: [function (body) {
    // The context should be SuperAgent Response object
    t.is(this, originalResp)
    // Should get original body
    t.is(body, originalBody)
    return transBody
  }] })

  // Should have transformed response
  t.deepEqual(result, { body: transBody })
})

test('post with response transform(error occurred)', async t => {
  const transBody = { data: 'something' }

  const url = 'http://example.com/posts/'

  t.context.requestIns.end = t.context.stub().yields(null, { body: { myData: 1 } })
  try {
    await t.context.request.post(url, {}, { transformResponse: [() => {
      throw transBody
    }] })
  } catch (err) {
    // Should have returned error
    t.is(err, transBody)
  }
})

test('post with response error transform', async t => {
  const originalErr = { err: 'foo' }
  const transErr = { err: 'bar' }

  const url = 'http://example.com/posts/'
  const notCalledSpy = t.context.spy()
  t.context.requestIns.end = t.context.stub().yields(originalErr)
  try {
    await t.context.request.post(url, {}, { catchResponseError: [e => {
      // Get original error
      t.is(e, originalErr)
      return transErr
    }, () => {
      notCalledSpy()
    }] })
  } catch (err) {
    // Should have transformed response
    t.is(err, transErr)
    // Should skip the 2nd hook
    t.true(notCalledSpy.notCalled)
  }
})

test('post request with built in cache', async t => {
  const data = { test: 'something', test2: 'something else' }
  const mockCachedResponse = { result: 'data' }

  const url = 'http://example.com/posts/'

  t.context.requestIns.url = url
  t.context.requestIns._query = {}
  t.context.requestIns._data = data
  t.context.requestIns.end = t.context.stub().yields(null, { body: mockCachedResponse })
  await t.context.request.post(url, data, { cache: true })

  // Should have called superagent
  t.true(t.context.stubs.superagent.calledWith('POST', url))

  // Should have sent data
  t.true(t.context.requestIns.send.calledWith(data))

  // Should have returned cached value
  t.true(t.context.cacheStub.set.calledWith(`${url}_{}_${JSON.stringify(data)}`, { body: mockCachedResponse }))
})

test('get request with built in cache', async t => {
  const queryData = { test: 'something', test2: 'something else' }
  const mockCachedResponse = { body: { result: 'data' } }
  const url = 'http://example.com/posts/'
  const originalEnd = t.context.requestIns.end
  t.context.requestIns.method = 'GET'
  t.context.cacheStub.get.callsArgWith(1, null, mockCachedResponse)

  const req = t.context.request.get(url, null, { cache: true })
  req.query(queryData)
  const result = await req
  // Should have returned cached value
  t.is(result, mockCachedResponse)

  // Should not have called superagent original request
  t.false(originalEnd.called)
})

test('get request with custom cache', async t => {
  const queryData = { test: 'something', test2: 'something else' }
  const mockCachedResponse = { body: { result: 'data' } }

  const url = 'http://example.com/posts/'

  const localCacheStub = {
    get: t.context.stub().callsArgWith(1, null, mockCachedResponse),
    set: t.context.stub()
  }
  const originalEnd = t.context.requestIns.end
  t.context.requestIns.method = 'GET'
  const req = t.context.request.get(url, null, { cache: localCacheStub })
  req.query(queryData)
  const result = await req

  // Should have returned cached value
  t.is(result, mockCachedResponse)

  // Should not have called superagent original request
  t.false(originalEnd.called)
})

test('get request with built in cache and no data', async t => {
  const queryData = { test: 'something', test2: 'something else' }
  const mockCachedResponse = { body: { result: 'data' } }

  const url = 'http://example.com/posts/'

  const originalEnd = t.context.requestIns.end
  originalEnd.yields(null, mockCachedResponse)
  t.context.requestIns.method = 'GET'
  t.context.requestIns.url = url
  t.context.requestIns._query = queryData
  t.context.requestIns._data = {}
  t.context.cacheStub.get.callsArgWith(1, null, null)
  const req = t.context.request.get(url, null, { cache: true })
  req.query(queryData)
  const result = await req

  // Should have returned cached value
  t.is(result, mockCachedResponse)

  // Should have called superagent original request
  t.true(originalEnd.called)

  // Should have called set
  t.true(t.context.cacheStub.set.calledWith(`${url}_${JSON.stringify(queryData)}_{}`, mockCachedResponse))
})
