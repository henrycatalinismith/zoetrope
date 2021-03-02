const sass = require("sass")

module.exports = [
  "encode($str)",

  function encodeUri(str) {
    return new sass.types.String(
      encodeURIComponent(str)
    )
  },
]

