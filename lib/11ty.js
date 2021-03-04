import chokidar from "chokidar"
import fs from "fs-extra"
import _ from "lodash"
import shimmer from "shimmer"
import Eleventy from "@11ty/eleventy/src/Eleventy.js"

import {
  demoBuild,
  demoMetadata,
  demoVersion,
} from "./demo"
import { compileSass } from "./sass"
import { minifyHtml } from "./html"

export const demoPlugin = {
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

export const lifecyclePlugin = {
  initArguments: {},
  configFunction: function(eleventyConfig, options) {
    setImmediate(function() {
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

export const minifyPlugin = {
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

