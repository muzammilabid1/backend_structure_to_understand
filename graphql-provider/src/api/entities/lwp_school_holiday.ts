import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { LwpSchool } from './school';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchoolHoliday, async ({ id, opType, token, parentId }) => {
    // school holidays can be safely viewed by any user, it'd be needless overhead to check their school attachment
    if (opType === OpType.Read) return '*';
    if (token.userType === UserType.ADMIN) return '*';

    if (token.userType === UserType.TEACHER && token.isSchoolLeader) {
        // allow creation if school parent is write-accessible
        if (id === null) return (await LwpSchool.authorize({ id: parentId, opType, token })) ? '*' : false;

        return token.schoolId ===
            (
                await LwpSchoolHoliday.createQueryBuilder('lsh')
                    .innerJoin('lsh.schools', 'ls')
                    .select('ls.id')
                    .where('lsh.id = :id', { id })
                    .getRawOne<{ ls_id: string }>()
            )?.ls_id
            ? '*'
            : false;
    }

    return false;
})
export class LwpSchoolHoliday extends BaseAuthorizerEntity {
    @Field()
    @Column()
    @AuthorizeField(TeacherField)
    holidayName: string;

    @Field()
    @Column()
    @AuthorizeField(TeacherField)
    startDate: Date;

    @Field()
    @Column()
    @AuthorizeField(TeacherField)
    endDate: Date;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    released: boolean;

    @Field({ defaultValue: false })
    @AuthorizeField(TeacherField)
    hasSchoolsLinked: boolean;

    @ManyToOne(() => StaticLwpPeriod, (child) => child.schoolHolidays, { nullable: true, onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(TeacherField)
    period: StaticLwpPeriod;

    @ManyToMany(() => LwpSchool, (school) => school.schoolHolidays, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinTable({ name: 'lwp_school_holidays' })
    @Field(() => [LwpSchool], { nullable: true })
    // Only access their own school please
    @AuthorizeField(({ token }) => {
        if (token.userType === UserType.TEACHER) {
            return (schools: LwpSchool[]) => schools.filter((s) => s.id == token.schoolId);
        }

        return false;
    })
    schools: LwpSchool[];

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    @Field()
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
