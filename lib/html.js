const htmlmin = require("html-minifier")

function minifyHtml(html) {
  return htmlmin.minify(html, {
    useShortDoctype: true,
    removeComments: true,
    collapseWhitespace: true
  })
}

module.exports = {
  minifyHtml,
}

