import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ErDiagramInput, ErDiagramOptions } from './schema'

const EXAMPLE: ErDiagramInput = {
  text: `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts (id),
  body TEXT
);`,
}

export default function Tool() {
  return (
    <TwoColumn<ErDiagramInput, ErDiagramOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
