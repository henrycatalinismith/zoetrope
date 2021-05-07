#!/usr/bin/env node
import browserSync from "browser-sync"
import chokidar from "chokidar"
import createHtmlElement from "create-html-element"
import crypto from "crypto"
import fs from "fs-extra"
import {
  Action,
  PayloadAction,
  configureStore,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit"
import React from "react"
import ReactDOMServer from "react-dom/server"
import {
  Provider,
  ThunkAction,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux/lib/alternate-renderers"
import { render, Box, Text, Newline } from "ink"
import { render as renderSass, types as sassTypes } from "sass"
import { name, description, version } from "./package.json"

function unquote(value) {
  if (value instanceof sassTypes.Number) {
    return value.getValue()
  }
  return new sassTypes.String(
    value.getValue()
  ).getValue()
}

function html(tagName, props, children) {
  const name = unquote(tagName) as string
  const attributes = {}
  for (let i = 0; i < props.getLength(); i++) {
    const key = unquote(props.getKey(i))
    const value = unquote(props.getValue(i))
    attributes[key] = value
  }
  const html = children.getValue()
  return new sassTypes.String(
    createHtmlElement({
      name,
      attributes,
      html,
    })
  )
}

function implode(pieces, glue) {
  const array = []
  for (let i = 0; i < pieces.getLength(); i++) {
    array.push(unquote(pieces.getValue(i)))
  }
  const output = array.join(unquote(glue) as string)
  return new sassTypes.String(output)
}

function svg(x, y, w, h, children) {
  const tagName = new sassTypes.String("svg")
  const props = new sassTypes.Map(3)

  props.setKey(0, new sassTypes.String("xmlns"))
  props.setValue(0, new sassTypes.String("http://www.w3.org/2000/svg"))

  props.setKey(1, new sassTypes.String("xmlns:xlink"))
  props.setValue(1, new sassTypes.String("http://www.w3.org/1999/xlink"))

  props.setKey(2, new sassTypes.String("viewBox"))
  props.setValue(2, new sassTypes.String([
    x.getValue(),
    y.getValue(),
    w.getValue(),
    h.getValue(),
  ].join(" ")))

  const dirty = html(tagName, props, children)
  const clean = encodeURIComponent(dirty.getValue())
  const url = new sassTypes.String(`url("data:image/svg+xml;utf8,${clean}")`)

  return url
}

const functions = {
  "html($tagName, $props: (), $children: '')": html,
  "implode($pieces, $glue: '')": implode,
  "svg($x, $y, $w, $h, $children: '')": svg,
}

type Command = "help" | "build" | "server"

const command = createSlice({
  name: "command",
  initialState: "help" as Command,
  reducers: {
    run: (state, action: PayloadAction<string>): Command => {
      if (["help", "build", "server"].includes(action.payload)) {
        return action.payload as Command
      } else {
        return state
      }
    },
  },
})

const log = createSlice({
  name: "log",
  initialState: [],
  reducers: {
    add: (state, action: PayloadAction<string>): void => {
      state.push(action.payload)
    },
  },
})

interface Metadata {
  name?: string
  description?: string
  main?: string
}

const metadata = createSlice({
  name: "metadata",
  initialState: fs.readJsonSync(
    `${process.cwd()}/package.json`,
  ) as Metadata,
  reducers: {},
})

type PageStatuses = "idle" | "busy"

interface Page {
  status: PageStatuses
  html: string
}

const initialPageState: Page = {
  status: "idle",
  html: "",
}

const page = createSlice({
  name: "page",
  initialState: initialPageState,
  reducers: {
    build: (state) => {
      state.status = "busy"
    },
    done: (state, action: PayloadAction<string>) => {
      state.status = "idle"
      state.html = action.payload
    },
  },
})

type SassStatuses = "idle" | "busy" | "okay" | "error"

interface SassResult {
  css: string
  map?: string
  stats: {
    entry: string
    includedFiles: string[]
    start: number
    end: number
    duration: number
  }
}

interface Sass {
  code: string
  error: string
  result: SassResult,
  status: SassStatuses
}

const initialSassState: Sass = {
  code: "",
  error: "",
  result: {
    css: "",
    map: "",
    stats: {
      entry: "",
      includedFiles: [],
      start: 0,
      end: 0,
      duration: 0,
    }
  },
  status: "idle"
}

const sass = createSlice({
  name: "sass",
  initialState: initialSassState,
  reducers: {
    update: (state, action: PayloadAction<string>) => {
      state.code = action.payload
    },
    build: (state) => {
      state.status = "busy"
    },
    result: (state, action: PayloadAction<SassResult>) => {
      state.result = action.payload
      state.status = "okay"
    },
    error: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.status = "error"
    },
  },
})

type ServerStatus = "offline" | "starting" | "online"

interface Server {
  status: ServerStatus
  options: {
    logLevel: "info" | "debug" | "warn" | "silent"
    open: boolean
    port: number
    server: string
  }
}

const initialServerState: Server = {
  status: "offline",
  options: {
    logLevel: "silent",
    open: false,
    port: 8080,
    server: "_site",
  }
}

const server = createSlice({
  name: "server",
  initialState: initialServerState,
  reducers: {
    starting: (state) => {
      state.status = "starting"
    },
    online: (state) => {
      state.status = "online"
    },
  },
})

const store = configureStore({
  reducer: {
    command: command.reducer,
    log: log.reducer,
    metadata: metadata.reducer,
    sass: sass.reducer,
    server: server.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
  .concat(store => next => async action => {
    next(action)
    if (action.type !== "log/add") {
      store.dispatch(log.actions.add(action.type))
    }
  }),
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export type Thunk = ThunkAction<void, RootState, null, Action<string>>

const selectMetadata = ({ metadata }): Metadata => metadata
const selectSass = ({ sass }): Sass => sass

const selectMetadataMain = createSelector(
  [selectMetadata],
  (metadata) => metadata.main
)

const selectMetadataName = createSelector(
  [selectMetadata],
  (metadata) => metadata.name.replace(/^.+\//, "")
)

const selectSassCode = createSelector(
  [selectSass],
  (sass) => sass.code
)

const selectSassHash = createSelector(
  [selectSassCode],
  (code) => crypto
    .createHash("md5")
    .update(code)
    .digest("hex")
    .slice(0, 8)
)

const selectCssFilename = createSelector(
  [selectMetadataName, selectSassHash],
  (name, hash) => `${name}-${hash}.css`
)

function Zoetrope(): React.ReactElement {
  const command = useAppSelector(state => state.command)
  return (
    <>
      {command === "help" && <Help />}
      {command === "build" && <Build />}
      {command === "server" && <Server />}
    </>
  )
}

function Help(): React.ReactElement {
  return (
    <>
      <HelpTitle />
      <HelpUsage />
      <HelpCommands />
      <Newline />
    </>
  )
}

function HelpTitle(): React.ReactElement {
  return (
    <Box paddingTop={1} paddingLeft={1} flexDirection="column">
      <Box>
        <Text>zoetrope</Text>
        <Text> </Text>
        <Text color="gray">[{name}@{version}]</Text>
      </Box>
      <Text>{description}</Text>
    </Box>
  )
}

function HelpUsage(): React.ReactElement {
  return (
    <Box paddingTop={1} paddingLeft={1} flexDirection="column">
      <Text>Usage</Text>
      <Box paddingLeft={1}>
        <Text>{"zoetrope "}</Text>
        <Text color="magenta">{"<command>"}</Text>
      </Box>
    </Box>
  )
}

function HelpCommands(): React.ReactElement {
  return (
    <Box paddingTop={1} paddingLeft={1} flexDirection="column">
      <Text>Commands</Text>
      <Box paddingLeft={1} width="64" flexDirection="column">
        <HelpCommand
          name="help"
          description="print this help text"
        />
        <HelpCommand
          name="build"
          description="build static site"
        />
        <HelpCommand
          name="server"
          description="run development server"
        />
      </Box>
    </Box>
  )
}

function HelpCommand({ name, description }): React.ReactElement {
  return (
    <Box paddingLeft={1}>
      <Box width="10%">
        <Text color="magenta">{name}</Text>
      </Box>
      <Box width="90%">
        <Text>{description}</Text>
      </Box>
    </Box>
  )
}

function Build(): React.ReactElement {
  const lines = useAppSelector(state => state.log)
  return (
    <Box height={lines.length} flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  )
}

function Server(): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      height={process.stdout.rows}
      width={process.stdout.columns}
    >
      <ServerStatus />
      <ServerLogs />
    </Box>
  )
}

function ServerStatus(): React.ReactElement {
  const metadata = useAppSelector(state => state.metadata)
  const name = useAppSelector(selectMetadataName)
  return (
    <Box 
      borderColor="magenta"
      borderStyle="round"
      flexDirection="column"
      width="50%"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="magenta">zoetrope</Text>
      <Box paddingLeft={1} paddingRight={1} flexDirection="column">
        <Text>{name}</Text>
        <Text>{metadata.homepage}</Text>
      </Box>
      <Box paddingLeft={1} paddingRight={1} flexDirection="column">
        <Text>{metadata.description}</Text>
      </Box>
    </Box>
  )
}

function ServerLogs(): React.ReactElement {
  const lines = useAppSelector(state => state.log)
  const height = process.stdout.rows - 2

  return (
    <Box 
      borderColor="magenta"
      borderStyle="round"
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
      width="50%"
    >
      {lines.slice(0 - height).map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  )
}

function Page(): React.ReactElement {
  const metadata = useAppSelector(selectMetadata)
  const name = useAppSelector(selectMetadataName)
  const cssFilename = useAppSelector(selectCssFilename)
  return (
    <html
      lang="en"
      dir="ltr"
      itemScope
      itemType="http://schema.org/WebApplication">
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          :root {
            --padding: 1rem;
            --tiny: calc(100vw - var(--padding) * 2);
            --wide: 32rem;
            --box: min(var(--tiny), var(--wide));

            --backgroundColor: black;

            --mainAnimation: none;
            --mainWidth: var(--box);
            --mainHeight: var(--box);

            --playButtonBackground: dodgerblue;
            --playButtonBorder: 2px solid #1d2b53;
            --playButtonBorderRadius: 4px;
            --playButtonBoxShadow: 0 0 4px moccasin;
            --playButtonDisplay: none;
            --playButtonHeight: 3rem;
            --playButtonWidth: 6.75rem;

            --loadingBarBackground: var(--playButtonBackground);
            --loadingBarBorder: var(--playButtonBorder);
            --loadingBarBorderRadius: var(--playButtonBorderRadius);
            --loadingBarBoxShadow: var(--playButtonBoxShadow);
            --loadingBarDisplay: none;
            --loadingBarHeight: var(--playButtonHeight);
            --loadingBarTransform: scaleX(1);
            --loadingBarTransitionDuration: 256ms;
            --loadingBarWidth: var(--playButtonWidth);
          }

          body[data-mode="menu"] {
            --playButtonDisplay: flex;
          }

          body[data-mode="load"] {
            --loadingBarDisplay: flex;
            --loadingBarWidth: var(--box);
          }

          body[data-mode="play"] {
            --loadingBarDisplay: flex;
            --loadingBarWidth: var(--box);
          }

          body[data-mode="play"] {
            --mainAnimation: explode 128ms forwards;
          }

          @media (prefers-reduced-motion: no-preference) {
            :root {
              --loadingBarTransform: scaleX(0.55);
            }
          }

          html {
            box-sizing: border-box;
            overflow: hidden;
          }

          *, *:before, *:after {
            box-sizing: inherit;
          }

          body {
            background-color: var(--backgroundColor);

            align-items: center;
            color: white;
            display: flex;
            height: 100vh;
            justify-content: center;
            margin: 0;
            overflow: hidden;
            width: 100vw;
          }

          @keyframes explode {
            from {
              opacity: 1;
              transform: scale(1.0);
            }
            to {
              opacity: 0;
              transform: scale(1.08);
            }
          }

          main {
            animation: var(--mainAnimation);
            height: var(--mainHeight);
            width: var(--mainWidth);

            align-items: center;
            display: flex;
            justify-content: center;
          }

          article {
            flex: 1;
          }

          h1[itemprop="name"] {
            color: white;
            font-family: Futura, sans-serif;
            font-size: 3rem;
            font-weight: bold;
            margin: 0;
          }

          [itemprop="description"] {
            font-family: Rockwell;
            font-size: 1.5rem;
            margin: 0 0 1rem 0;
          }

          [aria-label="play"] {
            background-color: var(--playButtonBackground);
            border: var(--playButtonBorder);
            border-radius: var(--playButtonBorderRadius);
            box-shadow: var(--playButtonBoxShadow);
            display: var(--playButtonDisplay);
            height: var(--playButtonHeight);
            width: var(--playButtonWidth);

            align-items: center;
            cursor: pointer;
            justify-content: center;
          }

          [aria-label="play"] svg:nth-child(1) {
            display: block;
            width: 26px;
            height: 32px;
            stroke-linecap: round;
            stroke-linejoin: round;
          }

          [aria-label="play"] svg:nth-child(1) path:nth-child(1) {
            stroke: #1d2b53;
            fill: white;
            stroke-width: 10;
          }

          [aria-label="play"] svg:nth-child(1) path:nth-child(2) {
            fill: white;
          }

          [aria-label="play"] svg:nth-child(2) {
            display: block;
            width: 64px;
            height: 32px;
          }

          @keyframes resize {
            0% {
              background-color: var(--playButtonBackground);
              transform: var(--loadingBarTransform);
            }

            25% {
              background-color: transparent;
              transform: var(--loadingBarTransform);
            }

            100% {
              background-color: transparent;
              transform: scaleX(1);
            }
          }

          [aria-label="loading"] {
            background-color: var(--loadingBarBorder);
            border: var(--loadingBarBorder);
            box-shadow: var(--loadingBarBoxShadow);
            display: var(--loadingBarDisplay);
            height: var(--loadingBarHeight);
            transform: var(--loadingBarTransform);
            width: var(--loadingBarWidth);

            animation: resize 128ms forwards ease-in-out;
            padding: 0 0.4rem;
            transform-origin: left;
          }

          [aria-label="loading"] path {
            stroke: cyan;
            stroke-width: 32;
            stroke-dasharray: 256;
            stroke-dashoffset: 256;
            transition: stroke-dashoffset var(--loadingBarTransitionDuration) linear;
          }

          [itemprop="creator"] {
            align-items: center;
            color: white;
            display: flex;
            font-family: Futura, Helvetica, sans-serif;
            grid-template-columns: repeat(2, auto);
            margin: 2rem 0 0 0;
            transition: opacity 256ms 512ms;
          }

          [itemprop="creator"] > span {
            color: lightgray;
            font-style: italic;
          }

          [itemprop="creator"] > span::after {
            content: "  ";
            white-space: pre;
          }

          [itemprop="creator"] a {
            text-decoration: none;
          }

          [itemprop="creator"] [itemprop="name"] {
            color: white;
            font-size: 1.4rem;
          }

          [itemprop="creator"] [itemprop="name"]:hover {
            text-decoration-line: underline;
            text-decoration-color: cyan;
          }

          a[href*="github"] {
            align-items: center;
            color: deepskyblue;
            display: flex;
            flex-direction: row;
            font-family: Futura, sans-serif;
            font-size: 1.2rem;
            margin-top: 1rem;
            text-decoration: none;
          }

          a[href*="github"]:hover {
            text-decoration: underline;
          }

          a[href*="github"] svg {
            fill: deepskyblue;
            margin-right: 0.5ch;
            height: 1.4rem;
            width: 1.4rem;
          }

          aside {
            display: none;
          }
        `
        }} />
      </head>
      <body data-mode="menu">
        <main>
          <article>
            <header>
              <h1 itemProp="name">
              {name}
              </h1>
            </header>
            <p itemProp="description">
              {metadata.description}
            </p>

            <button aria-label="play">
              <svg viewBox="0 0 40 48">
                <path d="M8,8 L32,24 L8,40 L8,8" />
                <path d="M8,8 L32,24 L8,40 L8,8" />
              </svg>
              <svg fill="none" viewBox="0 0 46 25">
                <path fill="#000" d="M11.15 12.2l-1.88.68.02.06.02.05 1.84-.79zm-.38-.6l1.41-1.42-1.41 1.41zm-.61-.4L9.3 13l.05.02.05.02.76-1.85zm-2.05.38L6.7 10.16l-.03.02-.02.03 1.46 1.37zm-.4.6l-1.82-.82-.01.02v.02l1.83.78zm0 1.44l1.84-.78-1.84.78zm.4.6L6.7 15.63l.02.02.02.03 1.37-1.46zm.6.4l-.87 1.8.05.03.05.02.76-1.85zm1.45 0l-.79-1.84.79 1.84zm.57-.4L9.32 12.8l-.02.02-.03.03 1.46 1.37zm.4-.6l-1.8-.86-.02.04-.01.04 1.83.78zM7.65 21.1v2h2v-2h-2zm-2.9 0h-2v2h2v-2zm0-12.3v-2h-2v2h2zm2.9 0h2v-2h-2v2zm0 .9h-2v5.74l3.56-4.5L7.65 9.7zm4.16-.81l-.85 1.8.02.02.02.01.8-1.83zM14 11.2l-1.87.7v.02l.01.02 1.86-.74zm0 3.4l-1.85-.75-.01.02v.01l1.86.73zM13.13 16l-1.45-1.37-.02.02 1.47 1.35zm-1.3.93l-.8-1.83.8 1.83zm-4.18-.72l1.43-1.4-3.43-3.54v4.94h2zm5.64-3.28c0-.51-.1-1.02-.3-1.5L9.3 12.98a.25.25 0 01-.01-.05v-.02h4zm-.26-1.4c-.18-.5-.47-.96-.85-1.34L9.35 13a.39.39 0 01-.08-.13l3.76-1.36zm-.85-1.34c-.37-.37-.8-.65-1.26-.84l-1.52 3.7H9.4a.22.22 0 01-.04-.03l2.83-2.83zm-1.16-.8a3.69 3.69 0 00-1.6-.35v4h-.04A.39.39 0 019.3 13l1.72-3.61zm-1.6-.35c-.51 0-1.02.1-1.5.3l1.57 3.68a.25.25 0 01-.05.02h-.02v-4zm-1.5.3c-.46.2-.87.48-1.22.83L9.52 13a.13.13 0 01-.03.02L7.91 9.34zm-1.27.88c-.32.34-.57.73-.76 1.15L9.53 13l.04-.07-2.92-2.73zm-.78 1.19c-.2.48-.3 1-.3 1.5h4v.02l-.02.05-3.68-1.57zm-.3 1.5c0 .52.1 1.03.3 1.51l3.68-1.57.01.04v.02h-4zm.3 1.51c.2.46.47.87.83 1.22l2.82-2.83a.12.12 0 01.03.04L5.87 14.4zm.87 1.27c.33.3.7.55 1.1.74l1.72-3.61a.32.32 0 01-.08-.05l-2.74 2.92zm1.2.79c.48.2.98.29 1.5.29v-4h.01l-1.5 3.7zm1.5.29c.51 0 1.02-.1 1.5-.3l-1.57-3.68.05-.02h.02v4zm1.5-.3c.47-.2.9-.5 1.25-.88l-2.92-2.73a.34.34 0 01.1-.07l1.58 3.67zm1.2-.83c.36-.35.64-.76.83-1.22L9.3 12.84v-.02l.02-.02 2.83 2.83zm.8-1.15c.23-.49.35-1.01.35-1.56h-4a.38.38 0 01.04-.16l3.61 1.72zm-5.3 4.62H4.76v4h2.9v-4zm-.89 2V8.8h-4v12.3h4zm-2-10.3h2.9v-4h-2.9v4zm.9-2v.9h4v-.9h-4zm3.56 2.15c.21-.26.46-.41.96-.41v-4c-1.62 0-3.06.63-4.09 1.92l3.13 2.49zm.96-.41c.32 0 .57.06.79.16l1.7-3.62a5.8 5.8 0 00-2.49-.54v4zm.83.18c.28.12.5.28.68.47l2.9-2.75a6.03 6.03 0 00-1.97-1.38L11 10.72zm.68.47c.18.2.33.43.45.73l3.74-1.42a6.14 6.14 0 00-1.28-2.06l-2.9 2.75zm.46.76c.11.28.18.6.18.97h4c0-.85-.15-1.67-.47-2.45l-3.7 1.48zm.18.97c0 .37-.07.68-.17.94l3.7 1.51c.32-.78.47-1.6.47-2.45h-4zm-.19.97c-.1.3-.26.53-.45.73l2.9 2.75c.56-.6.99-1.27 1.28-2.03l-3.73-1.45zm-.47.75a1.9 1.9 0 01-.64.45l1.63 3.66a5.9 5.9 0 001.96-1.4l-2.95-2.71zm-.64.45c-.23.1-.49.17-.81.17v4c.84 0 1.67-.17 2.44-.51l-1.63-3.66zm-.81.17c-.51 0-.84-.16-1.13-.45l-2.87 2.78a5.42 5.42 0 004 1.67v-4zm-4.56.94v4.9h4v-4.9h-4zM18.86 3.72h2v-2h-2v2zm0 13.28v2h2v-2h-2zm-2.9 0h-2v2h2v-2zm0-13.28v-2h-2v2h2zm.9 0V17h4V3.72h-4zm2 11.28h-2.9v4h2.9v-4zm-.9 2V3.72h-4V17h4zm-2-11.28h2.9v-4h-2.9v4zm7.72 7.9l-1.86.76.01.02v.01l1.85-.79zm.38.6l-1.46 1.36.02.03.03.02 1.41-1.41zm.6.4l-.8 1.83.02.01h.01l.76-1.84zm1.46 0l-.75-1.86-.02.01h-.01l.78 1.85zm.6-.4L25.3 12.8l-.02.02-.02.03 1.46 1.37zm.4-.6l-1.81-.86-.02.04-.01.04 1.84.78zm0-1.44l-1.86.76.03.05.02.05 1.8-.86zm-.4-.6l-1.46 1.36.02.03.02.02 1.42-1.41zm-.6-.4L25.34 13l.01.01h.02l.75-1.84zm-1.47 0l-.76-1.86-.01.01h-.02l.8 1.85zm-.59.4l-1.41-1.42-.03.02-.02.03 1.46 1.37zm-.38.59l1.82.82v-.02l.01-.01-1.83-.8zm3.5-3.38v-2h-2v2h2zm2.91 0h2v-2h-2v2zm0 8.21v2h2v-2h-2zm-2.91 0h-2v2h2v-2zm0-.91h2v-5.73l-3.57 4.48 1.57 1.25zm-4.16.85l-.82 1.82h.02l.02.02.78-1.84zM21.71 16l-1.46 1.37 1.46-1.37zm-.88-1.4l-1.87.72v.01l.01.02 1.86-.74zm0-3.4l1.86.72v-.01l-1.86-.71zm.85-1.4l1.47 1.36-1.47-1.35zm1.3-.92l.8 1.82h.02l.02-.01-.85-1.81zm4.2.72l-1.46 1.37 3.46 3.67V9.61h-2zm-5.65 3.26c0 .51.1 1.02.3 1.51l3.7-1.51a.1.1 0 010 .01h-4zm.3 1.54c.2.43.44.83.77 1.17l2.92-2.73v-.01l-3.68 1.57zm.82 1.22c.35.35.76.63 1.21.82l1.58-3.67h.02l.01.02-2.82 2.83zm1.24.84c.5.2 1 .29 1.51.29v-4s-.01 0 0 0l-1.5 3.7zm1.51.29c.52 0 1.03-.1 1.51-.3l-1.57-3.68.04-.02h.02v4zm1.48-.3c.48-.19.92-.48 1.3-.88l-2.92-2.73a.43.43 0 01.1-.09l1.52 3.7zm1.25-.83c.35-.35.63-.76.82-1.22l-3.67-1.57v-.02l.02-.02 2.83 2.83zm.8-1.15c.23-.5.35-1.03.35-1.58h-4a.37.37 0 01.03-.14l3.61 1.72zm.35-1.58c0-.54-.12-1.07-.36-1.58l-3.61 1.72a.37.37 0 01-.03-.14h4zm-.31-1.47c-.2-.47-.47-.9-.84-1.27L25.3 13a.24.24 0 01-.03-.03v-.02l3.7-1.51zm-.8-1.22c-.37-.4-.81-.69-1.29-.89l-1.51 3.7-.04-.01a.43.43 0 01-.07-.07l2.91-2.73zm-1.26-.87c-.48-.21-1-.3-1.5-.3v4l-.03-.01c-.01 0-.03 0-.04-.02l1.57-3.67zm-1.5-.3c-.52 0-1.03.09-1.52.28l1.52 3.7a.1.1 0 01-.02.01h.01v-4zm-1.55.3c-.45.2-.86.47-1.21.82L25.47 13a.13.13 0 01-.03.02l-1.58-3.67zm-1.26.87c-.33.35-.58.74-.76 1.17l3.67 1.58a.15.15 0 01.01-.02l-2.92-2.73zm-.75 1.14a3.7 3.7 0 00-.32 1.52h4v.03a.4.4 0 01-.03.09l-3.65-1.64zm5.33-.56h2.91v-4h-2.91v4zm.91-2V17h4V8.8h-4zm2 6.21h-2.91v4h2.91v-4zm-.91 2v-.91h-4V17h4zm-3.57-2.16c-.2.27-.45.42-.94.42v4c1.62 0 3.05-.64 4.08-1.93l-3.14-2.49zm-.94.42c-.36 0-.64-.07-.87-.16l-1.56 3.68c.77.32 1.59.48 2.43.48v-4zm-.83-.15a2.08 2.08 0 01-.68-.48l-2.9 2.75a6.08 6.08 0 001.94 1.38l1.64-3.65zm-.68-.48c-.19-.2-.35-.44-.48-.76l-3.7 1.49c.3.75.72 1.43 1.27 2.02l2.91-2.75zm-.46-.72c-.11-.29-.18-.63-.18-1.04h-4c0 .85.14 1.67.44 2.46l3.74-1.42zm-.18-1.04c0-.35.06-.66.17-.94l-3.73-1.45c-.3.77-.44 1.57-.44 2.4h4zm.18-.95c.12-.31.27-.55.45-.75l-2.95-2.7c-.54.59-.95 1.27-1.24 2.03l3.74 1.42zm.45-.75c.17-.19.38-.34.64-.46l-1.63-3.65c-.75.33-1.4.8-1.96 1.4l2.95 2.7zm.67-.47c.21-.1.47-.16.82-.16v-4c-.88 0-1.72.17-2.52.54l1.7 3.62zm.82-.16c.5 0 .8.14 1.08.44l2.92-2.74a5.34 5.34 0 00-4-1.7v4zm4.54-.93v-.82h-4v.82h4zm6.01 6.27l1.77.95.52-.97-.54-.96-1.75.98zm-3.96-7.09v-2H27.8l1.67 2.98 1.75-.98zm3.36 0l1.77-.92-.56-1.08h-1.21v2zM36.78 13l-1.78.92 1.8 3.46 1.76-3.48-1.78-.9zm2.13-4.2v-2h-1.23l-.56 1.09 1.79.9zm3.32 0l1.77.94 1.58-2.95h-3.35v2zm-6.59 12.3v2h1.2l.57-1.06-1.77-.94zm-3.25 0l-1.76-.95-1.58 2.95h3.34v-2zm4.55-6.2l-3.97-7.08-3.49 1.95 3.97 7.09 3.49-1.96zm-5.71-4.1h3.36v-4h-3.36v4zm1.58-1.08l2.2 4.2 3.54-1.84-2.19-4.21-3.55 1.85zm5.75 4.18l2.13-4.2-3.57-1.81-2.13 4.2 3.57 1.81zm.35-3.1h3.32v-4h-3.32v4zm1.56-2.95l-6.59 12.3 3.53 1.9L44 9.73l-3.53-1.9zM35.64 19.1H32.4v4h3.25v-4zm-1.48 2.94l2.8-5.21-3.53-1.9-2.8 5.22 3.53 1.9z"/>
                <path fill="#fff" d="M11.3 12.92c0-.26-.05-.5-.15-.72a1.64 1.64 0 00-.38-.6c-.17-.18-.38-.31-.61-.4a1.8 1.8 0 00-2.05.38c-.16.17-.3.37-.4.6-.1.23-.14.47-.14.72a1.8 1.8 0 00.54 1.32c.17.16.37.29.6.4a1.93 1.93 0 001.45 0c.22-.1.41-.23.57-.4.17-.17.3-.37.4-.6.11-.22.16-.45.16-.7zM7.64 21.1h-2.9V8.8h2.9v.9a3.06 3.06 0 012.52-1.16c.6 0 1.13.11 1.64.35A4.03 4.03 0 0114 11.2a4.57 4.57 0 010 3.4 4.18 4.18 0 01-2.16 2.31c-.5.22-1.05.34-1.63.34a3.42 3.42 0 01-2.56-1.06v4.9zM18.86 3.72V17h-2.9V3.72h2.9zm4.67 9.15a1.97 1.97 0 00.53 1.35 1.87 1.87 0 003.06-.6c.1-.22.16-.46.16-.72 0-.25-.06-.5-.16-.72a1.83 1.83 0 00-1.72-1.15 1.87 1.87 0 00-1.34.54c-.16.18-.29.37-.38.6-.1.21-.15.45-.15.7zm3.65-4.08h2.91V17h-2.91v-.91a3.04 3.04 0 01-2.51 1.17c-.6 0-1.15-.11-1.65-.32a4.08 4.08 0 01-2.2-2.32 4.87 4.87 0 010-3.41c.21-.54.5-1 .86-1.4.36-.39.79-.7 1.3-.92.5-.24 1.05-.35 1.66-.35 1.02 0 1.87.35 2.54 1.07v-.82zm8.01 7.09l-3.96-7.09h3.36L36.78 13l2.13-4.2h3.32l-6.59 12.3H32.4l2.8-5.22z"/>
              </svg>
            </button>

            <svg aria-label="loading" viewBox="0 0 256 48" preserveAspectRatio="none">
              <path d="M0,24 L256,24" />
            </svg>

            <p
              itemProp="creator"
              itemScope
              itemType="http://schema.org/Person">
              <span>by</span>
              <a href={metadata.author.url} target="_blank">
                <span itemProp="name">{metadata.author.name}</span>
              </a>
            </p>

          </article>
        </main>
        <script dangerouslySetInnerHTML={{
          __html: `
              
          document.addEventListener(
            "DOMContentLoaded",
            () => {
              const request = new XMLHttpRequest
              const body = document.createElement("body")
              const style = document.createElement("style")
              const loading = document.querySelector("[aria-label='loading'] path")
              let before = Date.now()
          
              request.onloadstart = () => {
                before = Date.now()
              }
          
              request.onprogress = (event) => {
                const after = Date.now()
                document.documentElement.style.setProperty(
                  "--loadingBarTransitionDuration",
                  \`\${(after - before) * 2}ms\`
                )
                loading.style.strokeDashoffset = 256 - (
                  256 * event.loaded / event.total
                )
                before = after
              }
          
              request.onload = () => {
                loading.style.strokeDashoffset = 0
                setTimeout(() => {
                  document.body.dataset.mode = "play"
                  style.innerText = request.response
                  setTimeout(() => {
                    document
                      .head
                      .querySelector("style")
                      .replaceWith(style)
                    document
                      .body
                      .replaceWith(body)
                  }, Math.pow(2, 8))
                }, Math.pow(2, 8))
              }
          
              document
                .querySelector("[aria-label='play']")
                .addEventListener(
                  "click",
                  () => {
                    document.body.dataset.mode = "load"
                    request.open("GET", "${cssFilename}")
                    request.send()
                  }
                )
          
              // {% if autoplay %}
                // document.body.dataset.mode = "load"
                // request.open("GET", "{{ url }}/{{ metadata.main | replace(".scss", "") }}-{{ version }}.css")
                // request.send()
              // {% endif %}
            }
          )
          `
        }} />
      </body>
    </html>
  )
}

function runCommand(name: string): Thunk {
  return async (dispatch, getState) => {
    dispatch(command.actions.run(name))
    switch (getState().command) {
      case "build":
        dispatch(runBuild())
        break
      case "server":
        dispatch(runServer())
        break
    }
  }
}

function runBuild(): Thunk {
  return async (dispatch, getState) => {
    await dispatch(updateSass())
    await dispatch(buildSass())
    await dispatch(buildPage())
  }
}

function runServer(): Thunk {
  return async (dispatch, getState) => {
    dispatch(server.actions.starting())
    const bs = browserSync.create()
    bs.init({ ...getState().server.options })
    bs.emitter.on("init", () => {
      dispatch(server.actions.online())
    })
    await dispatch(runBuild())
    await dispatch(watchSass())
  }
}

function buildPage(): Thunk {
  return async (dispatch, getState) => {
    fs.ensureDirSync("_site")
    dispatch(page.actions.build())
    
    let html = ReactDOMServer.renderToString(
      <Provider store={store}>
        <Page />
      </Provider>
    )
    html = `<!doctype html>${html}`
    html = html.replace(/ data-reactroot=""/, "")

    fs.writeFileSync(`_site/index.html`, html)
    dispatch(page.actions.done(html))
  }
}

function updateSass(): Thunk {
  return async (dispatch, getState) => {
    const main = selectMetadataMain(getState())
    const data = fs.readFileSync(main, "utf-8")
    await dispatch(sass.actions.update(data))
  }
}

function buildSass(): Thunk {
  return async (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      const data = selectSassCode(getState())
      dispatch(sass.actions.build())
      renderSass(
        { data, functions },
        async (err, result) => {
          if (err) {
            dispatch(sass.actions.error(err.stack))
            reject()
          } else {
            const sassResult: SassResult = {
              ...result,
              css: result.css.toString(),
              map: result.map?.toString(),
            }
            await dispatch(sass.actions.result(sassResult))
            const cssFilename = selectCssFilename(getState())
            const cssPath = `_site/${cssFilename}`
            fs.ensureDirSync("_site")
            fs.writeFileSync(cssPath, sassResult.css)
            resolve(null)
          }
        }
      )
    })
  }
}

function watchSass(): Thunk {
  return async (dispatch, getState) => {
    const main = selectMetadataMain(getState())
    const watcher = chokidar.watch([main], {
      persistent: true
    })
    watcher.on("change", async () => {
      await dispatch(runBuild())
    })
  }
}

store.dispatch(runCommand(process.argv[2]))

render(
  <Provider store={store}>
    <Zoetrope />
  </Provider>
)
