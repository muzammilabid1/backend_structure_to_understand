import { JwtPayloadWithRequiredProps, LwpJwt } from './LwpJwt';
import { TokenType } from './TokenType';

/**
 * FileUpload tokens are tokens that are issued to represent the name of a file
 * which the client is expected to upload directly. These are used to avoid scenarios
 * where a user could attach someone else's file to their own records.
 *
 * @export
 * @class FileUploadToken
 * @implements {LwpJwt}
 */
export class FileUploadToken extends LwpJwt {
    static readonly tokenType = TokenType.FileUpload;

    /**
     * Creates an instance of FileUploadToken.
     * @param {string} filename the file name to represent
     * @memberof AuthToken
     */
    constructor(filename: string) {
        super();
        this.filename = filename;
    }

    /**
     * The file name for upload.
     *
     * @type {string}
     * @memberof LwpJwt
     */
    filename: string;
}

export type FileUploadTokenJWT = FileUploadToken & JwtPayloadWithRequiredProps;
