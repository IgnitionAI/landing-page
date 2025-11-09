# Advanced RAG System - Documentation Complète

## 🎯 Vue d'ensemble

Le système RAG avancé implémente un pipeline sophistiqué de récupération d'information en 5 étapes :

```
User Query
    ↓
[1] Prompt Enhancement (LLM)
    → Génère 3 variations optimisées
    ↓
[2] Multi-Query Parallel Retrieval
    → 3 stratégies × 4 queries = 12 recherches parallèles
    ↓
[3] Reciprocal Rank Fusion
    → Fusion RRF + déduplication
    ↓
[4] Semantic Reranking
    → Similarité avec la query originale
    ↓
[5] Top-K Results (enrichis avec scores détaillés)
```

## 📁 Architecture des Fichiers

```
ai/rag/
├── rag-service.ts          # Service RAG de base (semantic, lexical, hybrid)
├── prompt-enhancer.ts      # [NOUVEAU] Query enhancement via LLM
├── advanced-retrieval.ts   # [NOUVEAU] Pipeline avancé complet
└── ADVANCED_RAG.md        # Cette documentation
```

## 🔧 Composants

### 1. Prompt Enhancer (`prompt-enhancer.ts`)

**Rôle** : Transforme une query simple en 3 variations optimisées

**Fonctionnement** :
- Détecte automatiquement la thématique (AI services, chatbot, RAG, multi-agent, général)
- Utilise GPT-4o-mini pour générer 3 variations
- Chaque variation capture un aspect différent :
  1. **Variation 1** : Perspective conceptuelle large
  2. **Variation 2** : Détails techniques spécifiques
  3. **Variation 3** : Applications pratiques et cas d'usage

**Templates Thématiques** :
```typescript
{
  ai_services: "AI consulting, ML solutions, LLM applications...",
  chatbot: "Conversational AI, NLP, customer service automation...",
  rag_systems: "RAG architecture, vector DBs, semantic search...",
  multi_agent: "Multi-agent systems, coordination, distributed AI...",
  general: "General AI and technology topics"
}
```

**Exemple** :
```typescript
Input: "chatbot implementation"

Output (Enhanced):
{
  original: "chatbot implementation",
  variations: [
    "best practices for chatbot implementation in customer service",
    "technical architecture for building a robust chatbot system",
    "case studies of successful chatbot integration in businesses"
  ],
  thematic: "chatbot",
  confidence: 0.9
}
```

**Performance** : ~1.7s (appel LLM)

**Fallback** : Si le LLM échoue, génère des variations simples sans LLM

---

### 2. Advanced Retrieval (`advanced-retrieval.ts`)

**Rôle** : Orchestre le pipeline complet de récupération

#### Étape 2.1 : Multi-Query Parallel Retrieval

Pour chaque query (originale + 3 variations = 4 queries), lance **3 recherches en parallèle** :

| Stratégie | Alpha | Comportement |
|-----------|-------|--------------|
| **Hybrid 1** | α=0.3 | Lexical-heavy (précision mots-clés) |
| **Hybrid 2** | α=0.7 | Semantic-heavy (compréhension contextuelle) |
| **Semantic** | 1.0 | Pure similarité vectorielle |

**Total** : 4 queries × 3 stratégies = **12 recherches parallèles**

**Performance** : 100-300ms grâce à l'exécution parallèle

#### Étape 2.2 : Reciprocal Rank Fusion (RRF)

**Formule RRF** :
```
score(doc) = Σ (1 / (k + rank))

k = 60 (constante RRF standard)
rank = position dans la liste de résultats
```

**Processus** :
1. Agrège les scores de toutes les 12 listes de résultats
2. Déduplique par ID de document
3. Somme les scores RRF pour chaque document
4. Garde les rangs de chaque stratégie pour analyse

**Avantage** : Robuste aux différences d'échelle entre stratégies

#### Étape 2.3 : Semantic Reranking

**Objectif** : S'assurer que les résultats finaux sont pertinents pour la query **originale**

**Méthode** :
1. Calcule la similarité cosinus entre :
   - Embedding de la query originale
   - Embedding de chaque document résultat
2. Score final = **70% rerank + 30% fusion**
   - 70% = pertinence directe à la query
   - 30% = consensus multi-stratégies

**Formule** :
```typescript
finalScore = 0.7 × similarity(query, doc) + 0.3 × fusedScore
```

**Performance** : ~13ms avec TensorFlow.js

---

## 🚀 Utilisation

### Via l'Agent LangChain

L'agent dispose de 2 tools :

#### 1. `search_knowledge_base` (Simple)
```typescript
// Pour recherches simples et rapides
{
  name: "search_knowledge_base",
  params: {
    query: string,
    topK?: number
  }
}
```

#### 2. `advanced_knowledge_search` (Recommandé)
```typescript
// Pour recherches complexes avec meilleure pertinence
{
  name: "advanced_knowledge_search",
  params: {
    query: string,
    topK?: number,
    thematic?: "ai_services" | "chatbot" | "rag_systems" | "multi_agent" | "general",
    enableEnhancement?: boolean,  // default: true
    enableReranking?: boolean      // default: true
  }
}
```

