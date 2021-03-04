const {
  demoAutoplay,
  demoMetadata,
  demoOpengraph,
  demoTwitter,
  demoVersion,
}= require("../lib/demo")

const autoplay = demoAutoplay()
const metadata = demoMetadata(process.env.DIR)
const opengraph = demoOpengraph(metadata)
const twitter = demoTwitter(metadata)
const version = demoVersion()

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

