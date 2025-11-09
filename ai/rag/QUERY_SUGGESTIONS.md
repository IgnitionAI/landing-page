# Query Suggestions System - Documentation

## 🎯 Vue d'ensemble

Le système de suggestions génère automatiquement **5 questions de suivi pertinentes** basées sur le contexte de la conversation pour guider l'utilisateur et améliorer l'engagement.

## 🏗️ Architecture

```
Conversation End
    ↓
[Extract Context]
  - User's query
  - Agent's response
  - Detected thematic
  - Previous queries (optional)
  - Search results (optional)
    ↓
[Analyze via LLM (GPT-4o-mini)]
  - Generate 5 diverse suggestions
  - Contextually relevant
  - Explore different angles
    ↓
[Send via SSE]
  - Event type: query_suggestions
  - Delivered after 'complete' event
    ↓
[Frontend Display]
  - Clickable suggestion buttons
  - User can select to send
```

## 📁 Fichiers

- **`ai/rag/query-suggester.ts`** - Générateur de suggestions (nouveau)
- **`app/api/chat/types.ts`** - Type SSE pour suggestions (modifié)
- **`app/api/chat/route.ts`** - Intégration API route (modifié)

## 🔧 Implémentation

### QuerySuggester Class

```typescript
import { querySuggester } from '@/ai/rag/query-suggester';

// Générer des suggestions
const suggestions = await querySuggester.suggestQueries({
  userQuery: "How do I implement a chatbot?",
  agentResponse: "Our chatbots support...",
  thematic: "chatbot",
  previousQueries: ["What are your services?"], // Optional
  searchResults: [...],                          // Optional
});

// Résultat
{
  suggestions: [
    "What's the typical timeline and cost?",
    "Can you explain the NLP capabilities?",
    "Do you have any case studies?",
    "How customizable are the chatbots?",
    "What analytics do you provide?"
  ],
  thematic: "chatbot",
  confidence: 0.9,
  context: "User asked: ..."
}
```

### Templates Thématiques

Le système utilise des templates spécialisés par domaine :

| Thematic | Focus | Exemples de Suggestions |
|----------|-------|-------------------------|
| **ai_services** | AI consulting, ML, LLM | Pricing, ROI, case studies, tech stack, support |
| **chatbot** | Conversational AI | Implementation, features, integrations, customization |
| **rag_systems** | RAG architecture | Components, vector DBs, performance, best practices |
| **multi_agent** | Multi-agent systems | Coordination, use cases, scalability, examples |
| **general** | Any topic | Deeper exploration, practical concerns, examples |

### SSE Event

L'API route envoie un nouvel event SSE après la completion :

```typescript
{
  type: "query_suggestions",
  data: {
    suggestions: string[],      // 5 questions
    thematic: string,            // Thématique détectée
    confidence: number           // 0-1
  }
}
```

**Ordre des events :**
```
start → thinking → tool_call_start → tool_result →
complete → query_suggestions → [stream closes]
```

## 📊 Prompt Engineering

### Template Structure

```
You are a {role} helping users explore {domain}.

Based on the conversation, suggest 5 diverse follow-up questions that:
1. {angle_1}  // Ex: Address practical concerns (pricing, timeline)
2. {angle_2}  // Ex: Explore technical details
3. {angle_3}  // Ex: Request examples or case studies
4. {angle_4}  // Ex: Ask about customization
5. {angle_5}  // Ex: Clarify specific capabilities

Focus on: {keywords}
```

### Context Summary

Le système construit un résumé pour le LLM :

```
User asked: "How do I implement a chatbot?"
Agent responded: "Our chatbots can be integrated..."
Previous questions: "What are your services?"
Relevant info found: "Next-generation LLM-powered chatbots..."
```

### Output Format

```json
[
  "Question 1 focusing on practical concerns",
  "Question 2 exploring technical details",
  "Question 3 requesting examples",
  "Question 4 about customization options",
  "Question 5 on analytics or performance"
]
```

## 🚀 Usage

### Dans l'API Route (Automatique)

Le système est intégré automatiquement dans `/app/api/chat/route.ts` :

```typescript
// Après l'envoi de l'event 'complete'
const suggestions = await querySuggester.suggestQueries({
  userQuery: message,
  agentResponse: trimmedResponse,
  thematic: detectedThematic,  // Auto-détecté depuis advanced_knowledge_search
});

sendEvent({
  type: 'query_suggestions',
  data: {
    suggestions: suggestions.suggestions,
    thematic: suggestions.thematic,
    confidence: suggestions.confidence,
  }
});
```

