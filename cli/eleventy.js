const chokidar = require("chokidar")
const fs = require("fs-extra")
const path = require("path")
const _ = require("lodash")

const eleventy = require("../lib/11ty")
const demo = require("../lib/demo")

const zoetrope = fs.readJsonSync(
  `${__dirname}/../package.json`,
  "utf-8"
)

module.exports = function(eleventyConfig) {
  console.log(`zoetrope ${zoetrope.version}`)

  eleventyConfig.addPlugin(
    eleventy.demo,
    process.env.DIR
  )

  eleventyConfig.addPlugin(eleventy.minify)
}

