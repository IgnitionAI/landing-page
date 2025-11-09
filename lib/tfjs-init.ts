import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

/**
 * Initialise TensorFlow.js avec le meilleur backend disponible
 * Ordre de préférence : WebGPU > WebGL > CPU
 * @returns Le nom du backend utilisé
 */
export async function initTfjsBackend(): Promise<string> {
  // Liste des backends par ordre de préférence
  const backends = ['webgpu', 'webgl', 'cpu'];

  // Vérifier quels backends sont disponibles
  const availableBackends = backends.filter(b => tf.findBackend(b) !== undefined);
  console.log('Backends disponibles:', availableBackends);

  for (const backend of availableBackends) {
    try {
      await tf.setBackend(backend);
      await tf.ready();
      const currentBackend = tf.getBackend();
      console.log(`✅ TensorFlow.js utilise le backend: ${currentBackend}`);
      return currentBackend;
    } catch (error) {
      console.warn(`Impossible d'initialiser le backend ${backend}:`, error);
      continue;
    }
  }

  throw new Error('Aucun backend TensorFlow.js disponible');
}

/**
 * Vérifie si WebGPU est disponible
 */
export function isWebGPUAvailable(): boolean {
  return 'gpu' in navigator;
}

/**
 * Récupère les informations sur le backend actuel
 */
export function getTfjsBackendInfo() {
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
