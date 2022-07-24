import React from "react"
import Api from "./api"

export const AppContext = React.createContext<{
    api: Api
}>({ api: undefined })