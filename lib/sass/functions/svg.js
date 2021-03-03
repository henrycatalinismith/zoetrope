const sass = require("sass")
const encode = require("./encode")
const html = require("./html")

module.exports = [
  "svg($x, $y, $w, $h, $children: '')",

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

    const dirty = html[1](tagName, props, children)
    const clean = encode[1](dirty).getValue()
    const url = new sass.types.String(`url("data:image/svg+xml;utf8,${clean}")`)

    return url
  },
]

