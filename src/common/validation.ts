export function isString(value: any): value is string {
    return typeof value === 'string' || value instanceof String;
}

export function isAnEmptyString(value: any): boolean {
    return isString(value) && value.length < 1;
}
