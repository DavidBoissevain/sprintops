import { afterEach, describe, expect, it, vi } from 'vitest'
import { AzureDevOpsError, createClient, isAttachmentUrl } from './azure-devops.ts'

const organization = 'contoso'
const attachmentPath = '_apis/wit/attachments/0f1e2d3c?fileName=image.png'
const attachment = `https://dev.azure.com/Contoso/project-guid/${attachmentPath}`

describe('isAttachmentUrl', () => {
  it('accepts an attachment in the organization, in any case', () => {
    expect(isAttachmentUrl(attachment, organization)).toBe(true)
  })

  it.each([
    ['plain http', `http://dev.azure.com/contoso/project/${attachmentPath}`],
    ['a lookalike host', `https://dev.azure.com.evil.test/contoso/project/${attachmentPath}`],
    ['another host', `https://evil.test/contoso/project/${attachmentPath}`],
    ['credentials before the host', `https://dev.azure.com@evil.test/contoso/project/${attachmentPath}`],
    ['credentials on the real host', `https://user:secret@dev.azure.com/contoso/project/${attachmentPath}`],
    ['another organization', `https://dev.azure.com/other/project/${attachmentPath}`],
    ['another port', `https://dev.azure.com:8443/contoso/project/${attachmentPath}`],
    ['a path that climbs out', 'https://dev.azure.com/contoso/_apis/wit/attachments/../../../other/api'],
    ['an encoded climb out', 'https://dev.azure.com/contoso/_apis/wit/attachments/%2e%2e/%2e%2e/other'],
    ['another API', 'https://dev.azure.com/contoso/project/_apis/wit/workitems/1'],
    ['a relative URL', `/contoso/project/${attachmentPath}`],
    ['an empty string', ''],
  ])('rejects %s', (_name, url) => {
    expect(isAttachmentUrl(url, organization)).toBe(false)
  })
})

describe('attachment', () => {
  const tokens = { getAuthorization: async () => 'Basic secret', clear: () => undefined }
  const client = createClient(tokens, { organization, project: 'Project', team: 'Team' })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the token for a real attachment', async () => {
    const fetch = vi.fn(async () => new Response('image'))
    vi.stubGlobal('fetch', fetch)

    await client.attachment(attachment)

    expect(fetch).toHaveBeenCalledWith(attachment, expect.objectContaining({ credentials: 'omit' }))
  })

  it('repeats the read after a reset connection', async () => {
    const fetch = vi.fn<() => Promise<Response>>().mockRejectedValueOnce(new TypeError('reset')).mockResolvedValue(new Response('image'))
    vi.stubGlobal('fetch', fetch)

    await client.attachment(attachment)

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('never calls out for another URL, so the token cannot leak', async () => {
    const fetch = vi.fn(async () => new Response('image'))
    vi.stubGlobal('fetch', fetch)

    await expect(client.attachment('https://evil.test/image.png')).rejects.toBeInstanceOf(AzureDevOpsError)

    expect(fetch).not.toHaveBeenCalled()
  })
})
