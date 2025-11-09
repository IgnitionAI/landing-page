export const messages = {
	en: {
		nav: {
			services: "Services",
			features: "Features",
			contact: "Contact",
			about: "About Us",
			getStarted: "Start Your Project",
		},
		vectorDb: {
			title: "Vector Database Demo",
			demo: "Try Vector DB",
			howItWorks:
				"This demo shows how vector databases work using TensorFlow.js and the Universal Sentence Encoder",
			desc: "Enter a sentence in the input field below and add it to the vector database. Then, find similar sentences using the 'Find Similar' button",
			addText: "Add to Database",
			searchSimilar: "Find Similar",
		},
		hero: {
			title: "Ignite Your AI Potential",
			subtitle:
				"We turn your data into competitive advantage through cutting-edge AI. Specializing in LLMs and intelligent systems, we bring your most ambitious projects to life",
			getStarted: "Start Your Project",
			learnMore: "Learn More",
		},
		services: {
			title: "Our Services",
			rag: {
				title: "Enterprise RAG Systems",
				description:
					"Advanced Retrieval-Augmented Generation systems that seamlessly integrate your proprietary data with state-of-the-art language models",
				longDescription:
					"Our Enterprise RAG Systems combine cutting-edge retrieval technology with powerful language models to create intelligent systems that understand and leverage your proprietary data. We build custom solutions that transform your knowledge base into a competitive advantage, enabling accurate, context-aware responses that drive business value.",
				features: [
					"Custom connectors for all major data sources (SQL, NoSQL, Cloud Storage)",
					"Advanced semantic search with multi-vector embeddings",
					"Automated document processing with OCR and structure detection",
					"High-availability architecture with 99.9% uptime SLA",
					"Real-time indexing and incremental updates",
					"Multi-language support with cross-lingual retrieval",
				],
				useCases: [
					"Internal knowledge base Q&A for enterprise teams",
					"Customer support automation with contextual answers",
					"Legal document analysis and compliance checking",
					"Research paper discovery and summarization",
					"Product catalog search and recommendation",
				],
				technologies: ["OpenAI", "LangChain", "Pinecone", "Weaviate", "Elasticsearch", "PostgreSQL"],
				details: [
					"Custom data source connectors",
					"Semantic search optimization",
					"Automated document processing pipeline",
					"High-availability architecture",
				],
				benefits: [
					"85%+ increase in response accuracy",
					"Immediate knowledge base valorization",
					"Near-zero hallucination rate",
					"Real-time business context maintenance",
				],
			},
			chatbots: {
				title: "Advanced Conversational Agents",
				description:
					"Next-generation LLM-powered chatbots with deep contextual understanding and enterprise-grade capabilities",
				longDescription:
					"Our Advanced Conversational Agents leverage the latest LLM technology to create natural, context-aware interactions that feel genuinely human. We design and deploy intelligent chatbots that understand intent, maintain conversation context, and provide accurate, helpful responses across all customer touchpoints.",
				features: [
					"Multi-channel deployment (Web, Mobile, Slack, Teams, WhatsApp)",
					"Advanced personality and tone customization per use case",
					"Native support for 100+ languages with cultural awareness",
					"Real-time analytics dashboard with conversation insights",
					"Seamless human handoff with context preservation",
					"Integration with CRM, ticketing, and knowledge bases",
				],
				useCases: [
					"24/7 customer support with tier-1 issue resolution",
					"Lead qualification and sales assistance",
					"Employee onboarding and IT helpdesk",
					"E-commerce product recommendations and order tracking",
					"Healthcare appointment scheduling and triage",
				],
				technologies: ["GPT-4", "Claude", "Rasa", "Dialogflow", "LangChain", "WebSocket"],
				details: [
					"Multi-channel deployment (Web, Mobile, API)",
					"Advanced tone and personality customization",
					"Native multilingual capabilities",
					"Real-time behavioral analytics",
				],
				benefits: [
					"70% reduction in support costs",
					"40% improvement in CSAT scores",
					"24/7 scalable customer support",
					"Automated customer insight generation",
				],
			},
			llm: {
				title: "Enterprise LLM Solutions",
				description:
					"Custom-built large language model implementations leveraging GPT-4, Claude, and LLaMA to solve your specific business challenges",
				longDescription:
					"We architect and deploy enterprise-grade LLM solutions tailored to your unique business requirements. From model selection and fine-tuning to production deployment and monitoring, we handle every aspect of integrating large language models into your operations while ensuring security, compliance, and cost-effectiveness.",
				features: [
					"Industry-specific model fine-tuning and domain adaptation",
					"Optimized inference with latency < 2s and cost reduction strategies",
					"Enterprise security with data encryption and access controls",
					"Continuous monitoring with performance dashboards and alerts",
					"A/B testing framework for model comparison",
					"Automated prompt engineering and optimization",
				],
				useCases: [
					"Automated report generation from structured data",
					"Contract analysis and risk assessment",
					"Code generation and technical documentation",
					"Medical record summarization and clinical decision support",
					"Financial document processing and fraud detection",
				],
				technologies: ["GPT-4", "Claude", "LLaMA", "Mistral", "Azure OpenAI", "AWS Bedrock"],
				details: [
					"Industry-specific model fine-tuning",
					"Optimized inference costs and latency",
					"Secure enterprise integration",
					"Continuous performance monitoring",
				],
				benefits: [
					"40-60% reduction in operational costs",
					"Automated complex document processing",
					"Accelerated time-to-market",
					"GDPR-compliant data handling",
				],
			},
			agents: {
				title: "Intelligent Multi-Agent Systems",
				description:
					"Self-orchestrating AI agents powered by LangChain and AutoGPT for complex business process automation",
				longDescription:
					"Our Multi-Agent Systems employ autonomous AI agents that collaborate to solve complex, multi-step problems. Using frameworks like LangChain and AutoGPT, we create intelligent systems that can plan, execute, and adapt workflows without human intervention, transforming how your organization operates.",
				features: [
					"LangChain and AutoGPT architecture with tool integration",
					"Self-optimizing workflows that learn from execution patterns",
					"Seamless integration with enterprise APIs and databases",
					"Real-time monitoring with execution traces and debugging",
					"Agent collaboration protocols for complex tasks",
					"Safety guardrails and human-in-the-loop controls",
				],
				useCases: [
					"Automated customer onboarding and verification workflows",
					"Intelligent data pipeline orchestration and ETL",
					"Multi-step research and competitive intelligence gathering",
					"Automated testing and QA with self-healing capabilities",
					"Supply chain optimization and inventory management",
				],
				technologies: ["LangChain", "AutoGPT", "CrewAI", "LangGraph", "ReAct", "Function Calling"],
				details: [
					"LangChain/AutoGPT architecture",
					"Self-optimizing workflows",
					"Enterprise API integration",
					"Real-time performance monitoring",
				],
				benefits: [
					"End-to-end process automation",
					"80% reduction in manual tasks",
					"Audited autonomous decision-making",
					"Unlimited operational scaling",
				],
			},
		},
		features: {
			title: "Why Choose ",
			fast: {
				title: "Production-Ready",
				description:
					"From prototype to production in weeks, not months. Built on proven frameworks with scalable architecture.",
			},
			scalable: {
				title: "Cost-Efficient",
				description:
					"Optimized inference costs and resource usage. Pay only for what you need as you grow.",
			},
			secure: {
				title: "Enterprise-Grade",
				description:
					"GDPR-compliant implementations with data security at the core of our solutions.",
			},
		},
		serviceDetails: {
			overview: "Overview",
			features: "Key Features",
			useCases: "Use Cases",
			technologies: "Technologies",
			cta: {
				title: "Ready to Get Started?",
				description: "Let's discuss how this service can transform your business.",
				button: "Contact Us",
			},
		},
		cta: {
			title: "Ready to Enhance Your Business with AI?",
			subtitle:
				"Book a technical consultation to discuss your project with our AI engineers",
			button: "Schedule Technical Call",
		},
		contact: {
			firstName: "First Name",
			firstNamePlaceholder: "John",
			lastName: "Last Name",
			lastNamePlaceholder: "Doe",
			email: "Email",
			emailPlaceholder: "john.doe@company.com",
			phone: "Phone (optional)",
			phonePlaceholder: "+1 (555) 123-4567",
			company: "Company",
			companyPlaceholder: "Your Company Name",
			message: "Message",
			messagePlaceholder: "Tell us about your project...",
			submit: "Send Message",
			success: "Thank you! We'll get back to you soon",
		},
		footer: {
			tagline: "Empowering businesses with intelligent AI solutions",
			services: "Services",
			company: "Company",
			demos: "Our Demos",
			connect: "Connect",
			about: "About Us",
			contact: "Contact",
		},
		about: {
			title: "About Us",
			subtitle: "Specialized AI consultancy focused on practical business applications",
			missionTitle: "Our Mission",
			expertiseTitle: "Our Expertise",
			approachTitle: "Our Approach",
			getInTouch: "Get in touch",
			description:
				"Specialized AI consultancy focused on practical business applications of language models and intelligent systems. TensorFlow certified developers with experience in enterprise LLM deployments.",
			mission: {
				title: "Our Mission",
				description:
					"We bridge the gap between cutting-edge AI technology and business needs through practical, production-ready solutions.",
			},
			expertise: {
				title: "Our Expertise",
				items: [
					"TensorFlow certified developers with enterprise LLM deployment experience",
					"Deep expertise in RAG systems and vector database optimization",
					"Production-grade multi-agent architecture implementation",
					"Fine-tuning and custom model development",
					"End-to-end AI solution architecture and deployment",
				],
			},
			approach: {
				title: "Our Approach",
				description:
					"We focus on delivering measurable business value through carefully architected AI solutions that are secure, scalable, and cost-effective.",
				items: [
					"Requirements analysis and feasibility study",
					"Proof of concept and rapid prototyping",
					"Production deployment with monitoring",
					"Continuous optimization and support",
				],
			},
			cta: {
				title: "Ready to Start Your AI Journey?",
				description: "Let's discuss how we can help transform your business with AI",
				button: "Get in Touch",
			},
		},
		resources: {
			title: "Technical Resources",
			subtitle: "Practical guides and documentation for AI developers",
			blog: {
				title: "Developer Documentation",
				description:
					"Detailed technical guides and best practices for AI implementation",
				categories: [
					"LLM Integration Guides",
					"RAG System Architecture",
					"Agent Development",
					"Production Deployment",
				],
				cta: "Access Documentation",
			},
			learning: {
				title: "Learning Path",
				sections: [
					{
						title: "LLM Fundamentals",
						topics: [
							"Model Types and Capabilities",
							"Prompt Engineering",
							"Fine-tuning Strategies",
						],
					},
					{
						title: "RAG Implementation",
						topics: [
							"Vector Databases",
							"Embedding Models",
							"Retrieval Optimization",
						],
					},
					{
						title: "Production Best Practices",
						topics: [
							"Security Considerations",
							"Cost Optimization",
							"Performance Monitoring",
						],
					},
				],
			},
		},
	},
	fr: {
		nav: {
			services: "Services",
			features: "Fonctionnalités",
			contact: "Contact",
			about: "À Propos",
			getStarted: "Démarrer Votre Projet",
		},
		vectorDb: {
			title: "Démo Base de Données Vectorielle",
			demo: "Essayer la BD Vectorielle",
			howItWorks:
				"Cette démo montre comment fonctionnent les bases de données vectorielles en utilisant TensorFlow.js et l'Universal Sentence Encoder",
			desc: "Entrez une phrase dans le champ ci-dessous et ajoutez-la à la base de données vectorielle. Ensuite, trouvez des phrases similaires en utilisant le bouton 'Rechercher Similaires'",
			addText: "Ajouter à la Base",
			searchSimilar: "Rechercher Similaires",
		},
		hero: {
			title: "Libérez votre Potentiel IA",
			subtitle:
				"Nous transformons vos données en avantage compétitif grâce à l'IA de pointe. Spécialistes des LLMs et systèmes intelligents, nous concrétisons vos projets les plus ambitieux",
			getStarted: "Démarrer Votre Projet",
			learnMore: "En savoir plus",
		},
		services: {
			title: "Nos Services",
			rag: {
				title: "Systèmes RAG Entreprise",
				description:
					"Systèmes avancés de génération augmentée par récupération intégrant harmonieusement vos données propriétaires aux modèles de langage dernière génération",
				longDescription:
					"Nos Systèmes RAG Entreprise combinent une technologie de récupération de pointe avec des modèles de langage puissants pour créer des systèmes intelligents qui comprennent et exploitent vos données propriétaires. Nous construisons des solutions sur mesure qui transforment votre base de connaissances en avantage concurrentiel, permettant des réponses précises et contextuelles qui génèrent de la valeur business.",
				features: [
					"Connecteurs personnalisés pour toutes les sources (SQL, NoSQL, Cloud)",
					"Recherche sémantique avancée avec embeddings multi-vecteurs",
					"Traitement automatisé avec OCR et détection de structure",
					"Architecture haute disponibilité avec SLA 99.9%",
					"Indexation en temps réel et mises à jour incrémentielles",
					"Support multilingue avec récupération cross-linguale",
				],
				useCases: [
					"Q&R sur base de connaissances interne pour équipes",
					"Automatisation support client avec réponses contextuelles",
					"Analyse de documents juridiques et vérification conformité",
					"Découverte et synthèse d'articles de recherche",
					"Recherche catalogue produits et recommandations",
				],
				technologies: ["OpenAI", "LangChain", "Pinecone", "Weaviate", "Elasticsearch", "PostgreSQL"],
				details: [
					"Connecteurs personnalisés pour vos sources de données",
					"Optimisation de la recherche sémantique",
					"Pipeline automatisé de traitement documentaire",
					"Architecture haute disponibilité",
				],
				benefits: [
					"Augmentation de 85%+ de la précision des réponses",
					"Valorisation immédiate des bases de connaissances",
					"Taux d'hallucination quasi-nul",
					"Maintenance en temps réel du contexte métier",
				],
			},
			chatbots: {
				title: "Agents Conversationnels Avancés",
				description:
					"Chatbots nouvelle génération basés sur les LLMs avec compréhension contextuelle approfondie et fonctionnalités entreprise",
				longDescription:
					"Nos Agents Conversationnels Avancés exploitent les dernières technologies LLM pour créer des interactions naturelles et contextuelles qui semblent véritablement humaines. Nous concevons et déployons des chatbots intelligents qui comprennent l'intention, maintiennent le contexte et fournissent des réponses précises et utiles sur tous les points de contact client.",
				features: [
					"Déploiement multi-canal (Web, Mobile, Slack, Teams, WhatsApp)",
					"Personnalisation avancée du ton et du style par cas d'usage",
					"Support natif de 100+ langues avec conscience culturelle",
					"Tableau de bord analytique temps réel avec insights conversationnels",
					"Transfert humain transparent avec préservation du contexte",
					"Intégration avec CRM, ticketing et bases de connaissances",
				],
				useCases: [
					"Support client 24/7 avec résolution tier-1",
					"Qualification de leads et assistance commerciale",
					"Onboarding employés et helpdesk IT",
					"Recommandations produits e-commerce et suivi commandes",
					"Planification rendez-vous et triage santé",
				],
				technologies: ["GPT-4", "Claude", "Rasa", "Dialogflow", "LangChain", "WebSocket"],
				details: [
					"Déploiement multi-canal (Web, Mobile, API)",
					"Personnalisation avancée du ton et du style",
					"Capacités multilingues natives",
					"Analyse comportementale en temps réel",
				],
				benefits: [
					"Réduction de 70% des coûts de support",
					"Amélioration de 40% du score CSAT",
					"Support client 24/7 évolutif",
					"Génération automatisée d'insights clients",
				],
			},
			llm: {
				title: "Solutions LLM Entreprise",
				description:
					"Implémentations personnalisées de modèles de langage exploitant GPT-4, Claude et LLaMA pour répondre à vos défis métier",
				longDescription:
					"Nous architecturons et déployons des solutions LLM de niveau entreprise adaptées à vos besoins uniques. De la sélection de modèle et du fine-tuning au déploiement en production et au monitoring, nous gérons tous les aspects de l'intégration des grands modèles de langage dans vos opérations tout en garantissant sécurité, conformité et rapport coût-efficacité.",
				features: [
					"Fine-tuning et adaptation par domaine",
					"Inférence optimisée avec latence < 2s et stratégies de réduction des coûts",
					"Sécurité entreprise avec chiffrement et contrôles d'accès",
					"Monitoring continu avec dashboards et alertes",
					"Framework A/B testing pour comparaison de modèles",
					"Prompt engineering et optimisation automatisés",
				],
				useCases: [
					"Génération automatisée de rapports depuis données structurées",
					"Analyse de contrats et évaluation des risques",
					"Génération de code et documentation technique",
					"Synthèse dossiers médicaux et aide décision clinique",
					"Traitement documents financiers et détection fraude",
				],
				technologies: ["GPT-4", "Claude", "LLaMA", "Mistral", "Azure OpenAI", "AWS Bedrock"],
				details: [
					"Fine-tuning adapté à votre secteur",
					"Optimisation des coûts d'inférence et de latence",
					"Intégration sécurisée en entreprise",
					"Surveillance continue des performances",
				],
				benefits: [
					"Réduction de 40-60% des coûts opérationnels",
					"Automatisation du traitement documentaire complexe",
					"Mise sur le marché accélérée",
					"Traitement des données conforme au RGPD",
				],
			},
			agents: {
				title: "Systèmes Multi-Agents Intelligents",
				description:
					"Agents IA auto-orchestrés propulsés par LangChain et AutoGPT pour l'automatisation des processus métier complexes",
				longDescription:
					"Nos Systèmes Multi-Agents emploient des agents IA autonomes qui collaborent pour résoudre des problèmes complexes en plusieurs étapes. En utilisant des frameworks comme LangChain et AutoGPT, nous créons des systèmes intelligents qui peuvent planifier, exécuter et adapter des workflows sans intervention humaine, transformant le fonctionnement de votre organisation.",
				features: [
					"Architecture LangChain et AutoGPT avec intégration d'outils",
					"Workflows auto-optimisants qui apprennent des patterns d'exécution",
					"Intégration transparente avec APIs et bases de données entreprise",
					"Monitoring temps réel avec traces d'exécution et debugging",
					"Protocoles de collaboration d'agents pour tâches complexes",
					"Garde-fous de sécurité et contrôles human-in-the-loop",
				],
				useCases: [
					"Workflows automatisés d'onboarding et vérification clients",
					"Orchestration intelligente de pipelines de données et ETL",
					"Recherche multi-étapes et intelligence concurrentielle",
					"Tests et QA automatisés avec capacités d'auto-réparation",
					"Optimisation supply chain et gestion inventaire",
				],
				technologies: ["LangChain", "AutoGPT", "CrewAI", "LangGraph", "ReAct", "Function Calling"],
				details: [
					"Architecture LangChain/AutoGPT",
					"Workflows auto-optimisants",
					"Intégration API entreprise",
					"Monitoring des performances en temps réel",
				],
				benefits: [
					"Automatisation complète des processus",
					"Réduction de 80% des tâches manuelles",
					"Prise de décision autonome auditée",
					"Scalabilité opérationnelle illimitée",
				],
			},
		},
		features: {
			title: "Pourquoi Choisir ",
			fast: {
				title: "Ultra Rapide",
				description:
					"Déploiement rapide et traitement en temps réel pour des résultats immédiats",
			},
			scalable: {
				title: "Évolutif",
				description: "Des solutions qui évoluent avec vos besoins",
			},
			secure: {
				title: "Sécurisé",
				description: "Sécurité de niveau entreprise pour vos données sensibles",
			},
		},
		serviceDetails: {
			overview: "Aperçu",
			features: "Fonctionnalités Clés",
			useCases: "Cas d'Usage",
			technologies: "Technologies",
			cta: {
				title: "Prêt à Commencer ?",
				description: "Discutons de comment ce service peut transformer votre entreprise.",
				button: "Nous Contacter",
			},
		},
		cta: {
			title: "Prêt à Améliorer Votre Entreprise avec l'IA ?",
			subtitle:
				"Réservez une consultation technique pour discuter de votre projet avec nos ingénieurs IA",
			button: "Planifier un Appel Technique",
		},
		contact: {
			firstName: "Prénom",
			firstNamePlaceholder: "Jean",
			lastName: "Nom",
			lastNamePlaceholder: "Dupont",
			email: "Email",
			emailPlaceholder: "jean.dupont@entreprise.com",
			phone: "Téléphone (facultatif)",
			phonePlaceholder: "+33 6 12 34 56 78",
			company: "Entreprise",
			companyPlaceholder: "Nom de votre entreprise",
			message: "Message",
			messagePlaceholder: "Parlez-nous de votre projet...",
			submit: "Envoyer le message",
			success: "Merci ! Nous vous recontacterons bientôt",
		},
		footer: {
			tagline:
				"Autonomiser les entreprises avec des solutions IA intelligentes",
			services: "Services",
			company: "Entreprise",
			demos: "Nos Démos",
			connect: "Connexion",
			about: "À Propos",
			contact: "Contact",
		},
		about: {
			title: "À propos",
			subtitle: "Cabinet de conseil spécialisé en applications pratiques de l'IA",
			missionTitle: "Notre Mission",
			expertiseTitle: "Notre Expertise",
			approachTitle: "Notre Approche",
			getInTouch: "Contactez-nous",
			description:
				"Cabinet de conseil spécialisé en IA focalisé sur les applications métier pratiques des modèles de langage et systèmes intelligents. Développeurs certifiés TensorFlow avec expérience en déploiement LLM entreprise.",
			mission: {
				title: "Notre Mission",
				description:
					"Nous comblons le fossé entre la technologie IA de pointe et les besoins métier par des solutions pratiques et prêtes pour la production.",
			},
			expertise: {
				title: "Notre Expertise",
				items: [
					"Développeurs certifiés TensorFlow avec expérience en déploiement LLM entreprise",
					"Expertise approfondie en systèmes RAG et optimisation de bases vectorielles",
					"Implémentation d'architectures multi-agents de niveau production",
					"Fine-tuning et développement de modèles personnalisés",
					"Architecture et déploiement de solutions IA de bout en bout",
				],
			},
			approach: {
				title: "Notre Approche",
				description:
					"Nous nous concentrons sur la création de valeur mesurable à travers des solutions IA soigneusement architecturées, sécurisées, évolutives et rentables.",
				items: [
					"Analyse des besoins et étude de faisabilité",
					"Preuve de concept et prototypage rapide",
					"Déploiement en production avec monitoring",
					"Optimisation continue et support",
				],
			},
			cta: {
				title: "Prêt à Commencer Votre Parcours IA ?",
				description: "Discutons de comment nous pouvons transformer votre entreprise avec l'IA",
				button: "Contactez-nous",
			},
		},
		resources: {
			title: "Ressources Techniques",
			subtitle: "Guides pratiques et documentation pour développeurs IA",
			blog: {
				title: "Documentation Développeur",
				description:
					"Guides techniques détaillés et bonnes pratiques pour l'implémentation IA",
				categories: [
					"Guides d'Intégration LLM",
					"Architecture Système RAG",
					"Développement d'Agents",
					"Déploiement en Production",
				],
				cta: "Accéder à la Documentation",
			},
			learning: {
				title: "Parcours d'Apprentissage",
				sections: [
					{
						title: "Fondamentaux LLM",
						topics: [
							"Types et Capacités des Modèles",
							"Ingénierie de Prompts",
							"Stratégies de Fine-tuning",
						],
					},
					{
						title: "Implémentation RAG",
						topics: [
							"Bases de Données Vectorielles",
							"Modèles d'Embedding",
							"Optimisation de la Récupération",
						],
					},
					{
						title: "Bonnes Pratiques Production",
						topics: [
							"Considérations de Sécurité",
							"Optimisation des Coûts",
							"Monitoring des Performances",
						],
					},
				],
			},
		},
	},
};

export type Locale = keyof typeof messages;
export type Messages = typeof messages.en;
