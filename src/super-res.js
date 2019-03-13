import { assignOptions } from './utils'
import ResourceAction from './resource-action'
import request from './request'

const superRes = {}

function generateDefaultActions (resource, url, defaultParams, commonOptions, enforceFixMethod) {
  let action

  bind2actions('get', 'query', 'GET')

  if (!resource.post) {
    action = new ResourceAction(url, defaultParams, assignOptions(commonOptions, { method: 'POST' }))
    resource.post = action.makeRequest.bind(action)
  } else if (enforceFixMethod) {
    resource.post.config.method = 'POST'
  }

  bind2actions('put', 'save', 'PUT')
  bind2actions('remove', 'delete', 'DELETE')

  function bind2actions (act1, act2, method) {
    if (resource[act1] || resource[act2]) {
      if (resource[act1]) {
        if (!resource[act2] || enforceFixMethod) {
          resource[act2] = resource[act1]
        }
      } else {
        resource[act1] = resource[act2]
      }
      if (enforceFixMethod) {
        resource[act1].config.method = method
      }
    } else {
      action = new ResourceAction(url, defaultParams, assignOptions(commonOptions, { method }))
      resource[act1] = action.makeRequest.bind(action)
      resource[act2] = resource[act1]
    }
  }

  return resource
}

/**
 * Generate a resource instance
 * @param {String} url
 * @param {Object} defaultParams Default query parameters
 * @param {Object} actions Custom actions
 * @param {Object} commonOptions Default options of this resource
 * @param {Boolean} enforceFixMethod Whether to correct the method of reserved-word actions with default one,
 *  and force combine equivalent actions
 * @returns {Object} Resource instance
 */
function resource (url, defaultParams, actions, commonOptions, enforceFixMethod = true) {
  const resource = {}
  if (actions) {
    Object.getOwnPropertyNames(actions).forEach(name => {
      let params = defaultParams
      const actionParams = actions[name].params
      if (actionParams && typeof actionParams === 'object') {
        params = assignOptions(defaultParams, actionParams)
        delete actions[name].params
      }
      const opts = assignOptions(commonOptions, actions[name])
      if (commonOptions && commonOptions.cache && actions[name].cache === true) {
        opts.cache = commonOptions.cache
      }
      const action = new ResourceAction(url, params, opts)
      resource[name] = action.makeRequest.bind(action)
      resource[name].config = action.config
    })
  }

  generateDefaultActions(resource, url, defaultParams, commonOptions, enforceFixMethod)

  Object.getOwnPropertyNames(resource).forEach(name => {
    delete resource[name].config
  })

  return resource
}

Object.defineProperties(superRes, {
  resource: {
    value: resource
  },
  request: {
    value: request
  },
  config: {
    value: request.config
  }
})

export default superRes
