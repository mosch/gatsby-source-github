const Octokat = require('octokat')
const crypto = require('crypto')
const fileType = require('file-type')
const mime = require('mime-types')

exports.sourceNodes = async (
  { boundActionCreators },
  { user, repository, tree = false, releases = false, secrets = undefined }
) => {
  if (!user || !repository) {
    throw 'You need to define user & repository for gatsby-source-github to work'
  }

  const octo = new Octokat(secrets)
  const { createNode } = boundActionCreators

  console.time(`fetch Github data`)
  secrets.token && console.log('Using Github Token')
  console.log(
    `starting to fetch data from the Github API. Warning: This may take a long time.`
  )

  const repo = octo
      .repos(user, repository)

  if (tree) {
    const data = await repo
      .git.trees('HEAD')
      .fetch({ recursive: 1 })

    const files = await Promise.all(
      data.tree.filter(file => file.type !== 'tree').map(file =>
        octo
          .fromUrl(file.url)
          .fetch()
          .then(result => {
            const buffer = Buffer.from(result.content, 'base64')
            const type = fileType(buffer)
            const mimeType = type
              ? type.mime
              : mime.lookup(file.path) || 'plaintext'

            return {
              user: user,
              repository: repository,
              path: file.path,
              fileAbsolutePath: file.url,
              relativePath: file.path,
              url: file.url,
              type: file.type,
              mime: mimeType,
              sha: file.sha,
              content: buffer.toString('utf8'),
            }
          })
      )
    )

    files.forEach(file =>
      createNode({
        ...file,
        id: file.url,
        parent: `__SOURCE__`,
        children: [],
        internal: {
          mediaType: file.mime,
          type: 'GithubFile',
          contentDigest: crypto
            .createHash(`md5`)
            .update(file.content)
            .digest(`hex`),
        },
      })
    )
  }

  if (releases) {

  }

  console.timeEnd(`fetch Github data`)

  return
}
