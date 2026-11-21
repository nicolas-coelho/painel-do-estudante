import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function localApiDevPlugin(): Plugin {
  const routeMap: Record<string, string> = {
    '/api/calendar': '/api/calendar.ts',
    '/api/ai-advisor': '/api/ai-advisor.ts',
    '/api/daily-digest': '/api/daily-digest.ts',
  };

  return {
    name: 'local-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        const modulePath = routeMap[pathname];
        if (!modulePath) {
          next();
          return;
        }

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;
          const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
          const query: Record<string, string> = {};
          url.searchParams.forEach((v, k) => {
            query[k] = v;
          });

          const body =
            req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'
              ? await readJsonBody(req)
              : undefined;

          const fakeReq: any = {
            method: req.method,
            query,
            headers: req.headers,
            body,
          };
          const fakeRes: any = {
            statusCode: 200,
            setHeader(name: string, val: string) {
              res.setHeader(name, val);
            },
            status(code: number) {
              res.statusCode = code;
              return this;
            },
            json(data: any) {
              if (!res.getHeader('Content-Type')) {
                res.setHeader('Content-Type', 'application/json');
              }
              res.end(JSON.stringify(data));
              return this;
            },
            end(chunk?: any) {
              res.end(chunk);
              return this;
            },
          };

          await handler(fakeReq, fakeRes);
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: e?.message || 'Erro interno' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Carrega variáveis sem prefixo VITE_ apenas em process.env do servidor dev (nunca no bundle do navegador)
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_') && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), localApiDevPlugin()],
  };
});
