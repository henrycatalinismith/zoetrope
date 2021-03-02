const _ = require("lodash")
const encode = require("./encode")
const html = require("./html")

module.exports = _.fromPairs([
  encode,
  html,
])

