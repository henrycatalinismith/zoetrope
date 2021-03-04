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
  "implode($pieces, $glue: '')",

  function implode(pieces, glue) {
    const array = []
    for (let i = 0; i < pieces.getLength(); i++) {
      array.push(unquote(pieces.getValue(i)))
    }
    const output = array.join(unquote(glue))
    return new sass.types.String(output)
  },
]

