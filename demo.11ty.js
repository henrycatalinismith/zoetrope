import Eleventy from "@11ty/eleventy/src/Eleventy.js"
import chokidar from "chokidar"
import createHtmlElement from "create-html-element"
import fs from "fs-extra"
import htmlmin from "html-minifier"
import loading from "loading-cli"
import _ from "lodash"
import path from "path"
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

function unquote(value) {
  if (value instanceof sass.types.Number) {
    return value.getValue()
  }
  return new sass.types.String(
    value.getValue()
  ).getValue()
}

function html(tagName, props, children) {
  const name = unquote(tagName)
  const attributes = {}
  for (let i = 0; i < props.getLength(); i++) {
    const key = unquote(props.getKey(i))
    const value = unquote(props.getValue(i))
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

function implode(pieces, glue) {
  const array = []
  for (let i = 0; i < pieces.getLength(); i++) {
    array.push(unquote(pieces.getValue(i)))
  }
  const output = array.join(unquote(glue))
  return new sass.types.String(output)
}

function svg(x, y, w, h, children) {
  const tagName = new sass.types.String("svg")
  const props = new sass.types.Map(3)

  props.setKey(0, new sass.types.String("xmlns"))
  props.setValue(0, new sass.types.String("http://www.w3.org/2000/svg"))

  props.setKey(1, new sass.types.String("xmlns:xlink"))
  props.setValue(1, new sass.types.String("http://www.w3.org/1999/xlink"))

  props.setKey(2, new sass.types.String("viewBox"))
  props.setValue(2, new sass.types.String([
    x.getValue(),
    y.getValue(),
    w.getValue(),
    h.getValue(),
  ].join(" ")))

  const dirty = html(tagName, props, children)
  const clean = encodeURIComponent(dirty)
  const url = new sass.types.String(`url("data:image/svg+xml;utf8,${clean}")`)

  return url
}

const functions = {
  "html($tagName, $props: (), $children: '')": html,
  "implode($pieces, $glue: '')": implode,
  "svg($x, $y, $w, $h, $children: '')": svg,
}

export async function compileSass(src, dst) {
  const file = path.resolve(src)
  const name = path.basename(src)
  const dir = path.dirname(dst)
  const start = process.hrtime()
  const load = loading(name).start()
  load.render()

  const interval = setInterval(() => {
    load.render()
  }, 100)

  return new Promise((resolve, reject) => {
    const result = sass.render(
      { file, functions },
      (err, result) => {
        clearInterval(interval)
        if (err) {
          console.error(err)
          load.fail()
          reject()
        } else {
          fs.ensureDirSync(dir)
          fs.writeFileSync(dst, result.css)
          const end = process.hrtime(start)
          const nanoseconds = end[0] * 1e9 + end[1]
          const milliseconds = Math.ceil(nanoseconds / 1e6)
          load.succeed(`${name} [${milliseconds}ms]`)
          resolve()
        }
      }
    )
  })
}

export function minifyHtml(html) {
  return htmlmin.minify(html, {
    useShortDoctype: true,
    removeComments: true,
    collapseWhitespace: true
  })
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

  eleventyConfig.addPlugin(minifyPlugin)
}

