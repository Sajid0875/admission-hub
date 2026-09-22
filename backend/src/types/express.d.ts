/**
 * express.d.ts - Global type augmentations for Express.
 *
 * Adds custom properties to Express's Request interface.
 * Loaded automatically by TypeScript when included in tsconfig.
 */

import 'express';

declare global {
    namespace Express {
        interface Request {
            /**
             * Request ID — set by requestId middleware in app.ts.
             * Falls back to a UUID when the client does not send `x-request-id`.
             */
            id: string;

            /**
             * Authenticated user context — set by `protect` middleware.
             * Undefined on public routes. Controllers behind `protect`
             * can rely on it being present.
             */
            user?: {
                id: string;
                role: string;
                partnerId: string | null;
            };
        }
    }
}