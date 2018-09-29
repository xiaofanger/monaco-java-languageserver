/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import * as os from 'os';
// import * as glob from 'glob';
const glob = require('glob');
import * as rpc from "vscode-ws-jsonrpc";
import * as server from "vscode-ws-jsonrpc/lib/server";
import * as lsp from "vscode-languageserver";

export function launch(socket: rpc.IWebSocket) {
    const reader = new rpc.WebSocketMessageReader(socket);
    const writer = new rpc.WebSocketMessageWriter(socket);
    // start the language server as an external process
    console.log('Launch Java language service from an external process.');
    // const extJsonServerPath = path.resolve(__dirname, 'ext-json-server.js');
    // const serverConnection = server.createServerProcess('JSON', 'node', [extJsonServerPath]);
    const socketConnection = server.createConnection(reader, writer, () => socket.dispose());
    const workpath = getTempWorkspace()
    const serverConnection = server.createServerProcess('JAVA', 'java', prepareParams(workpath));
    server.forward(socketConnection, serverConnection, message => {
        if (rpc.isRequestMessage(message)) {
            // console.log('请求消息: ' + message.method);
            if (message.method === lsp.InitializeRequest.type.method) {
                const initializeParams = message.params as lsp.InitializeParams;
                initializeParams.processId = process.pid;
            }
        }
        // if (rpc.isResponseMessage(message)) {
        //     console.log('响应消息: ');
        //     console.log(message.result)
        // }
        // if (rpc.isNotificationMessage(message)) {
        //     console.log('通知消息: ');
        //     console.log(message.method);
        // }
        return message;
    });

}

/**
 * 准备Java Language Server的启动参数
 * @param workpath java项目的根目录
 */
function prepareParams(workpath: string): string[] {
    let params: string[] = [];
    params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1044,quiet=y');
    // jdk9
    // if (requirements.java_version > 8) {
    // 	params.push('--add-modules=ALL-SYSTEM',
    // 				'--add-opens',
    // 				'java.base/java.util=ALL-UNNAMED',
    // 				'--add-opens',
    // 				'java.base/java.lang=ALL-UNNAMED');
    // }
    params.push('-Declipse.application=org.eclipse.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.eclipse.jdt.ls.core.product');
    params.push('-Dlog.level=ALL');
    params.push('-noverify',
        '-Xmx1G',
        '-XX:+UseG1GC',
        '-XX:+UseStringDeduplication');
    // let vmargs = javaConfiguration.get('jdt.ls.vmargs', '');
    // parseVMargs(params, vmargs);
    let server_home: string = path.resolve(__dirname, '../server');
    let launchersFound: Array<string> = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', { cwd: server_home });
    if (launchersFound.length) {
        params.push('-jar'); params.push(path.resolve(server_home, launchersFound[0]));
    } else {
        return [];
    }
    //select configuration directory according to OS
    let configDir = 'config_win';
    if (process.platform === 'darwin') {
        configDir = 'config_mac';
    } else if (process.platform === 'linux') {
        configDir = 'config_linux';
    }
    params.push('-configuration'); params.push(path.resolve(__dirname, '../server', configDir));
    // TODO: 
    params.push('-data'); params.push(path.resolve(workpath));
    return params;
}

function getTempWorkspace() {
    return path.resolve(os.tmpdir(), 'vscodesws_' + makeRandomHexString(5));
}

function makeRandomHexString(length: number) {
    let chars = ['0', '1', '2', '3', '4', '5', '6', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    let result = '';
    for (let i = 0; i < length; i++) {
        let idx = Math.floor(chars.length * Math.random());
        result += chars[idx];
    }
    return result;
}