### Code Direct

```typescript
import { advancedRetrieval } from '@/ai/rag/advanced-retrieval';

// Recherche avancée complète
const results = await advancedRetrieval.advancedSearch(
  "How to implement a chatbot?",
  {
    topK: 5,
    thematic: 'chatbot',      // Optionnel, auto-détecté si absent
    enableEnhancement: true,
    enableReranking: true,
    alpha1: 0.3,             // Hybrid lexical-heavy
    alpha2: 0.7,             // Hybrid semantic-heavy
  }
);

// Résultats enrichis
results.forEach(result => {
  console.log('Text:', result.text);
  console.log('Final Score:', result.scores.finalScore);
  console.log('Fusion Score:', result.scores.fusedScore);
  console.log('Rerank Score:', result.scores.rerankScore);
  console.log('Source Scores:', result.scores.sourceScores);
  console.log('Retrieved By:', result.retrievedBy);
});
```

---

## 📊 Scores Détaillés

Chaque résultat contient des informations complètes sur son scoring :

```typescript
interface AdvancedSearchResult {
  id: string;
  text: string;
  score: number;              // Alias de finalScore
  metadata?: Record<string, any>;

  scores: {
    finalScore: number;       // Score final (70% rerank + 30% fusion)
    rerankScore?: number;     // Similarité avec query originale
    fusedScore: number;       // Score RRF fusionné

    sourceScores: {
      hybrid1?: number;       // Score RRF de hybrid α=0.3
      hybrid2?: number;       // Score RRF de hybrid α=0.7
      semantic?: number;      // Score RRF de semantic
    };

    ranks: {
      hybrid1?: number;       // Rang dans hybrid α=0.3
      hybrid2?: number;       // Rang dans hybrid α=0.7
      semantic?: number;      // Rang dans semantic
    };
  };

  retrievedBy: string[];      // Ex: ["hybrid1_q0", "hybrid2_q1", "semantic_q0"]
}
```

**Exemple** :
```json
{
  "id": "services_rag_title",
  "text": "Enterprise RAG Systems...",
  "scores": {
    "finalScore": 0.1311,
    "rerankScore": 0.1311,
    "fusedScore": 0.1311,
    "sourceScores": {
      "hybrid1": 0.0656,
      "hybrid2": 0.0656
    },
    "ranks": {
      "hybrid1": 1,
      "hybrid2": 1
    }
  },
  "retrievedBy": [
    "hybrid1_q0", "hybrid2_q0",  // Query originale
    "hybrid1_q1", "hybrid2_q1",  // Variation 1
    "hybrid1_q2", "hybrid2_q2",  // Variation 2
    "hybrid1_q3", "hybrid2_q3"   // Variation 3
  ]
}
```

---

## 📈 Performance

### Benchmarks

| Étape | Temps | % du Total |
|-------|-------|------------|
| Query Enhancement | ~1700ms | 76% |
| Multi-Query Retrieval | ~100-300ms | 13% |
| Fusion RRF | <1ms | <1% |
| Semantic Reranking | ~13ms | <1% |
| **TOTAL** | **~2000ms** | **100%** |

### Comparaison Basic vs Advanced

| Métrique | Basic Search | Advanced Search |
|----------|--------------|-----------------|
| **Temps** | 4-14ms | ~2000ms |
| **Résultats pertinents** | 0-2 | 5+ |
| **Robustesse** | Faible | Élevée |
| **Queries ambiguës** | ❌ | ✅ |
| **Multi-stratégies** | ❌ | ✅ |
| **Reranking** | ❌ | ✅ |

**Trade-off** : +2s de latence pour une pertinence nettement supérieure

---

## ⚙️ Configuration

### Paramètres par défaut

```typescript
{
  topK: 5,
  enableEnhancement: true,
  enableReranking: true,
  alpha1: 0.3,    // Hybrid lexical-heavy
  alpha2: 0.7,    // Hybrid semantic-heavy
  rerankWeight: 0.7,  // 70% rerank + 30% fusion
}
```

### Optimisation de la latence

Pour réduire la latence (~2s → ~300ms) :

```typescript
// Désactiver le query enhancement
const results = await advancedRetrieval.advancedSearch(query, {
  enableEnhancement: false,  // Saute l'appel LLM (-1.7s)
  enableReranking: true,
});

// OU utiliser basic search pour queries simples
const results = await ragService.hybridSearch(query, 5, 0.5);
```

### Ajustement des stratégies

```typescript
// Plus de poids sur le lexical (termes techniques exacts)
alpha1: 0.2,  // Très lexical-heavy
alpha2: 0.5,  // Équilibré

// Plus de poids sur le sémantique (compréhension contextuelle)
alpha1: 0.5,  // Équilibré
alpha2: 0.9,  // Très semantic-heavy
```

---

## 🎓 Cas d'Usage

### 1. Queries Ambiguës

**Problème** : "RAG" peut signifier différentes choses

