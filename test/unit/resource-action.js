import proxyquire from 'proxyquire'
import test from '../_test.main'

test.beforeEach(t => {
  const request = t.context.stub()
  request.returns(request)
  Object.assign(request, {
    get: t.context.stub().returnsThis(),
    post: t.context.stub().returnsThis(),
    put: t.context.stub().returnsThis(),
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
  })

  t.context.stubs = {
    './request': request
  }
  t.context.ResourceAction = proxyquire('../../src/resource-action', t.context.stubs)
  t.context.request = t.context.stubs['./request']
})

test('get request with no data', async t => {
  const url = 'http://example.com/posts'
  t.context.request.end = t.context.stub().yields(null, { body: { foo: 'bar' } }).returnsThis()
  const returnSpy = t.context.spy()
  const resource = new t.context.ResourceAction(url, {}, { method: 'GET' })
  await resource.makeRequest().then(returnSpy)

  t.true(t.context.request.calledWith('GET', url))
  t.true(t.context.request.end.called)

  t.true(returnSpy.calledWith({ foo: 'bar' }))
})

test('get request with no data failed', async t => {
  const url = 'http://example.com/posts'
  t.context.request.end = t.context.stub().yields({ msg: 'Errors' }).returnsThis()
  const returnSpy = t.context.spy()
  const resource = new t.context.ResourceAction(url, {}, { method: 'GET' })
  await resource.makeRequest().catch(returnSpy)

  t.true(t.context.request.calledWith('GET', url))
  t.true(t.context.request.end.called)
  t.true(returnSpy.calledWith({ msg: 'Errors' }))
})

test('get request with data(detect hook only)', t => {
  const url = 'http://example.com/posts/'
  const resource = new t.context.ResourceAction(url, {}, { method: 'GET' })

  // Should have a preprocessor hook
  t.is(resource.config.transformRequest.length, 1)
  t.is(resource.config.transformRequest[0].name, 'moveDataToParam')
})

test('get request with missing params and data', t => {
  const queryData = { test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:someParam'
  const resource = new t.context.ResourceAction(url, {}, { method: 'GET' })
  resource.makeRequest({ foo: 'bar' }, queryData)

  // Should have replaced the url token
  t.true(t.context.request.calledWith('GET', 'http://example.com/posts'))

  // Should have called query
  t.true(t.context.request.query.calledWith({ foo: 'bar' }))
})

test('get request with params and data', t => {
  const queryData = { test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:someParam'
  const resource = new t.context.ResourceAction(url, {}, { method: 'GET' })
  resource.makeRequest({ someParam: 'testing', foo: 'bar' }, queryData)

  // Should have replaced the url token
  t.true(t.context.request.calledWith('GET', 'http://example.com/posts/testing'))

  // Should have called query
  t.true(t.context.request.query.calledWith({ foo: 'bar' }))
})

test('post request with data', t => {
  const postData = { test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts'
  const resource = new t.context.ResourceAction(url, {}, { method: 'POST' })
  resource.makeRequest(null, postData)

  // Should have called post with url
  t.true(t.context.request.calledWith('POST', url))
  // Should have called send
  t.true(t.context.request.send.calledWith(postData))
  // Should not have called query
  t.false(t.context.request.query.called)
})

test('post request with custom default params and data', t => {
  const postData = { test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:id'
  const resource = new t.context.ResourceAction(url, { id: 'something' }, { method: 'POST' })
  resource.makeRequest(postData)

  // Should have called post with url which is picked from data.
  t.true(t.context.request.calledWith('POST', 'http://example.com/posts/something'))
  // Should have called send
  t.true(t.context.request.send.calledWith(postData))
  // Should not have called query
  t.false(t.context.request.query.called)
})

test('post request with @ params and data', t => {
  const postData = { _id: 'hashcode', test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:id'
  const resource = new t.context.ResourceAction(url, { id: '@_id' }, { method: 'POST' })
  resource.makeRequest(postData)

  // Should have called post with url which is picked from data.
  t.true(t.context.request.calledWith('POST', 'http://example.com/posts/hashcode'))
  // Should have called send
  t.true(t.context.request.send.calledWith(postData))
  // Should not have called query
  t.false(t.context.request.query.called)
})

test('post request with factory params and data', async t => {
  const query = { foo: 'bar' }
  const postData = { _id: 'hashcode', test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:id'
  t.context.request.end = t.context.stub().yields(null, { body: {} }).returnsThis()
  const resource = new t.context.ResourceAction(url, { id: (params, data) => params.foo + data._id }, { method: 'POST' })
  await resource.makeRequest(query, postData)

  // Should have called post with url
  t.true(t.context.request.calledWith('POST', 'http://example.com/posts/barhashcode'))
  // Should have called send
  t.true(t.context.request.send.calledWith(postData))
  // Should have called query
  t.true(t.context.request.query.calledWith({ foo: 'bar' }))
})

test('post request with async factory params and data', async t => {
  const query = { foo: 'bar' }
  const postData = { _id: 'hashcode', test: 'something', test2: 'something else' }
  const url = 'http://example.com/posts/:id'
  t.context.request.end = t.context.stub().yields(null, { body: {} }).returnsThis()
  const resource = new t.context.ResourceAction(url, { id: (params, data) => Promise.resolve(params.foo + data._id) }, { method: 'POST' })
  await resource.makeRequest(query, postData)

  // Should have called post with url
  t.true(t.context.request.calledWith('POST', 'http://example.com/posts/barhashcode'))
  // Should have called send
  t.true(t.context.request.send.calledWith(postData))
  // Should have called query
  t.true(t.context.request.query.calledWith({ foo: 'bar' }))
})
