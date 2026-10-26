import { AuthMethod } from 'src/auth/types/AuthMethod';
import { SessionLength } from 'src/auth/types/SessionLength';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
@Index('lwp_user_session_user_refresh_idx', ['userId', 'refreshToken'], { unique: true })
// probably shouldn't be accessed explicitly by anyone? Not an authorizer
export class LwpUserSession {
    @Column({ type: 'bigint' })
    userId: string;

    @Column()
    ip: string;

    @Column()
    userAgent: string;

    @Column()
    authMethod: AuthMethod;

    @Column()
    sessionLength: SessionLength;

    /**
     * The jti of the JSON Web Token issued to
     * this session for refresh. Null for Microsoft
     * sessions.
     *
     * @type {string | null}
     * @memberof LwpUserSession
     */
    @Column({ nullable: true })
    refreshToken?: string;

    /**
     * The jti of the previous JSON Web Token issued
     * to this session for refresh. Can be used for
     * a period of 60 seconds from the time of last
     * update before no longer being valid.
     *
     * @type {string}
     * @memberof LwpUserSession
     */
    @Column({ nullable: true })
    previousRefreshToken?: string;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    logUpdatedAt: Date;
}
