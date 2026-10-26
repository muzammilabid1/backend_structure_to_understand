import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { PupilMathscotsCharacter, PupilMathscotsColour } from '../model';
import { LwpPupil } from './pupil';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilMathscot, Delegate(() => LwpPupil, 'pupil'))
@Index(['pupil.id', 'period.index'])
export class LwpPupilMathscot extends BaseAuthorizerEntity {
    @Column({ default: 'MONKEY' })
    @Field(() => PupilMathscotsCharacter, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    character: PupilMathscotsCharacter;

    @Column({ default: 'NATURAL' })
    @Field(() => PupilMathscotsColour, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    colour: PupilMathscotsColour;

    @Field(() => [String], { nullable: true })
    @Column({ type: 'jsonb', nullable: true })
    @AuthorizeField(UnrestrictedField)
    items: (string | number)[];

    @ManyToOne(() => StaticLwpPeriod, (t) => t.pupilMathscot, { onDelete: 'RESTRICT' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    period: StaticLwpPeriod;

    @ManyToOne(() => LwpPupil, (t) => t.mathscot, { onDelete: 'CASCADE' })
    @Field(() => LwpPupil, { nullable: true })
    pupil: LwpPupil;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
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
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
