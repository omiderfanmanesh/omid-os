import assert from 'node:assert/strict';
import test from 'node:test';
import chatHandler, { handleChat } from '../netlify/functions/chat.mjs';

function streamFromChunks(chunks) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
            controller.close();
        }
    });
}

test('streams records split across network chunks', async () => {
    const originalFetch = globalThis.fetch;

    let upstreamUrl;
    let upstreamBody;
    globalThis.fetch = async (url, options) => {
        upstreamUrl = url;
        upstreamBody = JSON.parse(options.body);
        return new Response(streamFromChunks([
            'data: {"choices":[{"delta":{"content":"Hel',
            'lo"}}]}\n',
            'data: {"choices":[{"delta":{"content":" world"}}]}\n',
            'data: [DONE]\n'
        ]), { status: 200 });
    };

    try {
        const request = new Request('http://localhost/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ message: 'Tell me about Omid', context: 'Invented client context' })
        });
        const response = await handleChat(request, { ip: 'test-stream' }, {
            OLLAMA_API_KEY: 'test-key',
            OLLAMA_BASE_URL: 'https://api.ollama.com/v1',
            NODE_ENV: 'production'
        });
        assert.equal(response.status, 200);
        assert.equal(upstreamUrl, 'https://ollama.com/api/chat');
        assert.equal((await response.text()).trim(), '{"text":"Hello"}\n{"text":" world"}');
        assert.equal(upstreamBody.messages[0].content.includes('Invented client context'), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('rejects invalid content types and oversized payloads', async () => {
    const invalidType = await chatHandler(new Request('http://localhost/api/chat', {
        method: 'POST',
        body: '{}'
    }), { ip: 'test-content-type' });
    assert.equal(invalidType.status, 415);

    const oversized = await chatHandler(new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'x'.repeat(9000) })
    }), { ip: 'test-oversized' });
    assert.equal(oversized.status, 413);
});
