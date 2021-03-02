const chokidar = require("chokidar")

module.exports = function watchSass(src, cb) {
  console.log("watch")
  const watcher = chokidar.watch([src], {
    persistent: true,
  })

  watcher.on("add", cb)
  watcher.on("change", cb)
}

