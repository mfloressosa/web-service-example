const path = require("path");
const stackTrace = require("stack-trace");

// Obtiene el PID asociado al log
let getLogPid = function () {
    // Obtengo pid
    let pid = process.pid.toString();
    // Devuevlo con formato y largo fijo
    return (pid + '     ').substring(0, 5);
};

// Obtiene y arma el dato de nivel de log
let getLogLevel = function (loggingEvent) {
    // Largo del resultado a devolver
    let resultLength = 5;
    // Obtengo nivel de log
    let level = loggingEvent.level.toString();
    // Devuevlo con formato y largo fijo
    return '[' + (level + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Obtiene y arma el dato de categoría de log
let getLogCategory = function(loggingEvent) {
    // Largo del resultado a devolver
    let resultLength = 20;
    // Obtengo categoría de log
    let category = loggingEvent.categoryName.toString() + '.log';
    // Devuevlo con formato y largo fijo
    return '[' + (category + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Obtiene y arma el contexto asiciado al log
let getLogContext = function(loggingEvent) {
    // Largo del resultado a devolver
    let resultLength = 30;
    // Obtengo el trace de la ejecucion actual
    let trace = stackTrace.get();
    // Verifico que tengo al menos la cantidad esperada de llamados
    if (trace.length <= 15) return '[Unknown context               ]';
    // Obtengo el nodo correspondiente a la funcion que llamo al logger
    let caller = trace[15];
    // Obtengo el file path del archivo donde se esta ejecutando
    let filePath = caller.getFileName();
    // Verifico que tengo al menos la cantidad esperada de llamados
    if (!filePath) return '[Unknown context               ]';
    // Obtengo las variables del contexto
    let fileName = path.basename(filePath) || '';
    let lineNumber = caller.getLineNumber().toString() || '';
    // Armo y acomodo el contexto para que tenga siempre el mismo largo
    let context = (fileName + ':' + lineNumber);
    context = ( context.length > resultLength ? '...' + context.slice(-1 * (resultLength - ('...').length)) : context );
    // Devuelvo el texto completo juntando todo
    return '[' + (context + Array(resultLength + 1).join(' ')).substring(0, resultLength) + ']';
};

// Devuelve un file appender en base a un nombre de archivo
let GetFileAppender = function(logName, showContext, showCategory) {
    return {
        type: 'file',
        filename: path.resolve(__dirname, '..', 'logs', logName + '.log'),
        maxLogSize: 20 * 1000 * 1024,
        backups: 5,
        category: logName,
        layout: {
            type: 'pattern',
            pattern: (showCategory ? '%x{category} ' : '') + '%x{level} %d{yyyy-MM-dd hh:mm:ss.SSS} %x{pid} ' + (showContext ? '%x{context} ' : '') + '%m',
            tokens: {
                pid: getLogPid,
                level: getLogLevel,
                category: getLogCategory,
                context: getLogContext
            }
        }
    };
};

// Devuelve un console appender en base a un nombre de archivo
let GetConsoleAppender = function (logName, showContext, showCategory) {
    return ({
        type: 'console',
        category: logName,
        layout: {
            type: 'pattern',
            pattern: (showCategory ? '%x{category} ' : '') + '%x{level} %d{yyyy-MM-dd hh:mm:ss.SSS} %x{pid} ' + (showContext ? '%x{context} ' : '') + '%m',
            tokens: {
                pid: getLogPid,
                level: getLogLevel,
                category: getLogCategory,
                context: getLogContext
            }
        }
    });
};

// Devuelve un file appender en base a un nombre de archivo
let GetLogLevelAppender = function (level, appender) {
    return ({
        type: 'logLevelFilter',
        level: level,
        appender: appender,
    });
};

// Devuelve una categoría en base a un appender y el nivel mínimo a loguear
let GetCategory = function (appender, level, sendToErrorLog) {
    return ({
        appenders: [
            appender
        ].concat((sendToErrorLog ? ['ErrorFilter'] : [])),
        level: level,
    });
};

// Configuracion de los loggers a utilizar
exports.LOGGER_CONFIG = {
    appenders: {
        'Console': GetConsoleAppender('Console', true, false),
        'Error': GetFileAppender('Error', true, true),
        'ErrorFilter': GetLogLevelAppender('ERROR', 'Error'),
        'AccessLog': GetFileAppender('AccessLog', false, false),
        'ServerScripts': GetFileAppender('ServerScripts', true, false),
    },
    categories: {
        'default': GetCategory('ServerScripts', 'DEBUG', true),
        'Console': GetCategory('Console', 'DEBUG', true),
        'Error': GetCategory('Error', 'DEBUG', true),
        'AccessLog': GetCategory('AccessLog', 'DEBUG', false),
        'ServerScripts': GetCategory('ServerScripts', 'DEBUG', true),
    },
    pm2: true,
    disableClustering: true,
};