### Usage Direct

```typescript
import { querySuggester } from '@/ai/rag/query-suggester';

// Suggestions depuis conversation
const result = await querySuggester.suggestQueries({
  userQuery: "What is RAG?",
  agentResponse: "RAG is a technique...",
  thematic: "rag_systems"
});

// Suggestions depuis résultats de recherche
const result = await querySuggester.suggestFromSearchResults(
  "chatbot integration",
  searchResults,
  "chatbot"
);
```

## 📈 Performance

### Benchmarks

| Métrique | Valeur | Notes |
|----------|--------|-------|
| **Temps moyen** | 1.5-2.5s | Dépend de la latence OpenAI |
| **Tokens input** | 100-200 | Context summary |
| **Tokens output** | 50-100 | 5 questions |
| **Coût par génération** | ~$0.0001 | GPT-4o-mini |

### Coûts Mensuels

| Volume | Coût/jour | Coût/mois |
|--------|-----------|-----------|
| 100 suggestions | $0.01 | $0.30 |
| 1000 suggestions | $0.10 | $3.00 |
| 10000 suggestions | $1.00 | $30.00 |

**Très abordable** pour la plupart des applications !

### Optimisation

Le système génère les suggestions **en parallèle** avec l'envoi de l'event `complete` :

```typescript
// Async IIFE - n'attend pas
(async () => {
  const suggestions = await querySuggester.suggestQueries(...);
  sendEvent({ type: 'query_suggestions', data: suggestions });
})();
```

**Impact** : Pas de latence additionnelle perçue par l'utilisateur car le stream reste ouvert.

## 🎨 Frontend Integration

### Écouter l'Event SSE

```typescript
const eventSource = new EventSource('/api/chat');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'query_suggestions') {
    setSuggestions(data.data.suggestions);
    setThematic(data.data.thematic);
  }
});
```

### Afficher les Suggestions

```tsx
function ChatSuggestions({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="suggestions-container">
      <p className="suggestions-title">Suggested questions:</p>
      <div className="suggestions-grid">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className="suggestion-button"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// Usage
<ChatSuggestions
  suggestions={suggestions}
  onSelect={(q) => sendMessage(q)}
/>
```

### Exemple de Styling

```css
.suggestions-container {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.suggestions-title {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.suggestions-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-button {
  text-align: left;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-button:hover {
  background: #f0f0f0;
  border-color: #999;
  transform: translateX(4px);
}
```

## 🧪 Exemples de Suggestions Générées

### Chatbot Implementation

**User:** "How do I implement a chatbot on my website?"

**Suggestions:**
1. "What's the typical timeline and cost for implementing a chatbot?"
2. "Can you explain the NLP capabilities of your chatbots?"
3. "Do you have any case studies or demos I can check out?"
4. "How customizable are the chatbots for different business needs?"
5. "What kind of analytics do you provide to track performance?"

### RAG System

**User:** "What is a RAG system?"

**Suggestions:**
1. "What are the key components of a RAG architecture?"
2. "How do vector databases enhance semantic retrieval in RAG?"
3. "What are the performance considerations for scaling a RAG system?"
4. "Can you share some best practices for implementing RAG in projects?"
5. "How can I integrate RAG with my existing document processing systems?"

### AI Services

**User:** "What AI services do you offer?"

**Suggestions:**
1. "What are your typical pricing models for these AI services?"
2. "Can you share the technology stack used in your LLM solutions?"
3. "Do you have case studies highlighting successful AI transformations?"
4. "What kind of support and maintenance do you offer post-implementation?"
5. "How can your chatbots be tailored for specific industry use cases?"

## 💡 Best Practices

### 1. Détection de Thématique

Pour de meilleures suggestions, passez la thématique détectée :

```typescript
// Dans route.ts - capture depuis advanced_knowledge_search
if (event.data.toolName === 'advanced_knowledge_search') {
  detectedThematic = event.data.result?.meta?.thematic;
}
```

### 2. Historique de Conversation

Enrichir le contexte avec les questions précédentes :

```typescript
const suggestions = await querySuggester.suggestQueries({
  userQuery: currentQuery,
  agentResponse: response,
  previousQueries: conversationHistory.map(m => m.query),
  thematic: detectedThematic
});
```

