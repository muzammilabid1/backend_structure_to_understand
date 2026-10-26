import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

import { ImportedType, WondeGender } from '../model';
import { ImportedSchool } from './imported_school';
import { ImportedSchoolClass } from './imported_school_class';
import { ImportedStudentContact } from './imported_student_contact';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpPupil } from './pupil';
import { DateOnly } from './scalar/DateOnly.scalar';

@Entity()
@ObjectType()
// @Index('imported_student_schoolId_upn_unique', ['school', 'UPN'], {
// unique: true,
// where: `"UPN" != '[Unknown]'`
// }) // for documentation
@ActsAsAuthorizer(ImportedStudent, Delegate(() => ImportedSchool, 'school'))
export class ImportedStudent extends BaseAuthorizerEntity {
    // This is wonde id
    @PrimaryColumn()
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    mis_id?: string;

    // @Column({ nullable: true })
    // @Field({ nullable: true })
    // phoneNumber?: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    forename: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    surname: string;

    @Column({ nullable: true, type: 'date', transformer: dateValueTransformer })
    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(TeacherField)
    dateOfBirth: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    initials: string;

    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    details: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    UPN: string;

    @Column({ default: 'WONDE' })
    @Field(() => ImportedType)
    @AuthorizeField(TeacherField)
    importedFrom: ImportedType;

    @Field(() => WondeGender, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    gender?: WondeGender;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    ethnicity: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    ethnicity_code: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    english_as_additional_language: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    english_as_additional_language_status: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    sen_status: string;

    @ManyToMany(() => ImportedSchoolClass, (schoolClass) => schoolClass.students, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => [ImportedSchoolClass], { nullable: true })
    @AuthorizeField(TeacherField)
    schoolClasses: ImportedSchoolClass[];

    @ManyToOne(() => ImportedSchool, (school) => school.importedStudents, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => ImportedSchool, { nullable: true })
    @Index(['school.id'])
    @AuthorizeField(TeacherField)
    school: ImportedSchool;

    @Column({ nullable: true })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isPremium: boolean;

    @Column({ nullable: true, default: false })
    @Field(() => Boolean, { nullable: true })
    @AuthorizeField(TeacherField)
    isPreRegistration: boolean;

    @Field(() => LwpPupil, { nullable: true })
    @OneToOne(() => LwpPupil, (p) => p.importedStudent, { nullable: true, onDelete: 'SET NULL' })
    @AuthorizeField(TeacherField)
    @Index(['lwpPupil.id'])
    @JoinColumn()
    lwpPupil?: LwpPupil;

    @OneToMany(() => ImportedStudentContact, (s) => s.importedStudent)
    @Field(() => [ImportedStudentContact])
    @AuthorizeField(TeacherField)
    importedStudentContacts: ImportedStudentContact[];

    getFullName(): string {
        return `${this.forename ?? '[Unknown]'} ${this.surname ?? '[Unknown]'}`;
    }

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
