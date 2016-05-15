Package.describe({
  name: 'mfactory:coffeelint',
  version: '0.0.1',
  summary: 'Lint all your CoffeeScript files with CoffeeLint.',
  git: '',
  documentation: 'README.md'
});

Package.registerBuildPlugin({
  name: 'lintCoffeelint',
  sources: [
    'coffeelint.js'
  ],
  npmDependencies: {
    'coffeelint': '1.15.7'
  }
});

Package.onUse(function(api) {
  api.use('isobuild:linter-plugin@1.0.0');
});
