const shimmer = require("shimmer")

module.exports = {
  initArguments: {},
  configFunction: function(eleventyConfig, options) {
    setImmediate(function() {
      const Eleventy = require("@11ty/eleventy/src/Eleventy.js")
      for (const key in options) {
        shimmer.wrap(
          Eleventy.prototype,
          key,
          options[key]
        )
      }
    })
  }
}

