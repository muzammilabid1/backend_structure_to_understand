### How to run project locally

1. Copy `.env.sample` to `.env` file and update values
2. Install libraries `yarn install`
3. Create database and its tables using migration by running the command `yarn run typeorm:run`
4. Start and run project `yarn run start:dev`

Project should be running on localhost:PORT

### URLs

-   GraphQL url: http://localhost:PORT/graphql
-   Health url: http://localhost:PORT/health

### How to deploy project on server

1. ENV variables defined in .env must be setup on server
2. Install libraries `yarn install`
3. Create dist folder by building project `yarn run build`
4. Run project in dist folder as nodemon process `yarn run start:prod`

Project should be running on server

#### Helpful commands for local dev

-   run postgres using docker
-   `docker run --rm --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5433:5432 postgres:11`
-   ```
    docker run -p 9000:9000 \
      -e "MINIO_ACCESS_KEY=key123" \
      -e "MINIO_SECRET_KEY=secret123" \
      pgsty/minio:RELEASE.2026-08-04T00-00-00Z server /data
    ```
-   `after run the minio please create two buckers "public" and "usermedia" and create the following folders`
-   ```
      Mathscot items - /static/img/mathscot_items in public bucket
      Card icons for activiites - /static/img/activity_icon/ in public bucket
      Image activity steps - /static/img/activity_step/ in public bucket
      Image download file step - /static/activity_file_step/ in public bucket
      Topic teacher resources - /static/topic_teacher_resources/ in public bucket
      Topic thumbnail path - /static/img/topic_icon/ in public bucket
      Teacher resources - /static/teacher_resources/ in public bucket
      Generated mathscot images - /generated/img/mathscots/ in public bucket
      Uploaded images - /upload/parent_photos/ in usermedia bucket
    ```
-   `export PGPASSWORD="docker"; pg_dump -h localhost -p 5433 -U postgres -d postgres --column-inserts --data-only -t lwp_pupil -t lwp_parent > data-import/tmp.sql`
-   `export PGPASSWORD="docker"; psql -a -d postgres -h localhost -p 5433 -U postgres -f data-import/tmp.sql`

### Generating new table through TypeORM

-   Setup new entities using TypeORM as ts files with relationship in src/\*_/entities/_.ts files
-   To create a migration file with the new table / changes `yarn run typeorm:generate`. this will create a new file in src/migration/ folder
-   The file can be amended to insert or update data
-   To apply this or any pending migration with the connected db `yarn run typeorm:run`

### Prettier & ESLint setup

#### Plugins to install

-   ESLint: dbaeumer.vscode-eslint
-   Prettier: esbenp.prettier-vscode

#### Settings for workspace

-   Go to Code, preferences, settings
-   go to json view mode and make sure these settings are setup

```
"editor.formatOnSave": true,
"editor.codeActionsOnSave": {
    // For ESLint
    "source.fixAll.eslint": true,
    // For TSLint
    "source.fixAll.tslint": true,
    // For Stylelint
    "source.fixAll.stylelint": true
}
```

#### Devtools browser plugin
