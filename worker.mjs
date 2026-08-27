import { handleChat } from './netlify/functions/chat.mjs';

export default {
    fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/chat') {
            const ip = request.headers.get('cf-connecting-ip') || 'unknown';
            return handleChat(request, { ip }, env);
        }

        return env.ASSETS.fetch(request);
    }
};
