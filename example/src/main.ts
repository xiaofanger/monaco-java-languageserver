/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */ 
 require('monaco-editor');
 (self as any).MonacoEnvironment = {
    // getWorkerUrl: () => './editor.worker.bundle.js'
    getWorkerUrl: function (moduleId: any, label: any) {
        if (label === 'json') {
          return './json.worker.bundle.js';
        }
        if (label === 'css') {
          return './css.worker.bundle.js';
        }
        if (label === 'html') {
          return './html.worker.bundle.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return './ts.worker.bundle.js';
        }
        return './editor.worker.bundle.js';
      }
}
console.log('this is main.');
require('./client');
