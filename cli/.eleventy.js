const chokidar = require("chokidar")
const createHtmlElement = require("create-html-element")
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

const functions = {}

functions['html($element, $props: (), $children: "")'] = function(element, props, children) {
  const name = new sass.types.String(element.getValue()).getValue()

  const attributes = {}
  for (let i = 0; i < props.getLength(); i++) {
    const key = new sass.types.String(props.getKey(i).getValue()).getValue()
    const value = new sass.types.String(props.getValue(i).getValue()).getValue()
    attributes[key] = value
  }

  const html = children.getValue()

  return new sass.types.String(
    createHtmlElement({
      name,
      attributes,
      html,
    })
  )
}

functions['encode-uri($str)'] = function(str) {
  return new sass.types.String(encodeURIComponent(str))
}

function compile() {
  const target = `${process.env.DIR}/_site/${mainBare}-${version}.css`
  const hrstart = process.hrtime()
  const result = sass.renderSync({ file: mainPath, functions })
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
