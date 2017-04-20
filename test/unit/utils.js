import test from '../_test.main';
import {assignOptions, parseUrl} from '../../src/utils';

// AssignOptions
test('should cover with null', t => {
  const a = {
    sub: 'foo'
  };
  const b = {
    sub: null
  };

  const c = assignOptions(a, b);

  t.deepEqual(c, {sub: null});
});

test('should merge two objects', t => {
  const a = {
    sub: {
      foo: 'foo'
    }
  };
  const b = {
    sub: {
      bar: 'bar'
    }
  };

  const c = assignOptions(a, b);

  t.deepEqual(c, {sub: {foo: 'foo', bar: 'bar'}});
});

test('should concat two options', t => {
  const a = {
    sub: ['foo']
  };
  const b = {
    sub: ['bar']
  };

  const c = assignOptions(a, b);

  t.deepEqual(c, {sub: ['foo', 'bar']});
});

test('should cover', t => {
  let a = {
    sub: {
      foo: 'foo'
    }
  };
  let b = {
    sub: ['bar']
  };

  let c = assignOptions(a, b);

  t.deepEqual(c, {sub: ['bar']});

  a = {
    sub: ['bar']
  };
  b = {
    sub: {
      foo: 'foo'
    }
  };

  c = assignOptions(a, b);

  t.deepEqual(c, {sub: {foo: 'foo'}});
});

// ParseUrl
test('should throw error with "hasOwnProperty"', t => {
  t.throws(() => parseUrl('http://foo.bar/baz:hasOwnProperty', {f: 'aaa', b: 'bbb'}));
});

test('should return url and query parameters', t => {
  t.deepEqual(parseUrl('http://foo.bar/baz:f', {f: 'aaa', b: 'bbb'}), {
    url: 'http://foo.bar/bazaaa',
    query: {b: 'bbb'}
  });
});

test('should return url with dots', t => {
  t.deepEqual(parseUrl('http://foo.bar/:baz.:qux', {baz: 'aaa', qux: 'bbb'}), {
    url: 'http://foo.bar/aaa.bbb',
    query: undefined
  });
});

test('should return url with missing parameters', t => {
  t.deepEqual(parseUrl('http://foo.bar/:baz.:qux', {qux: 'bbb'}), {
    url: 'http://foo.bar.bbb',
    query: undefined
  });
  t.deepEqual(parseUrl('http://foo.bar/:baz.:qux/else', {baz: 'bbb'}), {
    url: 'http://foo.bar/bbb./else',
    query: undefined
  });
  t.deepEqual(parseUrl('http://foo.bar/:baz/:qux/else'), {
    url: 'http://foo.bar/else',
    query: undefined
  });
});

test('should transform uri components', t => {
  t.deepEqual(parseUrl('http://foo.bar/:baz/:qux', {baz: '@:$,', qux: ' &=+'}), {
    url: 'http://foo.bar/@:$,/%20&=+',
    query: undefined
  });
});
