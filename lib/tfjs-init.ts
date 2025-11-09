/**
 * TensorFlow.js initialization utilities
 * This file is for client-side (browser) usage only
 * For server-side initialization, use the tfjs-env helper in ai/rag/
 */

import { initializeTensorFlow, isServer } from '../ai/rag/tfjs-env';

/**
 * Initialise TensorFlow.js avec le meilleur backend disponible
 * Ordre de préférence : WebGPU > WebGL > CPU
 * @returns Le nom du backend utilisé
 * @throws Error if called on server-side
 */
export async function initTfjsBackend(): Promise<string> {
  if (isServer) {
    throw new Error('initTfjsBackend() should only be called on the client-side. Use the RAG service initialization for server-side TensorFlow.js.');
  }

  const tf = await initializeTensorFlow();
  const backend = tf.getBackend();
  console.log(`✅ TensorFlow.js utilise le backend: ${backend}`);
  return backend;
}

/**
 * Vérifie si WebGPU est disponible
 */
export function isWebGPUAvailable(): boolean {
  if (isServer) {
    return false;
  }
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Récupère les informations sur le backend actuel
 * @throws Error if called on server-side
 */
export async function getTfjsBackendInfo() {
  if (isServer) {
    throw new Error('getTfjsBackendInfo() should only be called on the client-side.');
  }

  // Dynamically import tf only on client-side
  const tf = await import('@tensorflow/tfjs');
  const backend = tf.getBackend();
  const memory = tf.memory();

  return {
    backend,
    numTensors: memory.numTensors,
    numDataBuffers: memory.numDataBuffers,
    numBytes: memory.numBytes,
    unreliable: memory.unreliable,
  };
}
