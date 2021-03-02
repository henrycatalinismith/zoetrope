const chokidar = require("chokidar")
const createHtmlElement = require("create-html-element")
const fs = require("fs-extra")
const htmlmin = require("html-minifier")
const path = require("path")
const shimmer = require("shimmer")
const _ = require("lodash")

const sass = require("../lib/sass")

const package = fs.readJsonSync(
  `${process.env.DIR}/package.json`,
  "utf-8"
)

const version = require("./_data/version")
const cwd = process.env.DIR
const files = _.get(package, "files", [])
const mainPath = path.resolve(cwd, package.main)
const mainBare = path.basename(mainPath, ".scss")

function compile() {
  sass.compile(
    mainPath,
    `${process.env.DIR}/_site/${mainBare}-${version}.css`
  )
)

module.exports = function(eleventyConfig) {
  fs.emptyDirSync(`${process.env.DIR}/_site`)

  eleventyConfig.addPassthroughCopy(
    _.zipObject(
      files.map(f => `${process.env.DIR}/${f}`),
      files
    )
  )

  setImmediate(function() {
    const Eleventy = require("@11ty/eleventy/src/Eleventy.js")
    if (process.argv.includes("--serve")) {
      shimmer.wrap(Eleventy.prototype, "finish", function(orig) {
        const watcher = chokidar.watch([mainPath], {
          persistent: true
        })

        const compileAndReload = eleventyInstance => () => {
          compile()
          eleventyInstance.eleventyServe.reload()
        }

        return function() {
          watcher.on("add", compileAndReload(this))
          watcher.on("change", compileAndReload(this))
          return orig.apply(this);
        };
      })
    }
  })

  compile()

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

