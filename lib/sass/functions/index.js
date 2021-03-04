const _ = require("lodash")
const encode = require("./encode")
const html = require("./html")
const implode = require("./implode")
const svg = require("./svg")

module.exports = _.fromPairs([
  encode,
  html,
  implode,
  svg,
])

