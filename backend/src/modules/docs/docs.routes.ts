/**
 * docs.routes.ts - OpenAPI document + lightweight Swagger UI (CDN).
 *
 * Mounted under /api/v1 (before rate limit is fine; docs are public read).
 */

import { Router } from 'express';
import openapi from '../../docs/openapi.json' with { type: 'json' };

export const docsRouter: Router = Router();

docsRouter.get('/openapi.json', (_req, res) => {
    res.status(200).json(openapi);
});

docsRouter.get('/docs', (_req, res) => {
    // Swagger UI from CDN — no npm swagger dependency required.
    res
        .status(200)
        .type('html')
        .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admission Hub API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/v1/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`);
});
