/**
 * TensorFlow.js Environment Detection and Dynamic Import
 * Handles server-side (Node.js) vs client-side (browser) TensorFlow loading
 */

export const isServer = typeof window === 'undefined';
export const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

/**
 * Dynamically import the appropriate TensorFlow.js backend
 * - Server (Vercel/Serverless): @tensorflow/tfjs with CPU backend (no native bindings)
 * - Server (Local): @tensorflow/tfjs-node (native C++ bindings for performance)
 * - Client: @tensorflow/tfjs (browser with WebGL/CPU backends)
 */
export async function loadTensorFlow() {
    if (isServer) {
        // On Vercel/serverless: Use vanilla TensorFlow.js (no native bindings)
        if (isVercel) {
            console.log('[TensorFlow] Detected Vercel environment, using CPU backend');
            const tf = await import('@tensorflow/tfjs');
            await import('@tensorflow/tfjs-backend-cpu');
            return tf;
        }

        // Local development: Try to use Node.js native backend
        try {
            const tf = await import('@tensorflow/tfjs-node');
            console.log('[TensorFlow] Using tfjs-node with native backend');
            return tf;
        } catch (error) {
            // Fallback to vanilla TensorFlow.js if tfjs-node is not available
            console.warn('[TensorFlow] tfjs-node not available, falling back to CPU backend:', error);
            const tf = await import('@tensorflow/tfjs');
            await import('@tensorflow/tfjs-backend-cpu');
            return tf;
        }
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
        if (isVercel) {
            // Vercel: Force CPU backend (no native bindings available)
            console.log('[TensorFlow] Initializing Vercel CPU backend...');
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('[TensorFlow] Backend ready:', tf.getBackend());
        } else {
            // Local server: tfjs-node automatically uses native backend
            console.log('[TensorFlow] Initializing Node.js backend...');
            await tf.ready();
            console.log('[TensorFlow] Backend ready:', tf.getBackend());
        }
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
