import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.mjs';

test('Worker routes chat requests to the shared handler', async () => {
    const response = await worker.fetch(new Request('https://omid-os.dev/api/chat', {
        method: 'POST',
        body: '{}'
    }), {
        ASSETS: { fetch: () => assert.fail('chat request reached static assets') }
    });

    assert.equal(response.status, 415);
});

test('Worker delegates non-API requests to static assets', async () => {
    const request = new Request('https://omid-os.dev/projects');
    let forwardedRequest;
    const response = await worker.fetch(request, {
        ASSETS: {
            fetch(value) {
                forwardedRequest = value;
                return new Response('asset');
            }
        }
    });

    assert.equal(forwardedRequest, request);
    assert.equal(await response.text(), 'asset');
});
