# Quick start

```bash
git submodule update --init --recursive

apt-get install docker
make init

make graphql-dev-start
make frontend-dev-start
# make all-dev-start

make bash # If you want to execute any other command inside the container using node/yarn/...
```

# Repository structure

-   `frontend`: NextJS React frontend (Javascript)
-   `graphql-provider`: NestJS Express backend - serving GraphQL API and running cron tasks (Typescript)
-   `e2e-tests`: Cypress test framwork for regression tests
-   `release`: Scripts for server deployments on AWS & Vercel (dev, staging and production).
-   `seed-data`: Sub-repository with data to initialise the database and filestore.
-   `data_migration`: Deprecated - scripts for migrating data from original Maths with Parents site to Laerning with Parents.

# Local development

## Initial setup

1.  Install Docker

1.  Create a local .env file in the repo root with the settings for local development. (NB: This file is ignored by git, so can stay in your local repository root.) `
cp .env.sample .env`

1.  Pull the submodule for seed data: `git submodule update --init --recursive`
    You need only do this this way once. Beyond that first time, just `git pull --recurse-submodules` or `git submodule update --recursive` ought to be enough.

## Running the frontend only

Set the backend to be the latest dev backend. Amend the relevant lines in your `.env` file with the http version.

```bash
NEXT_PUBLIC_GRAPHQL_END_POINT=http://explore.dev.learningwithparents.com/graphql
```

Then you can run the frontend in dev mode using `make frontend-dev-start`.

This loads the frontend at `http://localhost:3000`

## Running the full stack

The first time that you run the backend, you should run `make db-prepare` to run migrations and bring your database up to the right state.

Simply run `make graphql-dev-start` and `make frontend-dev-start` to run both apps in dev mode. This will start the file server, the database, and the frontend and backend instances locally. This loads the site at `http://localhost:3000`.

## Running tests

Run `yarn test` to run the end-to-end Cypress tests.

Run `make playwright` (or `make playwright-ui` if you prefer the UI) to run the end-to-end Playwright tests.

(More detail to be added here on GraphQL testing and basic vs extended tests.)

# Branches and gates

-   `master`: Only ever updated as part of the release process after all testing & validation is complete.
-   `staging`: Only updated as part of the release process. Regression tests should be passing here.
-   `bugfix`: Used temporarily for urgent fixes if dev is being used for testing a major feature release.
-   `dev`: Push code here as soon as any feature or fix is "MVP" - i.e. not expected to break any existing functionality, and new functionality either works or is non-impactful (only added the backend, hidden, or hidden behind a feature flag). NB: Security should be included from the start (i.e. user & role based access to any new/updated backend APIs). Regression tests should be run regularly.
-   Other branches: Create branches based on the dev branch for regular local check-ins, and for the rare case where integration between backend and frontend is needed. (Most changes should be backwards-compatible, so it should be possible to commit the backend changes first.)

# Release candidates (generating database migrations)

To create a candidate for deploying to production, the migrations need to be updated. This should only be done in the staging branch ahead of a planned release.

1.  Update to staging@latest, and make sure this matches the latest code on master (throw away any aborted changes/migrations).

1.  Merge the code to be released. (Make sure this does NOT include any migration files.)

1.  Reset a local instance of the database with the current migrations: `yarn db:reset`

1.  Generate the additional migrations, using the connection to the database. `yarn migrations:generate`

1.  Commit the changes including the newly generated migration file to the repository.

```bash
git add graphql-provider/src/migrations/*-migration.ts
git commit -a
git push
```
