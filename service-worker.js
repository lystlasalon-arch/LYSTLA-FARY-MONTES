
/* =========================================
   MAKEOVER SALON LYSTLA
   SERVICE WORKER
   BY FARY MONTES
========================================= */


/* =========================================
   01. CONFIGURACIÓN DE CACHÉ
========================================= */

const CACHE_NAME = 'lystla-cache-v1';


/* =========================================
   02. ARCHIVOS PRINCIPALES
========================================= */

const ARCHIVOS_PRINCIPALES = [

    './',

    './index.html',

    './manifest.webmanifest',

    './images/portada-lystla.png',

    './images/icon-192.png',

    './images/icon-512.png'

];


/* =========================================
   03. INSTALACIÓN
========================================= */

self.addEventListener('install', (event) => {

    event.waitUntil(

        (async () => {

            const cache = await caches.open(
                CACHE_NAME
            );

            // Guardar los archivos disponibles.
            // Los iconos pendientes no bloquearán
            // la instalación del Service Worker.

            await Promise.allSettled(

                ARCHIVOS_PRINCIPALES.map((archivo) => {

                    return cache.add(archivo);

                })

            );

            await self.skipWaiting();

        })()

    );

});


/* =========================================
   04. ACTIVACIÓN
========================================= */

self.addEventListener('activate', (event) => {

    event.waitUntil(

        (async () => {

            const nombres = await caches.keys();

            await Promise.all(

                nombres

                    .filter((nombre) => {

                        return (
                            nombre.startsWith('lystla-cache-') &&
                            nombre !== CACHE_NAME
                        );

                    })

                    .map((nombre) => {

                        return caches.delete(nombre);

                    })

            );

            await self.clients.claim();

        })()

    );

});


/* =========================================
   05. NAVEGACIÓN Y ARCHIVOS
========================================= */

self.addEventListener('fetch', (event) => {

    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);


    /* =========================================
       05.1 NO INTERCEPTAR SERVICIOS EXTERNOS
    ========================================= */

    if (url.origin !== self.location.origin) {
        return;
    }


    /* =========================================
       05.2 NO GUARDAR ADMINISTRADOR
            NI DATOS PRIVADOS
    ========================================= */

    if (
        url.pathname.endsWith('/admin.html') ||
        url.pathname.includes('/auth/') ||
        url.pathname.includes('/rest/v1/') ||
        url.pathname.includes('/storage/v1/')
    ) {

        return;

    }


    /* =========================================
       05.3 NAVEGACIÓN
       PRIMERO RED, DESPUÉS CACHÉ
    ========================================= */

    if (request.mode === 'navigate') {

        event.respondWith(

            (async () => {

                try {

                    return await fetch(request);

                } catch (error) {

                    const cache = await caches.open(
                        CACHE_NAME
                    );

                    const respuesta = await cache.match(
                        request
                    );

                    if (respuesta) {
                        return respuesta;
                    }

                    const inicio = await cache.match(
                        './index.html'
                    );

                    if (inicio) {
                        return inicio;
                    }

                    return Response.error();

                }

            })()

        );

        return;

    }


    /* =========================================
       05.4 ARCHIVOS ESTÁTICOS
       PRIMERO CACHÉ, DESPUÉS RED
    ========================================= */

    event.respondWith(

        (async () => {

            const cache = await caches.open(
                CACHE_NAME
            );

            const respuestaGuardada = await cache.match(
                request
            );

            if (respuestaGuardada) {

                return respuestaGuardada;

            }

            const respuestaRed = await fetch(
                request
            );

            // Guardar únicamente archivos estáticos
            // conocidos del sitio público.

            const extensionPermitida = /\.(css|js|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i.test(
                url.pathname
            );

            if (
                respuestaRed.ok &&
                extensionPermitida &&
                respuestaRed.type === 'basic'
            ) {

                await cache.put(
                    request,
                    respuestaRed.clone()
                );

            }

            return respuestaRed;

        })()

    );

});
