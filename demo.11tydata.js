import {
  demoAutoplay,
  demoMetadata,
  demoOpengraph,
  demoTwitter,
  demoVersion,
} from "./demo.11ty.js"

const autoplay = demoAutoplay()
const metadata = demoMetadata(process.env.DIR)
const opengraph = demoOpengraph(metadata)
const twitter = demoTwitter(metadata)
const version = demoVersion()

const url = process.env.COMMIT_REF
  ? metadata.homepage.replace(/\/$/, "")
  : ""

export default {
  autoplay,
  metadata,
  opengraph,
  version,
  twitter,
  url,
}
