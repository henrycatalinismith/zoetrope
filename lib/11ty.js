const chokidar = require("chokidar")
const fs = require("fs-extra")
const _ = require("lodash")
const shimmer = require("shimmer")

const {
  demoBuild,
  demoMetadata,
  demoVersion,
}= require("./demo")
const { compileSass } = require("./sass")
const { minifyHtml } = require("./html")

const demoPlugin = {
  initArguments: {},
  configFunction: function(eleventyConfig, directory) {
    const metadata = demoMetadata(directory)
    const version = demoVersion()
    const build = demoBuild(directory, metadata, version)

    const passthroughCopy = _.zipObject(
      metadata.files.map(f => `${build.demoDirectory}/${f}`),
      metadata.files
    )

    function compile() {
      compileSass(
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
      eleventyConfig.addPlugin(lifecyclePlugin, {
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

const lifecyclePlugin = {
  initArguments: {},
  configFunction: function(eleventyConfig, options) {
    setImmediate(function() {
      const Eleventy = require("@11ty/eleventy/src/Eleventy.js")
      for (const key in options) {
        shimmer.wrap(
          Eleventy.prototype,
          key,
          options[key]
        )
      }
    })
  }
}

const minifyPlugin = {
  initArguments: {},
  configFunction: function(eleventyConfig, options) {
    eleventyConfig.addTransform(
      "htmlmin",
      function(content, outputPath) {
        if (outputPath && outputPath.endsWith(".html")) {
          return minifyHtml(content)
        }
        return content
      }
    )
  }
}

module.exports = {
  demoPlugin,
  lifecyclePlugin,
  minifyPlugin,
}

