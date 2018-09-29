/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from 'monaco-languageclient';
import normalizeUrl = require('normalize-url');
const ReconnectingWebSocket = require('reconnecting-websocket');

// 使用monaco-editor-core需要对语言进行注册
// 而monaco-editor不需要
// monaco.languages.register({
//     id: 'java',
//     extensions: ['.java', '.jav'],
//     aliases: ['Java', 'java'],
//     mimetypes: ['text/x-java-source', 'text/x-java']
// });

// create Monaco editor
const value = `package com.biz;

import com.biz.server.base.BaseTomcatRunner;

public class ServerTest extends BaseTomcatRunner {
    public ServerTest(int port, String contextPath) {
        super(port, contextPath);
    }

    /**
     *
     * @param args
     */
    public static void main(String[] args) {
        try {
            new ServerTest(8081, "src/main/webapp").start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

 }`;

const editor = monaco.editor.create(document.getElementById("container")!, {
    model: monaco.editor.createModel(value, 'java', monaco.Uri.parse(getUri('G:/jdsoft/extdirectspring/src/test/java/com/biz/ServerTest.java'))),
    glyphMargin: true,
    lightbulb: {
        enabled: true
    },
    language: "java"
});
// install Monaco language client services
const ms = MonacoServices.install(editor);

// create the web socket
const url = createUrl('/javaserver')
const webSocket = createWebSocket(url);

// listen when the web socket is opened
listen({
    webSocket,
    onConnection: connection => {
        // create and start the language client
        const languageClient = createLanguageClient(connection);
        const disposable = languageClient.start();
        // register commands
        ms.commands.registerCommand('java.show.references', function(...args: any[]) {
            console.log(args);
        })
        ms.commands.registerCommand('java.apply.workspaceEdit', function(...args: any[]) {
            applyWorkspaceEdit(args, languageClient)
        })
        connection.onClose(() => disposable.dispose());
    }
});

function createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
    return new MonacoLanguageClient({
        name: "Sample Language Client",
        clientOptions: {
            // use a language id as a document selector
            documentSelector: [
                { scheme: 'file', language: 'java' },
                { scheme: 'jdt', language: 'java' },
                { scheme: 'untitled', language: 'java' }
            ],
            synchronize: {
                configurationSection: 'java'
            },
            initializationOptions: {
                // project root directory
                workspaceFolders: [
                    getUri('G:/jdsoft/extdirectspring')
                ]
            },
            errorHandler: {
                error: () => ErrorAction.Continue,
                closed: () => CloseAction.DoNotRestart
            }
        },
        // create a language client connection from the JSON RPC connection on demand
        connectionProvider: {
            get: (errorHandler: any, closeHandler: any) => {
                return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
            }
        }
    });
}

function createUrl(path: string): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return normalizeUrl(`${protocol}://${location.host}${location.pathname}${path}`);
}

function createWebSocket(url: string): WebSocket {
    const socketOptions = {
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 10000,
        maxRetries: Infinity,
        debug: false
    };
    return new ReconnectingWebSocket(url, undefined, socketOptions);
}

function getUri(path: string): string {
    if (path && path !== "") {
        path = "file:///" + path.replace(/\\/g, "/");
    }
    return path;
}

function applyWorkspaceEdit(args: any[], languageclient: MonacoLanguageClient) {
    console.log(args);    
}