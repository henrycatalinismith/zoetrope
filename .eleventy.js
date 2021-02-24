const chokidar = require("chokidar")
const fs = require("fs-extra")
const htmlmin = require("html-minifier")
const path = require("path")
const sass = require("sass")
const shimmer = require("shimmer")
const _ = require("lodash")

const package = fs.readJsonSync(
  `${process.env.DIR}/package.json`,
  "utf-8"
)

const version = require("./_data/version")
const cwd = process.env.DIR
const files = _.get(package, "files", [])
const mainPath = path.resolve(cwd, package.main)
const mainBare = path.basename(mainPath, ".scss")

console.log(mainPath)

function compile() {
  const target = `${process.env.DIR}/_site/${mainBare}-${version}.css`
  const hrstart = process.hrtime()
  const result = sass.renderSync({ file: mainPath })
  const hrend = process.hrtime()
  console.log(`✨ ${mainBare}.css ${Math.floor(hrend[1] / 1000000)}ms`)
  fs.ensureDirSync(`${process.env.DIR}/_site`)
  fs.writeFileSync(target, result.css)
}

module.exports = function(eleventyConfig) {
  fs.emptyDirSync(`${process.env.DIR}/_site`)

  compile()

  eleventyConfig.addPassthroughCopy(
    _.zipObject(
      files.map(f => `${process.env.DIR}/${f}`),
      files
    )
  )

  setImmediate(function() {
    let initialized = false
    const Eleventy = require("@11ty/eleventy/src/Eleventy.js")
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
  })

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

