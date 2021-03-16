import createHtmlElement from "create-html-element"
import fs from "fs-extra"
import path from "path"
import sass from "sass"

import {
  demoAutoplay,
  demoBuild,
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
const build = demoBuild(process.env.DIR, metadata, version)

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

const file = path.resolve(build.scssFilename)
let result
let error
try {
  result = sass.renderSync(
    { file, functions }
  )
  fs.ensureDirSync(build.siteDirectory)
  fs.writeFileSync(build.cssFilename, result.css)
} catch (e) {
  console.error(e)
  error = e
}

const url = process.env.COMMIT_REF
  ? metadata.homepage.replace(/\/$/, "")
  : ""

export default {
  autoplay,
  error,
  metadata,
  opengraph,
  version,
  twitter,
  url,
}
