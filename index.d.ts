
interface EncodeOptions {
    section?: string;
    whitespace?: boolean;
    align?: boolean;
    newline?: boolean;
    platform?: string;
    bracketedArray?: boolean;
}

interface DecodeOptions {
    bracketedArray?: boolean;
    retainComments?: boolean;
}

interface UnsafeOptions {
    retainComments?: boolean;
}

interface SafeOptions {
    retainComments?: boolean;
}

export function decode(str: string, options?: DecodeOptions): {
    [key: string]: any;
};
export function parse(str: string, options?: DecodeOptions): {
    [key: string]: any;
};
export function encode(object: any, options?: EncodeOptions | string): string;
export function stringify(object: any, options?: EncodeOptions | string): string;
export function safe(val: string, options?: SafeOptions): string;
export function unsafe(val: string, options?: UnsafeOptions): string;

/**
 * Create a token that can be used as an object key to indicate a comment follows. 
 * NOTE: It is expected that the string used as a value with this token starts with either a '#' or a ';'
 */
export function createCommentToken(): string;

/**
 * Inserts a comment before the specified key on the provided object (either the ini or a section of it). 
 * NOTE: This function returns a new object with the inserted comment at the correct place. For correct placement, ensure to use the returned object and not the original!
 */
export function insertCommentBefore(comment: string, before: string, iniOrSection: any): any;