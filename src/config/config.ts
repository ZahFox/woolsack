import { isString } from '../common'

export enum Environment {
  PRODUCTION = 'production',
  TEST = 'test'
}

export type CouchConfig = Record<string, string> & {
  user: string
  password: string
  host: string
  port: string
}

export function getEnv(): Environment {
  const env = process.env.NODE_ENV

  if (!env) {
    throw new Error('No valid envrionment mode was detected.')
  }

  switch (env) {
    case Environment.PRODUCTION:
      return Environment.PRODUCTION
    case Environment.TEST:
      return Environment.TEST
    default:
      throw new Error(`${env} is not a valid environemnt mode for woolsack.`)
  }
}

export function getConfig(): CouchConfig {
  const expectedEnvironmentVariables: CouchConfig = {
    user: 'COUCH_USER',
    password: 'COUCH_PASSWORD',
    host: 'COUCH_HOST',
    port: 'COUCH_PORT'
  }

  try {
    const config: CouchConfig & Record<string, string> = { user: '', password: '', host: '', port: '' }
    const configKeys = Object.keys(expectedEnvironmentVariables)

    for (const key of configKeys) {
      const value = getEnvironmentVariable(expectedEnvironmentVariables[key])
      if (value) {
        config[key] = value
      }
      validateConfigValue(key, config[key])
    }

    return config
  } catch (e) {
    throw new Error(e.message)
  }
}

function getEnvironmentVariable(value: string) {
  if (!process.env[value]) {
    throw new Error(`Expected an environment variable for: ${value}`)
  }

  return process.env[value]
}

function validateConfigValue(name: string, value: string) {
  if (!isString(value) || value.length < 1) {
    throw new Error(`The supplied value for the ${name} environment variable is invalid`)
  }
}
