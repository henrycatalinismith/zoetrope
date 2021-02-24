const fs = require("fs-extra")
const _ = require("lodash")

const package = fs.readJsonSync(
  `${process.env.DIR}/package.json`,
  "utf-8"
)

const author = _.get(package, "author")
const autoplay = process.argv.includes("--serve")
const description = _.get(package, "description", "")
const name = _.get(package, "name", "").replace(/^.+\//, "")
const repository = _.get(package, "repository")

const opengraph = []
const twitter = []

const url = process.env.COMMIT_REF
  ? package.homepage.replace(/\/$/, "")
  : ""

opengraph.push({
  property: "og:title",
  content: name,
})

opengraph.push({
  property: "og:url",
  content: url,
})

opengraph.push({
  property: "og:description",
  content: data => data.description,
})

const image = _.find(
  package.files,
  f => f.match(/opengraph/)
)

if (image) {
  opengraph.push({
    property: "og:image",
    content: `${url}/${image}`,
  })

  opengraph.push({
    property: "og:image:alt",
    content: description,
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

twitter.push({
  name: "twitter:card",
  content: "summary_large_image",
})

twitter.push({
  name: "twitter:text:title",
  content: name,
})

twitter.push({
  name: "twitter:description",
  content: description,
})

module.exports = {
  author,
  autoplay,
  description,
  name,
  opengraph,
  repository,
  twitter,
  url,
}