**Solution** :
```typescript
const results = await advancedRetrieval.advancedSearch("RAG", {
  thematic: 'rag_systems'  // Force le contexte
});
```

Le prompt enhancement génère :
1. "RAG architecture and components"
2. "Vector databases and embeddings for RAG"
3. "Implementing RAG systems in production"

### 2. Questions Complexes

**Problème** : "How can AI improve customer engagement?" nécessite une compréhension profonde

**Solution** : Le pipeline avancé capture automatiquement :
- Aspect stratégique (AI strategies for engagement)
- Aspect technique (ML models for personalization)
- Aspect pratique (Case studies)

### 3. Recherche Multi-Domaine

**Problème** : Query qui touche plusieurs domaines

**Solution** :
```typescript
const results = await advancedRetrieval.advancedSearch(
  "AI chatbot with RAG for customer service",
  {
    thematic: 'chatbot',  // Domaine principal
    topK: 10              // Plus de résultats
  }
);
```

Le multi-query retrieval trouvera des résultats pertinents pour :
- Chatbot architecture
- RAG systems
- Customer service automation

---

## 🔍 Debugging

### Logs Détaillés

Tous les composants loguent leurs opérations :

```
[PromptEnhancer] Enhancing query with thematic: chatbot
[PromptEnhancer] Generated variations: [...]
[AdvancedRetrieval] Enhanced to 4 queries
[AdvancedRetrieval] Retrieved 54 raw results in 299ms
[AdvancedRetrieval] Fused to 19 unique results in 1ms
[AdvancedRetrieval] Reranked to top 5 in 13ms
[AdvancedRetrieval] Final results: [...]
```

### Analyse des Scores

Pour comprendre pourquoi un document est classé :

```typescript
const result = results[0];

console.log('Final Score:', result.scores.finalScore);

// Décomposition :
console.log('Rerank (70%):', result.scores.rerankScore * 0.7);
console.log('Fusion (30%):', result.scores.fusedScore * 0.3);

// Sources :
console.log('Found by:', result.retrievedBy.length, 'strategies');
console.log('Hybrid1 rank:', result.scores.ranks.hybrid1);
console.log('Hybrid2 rank:', result.scores.ranks.hybrid2);
```

---

## 🚦 Recommandations

### Quand utiliser Advanced Search

✅ **OUI** si :
- Query complexe ou ambiguë
- Besoin de haute précision
- Latence <3s acceptable
- Queries importantes (user-facing)

❌ **NON** si :
- Query simple et claire
- Besoin de latence <100ms
- Recherche interne/background
- Budget LLM limité (coût GPT-4o-mini)

### Stratégie Hybride

```typescript
// Décision automatique basée sur la complexité
const isComplex = query.split(' ').length > 5 || query.includes('?');

const results = isComplex
  ? await advancedRetrieval.advancedSearch(query, options)
  : await ragService.hybridSearch(query, topK, 0.5);
```

---

## 💰 Coûts

### LLM (Query Enhancement)

- Modèle : GPT-4o-mini
- Coût : ~$0.00015 par query
- Tokens : ~100-200 input, ~50-100 output

**Exemple** :
- 1000 queries/jour = $0.15/jour = $4.50/mois
- Négligeable pour la plupart des applications

### Calcul

- TensorFlow.js : Gratuit (local)
- Azure Table Storage : Lecture gratuite (<1M/mois)

**Coût total** : ~$5/mois pour 1000 queries/jour

---

## 🔄 Évolutions Futures

### Optimisations Possibles

1. **Cache des variations** : Stocker les query enhancements
2. **Batch processing** : Grouper plusieurs queries
3. **Streaming results** : Retourner résultats au fur et à mesure
4. **Fine-tuning** : Entraîner un petit modèle pour l'enhancement
5. **A/B Testing** : Tester différentes configurations alpha

### Extensions

1. **Filtres avancés** : Par date, catégorie, source
2. **Personnalisation** : User-specific enhancements
3. **Multi-modal** : Images + texte
4. **Cross-lingual** : Queries multilingues

---

## 📚 Références

**Algorithmes** :
- [Reciprocal Rank Fusion (RRF)](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Query Expansion with LLMs](https://arxiv.org/abs/2305.03653)
- [Dense Retrieval Reranking](https://arxiv.org/abs/2104.08663)

**Implémentation** :
- LangChain: https://js.langchain.com
- TensorFlow.js: https://www.tensorflow.org/js
- Universal Sentence Encoder: https://tfhub.dev/google/universal-sentence-encoder/4

---

## ✅ Checklist d'Intégration

- [x] Installer dépendances (@tensorflow/tfjs-node)
- [x] Configurer OpenAI API key
- [x] Initialiser RAG service
- [x] Ajouter tool à l'agent
- [x] Tester avec queries complexes
- [x] Monitorer performance et coûts
- [x] Ajuster configuration selon use case
- [ ] Mettre en place A/B testing (recommandé)
- [ ] Implémenter caching (recommandé)

---

**Date de création** : 9 novembre 2025
**Version** : 1.0.0
**Auteur** : Claude (Anthropic)
