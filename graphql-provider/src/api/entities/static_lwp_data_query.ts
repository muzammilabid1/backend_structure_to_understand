import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpStaticDataQueryType, LwpStaticQueryCatergory, LwpStaticQueryStatus } from '../model';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpDataQuery, async ({ opType, token, id }) => {
    if (token.userType === UserType.ADMIN) return '*';

    if (opType === OpType.Write) return false;

    if (!token.isSchoolLeader) return false;

    return (await StaticLwpDataQuery.createQueryBuilder('sldq')
        .where('sldq.id = :id AND sldq.type = :type', { id, type: LwpStaticDataQueryType.LEADER })
        .getCount()) > 0
        ? '*'
        : false;
})
export class StaticLwpDataQuery extends BaseAuthorizerEntity {
    @Column()
    @AuthorizeField(TeacherField)
    @Field()
    @Index({ unique: true })
    name: string;

    @Field(() => LwpStaticDataQueryType)
    @Column()
    type: LwpStaticDataQueryType;

    @AuthorizeField(TeacherField)
    @Field(() => LwpStaticQueryCatergory, { nullable: true })
    @Column({ nullable: true })
    category?: LwpStaticQueryCatergory;

    @Field(() => LwpStaticQueryStatus, { defaultValue: 'HIDDEN' })
    @Column()
    status?: LwpStaticQueryStatus;

    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    @Field({ nullable: true })
    description: string;

    @Column({ default: false })
    @AuthorizeField(TeacherField)
    @Field()
    isAvailableForPreviousYear: boolean;

    @Column()
    @Field()
    query: string;

    @Column()
    @Field()
    order: number;

    @Column({ nullable: true })
    @Field({ nullable: true })
    csvFileLocation: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    lastCsvGenerated: Date;

    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(TeacherField)
    @Field()
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
