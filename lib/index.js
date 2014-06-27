// Load modules

var Path = require('path');
var Ws = require('ws');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Handlebars = require('handlebars');


// Declare internals

var internals = {};


internals.dashboard = function (request, reply) {

    var context = {
        uri: 'ws://' + request.info.host.split(':')[0] + ':8001'
    };

    if (request.query.hasOwnProperty('host')) {
        context.isHost = 'true';
    }

    return reply.view('index', context);
};


internals.start = function () {

    var server = new Hapi.Server(8000);

    server.views({
        engines: {
            html: Handlebars
        },
        path: Path.join(__dirname, '../templates')
    });

    server.route({ method: 'GET', path: '/', handler: internals.dashboard });
    server.route({ method: 'GET', path: '/{p*}', handler: { directory: { path: Path.join(__dirname, '../static') } } });

    server.start(function (err) {

        Hoek.assert(!err);

        var dashboards = [];
        var ws = new Ws.Server({ host: server.info.host, port: 8001 });
        ws.on('connection', function (socket) {

            socket.on('message', function (message) {

                var payload = JSON.parse(message);
                if (payload.type === 'hello') {
                    dashboards.push(socket);
                }
                else {
                    var active = []
                    for (var i = 0, il = dashboards.length; i < il; ++i) {
                        if (internals.send(dashboards[i], payload)) {
                            active.push(dashboards[i]);
                        }
                    }

                    dashboards = active;
                }
            });

            internals.send(socket, { type: 'intro' });
        });

        console.log(server.info.uri);
    });
};


internals.send = function (socket, payload) {

    if (socket &&
        socket.readyState === Ws.OPEN) {

        socket.send(JSON.stringify(payload));
        return true;
    }

    return false;
};


internals.start();
