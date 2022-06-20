<h1 align="center">
 <img
  alt="zoetrope"
  src="https://github.com/henrycatalinismith/zoetrope/raw/trunk/zoetrope.svg"
  height="64"
 />
</h1>

<p align="center">
 <strong>
  CSS demo build tool
 </strong>
</p>

<p align="center">
 <img
  src="https://github.com/henrycatalinismith/zoetrope/actions/workflows/publish.yml/badge.svg"
  alt="Build status"
 />
</p>

zoetrope is a tool for building CSS demos.
Imagine something like Codepen, except:

* It runs locally on your own computer
* You use your normal text editor
* You can't add any HTML or JS. Only CSS.

That last one is super important.
CSS demos that depend on JavaScript or lots of little helper `<div />` elements
are great, but I think it's also fun to try without that stuff, and get
creative within the boundaries of what CSS can do all on its own.
Working with [PICO-8] taught me how platform constraints can actually inspire
creativity rather than stifle it.
zoetrope is a way for me to bridge the gap and try to bring some of that
thinking into the stuff I do on the web.

This is more of a personal tool, and not really intended for widespread public
adoption.
It's open source because it might as well be, and it has this
documentation because I don't like open sourcing things without any.
You're more than welcome to give it a try, and I'd be really excited if anybody
did.
But that's not really the goal here!

## Installation

```
yarn add -D @henrycatalinismith/zoetrope
```

## Usage

```
 zoetrope <command>

 Commands
   help    print this help text
   build   build static site
   server  run development server
```

I wanted to optimize out as much tooling boilerplate as possible from my
workflow, so zoetrope pulls all the metadata it needs to build a demo from
`package.json`.
Check out the [`package.json` for my doomfire demo][doomfire] for example.
Most of the values in there are actually used in the built version of the demo
at https://hen.cat/doomfire.
I'm not going to document the setup process in detail, but if you do want to
try out zoetrope for yourself then go and browse around that repository for a
moment.

## Contributing

<p>
 <a href="https://www.contributor-covenant.org/version/2/0/code_of_conduct/">
  Contributor Covenant v2.0
 </a>
</p>

## License

MIT

[PICO-8]: https://www.lexaloffle.com/pico-8.php
[doomfire]: https://github.com/henrycatalinismith/doomfire/blob/trunk/package.json
