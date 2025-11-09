/**
 * TensorFlow.js Environment Detection and Dynamic Import
 * Handles server-side (Node.js) vs client-side (browser) TensorFlow loading
 */

export const isServer = typeof window === 'undefined';

/**
 * Dynamically import the appropriate TensorFlow.js backend
 * - Server: @tensorflow/tfjs-node (native C++ bindings)
 * - Client: @tensorflow/tfjs (browser with WebGL/CPU backends)
 */
export async function loadTensorFlow() {
    if (isServer) {
        // Server-side: Use Node.js native backend
        const tf = await import('@tensorflow/tfjs-node');
        return tf;
    } else {
        // Client-side: Use browser backends
        const tf = await import('@tensorflow/tfjs');

        // Import browser-specific backends
        await import('@tensorflow/tfjs-backend-webgpu');
        await import('@tensorflow/tfjs-backend-webgl');
        await import('@tensorflow/tfjs-backend-cpu');

        return tf;
    }
}

/**
 * Load Universal Sentence Encoder model
 * Works in both server and client environments
 */
export async function loadUniversalSentenceEncoder() {
    // Ensure TensorFlow is loaded first
    await loadTensorFlow();

    // Load the model (works with both backends)
    const use = await import('@tensorflow-models/universal-sentence-encoder');
    return use;
}

/**
 * Initialize TensorFlow.js with the appropriate backend
 */
export async function initializeTensorFlow() {
    const tf = await loadTensorFlow();

    if (isServer) {
        // Server: tfjs-node automatically uses native backend
        console.log('[TensorFlow] Initializing Node.js backend...');
        await tf.ready();
        console.log('[TensorFlow] Backend ready:', tf.getBackend());
    } else {
        // Client: Try to use the best available backend
        console.log('[TensorFlow] Initializing browser backend...');

        // Try WebGPU first (fastest), then WebGL, then CPU
        try {
            if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
                await tf.setBackend('webgpu');
                console.log('[TensorFlow] Using WebGPU backend');
            } else {
                await tf.setBackend('webgl');
                console.log('[TensorFlow] Using WebGL backend');
            }
        } catch (error) {
            console.warn('[TensorFlow] WebGPU/WebGL failed, falling back to CPU:', error);
            await tf.setBackend('cpu');
            console.log('[TensorFlow] Using CPU backend');
        }

        await tf.ready();
    }

    return tf;
}
