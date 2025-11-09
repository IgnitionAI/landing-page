# RAG Service - TensorFlow.js Dual Environment Support

Ce service RAG (Retrieval-Augmented Generation) fonctionne maintenant dans **deux environnements** :
- **Serveur Node.js** (API routes Next.js)
- **Client navigateur** (composants React)

## Architecture

### Fichiers principaux

- **[tfjs-env.ts](tfjs-env.ts)** - Helper de détection d'environnement et chargement dynamique de TensorFlow.js
- **[rag-service.ts](rag-service.ts)** - Service RAG avec support dual environment
- **[lib/tfjs-init.ts](../../lib/tfjs-init.ts)** - Utilitaires d'initialisation TensorFlow.js (client uniquement)

### Comment ça fonctionne

Le système détecte automatiquement l'environnement d'exécution et charge le backend TensorFlow.js approprié :

| Environnement | Backend utilisé | Packages |
|---------------|----------------|----------|
| **Node.js** (serveur) | `tensorflow` (natif C++) | `@tensorflow/tfjs-node` |
| **Browser** (client) | `webgpu` / `webgl` / `cpu` | `@tensorflow/tfjs` + backends navigateur |

### Backends par ordre de préférence

**Côté serveur (Node.js) :**
1. Backend natif TensorFlow (C++ bindings)

**Côté client (Browser) :**
1. WebGPU (le plus rapide, si disponible)
2. WebGL (fallback rapide)
3. CPU (fallback de dernier recours)

## Installation

Le package `@tensorflow/tfjs-node` nécessite la compilation de bindings natifs. Après installation :

```bash
pnpm install
# Les bindings natifs sont automatiquement construits lors de l'installation
```

Si vous rencontrez des erreurs avec les bindings natifs, reconstruisez-les :

```bash
cd node_modules/.pnpm/@tensorflow+tfjs-node@*/node_modules/@tensorflow/tfjs-node
npm install --build-from-source
```

## Utilisation

### Côté serveur (API Routes)

```typescript
import { ragService } from '@/ai/rag/rag-service';

// Le service s'initialise automatiquement avec tfjs-node
await ragService.initialize();

// Recherche sémantique
const results = await ragService.search('ma requête', 5);

// Ajouter un vecteur
const vectorId = await ragService.addVector('mon texte', { metadata: 'value' });
```

### Côté client (Composants React)

```typescript
'use client';

import { ragService } from '@/ai/rag/rag-service';
import { useEffect } from 'react';

export function MyComponent() {
  useEffect(() => {
    // Le service s'initialise automatiquement avec tfjs navigateur
    ragService.initialize().then(() => {
      console.log('RAG prêt côté client');
    });
  }, []);

  // Utilisation identique au serveur
  const handleSearch = async () => {
    const results = await ragService.search('ma requête', 5);
    console.log(results);
  };

  return <button onClick={handleSearch}>Rechercher</button>;
}
```

## Logs de débogage

Le service affiche des logs détaillés pour le débogage :

```
[RAG] Initializing TensorFlow.js on server (Node.js)...
[TensorFlow] Initializing Node.js backend...
[TensorFlow] Backend ready: tensorflow
[RAG] TensorFlow.js backend ready: tensorflow
[RAG] Loading Universal Sentence Encoder...
[RAG] Model loaded successfully
[RAG] Initialized with 136 vectors on server (Node.js)
```

## Performance

| Environnement | Temps d'initialisation | Performance embedding |
|---------------|------------------------|----------------------|
| **Node.js** | ~2-3s (première fois) | Très rapide (natif) |
| **Browser (WebGPU)** | ~3-5s | Rapide (GPU) |
| **Browser (WebGL)** | ~3-5s | Moyen (GPU) |
| **Browser (CPU)** | ~3-5s | Lent (CPU) |

## Dépendances

```json
{
  "@tensorflow/tfjs": "^4.22.0",
  "@tensorflow/tfjs-node": "^4.22.0",
  "@tensorflow/tfjs-backend-cpu": "^4.22.0",
  "@tensorflow/tfjs-backend-webgl": "^4.22.0",
  "@tensorflow/tfjs-backend-webgpu": "^4.22.0",
  "@tensorflow-models/universal-sentence-encoder": "^1.3.3"
}
```

## Limitations connues

1. **Premier chargement** : Le modèle Universal Sentence Encoder (~50MB) doit être téléchargé la première fois
2. **Mémoire** : Le modèle prend environ 100-150MB de RAM une fois chargé
3. **Compatibilité** : WebGPU n'est disponible que sur les navigateurs récents (Chrome 113+, Edge 113+)

## Résolution des problèmes

### Erreur : "Cannot find tfjs_binding.node"

Reconstruisez les bindings natifs :

```bash
cd node_modules/.pnpm/@tensorflow+tfjs-node@*/node_modules/@tensorflow/tfjs-node
npm install --build-from-source
```

### Erreur : "WebGL is not supported"

Le navigateur tente d'utiliser WebGL mais échoue. Le système devrait automatiquement fallback sur CPU.

### Performance lente côté client

Vérifiez quel backend est utilisé :

```typescript
import { getTfjsBackendInfo } from '@/lib/tfjs-init';

const info = await getTfjsBackendInfo();
console.log('Backend actuel:', info.backend); // Devrait être 'webgpu' ou 'webgl'
```

## Tests

Un script de test complet est disponible pour vérifier le bon fonctionnement :

```typescript
// Créer un fichier test.mjs
import { ragService } from './ai/rag/rag-service.ts';

await ragService.initialize();
const results = await ragService.search('test', 5);
console.log('Résultats:', results);
```

```bash
npx tsx test.mjs
```
