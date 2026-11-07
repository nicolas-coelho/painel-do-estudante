import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function calendarApiDevPlugin(): Plugin {
  return {
    name: 'calendar-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use('/api/calendar', async (req, res) => {
        try {
          const calendarHandler = (await import('./api/calendar')).default;
          const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
          const query: Record<string, string> = {};
          url.searchParams.forEach((v, k) => {
            query[k] = v;
          });

          const fakeReq: any = {
            method: req.method,
            query,
            headers: req.headers,
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
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return this;
            },
            end() {
              res.end();
              return this;
            },
          };
          await calendarHandler(fakeReq, fakeRes);
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), calendarApiDevPlugin()],
});
