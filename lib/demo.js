const fs = require("fs-extra")
const _ = require("lodash")
const path = require("path")

function demoAutoplay() {
  return process.argv.includes("--serve")
}

function demoBuild(directory, metadata, version) {
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

function demoMetadata(dir) {
  const package = fs.readJsonSync(
    `${dir}/package.json`,
    "utf-8"
  )

  const author = _.get(package, "author", "")
  const description = _.get(package, "description", "")
  const files = _.get(package, "files", [])
  const homepage = _.get(package, "homepage", "")
  const main = _.get(package, "main", "")
  const name = _.get(package, "name", "").replace(/^.+\//, "")
  const repository = _.get(package, "repository")
  const url = _.get(package, "url")

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

function demoOpengraph(metadata) {
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
      content: `${metadata.url}/${image}`,
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

function demoTwitter(metadata) {
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

function demoVersion() {
  return process.env.COMMIT_REF || "dev"
}

module.exports = {
  demoAutoplay,
  demoBuild,
  demoMetadata,
  demoOpengraph,
  demoTwitter,
  demoVersion,
}

