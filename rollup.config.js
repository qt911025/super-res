import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/super-res.js',
  format: 'cjs',
  dest: 'index.js',
  plugins: [
    babel({
      babelrc: false,
      presets: [['env', {
        target: {
          browsers: ['last 2 versions', 'safari >= 7'],
          node: 4
        },
        modules: false
      }]],
      plugins: ['transform-runtime', 'transform-strict-mode'],
      exclude: 'node_modules/**',
      runtimeHelpers: true
    })
  ]
};
