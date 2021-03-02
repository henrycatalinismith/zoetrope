const fs = require("fs-extra")
const _ = require("lodash")

module.exports = function demoMetadata(dir) {
  const package = fs.readJsonSync(
    `${dir}/package.json`,
    "utf-8"
  )

  const author = _.get(package, "author", "")
  const description = _.get(package, "description", "")
  const files = _.get(package, "files", [])
  const homepage = _.get(package, "homepage", "")
  const main = _.get(package, "main", "")
  const name = _.get(package, "name", "").replace(/^.+\//, "")
  const repository = _.get(package, "repository")
  const url = _.get(package, "url")

  const demo = {
    author,
    description,
    files,
    homepage,
    main,
    name,
    repository,
    url,
  }

  return demo
}

