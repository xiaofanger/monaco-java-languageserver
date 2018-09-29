/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as ws from "ws";
import * as http from "http";
import * as url from "url";
import * as net from "net";
import * as express from "express";
import * as rpc from "vscode-ws-jsonrpc";
import { launch } from "./json-server-launcher";

process.on('uncaughtException', function (err: any) {
    console.error('Uncaught Exception: ', err.toString());
    if (err.stack) {
        console.error(err.stack);
    }
});

// create the express application
const app = express();
// server the static content, i.e. index.html
app.use(express.static(__dirname));
// start the server
const server = app.listen(3000);
// create the web socket
const wss = new ws.Server({
    host: 'localhost',
    port: 3001,
    noServer: true,
    perMessageDeflate: false
});

console.log("the node server is starting...");
server.on('upgrade', (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    const pathname = request.url ? url.parse(request.url).pathname : undefined;
    if (pathname === '/javaserver') {
        lookport(1044, function(result: boolean, port: number) {
            wss.handleUpgrade(request, socket, head, webSocket => {
                const socket: rpc.IWebSocket = {
                    send: content => webSocket.send(content, error => {
                        if (error) {
                            throw error;
                        }
                    }),
                    onMessage: cb => webSocket.on('message', cb),
                    onError: cb => webSocket.on('error', cb),
                    onClose: cb => webSocket.on('close', cb),
                    dispose: () => webSocket.close()
                };
                // launch the server when the web socket is opened
                if (webSocket.readyState === webSocket.OPEN) {
                    if (!result) {
                        console.info('launch the server , the web socket is opened')
                        launch(socket);
                    } else {
                        console.info('检测到服务端口'+ port +'存在，服务已在运行中，无需再次启动');
                    }
                } else {
                    webSocket.on('open', () => launch(socket));
                }
            });
        });
    }
})

function lookport(port: number, callback: any) {
    var cmd = process.platform == 'win32' ? 'netstat' : 'ps aux';
    cmd = cmd + " -aon|findstr \"" + port + "\""
    var exec = require('child_process').exec;
    var qqname = 'tcp';
    exec(cmd, function (err: any, stdout: any, stderr: any) {
        let result = false;
        if (err) {
            // console.log(err.stack);
        }
        stdout.split('\n').filter(function (line: string) {
            if (line.length > 12) {
                var p = line.trim().split(/\s+/), pname = p[0], pid = p[1];
                var rport = parseInt(pid.substring(pid.indexOf(":") + 1));
                if (pname.toLowerCase().indexOf(qqname) >= 0 && rport == port) {
                    console.log(pname, rport);
                    result = true;
                }
            }
        });
        callback(result, port)
    })
}