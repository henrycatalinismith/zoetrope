const demo = require("../lib/demo")

const autoplay = demo.autoplay()
const metadata = demo.metadata(process.env.DIR)
const opengraph = demo.opengraph(metadata)
const twitter = demo.twitter(metadata)
const version = demo.version()

const url = process.env.COMMIT_REF
  ? metadata.homepage.replace(/\/$/, "")
  : ""

module.exports = {
  autoplay,
  metadata,
  opengraph,
  version,
  twitter,
  url,
}

