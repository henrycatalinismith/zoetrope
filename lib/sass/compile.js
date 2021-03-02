const fs = require("fs-extra")
const loading = require("loading-cli")
const path = require("path")
const sass = require("sass")
const functions = require("./functions")

module.exports = async function compileSass(src, dst) {
  const file = path.resolve(src)
  const name = path.basename(src)
  const dir = path.dirname(dst)
  const start = process.hrtime()
  const load = loading(name).start()
  load.render()

  const interval = setInterval(() => {
    load.render()
  }, 100)

  return new Promise((resolve, reject) => {
    const result = sass.render(
      { file, functions },
      (err, result) => {
        clearInterval(interval)
        if (err) {
          load.fail()
          reject()
        } else {
          fs.ensureDirSync(dir)
          fs.writeFileSync(dst, result.css)
          const end = process.hrtime(start)
          const nanoseconds = end[0] * 1e9 + end[1]
          const milliseconds = Math.ceil(nanoseconds / 1e6)
          load.succeed(`${name} [${milliseconds}ms]`)
          resolve()
        }
      }
    )
  })


  // const target = `${process.env.DIR}/_site/${mainBare}-${version}.css`
  // const hrstart = process.hrtime()
  // const hrend = process.hrtime()
  // console.log(`✨ ${mainBare}.css ${Math.floor(hrend[1] / 1000000)}ms`)
}

