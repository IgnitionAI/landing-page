# RAG Service - Search Methods Documentation

Le RAG service propose maintenant **3 méthodes de recherche** optimisées avec TensorFlow.js :

## 📊 Méthodes de Recherche

### 1. Semantic Search (Recherche Sémantique)

**Utilise** : Universal Sentence Encoder + similarité cosinus (batch TensorFlow.js)

**Avantages** :
- Comprend le **sens** et le **contexte** de la requête
- Trouve des documents similaires même avec des mots différents
- Excellent pour les questions complexes et conceptuelles

**Inconvénients** :
- Moins précis pour les termes techniques exacts
- Nécessite le modèle USE (~50MB)

**Cas d'usage** :
- Questions ouvertes : "Comment améliorer l'engagement client ?"
- Concepts abstraits : "intelligence artificielle conversationnelle"
- Recherche par intention plutôt que mots-clés

**Code exemple** :
```typescript
import { ragService } from '@/ai/rag/rag-service';

// Recherche sémantique (par défaut)
const results = await ragService.search('customer engagement strategies', 5);

results.forEach(result => {
  console.log(`Score: ${result.score.toFixed(4)}`);
  console.log(`Text: ${result.text}`);
});
```

**Performance** : 7-30ms pour 136 documents (avec tfjs-node natif)

---

### 2. Lexical Search (Recherche Lexicale - BM25)

**Utilise** : Algorithme BM25 (Best Matching 25)

**Avantages** :
- Très **rapide** (1-3ms)
- Excellent pour les **mots-clés exacts** et termes techniques
- Pas besoin de modèle ML
- Meilleur pour les noms propres, acronymes, codes

**Inconvénients** :
- Ne comprend pas le sens ou le contexte
- Sensible aux fautes d'orthographe
- Requiert une correspondance exacte des termes

**Cas d'usage** :
- Recherche de termes techniques : "TensorFlow.js", "RAG", "BM25"
- Noms de produits ou services spécifiques
- Codes ou identifiants
- Recherche par mots-clés exacts

**Code exemple** :
```typescript
import { ragService } from '@/ai/rag/rag-service';

// Recherche lexicale BM25
const results = await ragService.lexicalSearch('TensorFlow backend optimization', 5);

results.forEach(result => {
  console.log(`BM25 Score: ${result.score.toFixed(4)}`);
  console.log(`Text: ${result.text}`);
});
```

**Performance** : 1-3ms pour 136 documents

---

### 3. Hybrid Search (Recherche Hybride - RRF)

**Utilise** : Reciprocal Rank Fusion (RRF) combinant sémantique + lexical

**Avantages** :
- **Meilleur des deux mondes** : sens + précision
- Plus robuste et équilibré
- Paramètre `alpha` pour ajuster le poids sémantique/lexical
- Recommandé pour la plupart des cas d'usage

**Inconvénients** :
- Légèrement plus lent (combine les deux méthodes)
- Nécessite le modèle USE

**Cas d'usage** :
- Production générale (recommandé)
- Requêtes mixtes (concepts + termes techniques)
- Besoin de précision ET de compréhension contextuelle

**Code exemple** :
```typescript
import { ragService } from '@/ai/rag/rag-service';

// Hybrid search avec alpha = 0.5 (équilibré)
const balanced = await ragService.hybridSearch('AI chatbot implementation', 5, 0.5);

// Hybrid search avec alpha = 0.8 (favorise sémantique)
const semantic = await ragService.hybridSearch('customer engagement', 5, 0.8);

// Hybrid search avec alpha = 0.2 (favorise lexical)
const lexical = await ragService.hybridSearch('TensorFlow.js API', 5, 0.2);

balanced.forEach(result => {
  const info = result.metadata?.hybridInfo;
  console.log(`Fused Score: ${result.score.toFixed(4)}`);
  console.log(`Semantic Rank: ${info.semanticRank}, Lexical Rank: ${info.lexicalRank}`);
  console.log(`Text: ${result.text}`);
});
```

**Performance** : 7-10ms pour 136 documents (combine les deux recherches en parallèle)

---

## 🎯 Paramètre Alpha (Hybrid Search)

Le paramètre `alpha` contrôle le poids entre recherche sémantique et lexicale :