### 3. Fallback Gracieux

Si la génération échoue, le système utilise des suggestions prédéfinies :

```typescript
private generateFallbackSuggestions(context) {
  const fallbackByThematic = {
    chatbot: [
      "What features do your chatbots include?",
      "How do I integrate a chatbot on my website?",
      // ...
    ]
  };
  return fallbackByThematic[context.thematic] || fallbackByThematic.general;
}
```

### 4. Éviter la Redondance

Ne pas suggérer ce que l'utilisateur vient de demander :

```typescript
// Le LLM est instruit de :
"Generate questions that explore different angles than what was just asked"
```

## 🔍 Debugging

### Logs

Le système log toutes ses opérations :

```
[QuerySuggester] Generating suggestions for thematic: chatbot
[QuerySuggester] Generated suggestions: [...]
[API] Failed to generate query suggestions: Error...
```

### Vérifier les Suggestions

```typescript
// Dans le frontend
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'query_suggestions') {
    console.log('Received suggestions:', data.data);
    console.log('Thematic:', data.data.thematic);
    console.log('Confidence:', data.data.confidence);
  }
});
```

### Tester Différents Contextes

```typescript
// Test avec différentes thématiques
const thematics = ['ai_services', 'chatbot', 'rag_systems', 'multi_agent'];

for (const thematic of thematics) {
  const suggestions = await querySuggester.suggestQueries({
    userQuery: "Tell me more",
    agentResponse: "...",
    thematic
  });
  console.log(`${thematic}:`, suggestions.suggestions);
}
```

## ⚙️ Configuration

### Modèle LLM

Par défaut : GPT-4o-mini (rapide et cheap)

Pour changer :

```typescript
// Dans query-suggester.ts
this.llm = new ChatOpenAI({
  apiKey: config.openai_api_key,
  model: "gpt-4o",          // Plus puissant mais plus cher
  temperature: 0.8,
  maxTokens: 300,
});
```

### Température

Contrôle la créativité des suggestions :

```typescript
temperature: 0.8,  // Default: Bon équilibre diversité/pertinence
temperature: 0.5,  // Plus conservateur, suggestions similaires
temperature: 1.0,  // Plus créatif, suggestions variées
```

### Nombre de Suggestions

Pour changer de 5 à N suggestions :

```typescript
// Modifier le prompt
"Generate exactly {N} follow-up questions that..."

// Et la validation
if (suggestions.length !== N) { ... }
```

## 🚦 Limitations

### 1. Latence

- ~2s pour générer (appel LLM)
- Généré en parallèle, donc transparent pour l'utilisateur

### 2. Coût

- $0.0001 par génération
- Négligeable pour <10k conversations/jour
- Pour volume élevé, considérer caching

### 3. Qualité

- Dépend de la qualité du contexte fourni
- LLM peut parfois générer suggestions génériques
- Fallback prévu pour cas d'échec

## 🔄 Évolutions Futures

### 1. Caching Intelligent

```typescript
// Cache les suggestions par (query, thematic)
const cacheKey = `${query}_${thematic}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 2. Personnalisation Utilisateur

```typescript
// Adapter selon l'historique de l'utilisateur
{
  userQuery: query,
  agentResponse: response,
  userPreferences: {
    industry: "healthcare",
    interests: ["pricing", "compliance"]
  }
}
```

### 3. A/B Testing

```typescript
// Tester différents prompts
const variant = Math.random() > 0.5 ? 'variant_a' : 'variant_b';
const template = TEMPLATES[variant];
// Track which performs better
```

### 4. Analytics

```typescript
// Tracker quelles suggestions sont cliquées
{
  type: 'suggestion_clicked',
  data: {
    suggestion: "What's the cost?",
    position: 1,
    thematic: "chatbot"
  }
}
```

## ✅ Checklist d'Intégration

- [x] Installer query-suggester.ts
- [x] Ajouter type SSE dans types.ts
- [x] Intégrer dans route.ts
- [x] Tester génération de suggestions
- [ ] Implémenter UI frontend (recommandé)
- [ ] Ajouter analytics de clics (recommandé)
- [ ] Mettre en place caching (optionnel)
- [ ] A/B tester prompts (optionnel)

---

**Date de création** : 9 novembre 2025
**Version** : 1.0.0
**Modèle LLM** : GPT-4o-mini
**Coût** : ~$3/mois pour 1000 suggestions/jour
