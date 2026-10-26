import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpPupil } from './pupil';
import { LwpSchool } from './school';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LwpPupilTag, async ({ id, token }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins can always access

    if (token.userType === UserType.TEACHER) {
        return (await LwpPupilTag.createQueryBuilder('lpt')
            .where('lpt.id = :id AND lpt.schoolId = :schoolId', { id, schoolId: token.schoolId })
            .getCount()) > 0
            ? '*'
            : false;
    }

    return false;
})
export class LwpPupilTag extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(TeacherField)
    @Field()
    id: string;

    @Column()
    @Field()
    @AuthorizeField(TeacherField)
    name: string;

    @Field()
    @Column()
    @AuthorizeField(TeacherField)
    color: string;

    @ManyToOne(() => LwpSchool, (schoolTag) => schoolTag.schoolPupilTags, { onDelete: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(TeacherField)
    school: LwpSchool;

    @ManyToMany(() => LwpPupil, (child) => child.tags, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_pupil_tag_pupil' })
    @Field(() => [LwpPupil], { nullable: true })
    @AuthorizeField(TeacherField)
    pupils: LwpPupil[];

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @AuthorizeField(TeacherField)
    deletedBy: LwpUser;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @AuthorizeField(TeacherField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @AuthorizeField(TeacherField)
    logUpdatedBy: LwpUser;

    @Field(() => Number, { defaultValue: 0 })
    @AuthorizeField(TeacherField)
    pupilCounts: number;
}
