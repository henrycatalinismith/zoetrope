#!/usr/bin/env node

require("child_process").fork(
  `${process.cwd()}/node_modules/.bin/eleventy`,
  [
    // pass any extra arguments along to eleventy so we can use e.g. --serve
    ...process.argv.slice(2),

    // output the generated site to the external directory
    `--output=${process.cwd()}/_site`,
  ],
  {
    // run eleventy in the local zoetrope directory so that it builds the site
    // primarily based on the stuff in here instead of the external directory
    cwd: __dirname,

    env: {
      // pass through any existing environment variables
      ...process.env,

      // pass the path of the external directory through to eleventy so that we
      // can still reach back out to it to pull in extra content from there
      DIR: process.cwd(),
    },
  }
)

