import proxyquire from 'proxyquire'
import test from '../_test.main'

test.beforeEach(t => {
  t.context.actionStub = {
    makeRequest: t.context.stub()
  }

  t.context.constructorSpy = t.context.spy()

  const stubs = {
    './resource-action': class ResourceAction {
      constructor (...args) {
        t.context.constructorSpy(...args)
        return t.context.actionStub
      }
    }
  }
  t.context.superRes = proxyquire('../../src/super-res', stubs)
  t.context.stubs = stubs
})

test('Default actions are defined', t => {
  t.context.resource = t.context.superRes.resource('http://example.com/posts/:id')

  t.is(typeof t.context.resource.get, 'function')
  t.is(typeof t.context.resource.save, 'function')
  t.is(typeof t.context.resource.put, 'function')
  t.is(typeof t.context.resource.get, 'function')
  t.is(typeof t.context.resource.delete, 'function')
  t.is(typeof t.context.resource.remove, 'function')
})

test('Custom action is defined', t => {
  t.context.resource = t.context.superRes.resource('http://example.com/posts/:id', null, {
    myFunction: { method: 'GET' }
  })
  t.context.resource.myFunction()

  t.is(typeof t.context.resource.myFunction, 'function')
  t.true(t.context.actionStub.makeRequest.called)
})

test('Default parameters of single action is defined', t => {
  t.context.resource = t.context.superRes.resource('http://example.com/posts/:id', null, {
    myFunction: { params: { id: 'foo' } }
  })
  t.context.resource.myFunction()

  t.is(typeof t.context.resource.myFunction, 'function')
  t.true(t.context.actionStub.makeRequest.called)
  t.true(t.context.constructorSpy.calledWith('http://example.com/posts/:id', { id: 'foo' }, {}))
})

test('False method is fixed', t => {
  t.context.stubs['./resource-action'] = function (url, defaultParams, options) {
    return {
      config: Object.assign({}, options),
      makeRequest () {
        return this.config
      }
    }
  }

  t.context.superRes = proxyquire('../../src/super-res', t.context.stubs)

  t.context.resource = t.context.superRes.resource('http://example.com/posts/:id', null, {
    get: { method: 'PUT' },
    query: { method: 'POST' },
    post: { method: 'GET' }
  })

  t.is(t.context.resource.get, t.context.resource.query)
  t.is(t.context.resource.get().method, 'GET')
  t.is(t.context.resource.post().method, 'POST')
})

test('Will not fix method, but combine equivalent actions', t => {
  t.context.stubs['./resource-action'] = function (url, defaultParams, options) {
    return {
      config: Object.assign({}, options),
      makeRequest () {
        return this.config
      }
    }
  }

  t.context.superRes = proxyquire('../../src/super-res', t.context.stubs)

  t.context.resource = t.context.superRes.resource('http://example.com/posts/:id', null, {
    query: { method: 'POST' },
    remove: { method: 'GET' },
    delete: { method: 'PUT' }
  }, {}, false)

  t.is(t.context.resource.get, t.context.resource.query)
  t.is(t.context.resource.get().method, 'POST')
  t.not(t.context.resource.remove, t.context.resource.delete)
  t.is(t.context.resource.remove().method, 'GET')
  t.is(t.context.resource.delete().method, 'PUT')
})
