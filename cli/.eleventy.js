const chokidar = require("chokidar")
const fs = require("fs-extra")
const path = require("path")
const _ = require("lodash")

const eleventy = require("../lib/11ty")
const demo = require("../lib/demo")
const html = require("../lib/html")
const sass = require("../lib/sass")

const package = fs.readJsonSync(
  `${process.env.DIR}/package.json`,
  "utf-8"
)

const zoetrope = fs.readJsonSync(
  `${__dirname}/../package.json`,
  "utf-8"
)

const version = demo.version()
const cwd = process.env.DIR
const files = _.get(package, "files", [])
const mainPath = path.resolve(cwd, package.main)
const mainBare = path.basename(mainPath, ".scss")

function compile() {
  sass.compile(
    mainPath,
    `${process.env.DIR}/_site/${mainBare}-${version}.css`
  )
}

module.exports = function(eleventyConfig) {
  console.log(`zoetrope ${zoetrope.version}`)
  fs.emptyDirSync(`${process.env.DIR}/_site`)

  eleventyConfig.addPassthroughCopy(
    _.zipObject(
      files.map(f => `${process.env.DIR}/${f}`),
      files
    )
  )

  compile()

  if (process.argv.includes("--serve")) {
    eleventyConfig.addPlugin(eleventy.lifecycle, {
      finish: function(orig) {
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
      }
    })
  }

  eleventyConfig.addPlugin(eleventy.minify)
}

