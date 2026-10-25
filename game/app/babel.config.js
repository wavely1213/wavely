module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    /* reanimated 3.x 의 babel 플러그인은 4.x 에서 react-native-worklets 로 옮겨졌다 */
    plugins: ["react-native-worklets/plugin"],
  };
};
