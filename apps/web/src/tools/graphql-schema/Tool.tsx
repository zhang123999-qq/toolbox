import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { GraphqlSchemaInput, GraphqlSchemaOptions } from './schema'

const EXAMPLE: GraphqlSchemaInput = {
  text: `# 示例 schema
interface Node { id: ID! }

type User implements Node {
  id: ID!
  name: String!
  email: String
  role: Role
  posts(after: String, limit: Int = 10): [Post!]!
}

enum Role { ADMIN USER }

input UserInput {
  name: String!
  email: String
}

union SearchResult = User | Post

scalar DateTime
`,
}

export default function Tool() {
  return (
    <TwoColumn<GraphqlSchemaInput, GraphqlSchemaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
