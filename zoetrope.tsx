#!/usr/bin/env node
import browserSync from "browser-sync"
import createHtmlElement from "create-html-element"
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

const selectMain = createSelector(
  [selectMetadata],
  (metadata) => metadata.main
)

const selectSassCode = createSelector(
  [selectSass],
  (sass) => sass.code
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
        <Text>{metadata.name}</Text>
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
  return (
    <Box 
      borderColor="magenta"
      borderStyle="round"
      flexDirection="column"
      padding={1}
      width="50%"
    >
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  )
}

function Page(): React.ReactElement {
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
      </head>
      <body>
        lol
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
  }
}

function buildPage(): Thunk {
  return async (dispatch, getState) => {
    fs.ensureDirSync("_site")
    dispatch(page.actions.build())
    
    let html = ReactDOMServer.renderToString(
      <Page />
    )
    html = `<!doctype html>${html}`
    html = html.replace(/ data-reactroot=""/, "")

    fs.writeFileSync(`_site/index.html`, html)
    dispatch(page.actions.done(html))
  }
}

function updateSass(): Thunk {
  return async (dispatch, getState) => {
    const main = selectMain(getState())
    const data = fs.readFileSync(main, "utf-8")
    await dispatch(sass.actions.update(data))
  }
}

function buildSass(): Thunk {
  return async (dispatch, getState) => {
    const data = selectSassCode(getState())
    dispatch(sass.actions.build())
    renderSass(
      { data, functions },
      async (err, result) => {
        if (err) {
          dispatch(sass.actions.error(err.stack))
        } else {
          const sassResult: SassResult = {
            ...result,
            css: result.css.toString(),
            map: result.map?.toString(),
          }
          fs.writeFileSync(`_site/style.css`, sassResult.css)
          await dispatch(sass.actions.result(sassResult))
          await dispatch(buildPage())
        }
      }
    )
  }
}

store.dispatch(runCommand(process.argv[2]))

render(
  <Provider store={store}>
    <Zoetrope />
  </Provider>
)
