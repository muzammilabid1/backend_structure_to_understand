import * as fs from 'fs';
import { parse } from 'papaparse';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class migrationdata implements MigrationInterface {
    name = 'migrationdata';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // data
        // const class1_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_school_class')
        //   .values({
        //     code: 'c_001',
        //     name: 'class name 1',
        //     yearGroup: 'Year 1',
        //     primaryTeacher: 'teacher name 1'
        //   })
        //   .execute();

        // const class2_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_school_class')
        //   .values({
        //     code: 'c_002',
        //     name: 'class name 2',
        //     yearGroup: 'Year 1',
        //     primaryTeacher: 'teacher name 2'
        //   })
        //   .execute();

        // // insert parent
        // const p1_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_parent')
        //   .values({
        //     email: 'parent1@email.com',
        //     firstname: 'parent1_fn',
        //     lastname: 'parent1_ln',
        //     invitedEmail: 'parent1@email.com',
        //     invitedFirstname: 'parent1_fn',
        //     invitedLastname: 'parent1_ln'
        //   })
        //   .execute();
        // const p1_id = p1_ret['identifiers'][0]['id'];

        // const p2_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_parent')
        //   .values({
        //     email: 'parent2@email.com',
        //     firstname: 'parent2_fn',
        //     lastname: 'parent2_ln'
        //   })
        //   .execute();
        // const p2_id = p2_ret['identifiers'][0]['id'];

        // // insert child
        // const c1_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_pupil', ['firstname', 'lastname', 'schoolClass'])
        //   .values({
        //     firstname: 'pupil1_fn',
        //     lastname: 'pupil1_ln',
        //     schoolClass: await queryRunner.manager
        //       .createQueryBuilder()
        //       .select('class')
        //       .from('lwp_school_class', 'class')
        //       .where('class.id = :id', { id: class1_ret['identifiers'][0]['id'] })
        //       .getOne()
        //   })
        //   .execute();
        // const c1_id = c1_ret['identifiers'][0]['id'];

        // const c2_ret = await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_pupil', ['firstname', 'lastname', 'schoolClass'])
        //   .values({
        //     firstname: 'pupil2_fn',
        //     lastname: 'pupil2_ln',
        //     schoolClass: await queryRunner.manager
        //       .createQueryBuilder()
        //       .select('class')
        //       .from('lwp_school_class', 'class')
        //       .where('class.id = :id', { id: class2_ret['identifiers'][0]['id'] })
        //       .getOne()
        //   })
        //   .execute();
        // const c2_id = c2_ret['identifiers'][0]['id'];

        // // insert parent pupil relationships
        // await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_parent_pupil')
        //   .values({
        //     lwpParentId: p1_id,
        //     lwpPupilId: c1_id
        //   })
        //   .execute();

        // await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_parent_pupil')
        //   .values({
        //     lwpParentId: p2_id,
        //     lwpPupilId: c2_id
        //   })
        //   .execute();

        // await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_mathscot_item')
        //   .values({
        //     name: 'adult_mathscot',
        //     theme: 'main',
        //     category: 'main',
        //     zIndex: 0,
        //     imagePath: `http://${media.minio_host}:${media.minio_port}/${media.bucket_public}/child-mathscot.png`,
        //     imageIconPath: ''
        //   })
        //   .execute();

        // await queryRunner.manager
        //   .createQueryBuilder()
        //   .insert()
        //   .into('lwp_mathscot_item')
        //   .values({
        //     name: 'pirate jacket',
        //     theme: 'pirate',
        //     category: 'body',
        //     zIndex: 1,
        //     imagePath: `http://${media.minio_host}:${media.minio_port}/${media.bucket_public}/pirate%20jacket.png`,
        //     imageIconPath: ''
        //   })
        //   .execute();

        // insert data from tmp.sql
        const readSqlFile = (filepath: string): string[] => {
            if (fs.existsSync(filepath)) {
                return fs
                    .readFileSync(path.join(__dirname, filepath))
                    .toString()
                    .replace(/\r?\n|\r/g, '')
                    .split(';')
                    .filter((query) => query?.length);
            } else return [];
        };

        const queries = readSqlFile('tmp.sql');

        for (let i = 0; i < queries.length; i++) {
            if (queries[i].startsWith('INSERT')) {
                await queryRunner.query(queries[i]);
            }
        }

        // insert data from csv files
        const files = fs.readdirSync(__dirname).filter((fn) => fn.endsWith('.csv'));

        files.forEach((file) => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.insertCsv(file, queryRunner);
        });
    }

    private async insertCsv(csvFile: string, queryRunner: QueryRunner): Promise<void> {
        const tableName = csvFile.split('.')[0];

        const fileData = fs.readFileSync(path.join(__dirname, csvFile), 'utf8');

        const records = parse(fileData, {
            header: true,
            skipEmptyLines: true
        });

        await queryRunner.manager.createQueryBuilder().insert().into(tableName).values(records.data).execute();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async down(queryRunner: QueryRunner): Promise<void> {}
}
