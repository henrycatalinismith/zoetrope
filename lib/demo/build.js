const path = require("path")

module.exports = function demoBuild(directory, metadata, version) {
  const demoDirectory = directory
  const siteDirectory = `${demoDirectory}/_site`
  const zoetropeDirectory = path.resolve(__dirname, "../../")

  const scssFilename = [
    demoDirectory,
    metadata.main,
  ].join("/")

  const cssFilename = [
    siteDirectory,
    `${path.basename(metadata.main, ".scss")}-${version}.css`
  ].join("/")

  const build = {
    cssFilename,
    demoDirectory,
    scssFilename,
    siteDirectory,
    zoetropeDirectory,
  }

  return build
}

