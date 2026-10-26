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
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

import { ImportedType } from '../model';
import { ImportedSchool } from './imported_school';
import { ImportedStudent } from './imported_student';
import { LwpSchoolClass } from './school_class';
import { StaticLwpPeriod } from './static_period';
import { StaticLwpYearGroup } from './year_group';

@Entity()
@ObjectType()
@ActsAsAuthorizer(ImportedSchoolClass, Delegate(() => ImportedSchool, 'school'))
export class ImportedSchoolClass extends BaseAuthorizerEntity {
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
    code: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    nc_year: string;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    linkedClassShouldBeActive: boolean;

    @Column({ default: 'WONDE' })
    @Field(() => ImportedType)
    @AuthorizeField(TeacherField)
    importedFrom: ImportedType;

    @ManyToOne(() => ImportedSchool, (school) => school.classes, { nullable: false, onDelete: 'CASCADE' })
    @Field(() => ImportedSchool, { nullable: false })
    @AuthorizeField(TeacherField)
    @Index(['school.id'])
    school: ImportedSchool;

    @ManyToMany(() => ImportedStudent, (teacherOrPupil) => teacherOrPupil.schoolClasses, { onDelete: 'CASCADE', nullable: true })
    @JoinTable({
        name: 'imported_school_class_student',
        joinColumn: { name: 'importedSchoolClassId' },
        inverseJoinColumn: { name: 'importedStudentId' }
    })
    @AuthorizeField(TeacherField)
    @Field(() => [ImportedStudent], { nullable: true })
    students: ImportedStudent[];

    @Field(() => StaticLwpYearGroup, { nullable: true })
    @ManyToOne(() => StaticLwpYearGroup, (p) => p.importedClasses, { nullable: true, onDelete: 'SET NULL' })
    @AuthorizeField(TeacherField)
    @JoinColumn({ name: 'yearGroup' })
    @Index(['yearGroup.id'])
    yearGroup: StaticLwpYearGroup;

    @Field(() => LwpSchoolClass, { nullable: true })
    @OneToOne(() => LwpSchoolClass, (s) => s.importedSchoolClass, { nullable: true, onDelete: 'SET NULL' })
    @AuthorizeField(TeacherField)
    @Index(['lwpSchoolClass.id'])
    @JoinColumn()
    lwpSchoolClass?: LwpSchoolClass;

    @ManyToOne(() => StaticLwpPeriod, (t) => t.importedSchoolClasses, { onDelete: 'RESTRICT' })
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
