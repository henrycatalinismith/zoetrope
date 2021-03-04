import htmlmin from "html-minifier"

export function minifyHtml(html) {
  return htmlmin.minify(html, {
    useShortDoctype: true,
    removeComments: true,
    collapseWhitespace: true
  })
}

