module.exports = function demoVersion() {
  return  process.env.COMMIT_REF || "dev"
}

