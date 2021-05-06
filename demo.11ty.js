import Eleventy from "@11ty/eleventy/src/Eleventy.js"
import { rehypePlugin } from "@hendotcat/11tyhype"
import chokidar from "chokidar"
import createHtmlElement from "create-html-element"
import fs from "fs-extra"
import loading from "loading-cli"
import _ from "lodash"
import path from "path"
import rehypeMinifyWhitespace from "rehype-minify-whitespace"
import sass from "sass"
import shimmer from "shimmer"

export function demoAutoplay() {
  return process.argv.includes("--serve")
}

export function demoBuild(directory, metadata, version) {
  const demoDirectory = directory
  const siteDirectory = `${demoDirectory}/_site`
  const zoetropeDirectory = path.resolve(__dirname, "../../")

  const scssFilename = [
    demoDirectory,
    metadata.main,
  ].join("/")

  const cssFilename = [
    siteDirectory,
    `${path.basename(metadata.main, ".scss")}-${version}.css`
  ].join("/")

  const build = {
    cssFilename,
    demoDirectory,
    scssFilename,
    siteDirectory,
    zoetropeDirectory,
  }

  return build
}

export function demoMetadata(dir) {
  const pkg = fs.readJsonSync(
    `${dir}/package.json`,
    "utf-8"
  )

  const author = _.get(pkg, "author", "")
  const description = _.get(pkg, "description", "")
  const files = _.get(pkg, "files", [])
  const homepage = _.get(pkg, "homepage", "")
  const main = _.get(pkg, "main", "")
  const name = _.get(pkg, "name", "").replace(/^.+\//, "")
  const repository = _.get(pkg, "repository")
  const url = _.get(pkg, "url")

  const demo = {
    author,
    description,
    files,
    homepage,
    main,
    name,
    repository,
    url,
  }

  return demo
}

export function demoOpengraph(metadata) {
  const opengraph = []

  opengraph.push({
    property: "og:title",
    content: metadata.name,
  })

  opengraph.push({
    property: "og:url",
    content: metadata.url,
  })

  opengraph.push({
    property: "og:description",
    content: metadata.description,
  })

  const image = _.find(
    metadata.files,
    f => f.match(/opengraph/)
  )

  if (image) {
    opengraph.push({
      property: "og:image",
      content: `${metadata.homepage.replace(/\/$/, "")}/${image}`,
    })

    opengraph.push({
      property: "og:image:alt",
      content: metadata.description,
    })

    opengraph.push({
      property: "og:image:height",
      content: 630,
    })

    opengraph.push({
      property: "og:image:height",
      content: 1200,
    })
  }

  return opengraph
}

export function demoTwitter(metadata) {
  const twitter = []

  twitter.push({
    name: "twitter:card",
    content: "summary_large_image",
  })

  twitter.push({
    name: "twitter:text:title",
    content: metadata.name,
  })

  twitter.push({
    name: "twitter:description",
    content: metadata.description,
  })

  return twitter
}

export function demoVersion() {
  return process.env.COMMIT_REF || "dev"
}

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

const zoetrope = fs.readJsonSync(
  `${__dirname}/package.json`,
  "utf-8"
)

export default function(eleventyConfig) {
  console.log(`zoetrope ${zoetrope.version}`)

  eleventyConfig.addPlugin(
    demoPlugin,
    process.env.DIR
  )

  eleventyConfig.addPlugin(rehypePlugin, {
    plugins: [
      [rehypeMinifyWhitespace],
    ]
  })

}

