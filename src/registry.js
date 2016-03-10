/**
 * @overview HTTP interface to the npm registry.
 * @module lib/registry
 * @license MIT
 * @author Alexander Gugel <alexander.gugel@gmail.com>
 */

'use strict'

import { Observable } from 'rx'
import semver from 'semver'
import { httpGetJSON } from './util'
import url from 'url'

/**
 * The default npm registry to be used for resolving packages.
 * @type {String}
 * @default
 */
export const DEFAULT_NPM_REGISTRY = 'http://registry.npmjs.org/'

/**
 * Map of package root documents as retrieved from the registry. References to
 * objects representing the HTTP responses are being cached. This enables us
 * to check if a installation path is circular without deep comparing the
 * equality of package.json files.
 * @type {Map}
 */
export const httpGetPackageRootCache = new Map()

/**
 * Fetches the CommonJS package root JSON document for a specific npm package.
 * @param  {String} name The name of a specific package.
 * @param  {String} registryRootUrl Root URL of the CommonJS registry to be used.
 * @return {Object} An observable sequence of the specific JSON
 * document representing the package root.
 */
export const httpGetPackageRoot = (name, registryRootUrl) => {
  const url = registryRootUrl + name
  if (!httpGetPackageRootCache.has(url)) {
    httpGetPackageRootCache.set(url, httpGetJSON(url).shareReplay())
  }
  return httpGetPackageRootCache.get(url)
}

/**
 * Resolves a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param  {String} name The name of the package to be resolved.
 * @param  {String} version The semantic version string to be used as a target.
 * @param  {String} [registryRootUrl='http://registry.npmjs.org/'] The URL of
 * the registry to be used as an endpoint.
 * @return {Object} An observable sequence of the specific `package.json` file.
 */
export const resolveFromRegistry = (name, version, registryRootUrl) =>
  httpGetPackageRoot(name, registryRootUrl || DEFAULT_NPM_REGISTRY).map((packageRoot) => {
    const availableVersions = Object.keys(packageRoot.versions)
    const targetVersion = semver.maxSatisfying(availableVersions, version)
    const target = packageRoot.versions[targetVersion]
    if (!target) throw new Error(`no version of ${name} that satisfies ${version}`)
    return target
  })

export const resolve = (o) => o.selectMany(([name, version]) => {
  const { protocol } = url.parse(version)
  switch (protocol) {
    case null:
      return resolveFromRegistry(name, version)
    case 'http:':
    case 'https:':
    default:
      throw new Error(`unsupported protocol ${protocol} for ${name} ${version}`)
  }
})

export const fetchInto = (url) => Observable.return({})