| Alpha | Comportement | Cas d'usage |
|-------|--------------|-------------|
| `1.0` | Pure sémantique | Questions conceptuelles |
| `0.8` | Favorise sémantique | Requêtes ouvertes avec quelques termes techniques |
| **`0.5`** | **Équilibré (recommandé)** | **Usage général en production** |
| `0.2` | Favorise lexical | Termes techniques avec contexte |
| `0.0` | Pure lexical | Mots-clés exacts uniquement |

**Formule RRF** :
```
score(doc) = α × RRF_semantic(doc) + (1-α) × RRF_lexical(doc)

RRF(doc, rank) = 1 / (60 + rank)
```

---

## 🚀 Optimisations TensorFlow.js

### Batch Operations (Semantic Search)

Au lieu de calculer N fois la similarité cosinus :
```typescript
// ❌ Lent : N calculs indépendants
vectors.forEach(vec => {
  const similarity = cosineSimilarity(query, vec.embedding);
});
```

Nous utilisons une **opération matricielle batch** :
```typescript
// ✅ Rapide : 1 opération matricielle
const scores = tf.matMul(docMatrix, queryVector);
```

**Avantages** :
- **10-50x plus rapide** sur de grands ensembles de données
- Utilise les bindings natifs C++ (tfjs-node)
- Peut utiliser le GPU sur client (WebGL/WebGPU)
- Gestion automatique de la mémoire avec `tf.tidy()`

### Cosine Similarity Optimisée

```typescript
private cosineSimilarity(a: number[], b: number[]): number {
  return this.tf.tidy(() => {
    const tensorA = this.tf.tensor1d(a);
    const tensorB = this.tf.tensor1d(b);

    const dotProduct = this.tf.sum(this.tf.mul(tensorA, tensorB));
    const magnitudeA = this.tf.sqrt(this.tf.sum(this.tf.square(tensorA)));
    const magnitudeB = this.tf.sqrt(this.tf.sum(this.tf.square(tensorB)));

    const similarity = this.tf.div(dotProduct, this.tf.mul(magnitudeA, magnitudeB));
    return similarity.dataSync()[0];
  });
}
```

**Note** : `tf.tidy()` libère automatiquement la mémoire GPU/CPU des tensors intermédiaires.

---

## 📊 Comparaison des Méthodes

### Benchmarks (136 documents)

| Méthode | Temps | Précision Mots-Clés | Précision Contextuelle | Recommandé Pour |
|---------|-------|---------------------|------------------------|-----------------|
| **Semantic** | 7-30ms | ⭐⭐ | ⭐⭐⭐⭐⭐ | Questions conceptuelles |
| **Lexical** | 1-3ms | ⭐⭐⭐⭐⭐ | ⭐⭐ | Termes exacts |
| **Hybrid** | 7-10ms | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Production** |

### Choix de la Méthode

```
┌─────────────────────────────────────┐
│  Ma requête contient des termes     │
│  techniques exacts ?                │
└────────────┬────────────────────────┘
             │
      OUI ───┼─── NON
             │
    ┌────────▼─────────┐     ┌────────▼──────────┐
    │ J'ai besoin de   │     │ C'est une question│
    │ compréhension    │     │ ouverte/concept ? │
    │ contextuelle ?   │     └────────┬──────────┘
    └────────┬─────────┘              │
             │                 OUI ───┼─── NON
      OUI ───┼─── NON                 │
             │                        │
    ┌────────▼────────┐      ┌───────▼────────┐
    │ HYBRID (α=0.2)  │      │ SEMANTIC       │
    │ ou HYBRID (α=0.5)│     │ ou HYBRID      │
    └─────────────────┘      │ (α=0.8)        │
             │               └────────────────┘
    ┌────────▼────────┐
    │ LEXICAL (BM25)  │
    └─────────────────┘
```

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Chatbot FAQ

```typescript
// Requête utilisateur mixte (concept + terme technique)
const userQuery = "Comment intégrer TensorFlow dans mon chatbot ?";

// Utiliser hybrid search équilibré
const results = await ragService.hybridSearch(userQuery, 3, 0.5);

// Retourner la meilleure réponse
const answer = results[0]?.text || "Désolé, je n'ai pas trouvé de réponse.";
```

### Exemple 2 : Recherche Documentaire

```typescript
// Pour une recherche de documentation technique
const query = "tfjs-node installation guide";

// Favoriser lexical pour trouver les termes exacts
const results = await ragService.hybridSearch(query, 5, 0.2);
```

