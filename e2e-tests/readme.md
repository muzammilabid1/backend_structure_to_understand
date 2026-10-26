## Cypress Tests
Make a copy of `cypress.env.sample.json` to `cypress.env.json` and add your necessary environment details before running any of the below commands.

## To run e2e test

`yarn e2e-test`

## To add new test files
Add the test file ending with *_spec.js inside cypress/integration folder. For example: 
`login/login_spec.js`

These files will be automatically picked up by cypress.

## Other Cypress Helper commands

To check cypress info.

`yarn run cypress info`

To run cypress interactively (in local development). This command will open a window to interactively run each tests

`yarn cypress:open`

To run cypress in headless mode.

`yarn cypress:run --headless`

To run particular spec file

`yarn cypress:run --spec <path_to_spec_file>`

To run cypress on specific browser.

`yarn cypress:run --browser chrome`

To export the report in a specific format.

`yarn cypress:run --reporter json`

`yarn cypress:run --reporter junit --reporter-options mochaFile=result.xml,toConsole=true`


For more info and learning, refer [Cypress Docs](https://docs.cypress.io/guides/guides/command-line.html#Installation).
