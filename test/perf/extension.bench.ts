import { bench, describe } from 'vitest'
import * as path from 'path'

// Replicate getAssetsFolder logic for benchmarking (not exported from extension)
function getAssetsFolder(
  fileFsPath: string,
  imageSaveFolder: string,
  workspaceRoot: string
): string {
  const replaced = imageSaveFolder
    .replace('${projectRoot}', workspaceRoot)
    .replace('${file}', fileFsPath)
    .replace(
      '${fileBasenameNoExtension}',
      path.basename(fileFsPath, path.extname(fileFsPath))
    )
    .replace('${dir}', path.dirname(fileFsPath))
  return path.resolve(path.dirname(fileFsPath), replaced)
}

describe('getAssetsFolder path computation', () => {
  bench('default config', () => {
    getAssetsFolder('/workspace/docs/readme.md', 'assets', '/workspace')
  })

  bench('projectRoot template', () => {
    getAssetsFolder(
      '/workspace/docs/readme.md',
      '${projectRoot}/assets',
      '/workspace'
    )
  })

  bench('all template variables', () => {
    getAssetsFolder(
      '/workspace/docs/readme.md',
      '${projectRoot}/${dir}/${fileBasenameNoExtension}/${file}',
      '/workspace'
    )
  })
})

// Benchmark full document replace - the extension replaces the ENTIRE document on every edit
describe('full document replace scaling', () => {
  function generateDocument(lines: number): string {
    return Array.from(
      { length: lines },
      (_, i) => `Line ${i}: This is a sample markdown line with some **bold** and *italic* text.`
    ).join('\n')
  }

  const doc100 = generateDocument(100)
  const doc1000 = generateDocument(1000)
  const doc10000 = generateDocument(10000)

  bench('100 lines - create Range + edit object', () => {
    // Simulates the WorkspaceEdit creation overhead
    const range = { startLine: 0, startChar: 0, endLine: 100, endChar: 0 }
    const edit = { uri: '/test.md', range, content: doc100 }
    // Force no dead code elimination
    if (!edit.content) throw new Error()
  })

  bench('1000 lines - create Range + edit object', () => {
    const range = { startLine: 0, startChar: 0, endLine: 1000, endChar: 0 }
    const edit = { uri: '/test.md', range, content: doc1000 }
    if (!edit.content) throw new Error()
  })

  bench('10000 lines - create Range + edit object', () => {
    const range = { startLine: 0, startChar: 0, endLine: 10000, endChar: 0 }
    const edit = { uri: '/test.md', range, content: doc10000 }
    if (!edit.content) throw new Error()
  })
})

// Benchmark base64 decoding (upload path)
describe('base64 decode (upload simulation)', () => {
  const small = Buffer.from('x'.repeat(1024)).toString('base64')       // 1KB
  const medium = Buffer.from('x'.repeat(1024 * 100)).toString('base64') // 100KB
  const large = Buffer.from('x'.repeat(1024 * 1024)).toString('base64') // 1MB

  bench('1KB base64 decode', () => {
    Buffer.from(small, 'base64')
  })

  bench('100KB base64 decode', () => {
    Buffer.from(medium, 'base64')
  })

  bench('1MB base64 decode', () => {
    Buffer.from(large, 'base64')
  })
})

// Benchmark path.relative computation (used for each uploaded file)
describe('upload path computation', () => {
  bench('path.relative for single file', () => {
    path.relative('/workspace/docs', path.join('/workspace/docs/assets', 'image.png')).replace(/\\/g, '/')
  })

  bench('path.relative for 5 files (batch upload)', () => {
    for (let i = 0; i < 5; i++) {
      path.relative('/workspace/docs', path.join('/workspace/docs/assets', `image_${i}.png`)).replace(/\\/g, '/')
    }
  })
})
