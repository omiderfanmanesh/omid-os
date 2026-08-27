import { handleChat } from '../../netlify/functions/chat.mjs';

export function onRequest(context) {
    const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
    return handleChat(context.request, { ip }, context.env);
}
