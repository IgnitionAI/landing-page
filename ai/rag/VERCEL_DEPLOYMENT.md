# Déploiement sur Vercel - TensorFlow.js

## 🎯 Problème

TensorFlow.js Node (`@tensorflow/tfjs-node`) nécessite des binaires natifs C++ qui **ne peuvent pas fonctionner sur Vercel** car :

1. Vercel utilise AWS Lambda (environnement read-only)
2. Les binaires natifs doivent être compilés à la construction
3. L'architecture Lambda diffère de l'environnement de build

## ✅ Solution Implémentée

Nous utilisons une **détection d'environnement automatique** dans `ai/rag/tfjs-env.ts` :

```typescript
export const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
```

### Comportement selon l'environnement

| Environnement | Backend TensorFlow | Performance | Binaires Natifs |
|---------------|-------------------|-------------|-----------------|
| **Local Dev** | `@tensorflow/tfjs-node` | ⚡ Très rapide (~7-30ms) | ✅ Oui |
| **Vercel Production** | `@tensorflow/tfjs` (CPU) | 🐢 Plus lent (~100-500ms) | ❌ Non |
| **Browser** | `@tensorflow/tfjs` (WebGL/WebGPU) | ⚡ Rapide | ❌ Non |

### Code de Détection

```typescript
export async function loadTensorFlow() {
    if (isServer) {
        if (isVercel) {
            // Vercel: Utilise CPU backend vanilla (pas de binaires natifs)
            console.log('[TensorFlow] Detected Vercel environment, using CPU backend');
            const tf = await import('@tensorflow/tfjs');
            await import('@tensorflow/tfjs-backend-cpu');
            return tf;
        }

        // Local: Tente d'utiliser tfjs-node natif
        try {
            const tf = await import('@tensorflow/tfjs-node');
            return tf;
        } catch (error) {
            // Fallback si tfjs-node n'est pas disponible
            const tf = await import('@tensorflow/tfjs');
            await import('@tensorflow/tfjs-backend-cpu');
            return tf;
        }
    }
    // ...
}
```

## 📊 Impact Performance

### Opérations RAG Typiques

| Opération | Local (tfjs-node) | Vercel (CPU) | Différence |
|-----------|-------------------|--------------|------------|
| **Embedding 1 query** | 10-15ms | 100-200ms | ~10x plus lent |
| **Semantic search (100 docs)** | 20-50ms | 200-500ms | ~10x plus lent |
| **Batch embeddings (10 queries)** | 50-100ms | 500-1000ms | ~10x plus lent |

### Latence Totale API `/api/chat`

- **Sans Query Enhancement** : +200-500ms sur Vercel
- **Avec Query Enhancement** : Impact négligeable (latence LLM >> latence embeddings)

## 🚀 Optimisations Possibles

### 1. Cache des Embeddings ✅ **RECOMMANDÉ**

Stocker les embeddings pré-calculés dans Azure Table Storage :

```typescript
// Lors de l'indexation (une fois)
const embedding = await model.embed(text);
await storeEmbedding(docId, embedding);

// Lors de la recherche (rapide)
const cachedEmbeddings = await getEmbeddings(allDocIds);
// Pas besoin de recalculer !
```

**Gain** : 0ms pour les embeddings des documents (déjà en cache)

### 2. API Externe pour Embeddings

Utiliser un service externe comme :
- **OpenAI Embeddings API** (`text-embedding-3-small`)
- **Cohere Embed API**
- **Hugging Face Inference API**

```typescript
// Exemple OpenAI
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: query,
});
const embedding = response.data[0].embedding;
```

**Avantages** :
- ✅ Très rapide (~50-100ms)
- ✅ Pas de calcul côté serveur
- ✅ Fonctionne partout

**Inconvénients** :
- ❌ Coût par requête
- ❌ Dépendance externe

### 3. Edge Runtime avec Cloudflare Workers

Déployer sur Cloudflare Workers avec WebAssembly :
- Supporte TensorFlow.js WASM
- Plus rapide que CPU vanilla
- ~50-100ms par embedding

## 🔍 Vérification du Déploiement

### Logs Vercel

Vous devriez voir dans les logs :

```
[TensorFlow] Detected Vercel environment, using CPU backend
[TensorFlow] Initializing Vercel CPU backend...
[TensorFlow] Backend ready: cpu
```

### Tester Localement avec Simulation Vercel

```bash
# Simule l'environnement Vercel
export VERCEL=1
pnpm dev
```

Vous devriez voir :
```
[TensorFlow] Detected Vercel environment, using CPU backend
```

## 📦 Dépendances Requises

Dans `package.json` :

```json
{
  "dependencies": {
    "@tensorflow/tfjs": "^4.22.0",
    "@tensorflow/tfjs-backend-cpu": "^4.22.0",
    "@tensorflow/tfjs-backend-webgl": "^4.22.0",
    "@tensorflow/tfjs-backend-webgpu": "^4.22.0",
    "@tensorflow/tfjs-node": "^4.22.0",  // Optionnel pour local
    "@tensorflow-models/universal-sentence-encoder": "^2.3.2"
  }
}
```

## ⚠️ Limitations Connues

### 1. Performance Réduite sur Vercel

Le CPU backend est **~10x plus lent** que tfjs-node natif.

**Solution** : Implémenter le caching des embeddings (recommandé)

### 2. Cold Start

Premier appel après déploiement : ~2-5s (chargement du modèle USE)

**Solution** :
- Warmer function
- Edge caching
- Précalcul des embeddings

### 3. Timeout Lambda

Vercel limite les functions à 10s (plan gratuit) / 60s (plan pro)

**Solution** :
- Utiliser des embeddings pré-calculés
- Optimiser le nombre de documents recherchés

## 🎯 Recommandations de Déploiement

### Configuration Vercel

Dans `vercel.json` (optionnel) :

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "VERCEL": "1"
  }
}
```

### Variables d'Environnement

Assurez-vous que ces variables sont définies sur Vercel :

```
OPENAI_API_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_TABLE_NAME=...
```

## 📚 Ressources

- [TensorFlow.js Platforms](https://www.tensorflow.org/js/guide/platform_environment)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4)

---

**Date de création** : 9 novembre 2025
**Version** : 1.0.0
**Status** : ✅ Testé et fonctionnel sur Vercel
