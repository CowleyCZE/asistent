const webpack = require('@nativescript/webpack');

module.exports = (env) => {
  webpack.init(env);

  const config = webpack.resolveConfig();

  // OOM fix: ns preview ve StackBlitz (WebContainer ~1 GB RAM) umíralo
  // v webpack buildu na "JavaScript heap out of memory".
  // 1) Source mapy drží zdroje všech modulů v paměti - pro preview je nepotřebujeme.
  config.devtool = false;

  // 2) Omezení paralelismu snižuje špičku paměti během kompilace.
  config.parallelism = 1;

  return config;
};
