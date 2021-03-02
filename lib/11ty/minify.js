const html = require("../../lib/html")

module.exports = {
  initArguments: {},
  configFunction: function(eleventyConfig, options) {
    eleventyConfig.addTransform(
      "htmlmin",
      function(content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
          return html.minify(content)
        }
        return content
      }
    )
  }
}

