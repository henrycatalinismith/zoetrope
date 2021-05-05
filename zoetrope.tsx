#!/usr/bin/env node
import browserSync from "browser-sync"
import {
  PayloadAction,
  configureStore,
  createSlice,
} from "@reduxjs/toolkit"
import React from "react"
import {
  Provider,
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux/lib/alternate-renderers"
import { render, Box, Text, Newline } from "ink"
import { name, description, version } from "./package.json"

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

const store = configureStore({
  reducer: {
    command: command.reducer,
    log: log.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
  .concat(store => next => async action => {
    next(action)
    if (action.type === "command/run") {
      const { command } = store.getState()
      if (command === "build") {
        await build()
      } else if (command === "server") {
        await server()
      }
    }
  }),
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

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

async function build() {
  store.dispatch(log.actions.add("building"))
  setTimeout(() => {
    store.dispatch(log.actions.add("done"))
  }, 1000)
}

async function server() {
  store.dispatch(log.actions.add("starting server"))

  const bs = browserSync.create()

  bs.init({
    logLevel: "silent",
    open: false,
    port: 8080,
    server: "_site",
  })

  // bs.watch('*.html').on('change', bs.reload)
  
  bs.emitter.on("init", () => {
    store.dispatch(log.actions.add("server running"))
  })
}

store.dispatch(command.actions.run(process.argv[2]))

render(
  <Provider store={store}>
    <Zoetrope />
  </Provider>
)
