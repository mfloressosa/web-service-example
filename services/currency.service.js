// Importo librerías
var log4js = require("log4js");

// Importo funciones compartidas
var DummyPromise = require('../shared/promise.shared.js').DummyPromise;

// Importo servicio con funciones para MSSQL
var MSSql = require("../mssql/mssql.service").MSSql;

// Obtengo logger
var logger = log4js.getLogger('ServerScripts');

exports.CurrencyService = function(app) {

    app.get('/api/currency/get_currency/:currency_id', function(req, res, next) {

        // Escribo a log
        logger.info('Se recibió ' + req.method + ' para \'' + req.path + '\'');

        // Datos recibidos en el request
        var currencyId = req.params.currency_id;

        // Empiezo con promesa dummy para poder hacer throw y caer en el catch
        DummyPromise()
        .then(
            result => {
                // Valido que este todo lo necesario
                if (!currencyId) throw 'Missing currencyId input parameter';

                // Ejecuto consulta a base de datos
                return MSSql.GetCurrency(currencyId);
            }
        ).then(
            resultCurrency => {
                // Si alguno de los pasos anteriores ya envio respuesta, no sigo
                if (res.headersSent) return;

                // Envio respuesta con el resultado recibido del ultimo paso
                res.json({status: true, description: 'OK', data: resultCurrency});
            }
        ).catch(
            err => {
                // Obtengo mensajes de error
                var clientMsg = (typeof err === 'string' ? err : 'Cannot process request');
                var errorMsg = (typeof err === 'string' ? err : err.message || err.description || 'Error al ejecutar solicitud');

                // Escribo el error en el log
                logger.error('Error al procesar \'' + req.path + '\': ' + errorMsg);

                // Si alguno de los pasos anteriores ya envio respuesta, no sigo
                if (res.headersSent) return;
                // Devuelvo respuesta con el mensaje obtenido
                res.json({status: false, description: clientMsg, error: errorMsg});
            }
        );
    });
}
