import request from './request'
import { assignOptions, parseUrl } from './utils'

const actionDefaults = {
  method: 'GET',
  transformRequest: []
}

function moveDataToParam (data) {
  if (data) {
    this.query(data)
  }
  return null
}

export default class ResourceAction {
  constructor (url, defaultParams, actionConf) {
    this.config = assignOptions({ url }, actionDefaults, actionConf)

    if (this.config.method === 'GET') {
      this.config.transformRequest.push(moveDataToParam)
    } else if ((this.config.method === 'POST' ||
      this.config.method === 'PUT' ||
      this.config.method === 'PATCH')) {
      this.hasData = true
    }

    this.defaultParams = defaultParams
    this.paramPreprocessors = this.config.paramPreprocessors || {}

    this.extraParams = {}
    for (const i in defaultParams) {
      if (Object.prototype.hasOwnProperty.call(defaultParams, i)) {
        const param = defaultParams[i]
        if (typeof param === 'function') {
          this.extraParams[i] = (params, data) => {
            const paramsWithWarning = {}
            Object.assign(paramsWithWarning, params)
            Object.defineProperty(paramsWithWarning, i, {
              get () {
                console.warn(`
                  super-res2 Warning: parameter: ${i}; url: ${url}
                  This is a default parameter generator. It will be overrided by explicitly assigned parameter.
                `)
                return params[i]
              },
              enumerable: true
            })
            return param(paramsWithWarning, data)
          }
        } else if (typeof param === 'string' && param[0] === '@') {
          this.extraParams[i] = param.slice(1)
        } else {
          continue
        }
        delete this.defaultParams[i]
      }
    }
  }

  buildRequest (params, data) {
    const { url, query } = parseUrl(this.config.url, params)

    const currentRequest = request(this.config.method, url, this.config)

    if (query) {
      currentRequest.query(query)
    }

    if (data) {
      currentRequest.send(data)
    }

    return currentRequest
  }
  async makeRequest (params, data) {
    if (arguments.length === 1 && this.hasData) {
      data = params
      params = undefined
    }

    Object.freeze(params)
    Object.freeze(data)
    const extraP = {}
    for (const i in this.extraParams) {
      if (Object.prototype.hasOwnProperty.call(this.extraParams, i)) {
        const p = this.extraParams[i]
        let result
        if (typeof p === 'function') {
          try {
            result = await p(params, data)
          } catch (e) {
            console.error(`super-res2 Error while generating default parameters: parameter: "${i}"; url: "${this.config.url}"`)
            throw e
          }
        } else if (data) {
          result = data[p]
        }
        if (result !== undefined) {
          extraP[i] = result
        }
      }
    }

    const fullParams = assignOptions(this.defaultParams, extraP, params)

    for (const i in this.paramPreprocessors) {
      if (Object.prototype.hasOwnProperty.call(this.paramPreprocessors, i) &&
      Object.prototype.hasOwnProperty.call(fullParams, i)) {
        try {
          fullParams[i] = await this.paramPreprocessors[i](fullParams[i])
        } catch (e) {
          console.error(`super-res2 Error while preprocessing parameters: parameter: "${i}"; url: "${this.config.url}"`)
          throw e
        }
      }
    }

    return this.buildRequest(fullParams, data).then(res => res ? res.body : res)
  }
}
