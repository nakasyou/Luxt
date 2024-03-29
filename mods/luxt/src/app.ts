import { Hono } from "https://deno.land/x/hono@v3.3.4/mod.ts"
import * as jsx from "luxt/jsx.ts"
import { type LuxtConfig } from "./config.ts"

export interface Context {
  
}
export type RouterResponse = (
  Response |
  jsx.Node
)
export type Router = (ctx: Context) => RouterResponse | Promise<RouterResponse>

export const defineRoute = (router: Router) => router

export interface AppInit {
  config: LuxtConfig
}
function modulePathToPath (modulePath: string) {
  if (modulePath.slice(0,2) === "./") {
    modulePath = modulePath.replace("./", "")
  }
  modulePath = modulePath.replace(/route$/,"")
    .replace(/\/$/, "") // 最後の/を削除
    .replace(/\[.+?\]/g, str => {
      const dynamicPath = str.slice(1, -1)
      if (dynamicPath[0]+dynamicPath[1]+dynamicPath[2] === "...") {
        // 可変長のPath
        const dynamicName = dynamicPath.slice(3)
        return `:${dynamicName}{.*?}`
      } else {
        return `:${dynamicPath}`
      }
    })
  modulePath = "/" + modulePath
  return modulePath
}
export class App {
  init: AppInit
  honoApp: Hono
  constructor (init: AppInit) {
    this.init = init

    const app = new Hono()
    for (const [path, route] of Object.entries(this.init.config.imports)) {
      app.all(modulePathToPath(path), async ctx => {
        const routeResult = await route(ctx)
        if (routeResult instanceof Response) {
          return routeResult
        }
        return new Response(await jsx.renderToString(routeResult), {
          headers: {
            "content-type": "text/html"
          }
        })
      })
    }
    this.honoApp = app
  }
  async fetch (request: Request): Promise<Response> {
    return await this.honoApp.fetch(request)
  }
}
