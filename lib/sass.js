import createHtmlElement from "create-html-element"
import fs from "fs-extra"
import loading from "loading-cli"
import path from "path"
import sass from "sass"

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

