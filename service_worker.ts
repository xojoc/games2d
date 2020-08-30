// copyright: AGPLv3 or later

//// xojoc: see https://github.com/microsoft/TypeScript/issues/14877
export default null

// variable `filesToCache` will be added at the beginning of this file by files_to_cache.sh
let FILES_TO_CACHE

declare var self: ServiceWorkerGlobalScope

declare let filesToCache: { [key: string]: string[] }

let CacheName = "games2d"

self.addEventListener('install', (e) => {
    self.skipWaiting()

    let files: string[] = [];
    for (let key in filesToCache) {
        files = files.concat(filesToCache[key])
    }
    // remove duplicates
    files = files.filter(function(elem, index, self) {
        return index === self.indexOf(elem)
    })
    console.log(`[Service Worker] Installing`)
    e.waitUntil(
        caches.open(CacheName).then((cache) => {
            console.log(`[Service Worker] Caching all`)
            console.log(files)
            return cache.addAll(files)
        })
    )
})

self.addEventListener('fetch', (e) => {
    caches.open(CacheName).then((cache) => {
        return cache.match(e.request).then((r) => {
            console.log('[Service Worker] Fetching resource: ' + e.request.url)
            if (r) {
                console.log("Resource is cached")
                // Respond with cache, but send network request anyway to update resource
                e.respondWith(Promise.resolve(r))
                update(e.request)
            } else {
                e.respondWith(fetch(e.request))
                console.log("Resource not cached")
            }
        })
    })
})

function update(request: RequestInfo) {
    return caches.open(CacheName).then(function(cache) {
        return fetch(request).then(function(response) {
            if (response.status === 200) {
                cache.put(request, response)
            }
            return response
        })
    })
}
