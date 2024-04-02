// Importo librerías
const http = require('http');
const https = require("https");
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const log4js = require("log4js");
const moment = require('moment');

// Importo configuraciones
const LOGGER_CONFIG = require("./config/logger.config").LOGGER_CONFIG;
const HTTP_BINDING_HOST = require("./config/server.config").HTTP_BINDING_HOST;
const HTTP_BINDING_PORT = require("./config/server.config").HTTP_BINDING_PORT;
const REQUEST_SIZE_LIMIT = require("./config/server.config").REQUEST_SIZE_LIMIT;
const HTTPS_BINDING_HOST = require("./config/server.config").HTTPS_BINDING_HOST;
const HTTPS_BINDING_PORT = require("./config/server.config").HTTPS_BINDING_PORT;
const HTTPS_DEFAULT_KEY = require("./config/server.config").HTTPS_DEFAULT_KEY;
const HTTPS_DEFAULT_CERT = require("./config/server.config").HTTPS_DEFAULT_CERT;
const HTTPS_CIPHERS = require("./config/server.config").HTTPS_CIPHERS;

// Importo funciones compartidas
const DummyPromise = require('./shared/promise.shared.js').DummyPromise;

// Importo funcioón de inicialización para conexión a SQL
const MsSqlInit = require('./mssql/mssql.init.js').MsSqlInit;

// Importo funcioón de inicialización para servicios
const ServicesInit = require('./services/services.init.js').ServicesInit;

// Obtengo aplicacion de Exress
let app = express();

// Referencia al server HTTP
let httpServer;
// Referencia al server HTTPS
let httpsServer;

