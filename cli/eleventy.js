import chokidar from "chokidar"
import fs from "fs-extra"
import path from "path"
import _ from "lodash"

import {
  demoPlugin,
  minifyPlugin,
} from "../lib/11ty"

const zoetrope = fs.readJsonSync(
  `${__dirname}/../package.json`,
  "utf-8"
)

export default function(eleventyConfig) {
  console.log(`zoetrope ${zoetrope.version}`)

  eleventyConfig.addPlugin(
    demoPlugin,
    process.env.DIR
  )

  eleventyConfig.addPlugin(minifyPlugin)
}

