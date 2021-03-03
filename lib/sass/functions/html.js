const createHtmlElement = require("create-html-element")
const sass = require("sass")

function unquote(value) {
  if (value instanceof sass.types.Number) {
    return value.getValue()
  }
  return new sass.types.String(
    value.getValue()
  ).getValue()
}

module.exports = [
  "html($tagName, $props: (), $children: '')",

  function element(tagName, props, children) {
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
  },
]

