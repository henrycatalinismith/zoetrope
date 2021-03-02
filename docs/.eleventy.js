const fs = require("fs-extra")
const htmlmin = require("html-minifier")

module.exports = function(eleventyConfig) {
  fs.emptyDirSync(`${__dirname}/_site`)

  eleventyConfig.addTransform(
    "htmlmin",
    function(content, outputPath) {
      if (outputPath && outputPath.endsWith(".html")) {
        return htmlmin.minify(content, {
          useShortDoctype: true,
          removeComments: true,
          collapseWhitespace: true
        })
      }
      return content
    }
  )
}

