import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpMathscotItem, AdminWriteAllRead)
export class StaticLwpMathscotItem extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field({ nullable: false })
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    name: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    theme: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    category: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    zIndex: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    imagePath: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    imageIconPath: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    sequenceOrder: number;

    @Field(() => [String], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    conflictingCategories: string[];

    @Column({ nullable: true })
    mwpTheme: number;
}
