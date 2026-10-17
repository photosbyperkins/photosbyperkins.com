// In Vitest's vmThreads pool, globalThis is happy-dom's Window object, which does
// not expose Node's Web Streams CompressionStream / DecompressionStream APIs.
const nodeProcess = (
    globalThis as unknown as {
        process?: { getBuiltinModule?: (id: string) => Record<string, unknown> | undefined };
    }
).process;

if (typeof globalThis.CompressionStream === 'undefined') {
    const webStreams = nodeProcess?.getBuiltinModule?.('node:stream/web');
    if (webStreams?.CompressionStream && webStreams?.DecompressionStream) {
        Object.assign(globalThis, {
            CompressionStream: webStreams.CompressionStream,
            DecompressionStream: webStreams.DecompressionStream,
        });
    }
}

// In vmThreads, Buffer inherits from Node's outer-realm Uint8Array while test code
// checks instanceof against the VM context's Uint8Array. Bridge Symbol.hasInstance
// so Node Buffers and outer-realm Uint8Arrays pass `instanceof Uint8Array`.
const nodeBuffer = (globalThis as unknown as { Buffer?: { prototype: object } }).Buffer;
const NodeUint8Array = nodeBuffer
    ? (Object.getPrototypeOf(nodeBuffer.prototype).constructor as typeof Uint8Array)
    : globalThis.Uint8Array;

if (globalThis.Uint8Array !== NodeUint8Array) {
    const VmUint8Array = globalThis.Uint8Array;
    Object.defineProperty(VmUint8Array, Symbol.hasInstance, {
        value: (instance: unknown) =>
            Function.prototype[Symbol.hasInstance].call(VmUint8Array, instance) ||
            Function.prototype[Symbol.hasInstance].call(NodeUint8Array, instance),
        configurable: true,
    });
}

// Replace happy-dom's live-network window.fetch (which resolves relative paths against
// http://localhost:3000 and opens real TCP sockets, causing ECONNREFUSED and teardown
// AbortErrors when tests leave fetch unmocked) with a fast-rejecting default matching
// Node's native fetch behavior on relative URLs.
globalThis.fetch = async (input: RequestInfo | URL) => {
    throw new TypeError(`Failed to parse URL from ${String(input)}`);
};
