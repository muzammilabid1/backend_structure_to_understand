import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
@ObjectType()
@ActsAsAuthorizer(LogParentPupilAction, ({ id, opType, token, parentId }) => {
    if (token.userType === UserType.ADMIN) return '*';

    // Only allow creation
    if (opType !== OpType.Write || id !== null) return false;

    // Allow creation only where the user ID context is this user
    return parentId === token.sub ? '*' : false;
})
export class LogParentPupilAction extends BaseAuthorizerEntity {
    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    actionId: number;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    userId: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    parentId: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupilId: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    param1: string;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    param2: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    param3: number;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field({ nullable: true })
    time: Date;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;
}
