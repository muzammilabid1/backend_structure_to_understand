import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { UserType } from 'src/auth/types/UserType';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

import { ImportedType } from '../model';
import { ImportedContact } from './imported_contact';
import { ImportedSchoolClass } from './imported_school_class';
import { ImportedStudent } from './imported_student';
import { ImportedStudentContact } from './imported_student_contact';
import { LwpSchool } from './school';
import { StaticLwpPeriod } from './static_period';

@ObjectType()
@Entity()
@ActsAsAuthorizer(ImportedSchool, async function ({ id, token, opType }) {
    if (token.userType === UserType.ADMIN) return '*';

    if (token.userType !== UserType.TEACHER) return false;

    return await Delegate(() => LwpSchool, 'lwpSchool').apply(this, [{ id, token, opType }]);
})
export class ImportedSchool extends BaseAuthorizerEntity {
    // This is wonde id
    @PrimaryColumn()
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    name: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    urn?: number;

    @Column({ default: 'WONDE' })
    @Field(() => ImportedType)
    @AuthorizeField(TeacherField)
    importedFrom: ImportedType;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    importedIgnoredContacts: number;

    @Column({ nullable: true })
    postCode?: string;

    @OneToMany(() => ImportedSchoolClass, (schoolClass) => schoolClass.school, { nullable: true })
    @Field(() => [ImportedSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    classes: ImportedSchoolClass[];

    @OneToMany(() => ImportedContact, (contact) => contact.school, { nullable: true })
    @Field(() => [ImportedContact], { nullable: true })
    @AuthorizeField(TeacherField)
    importedContacts: ImportedContact[];

    @OneToMany(() => ImportedStudent, (student) => student.school, { nullable: true })
    @Field(() => [ImportedStudent], { nullable: true })
    @AuthorizeField(TeacherField)
    importedStudents: ImportedStudent[];

    @OneToMany(() => ImportedStudentContact, (studentContact) => studentContact.school, {
        nullable: true
    })
    @Field(() => [ImportedStudentContact], { nullable: true })
    @AuthorizeField(TeacherField)
    importedStudentContacts: ImportedStudentContact[];

    @Field(() => LwpSchool, { nullable: true })
    @OneToOne(() => LwpSchool, (s) => s.importedSchool, { nullable: true, onDelete: 'CASCADE' })
    @AuthorizeField(TeacherField)
    @Index(['lwpSchool.id'])
    @JoinColumn()
    lwpSchool?: LwpSchool;

    @Field(() => LwpSchool, { nullable: true })
    @OneToOne(() => LwpSchool, { nullable: true, onDelete: 'CASCADE' })
    @AuthorizeField(TeacherField)
    @Index(['proposedSchool.id'])
    @JoinColumn()
    proposedSchool?: LwpSchool;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.importedSchools, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @AuthorizeField(TeacherField)
    period: StaticLwpPeriod;

    // Common Fields - in future we will reduce this duplication
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
}
