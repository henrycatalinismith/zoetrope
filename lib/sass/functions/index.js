const _ = require("lodash")
const encode = require("./encode")
const html = require("./html")
const svg = require("./svg")

module.exports = _.fromPairs([
  encode,
  html,
  svg,
])

