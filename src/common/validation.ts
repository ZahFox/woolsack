export function isArray(value: any): value is any[] {
  return Array.isArray(value)
}

export function isDate(value: any): value is Date {
  return value instanceof Date
}

export function isFunction(value: any): value is (...args: any) => any {
  return typeof value === 'function'
}

export function isObject(value: any): value is { [key: string]: any } {
  return value && typeof value === 'object' && value.constructor === Object
}

export function isPrimitive(value: any) {
  return value && !(typeof value === 'object' && value.constructor === Object) && !Array.isArray(value)
}

export function isString(value: any): value is string {
  return typeof value === 'string' || value instanceof String
}

export function isAnEmptyString(value: any): boolean {
  return isString(value) && value.length < 1
}
