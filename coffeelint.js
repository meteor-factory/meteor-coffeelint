var coffeelint = Npm.require('coffeelint');

Plugin.registerLinter({
  extensions: ['coffee'],
  filenames: ['.coffeelintrc']
}, function () {
  return new CoffeeLintLinter();
});

function CoffeeLintLinter() {
  // packageName -> { config (json),
  //                  files: { [pathInPackage,arch] -> { hash, errors }}}
  this._cacheByPackage = {};
}

var DEFAULT_CONFIG = JSON.stringify({
  "arrow_spacing": {
    "level": "ignore"
  },
  "braces_spacing": {
    "level": "ignore",
    "spaces": 0,
    "empty_object_spaces": 0
  },
  "camel_case_classes": {
    "level": "error"
  },
  "coffeescript_error": {
    "level": "error"
  },
  "colon_assignment_spacing": {
    "level": "ignore",
    "spacing": {
      "left": 0,
      "right": 0
    }
  },
  "cyclomatic_complexity": {
    "level": "ignore",
    "value": 10
  },
  "duplicate_key": {
    "level": "error"
  },
  "empty_constructor_needs_parens": {
    "level": "ignore"
  },
  "ensure_comprehensions": {
    "level": "warn"
  },
  "eol_last": {
    "level": "ignore"
  },
  "indentation": {
    "value": 2,
    "level": "error"
  },
  "line_endings": {
    "level": "ignore",
    "value": "unix"
  },
  "max_line_length": {
    "value": 80,
    "level": "error",
    "limitComments": true
  },
  "missing_fat_arrows": {
    "level": "ignore",
    "is_strict": false
  },
  "newlines_after_classes": {
    "value": 3,
    "level": "ignore"
  },
  "no_backticks": {
    "level": "error"
  },
  "no_debugger": {
    "level": "warn",
    "console": false
  },
  "no_empty_functions": {
    "level": "ignore"
  },
  "no_empty_param_list": {
    "level": "ignore"
  },
  "no_implicit_braces": {
    "level": "ignore",
    "strict": true
  },
  "no_implicit_parens": {
    "level": "ignore",
    "strict": true
  },
  "no_interpolation_in_single_quotes": {
    "level": "ignore"
  },
  "no_nested_string_interpolation": {
    "level": "warn"
  },
  "no_plusplus": {
    "level": "ignore"
  },
  "no_private_function_fat_arrows": {
    "level": "warn"
  },
  "no_stand_alone_at": {
    "level": "ignore"
  },
  "no_tabs": {
    "level": "error"
  },
  "no_this": {
    "level": "ignore"
  },
  "no_throwing_strings": {
    "level": "error"
  },
  "no_trailing_semicolons": {
    "level": "error"
  },
  "no_trailing_whitespace": {
    "level": "error",
    "allowed_in_comments": false,
    "allowed_in_empty_lines": true
  },
  "no_unnecessary_double_quotes": {
    "level": "ignore"
  },
  "no_unnecessary_fat_arrows": {
    "level": "warn"
  },
  "non_empty_constructor_needs_parens": {
    "level": "ignore"
  },
  "prefer_english_operator": {
    "level": "ignore",
    "doubleNotLevel": "ignore"
  },
  "space_operators": {
    "level": "ignore"
  },
  "spacing_after_comma": {
    "level": "ignore"
  },
  "transform_messes_up_line_numbers": {
    "level": "warn"
  }
});

CoffeeLintLinter.prototype.processFilesForPackage = function (files, options) {
  var self = this;

  // Assumes that this method gets called once per package.
  var packageName = files[0].getPackageName();
  if (! self._cacheByPackage.hasOwnProperty(packageName)) {
    self._cacheByPackage[packageName] = {
      configString: DEFAULT_CONFIG,
      files: {}
    };
  }
  var cache = self._cacheByPackage[packageName];

  var configs = files.filter(function (file) {
    return file.getBasename() === '.coffeelintrc';
  });
  if (configs.length > 1) {
    // This should really not happen for DEFAULT_CONFIG :)
    configs[0].error({
      message: 'Found multiple .coffeelintrc files in package ' + packageName +
        ': ' +
        configs.map(function (c) { return c.getPathInPackage(); }).join(', ')
    });
    return;
  }

  if (configs.length) {
    var newConfigString = configs[0].getContentsAsString();
    if (cache.configString !== newConfigString) {
      // Reset cache.
      cache.files = {};
      cache.configString = newConfigString;
    }
  } else {
    if (cache.configString !== DEFAULT_CONFIG) {
      // Reset cache.
      cache.files = {};
      cache.configString = DEFAULT_CONFIG;
    }
  }

  try {
    var config = JSON.parse(cache.configString);
  } catch (err) {
    configs[0].error({
      message: 'Failed to parse ' + configs[0].getPathInPackage() +
        ': not valid JSON: ' + err.message
    });
    return;
  }

  files.forEach(function (file) {
    if (file.getBasename() === '.coffeelintrc')
      return;

    // skip files we already linted
    var cacheKey = JSON.stringify([file.getPathInPackage(), file.getArch()]);
    if (cache.files.hasOwnProperty(cacheKey) &&
        cache.files[cacheKey].hash === file.getSourceHash()) {
      reportErrors(file, cache.files[cacheKey].errors);
      return;
    }

    var errors = coffeelint.lint(file.getContentsAsString(), config);
    if (errors.length)
      reportErrors(file, errors);
    cache.files[cacheKey] = { hash: file.getSourceHash(), errors: errors };
  });

  function reportErrors(file, errors) {
    errors.forEach(function (error) {
      file.error({
        message: error.context,
        line: error.line,
        column: error.character
      });
    });
  }
};