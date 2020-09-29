const querystring = require('querystring')
const fetch = require('node-fetch')

const constants = require('../config/vimeo.json')

const { VIMEO_TOKEN } = process.env

async function vimeoFetch (
  method = 'GET',
  endpoint = '',
  body = {},
  queryParams = {},
  extraConfig = {}) {
  endpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const queryParamsString = querystring.stringify(queryParams)
  const headers = {
    Authorization: `Bearer ${VIMEO_TOKEN}`, 'Content-Type': 'application/json'
  }

  const response = await fetch(`https://api.vimeo.com${endpoint}?${queryParamsString}`, {
    method,
    headers,
    body: method === 'GET' ? null : JSON.stringify(body)
  })

  if (!response.ok) {
    const { errors } = await response.json()
    throw errors
  }

  return response.json()
}

module.exports = {
  constants,
  fetch: vimeoFetch
}
