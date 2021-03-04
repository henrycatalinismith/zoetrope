const chokidar = require("chokidar")
const fs = require("fs-extra")
const path = require("path")
const _ = require("lodash")

const {
  demoPlugin,
  minifyPlugin,
}= require("../lib/11ty")

const zoetrope = fs.readJsonSync(
  `${__dirname}/../package.json`,
  "utf-8"
)

module.exports = function(eleventyConfig) {
  console.log(`zoetrope ${zoetrope.version}`)

  eleventyConfig.addPlugin(
    demoPlugin,
    process.env.DIR
  )

  eleventyConfig.addPlugin(minifyPlugin)
}

