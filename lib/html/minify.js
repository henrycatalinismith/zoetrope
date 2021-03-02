const htmlmin = require("html-minifier")

module.exports = function minifyHtml(html) {
  return htmlmin.minify(html, {
    useShortDoctype: true,
    removeComments: true,
    collapseWhitespace: true
  })
}