// Función par inicializar el server
function InitServer() {

    // Obtengo la ruta para la carpeta de logs
    let logsPath = path.resolve(__dirname, 'logs');

    // Si no existe la creo
    if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath);

    // Incremento la cantidad de listeners para evitar que el logger tire warning al inicializar
    global.process.setMaxListeners(20);

    // Inicializo los logs
    log4js.configure(LOGGER_CONFIG);

    // Obtengo logger
    let logger = log4js.getLogger('ServerScripts');

    // Anuncio servicio inicializandose
    logger.info('********************************************************');
    logger.info('* Inicializando servicio                               *');
    logger.info('********************************************************');

    // Inicializo los middleware para manejo de los request
    app.use(log4js.connectLogger(log4js.getLogger('AccessLog'), { level: 'auto' }));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json({ limit: REQUEST_SIZE_LIMIT }));
    app.use(bodyParser.text({ limit: REQUEST_SIZE_LIMIT }));
    app.use(bodyParser.raw({ limit: REQUEST_SIZE_LIMIT }));
    app.use(cookieParser());
    app.use(compression());

    // Verifico si hubo error de parseo y lo capturo
    app.use(function(err, req, res, next) {
        // Error de parseo en el body tipo JSON
        if (err && err instanceof SyntaxError && err.status >= 400 && err.status < 500 && err.message.indexOf('JSON')) {
            // Logueo error
            logger.warn('No se pudo parsear contenido JSON de request ' + req.method + ' para \'' + req.path + '\'');
            // Devuelvo un not found
            res.status(400).json({status: false, description: 'Invalid JSON', error: 'Invalid JSON'});
        // Error por tamaño del request
        } else if (err && err.type === 'entity.too.large') {
            // Logueo error
            logger.warn('El contenido del request ' + req.method + ' para \'' + req.path + '\' supera el tamaño máximo permitido (' + REQUEST_SIZE_LIMIT + ')');
            // Devuelvo un not found
            res.status(400).json({status: false, description: 'Request size limit reached (' + REQUEST_SIZE_LIMIT + ')', error: 'Request size limit reached (' + REQUEST_SIZE_LIMIT + ')'});
        // Error de parseo genérico
        } else if (err) {
            // Logueo error
            logger.warn('No se pudo parsear contenido de request ' + req.method + ' para \'' + req.path + '\'');
            // Devuelvo un not found
            res.status(400).json({status: false, description: 'Invalid request', error: 'Invalid request'});
        }
    });

    // Para recibir los datos de la solicitud original en caso de estar atras de un proxy
    app.set('trust proxy', true);

    // Verifico si el dominio llego con www (para no tener que definir los dos dominios)
    app.use(function(req, res, next) {
        // Si me llega una solicitud con www, lo redirijo
        if (req.headers.host && req.headers.host.slice(0, 4) === 'www.') {
            let newHost = req.headers.host.slice(4);
            return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
        }
        // En cualquier otro caso sigo ejecutando
        next();
    });

    // Deshabilito el header Etag para evitar cache web en los request (el contenido static lo sigue usando)
    app.disable('etag');

    // Hago inicialización de servicios para APIs
    ServicesInit(app);

    // Si la solicitud no cayo en ningun servicio, devuelvo not found
    app.get('/*', function(req, res, next) {
        // Devuelvo un not found
        res.status(404).type('txt').send('Page not found');
    });

    // Configuraciones de moment para evitar que tire warnings al validar fechas
    moment.suppressDeprecationWarnings = true;

    // Inicio cadena de promesas
    return DummyPromise().then(
        result => {
            // Inicializo conexion a base de datos SQL Server
            return MsSqlInit(app);
        }
    ).then(
        result => {
            // Inicializo servicio HTTP
            return new Promise((resolve, reject) => {

                // Escribo a log
                logger.info('Iniciando servicio HTTP');
                // Logueo a consola
                console.log('Iniciando servicio HTTP');

                // Creo y obtengo el servidor HTTP
                httpServer = http.createServer(app);

                // Levanto servicio HTTP en el puerto configurado
                httpServer.listen(HTTP_BINDING_PORT, HTTP_BINDING_HOST)
                .on('listening', () => {
                    // Escribo a log
                    logger.info('Servicio HTTP escuchando en ' + httpServer.address().address + ':' + HTTP_BINDING_PORT.toString());
                    // Logueo a consola
                    console.log('Servicio HTTP escuchando en ' + httpServer.address().address + ':' + HTTP_BINDING_PORT.toString());
                    // Resuelvo promesa
                    resolve(true);
                });
            });
        }

    ).then(
        result => {
            // Inicializo servicio HTTPS
            return new Promise((resolve, reject) => {

                // Escribo a log
                logger.info('Iniciando servicio HTTPS');
                // Logueo a consola
                console.log('Iniciando servicio HTTPS');

                // Creo y obtengo el servidor HTTPS
                httpsServer = https.createServer({
                    //SNICallback: cert_shared_1.SNICallback,
                    key: fs.readFileSync(HTTPS_DEFAULT_KEY),
                    cert: fs.readFileSync(HTTPS_DEFAULT_CERT),
                    ciphers: HTTPS_CIPHERS,
                }, app);

                // Seteo timeous altos para evitar problema ECONNRESET / 502 Bad gateway con ELB de Amazon
                httpsServer.keepAliveTimeout = (60 * 1000) + 1000;
                httpsServer.headersTimeout = (60 * 1000) + 2000;

                // Levanto servicio HTTP en el puerto configurado
                httpsServer.listen(HTTPS_BINDING_PORT, HTTPS_BINDING_HOST)
                .on('listening', () => {
                    // Escribo a log
                    logger.info('Servicio HTTPS escuchando en ' + httpsServer.address().address + ':' + HTTPS_BINDING_PORT.toString());
                    // Logueo a consola
                    console.log('Servicio HTTPS escuchando en ' + httpsServer.address().address + ':' + HTTPS_BINDING_PORT.toString());
                    // Resuelvo promesa
                    resolve(true);
                });
            });
        }
    ).then(
        result => {
            // Escribo a log
            logger.info('Servicio inicializado correctamente');
            // Logueo a consola
            console.log('Servicio inicializado correctamente');
        }
    ).catch(
        err => {
            // Obtengo mensaje de error
            let errorMsg = (typeof err === 'string' ? err : err.message || err.description || '');

            // Escribo a log
            logger.error('Error al inicializar el servicio: ' + errorMsg);
            // Logueo a consola
            console.error('Error al inicializar el servicio: ' + errorMsg);
        }
    );
}

// Llamo a función de inicialización
InitServer();
