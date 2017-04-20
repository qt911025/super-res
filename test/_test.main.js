import test from 'ava';
import sinon from 'sinon';

test.beforeEach(t => {
  t.context.sandbox = sinon.sandbox.create();
  t.context.stub = t.context.sandbox.stub.bind(t.context.sandbox);
  t.context.spy = t.context.sandbox.spy.bind(t.context.sandbox);
});

test.afterEach(t => {
  delete t.context.stub;
  delete t.context.spy;
  t.context.sandbox.restore();
});

export default test;
