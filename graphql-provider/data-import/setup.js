const fs = require('fs');
const replace = require('replace-in-file');

const timestamp = Date.now();

// move template as latest migration
fs.copyFile('data-import/migration.ts', `src/migrations/${timestamp}-migration.ts`, (err) => {
    if (err) throw err;
    console.log('migration.ts was copied to destination.txt');

    const options = {
        files: `src/migrations/${timestamp}-migration.ts`,
        from: /migrationdata/g,
        to: `migration${timestamp}`
    };

    replace(options)
        .then((results) => {})
        .catch((error) => {
            console.error('Error occurred:', error);
        });
});

// copy tmp file to migrations folder if present
if (fs.existsSync('data-import/tmp.sql')) {
    fs.copyFileSync('data-import/tmp.sql', `src/migrations/tmp.sql`);
}

const files = fs.readdirSync('./data-import').filter((fn) => fn.endsWith('.csv'));

files.forEach((file) => {
    fs.copyFileSync(`./data-import/${file}`, `src/migrations/${file}`);
});
