/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

const fs = require('fs');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on) => {
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
    on('task', {
        readStream(filePath) {
            return fs.createReadStream(filePath);
        },
        readDir(dirPath) {
            return new Promise((resolve, reject) => {
                fs.readdir(dirPath, (err, files) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(files);
                });
            });
        },
        deleteFile(filePath) {
            return new Promise((resolve, reject) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    resolve(null);
                });
            });
        }
    });
};