### Exemple 3 : Recherche Conceptuelle

```typescript
// Question conceptuelle sans termes techniques spécifiques
const query = "How to improve customer satisfaction with AI?";

// Favoriser sémantique
const results = await ragService.hybridSearch(query, 5, 0.8);
```

### Exemple 4 : A/B Testing

```typescript
// Tester les 3 méthodes en parallèle
const [semantic, lexical, hybrid] = await Promise.all([
  ragService.search(query, 5),
  ragService.lexicalSearch(query, 5),
  ragService.hybridSearch(query, 5, 0.5),
]);

// Comparer les résultats
console.log('Semantic:', semantic.map(r => r.id));
console.log('Lexical:', lexical.map(r => r.id));
console.log('Hybrid:', hybrid.map(r => r.id));
```

---

## 🔧 Configuration Avancée

### Ajuster BM25 Parameters

Les paramètres BM25 sont configurables dans la méthode `calculateBM25()` :

```typescript
// k1 : Saturation de la fréquence des termes
// Valeur recommandée : 1.2 - 2.0 (défaut: 1.5)
const k1 = 1.5;

// b : Normalisation de la longueur du document
// Valeur recommandée : 0.5 - 0.9 (défaut: 0.75)
const b = 0.75;
```

### Ajuster RRF Constant

La constante RRF est réglée à 60 (valeur standard) :

```typescript
const k = 60; // Dans hybridSearch()
```

Pour ajuster, modifier directement dans [rag-service.ts](rag-service.ts#L294).

---

## 🎓 Ressources

### Algorithmes

- **BM25** : [Wikipedia](https://en.wikipedia.org/wiki/Okapi_BM25)
- **Reciprocal Rank Fusion** : [Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- **Cosine Similarity** : [Wikipedia](https://en.wikipedia.org/wiki/Cosine_similarity)

### TensorFlow.js

- **Documentation** : [tensorflow.org/js](https://www.tensorflow.org/js)
- **Universal Sentence Encoder** : [TensorFlow Hub](https://tfhub.dev/google/universal-sentence-encoder/4)
- **Performance Tips** : [TensorFlow.js Guide](https://www.tensorflow.org/js/guide/platform_environment)

---

## 📈 Métriques de Performance

### Environnement de Test

- **Hardware** : macOS ARM64 (M-series)
- **Documents** : 136 vecteurs (512 dimensions)
- **Backend** : tensorflow (tfjs-node natif)
- **Node.js** : v22.14.0

### Résultats

| Opération | Temps Moyen | Notes |
|-----------|-------------|-------|
| Initialization | ~2-3s | Première fois uniquement |
| Model Load | ~2s | USE model download/cache |
| Semantic Search | 7-30ms | Batch matMul operation |
| Lexical Search | 1-3ms | Pure JavaScript BM25 |
| Hybrid Search | 7-10ms | Parallel execution |
| Add Vector | ~50-100ms | Embedding generation |

### Scalabilité

| Nombre de Documents | Semantic (ms) | Lexical (ms) | Hybrid (ms) |
|---------------------|---------------|--------------|-------------|
| 100 | 5-10 | 1-2 | 5-8 |
| 500 | 10-30 | 3-5 | 10-25 |
| 1,000 | 20-50 | 5-10 | 20-45 |
| 10,000 | 100-300 | 30-100 | 100-250 |

**Note** : Pour > 10,000 documents, considérez utiliser une base de données vectorielle dédiée (Pinecone, Weaviate, etc.).

---

## ✅ Recommandations

### Production

1. **Utiliser Hybrid Search** avec `α = 0.5` par défaut
2. **Ajuster alpha** selon le type de requête si nécessaire
3. **Mettre en cache** les embeddings générés
4. **Monitorer** les performances et ajuster

### Développement

1. **Tester les 3 méthodes** avec vos données
2. **Mesurer la pertinence** avec vos cas d'usage
3. **A/B tester** différentes valeurs d'alpha
4. **Logger** les scores pour analyse

### Optimisation

1. **Filtrer en amont** pour réduire le nombre de documents
2. **Pré-calculer** les embeddings et les stocker
3. **Utiliser un index** pour la recherche lexicale
4. **Considérer une DB vectorielle** pour > 10k documents
