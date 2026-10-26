import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A DeletedItem is an item that once existed as a record in a table, but has since been
 * deleted. These are added by a database trigger that automatically creates them when
 * a relevant item is removed from a table.
 *
 * Schema synchronisation is turned off entirely for DeletedItem. This is because the
 * schema here is heavily controlled by our migrations directly, in particular in relation
 * to the partition scheme (the deleted_item table is partitioned by month and year into
 * partitions titled according to the scheme "deleted_item_YYYY_Mon"). This process should
 * generally be transparent to TypeORM, but we want to ensure it doesn't attempt to take over.
 *
 * @export
 * @class DeletedItem
 */
@Entity({ synchronize: false })
@Index(['source', 'recordId'])
export class DeletedItem {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    deletedAt: Date;

    /**
     * The asExpression is slightly odd here, and looks like it could be simplified.
     * However, any simplified version is converted to this by Postgres anyway, and
     * then causes TypeORM to get stressed in generating migrations, meaning it keeps
     * trying to drop and regenerate it.
     */
    @Column({ type: 'varchar', nullable: true, generatedType: 'STORED', asExpression: `(record ->> 'id'::text)` })
    recordId: string;

    @Column({ type: 'varchar', nullable: false })
    source: string;

    @Column({ type: 'jsonb' })
    record: unknown;
}
