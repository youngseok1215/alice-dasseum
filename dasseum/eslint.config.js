// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // React Native Animated values are intentionally stable refs and are
      // consumed by native components during render.
      'react-hooks/refs': 'off',
    },
  },
]);
