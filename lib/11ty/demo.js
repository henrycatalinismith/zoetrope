const chokidar = require("chokidar")
const fs = require("fs-extra")
const _ = require("lodash")
const demo = require("../demo")
const sass = require("../sass")
const lifecycle = require("./lifecycle")

module.exports = {
  initArguments: {},
  configFunction: function(eleventyConfig, directory) {
    const metadata = demo.metadata(directory)
    const version = demo.version()
    const build = demo.build(directory, metadata, version)

    const passthroughCopy = _.zipObject(
      metadata.files.map(f => `${build.demoDirectory}/${f}`),
      metadata.files
    )

    function compile() {
      sass.compile(
        build.scssFilename,
        build.cssFilename
      )
    }

    fs.emptyDirSync(build.siteDirectory)

    eleventyConfig.addPassthroughCopy(
      passthroughCopy
    )

    compile()

    if (process.argv.includes("--serve")) {
      eleventyConfig.addPlugin(lifecycle, {
        finish: function(orig) {
          const watcher = chokidar.watch([build.scssFilename], {
            persistent: true
          })

          const compileAndReload = eleventyInstance => () => {
            compile()
            eleventyInstance.eleventyServe.reload()
          }

          return function() {
            watcher.on("add", compileAndReload(this))
            watcher.on("change", compileAndReload(this))
            return orig.apply(this)
          }
        },
      })
    }
  }
}

