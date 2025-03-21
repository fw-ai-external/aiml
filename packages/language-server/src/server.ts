import { createConnection, createServer, createSimpleProject } from '@volar/language-server/node';
import { service } from './service';

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
  return server.initialize(params, createSimpleProject([]), [service]);
});

connection.onInitialized(() => {
  server.initialized();
});
