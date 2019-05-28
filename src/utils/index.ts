import { writeFileSync } from 'fs'

export * from './constant'

export function logFile (filename: string) {
  return (message?: any, ...optionalParams: any[]) => {
    const msg = [message, ...optionalParams].join(' ')
    writeFileSync(filename, msg + '\n', {
      encoding: 'utf8',
      flag: 'a'
    })
  }
}
