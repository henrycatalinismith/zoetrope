const chokidar = require("chokidar")
const fs = require("fs-extra")
const htmlmin = require("html-minifier")
const path = require("path")
const sass = require("sass")
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

function compile() {
  const target = `${process.env.DIR}/_site/${mainBare}-${version}.css`
  const hrstart = process.hrtime()
  const result = sass.renderSync({ file: mainPath })
  const hrend = process.hrtime()
  console.log(`✨ ${mainBare}.css ${Math.floor(hrend[1] / 1000000)}ms`)
  fs.ensureDirSync(`${process.env.DIR}/_site`)
  fs.writeFileSync(target, result.css)
}

function monkeypatch(cls, fn) {
  const orig = cls.prototype[fn.name][`_PS_original`] || cls.prototype[fn.name]
  function wrapped() {
    return fn.bind(this, orig).apply(this, arguments)
  }
  wrapped[`_PS_original`] = orig
  cls.prototype[fn.name] = wrapped
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
    if (Eleventy.prototype) {
      function watch(original) {
        if (!initialized) {
          const watcher = chokidar.watch([mainPath], {
            persistent: true
          })
          const compileAndReload = eleventyInstance => () => {
            compile()
            this.eleventyServe.reload()
          }
          watcher.on("add", compileAndReload(this))
          watcher.on("change", compileAndReload(this))
          initialized = true
        }
        return original.apply(this)
      }
      monkeypatch(Eleventy, watch)
    }
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

