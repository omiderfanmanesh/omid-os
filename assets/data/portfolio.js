// ============================================================================
// OMID/OS — centralized portfolio data (single source of truth)
// All facts are derived from Omid Erfanmanesh's CV (reference/OErfanmaneshCV.pdf).
// Do not invent facts. If a field is missing, mark it with a TODO comment.
// ============================================================================
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.OMID_OS = root.OMID_OS || {};
        root.OMID_OS.portfolio = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VERSION = '1.1.0';

    const profile = {
        name: 'Omid Erfanmanesh',
        firstName: 'Omid',
        lastName: 'Erfanmanesh',
        title: 'AI Engineer',
        headline: 'AI Engineer • Data Scientist',
        tagline: "Production AI • LLMs • RAG • ML • Data Engineering",
        summary:
            'AI Engineer with 4+ years of experience building and deploying production AI systems ' +
            'across Generative AI, RAG, AI agents, computer vision and data engineering. ' +
            'Experienced in taking AI solutions from proof of concept to production on Azure, ' +
            'with applications spanning engineering knowledge systems, industrial computer vision ' +
            'and modern data platforms. Strong focus on reliable, maintainable AI systems that ' +
            'deliver measurable value in real-world environments.',
        location: 'Milan, Italy',
        residence: 'EU Long-Term Residence Permit (Italy)',
        email: 'o.erfanmanesh@gmail.com',
        phone: '+39 379 110 1911',
        linkedin: {
            handle: 'OmidErfanmanesh',
            url: 'https://www.linkedin.com/in/OmidErfanmanesh'
        },
        github: {
            handle: 'OmidErfanmanesh',
            url: 'https://github.com/OmidErfanmanesh'
        },
        // TODO: add personal website URL when available
        website: null,
        languages: ['English', 'Persian (Farsi)', 'Italian'],
        // vetted, CV-backed professional labels only
        roles: ['AI Engineer', 'Data Scientist', 'Data Engineer'],
        focusAreas: [
            'Generative AI',
            'RAG',
            'AI agents',
            'Machine learning',
            'Data engineering',
            'Production AI systems'
        ]
    };

    const experience = [
        {
            id: 'brembo',
            company: 'Brembo S.p.A.',
            role: 'AI Engineer',
            start: '2026-07',
            end: null,
            current: true,
            type: 'fulltime',
            location: 'Italy',
            summary: 'Building AI solutions for engineering and manufacturing teams, with a current focus on Generative AI and modern data platforms.',
            responsibilities: [
                'Developing data pipelines and streaming applications on Azure Databricks using Apache Spark, Delta Lake and Event Hubs.',
                'Designing LLM applications and AI agents to automate internal workflows and improve access to engineering knowledge.',
                'Working with software, data and domain experts to turn business requirements into production-ready AI solutions.',
                'Contributing to the design of scalable data architectures using Unity Catalog and Azure services.'
            ],
            stack: ['Python', 'Azure Databricks', 'Apache Spark', 'Delta Lake', 'Azure Event Hubs', 'Unity Catalog', 'LLMs', 'AI agents']
        },
        {
            id: 'bosch',
            company: 'Bosch VHIT S.p.A.',
            role: 'AI Engineer',
            start: '2022',
            end: '2026-06',
            current: false,
            type: 'fulltime',
            location: 'Italy',
            summary: 'Shipped production AI systems for engineering knowledge and industrial computer vision.',
            responsibilities: [
                'Shipped a RAG system on Azure used daily by ~50 engineers and operators to search 1,000 pages of technical, code and legal docs.',
                'Built an advanced retrieval pipeline combining hybrid BM25 + vector search, reranking, query rewriting and chunk augmentation, plus a multi-agent workflow for complex cross-document queries.',
                'Set up an evaluation loop with DeepEval, curated test sets and user feedback, replacing ad-hoc releases with measurable iteration.',
                'Built an agentic workflow on Claude Sonnet that writes unit tests, opens PRs and triggers CI, introducing automated testing in a codebase that had none.',
                'Built a document understanding pipeline (ingestion, OCR, LLM extraction, structured output) for invoice processing, removing manual data entry for the finance team.',
                'Pushed adoption of MLOps practices (Docker, CI/CD, model versioning, experiment tracking) across LLM and classical ML work.',
                'Deployed a CV model for scrap detection on the production line (~250–300 images/day), replacing a licensed solution and saving ~€12k.',
                'Deployed a CV model for crack detection on pump surfaces, replacing manual inspection on the line.'
            ],
            stack: ['Python', 'Azure', 'Azure OpenAI', 'Azure AI Search', 'Claude', 'DeepEval', 'RAG', 'Vector Search', 'BM25', 'Docker', 'CI/CD', 'Computer Vision', 'MLOps']
        },
        {
            id: 'capgemini',
            company: 'Capgemini',
            role: 'Data Scientist (Master’s Thesis)',
            start: '2021',
            end: '2022',
            current: false,
            type: 'thesis',
            location: 'Italy',
            summary: null,
            responsibilities: [
                'Trained a CNN for semantic segmentation to help UAVs identify safe emergency landing spots, then deployed it on a Jetson Nano, using pruning and quantization to fit the edge compute budget.',
                'Built training pipelines on AWS SageMaker and designed data cleaning and augmentation strategies to improve model robustness across varying lighting, terrain and weather conditions.'
            ],
            stack: ['Python', 'PyTorch / TensorFlow', 'AWS SageMaker', 'Jetson Nano', 'Pruning', 'Quantization', 'Semantic Segmentation']
        }
    ];

    const education = [
        {
            id: 'polito-msc',
            institution: 'Polytechnic University of Turin',
            degree: 'M.Sc. Data Science and Engineering',
            field: 'Data Science and Engineering',
            start: '2019',
            end: '2022',
            location: 'Turin, Italy'
        },
        {
            id: 'jahrom-bsc',
            institution: 'Jahrom University',
            degree: 'B.Sc. Information Technology Engineering',
            field: 'Information Technology Engineering',
            start: '2013',
            end: '2018',
            location: 'Jahrom, Iran'
        }
    ];

    const certifications = [
        {
            name: 'Microsoft Certified: Azure Data Engineer Associate (DP-203)',
            issuer: 'Microsoft',
            year: null // TODO: add year if known
        }
    ];

    const projects = [
        {
            id: 'applygpt',
            name: 'ApplyGPTBot',
            category: 'AI / LLM / Multi-Agent',
            status: 'Live',
            start: null,
            end: null,
            summary:
                'A Telegram bot that answers student questions about Italian regional scholarships across all 20 regions.',
            description:
                'Combines graph-based knowledge retrieval with a multi-agent setup and Tavily web search for facts that change year to year.',
            role: 'Solo builder — full stack',
            responsibilities: [
                'Built a Telegram bot (@ApplyGPTBot) for Italian regional scholarships.',
                'Split work across specialized agents (scholarship lookup, regional eligibility, live web research), reducing hallucinations and combining structured graph data with current sources.',
                'Owned the full stack: data ingestion, graph construction, agent orchestration and Telegram interface.'
            ],
            architecture: [
                'Telegram bot frontend',
                'Graph-based knowledge store',
                'Specialized agents for scholarship, eligibility and web research',
                'Tavily web search integration for dynamic facts'
            ],
            technologies: ['Python', 'LangChain', 'Graph-based retrieval', 'Multi-agent systems', 'Tavily', 'Telegram Bot API'],
            links: [
                { label: 'Telegram', url: 'https://t.me/ApplyGPTBot' }
            ]
        }
    ];

    const activities = [
        {
            id: 'draft-polito',
            organization: 'DRAFT PoliTO: UAV Student Competition Team',
            institution: 'Polytechnic University of Turin',
            role: 'AI Team Member',
            start: '2021',
            end: '2022',
            description:
                'Developed AI components for UAV autonomy (trajectory planning, obstacle detection, object recognition) using ROS, Gazebo and ArduPilot.',
            responsibilities: [
                'Developed AI components for UAV autonomy (trajectory planning, obstacle detection, and object recognition) using ROS, Gazebo, and ArduPilot.',
                'Worked alongside aerospace, software, and controls teammates to integrate perception and planning modules into simulated and real flight workflows.'
            ]
        }
    ];

    const skills = {
        'GenAI & LLMs': {
            items: [
                'RAG', 'Hybrid Retrieval', 'Reranking', 'Query Rewriting', 'Multi-Agent Systems',
                'LangChain', 'Graph-based Retrieval', 'LLM Evaluation (DeepEval)',
                'GPT-4 family (Azure OpenAI)', 'Claude', 'Cohere embeddings'
            ],
            category: 'ai'
        },
        'ML & Data Science': {
            items: [
                'PyTorch', 'TensorFlow', 'scikit-learn', 'Computer Vision', 'Anomaly Detection', 'Time-Series'
            ],
            category: 'ml'
        },
        'Programming': {
            items: [
                'Python (primary)', 'C++', 'SQL', 'Bash', 'Structured Text (PLC)'
            ],
            category: 'lang'
        },
        'Cloud & Data': {
            items: [
                'Microsoft Azure (App Service, AI Search, OpenAI, Data Factory, Databricks, Synapse, ML)',
                'Apache Spark', 'MySQL', 'MS SQL Server', 'MongoDB'
            ],
            category: 'data'
        },
        'MLOps & DevOps': {
            items: [
                'Docker', 'Git', 'CI/CD', 'Model Versioning', 'Experiment Tracking', 'Model Monitoring'
            ],
            category: 'mlops'
        }
    };

    const links = {
        email: 'mailto:o.erfanmanesh@gmail.com',
        linkedin: 'https://www.linkedin.com/in/OmidErfanmanesh',
        github: 'https://github.com/OmidErfanmanesh',
        cv: '/assets/cv/Omid_Erfanmanesh_CV.pdf',
        telegramBot: 'https://t.me/ApplyGPTBot'
    };

    // Virtual filesystem generated from the data above.
    function buildFileSystem() {
        const fs = {
            '~': {
                type: 'dir',
                children: {
                    'README.md': {
                        type: 'file',
                        content: `# OMID/OS v${VERSION}\n\nWelcome to the personal operating system of Omid Erfanmanesh.\n\nType 'help' to see available commands, or ask anything naturally.\n\nExample: "What kind of AI systems has Omid built?"`
                    },
                    'about.md': {
                        type: 'file',
                        content: `# About\n\n${profile.name}\n${profile.title}\n\n${profile.summary}\n\nLocation: ${profile.location}\nEmail: ${profile.email}\nLinkedIn: ${profile.linkedin.url}\nGitHub: ${profile.github.url}`
                    },
                    'contact.md': {
                        type: 'file',
                        content: `# Contact\n\nEmail: ${profile.email}\nPhone: ${profile.phone}\nLinkedIn: ${profile.linkedin.url}\nGitHub: ${profile.github.url}\nLocation: ${profile.location}`
                    },
                    'education.md': {
                        type: 'file',
                        content: education.map(e =>
                            `# ${e.degree}\n${e.institution}\n${e.start} — ${e.end || 'Present'}\n${e.location}`
                        ).join('\n\n')
                    },
                    'skills': { type: 'dir', children: {} },
                    'experience': { type: 'dir', children: {} },
                    'projects': { type: 'dir', children: {} },
                    'cv.pdf': { type: 'file', content: 'Binary file. Use the "cv" command to download it.', binary: true, url: links.cv },
                    'timeline.md': {
                        type: 'file',
                        content: generateTimelineMarkdown()
                    }
                }
            }
        };

        Object.entries(skills).forEach(([cat, data]) => {
            const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            fs['~'].children['skills'].children[`${slug}.md`] = {
                type: 'file',
                content: `# ${cat}\n\n${data.items.map(i => `- ${i}`).join('\n')}`
            };
        });

        experience.forEach(exp => {
            const fileName = `${exp.id}.md`;
            fs['~'].children['experience'].children[fileName] = {
                type: 'file',
                content: experienceToMarkdown(exp)
            };
        });

        projects.forEach(p => {
            const fileName = `${p.id}.md`;
            fs['~'].children['projects'].children[fileName] = {
                type: 'file',
                content: projectToMarkdown(p)
            };
        });

        return fs;
    }

    function generateTimelineMarkdown() {
        const events = [];
        education.forEach(e => events.push({ year: e.end || e.start, label: `${e.degree}, ${e.institution}` }));
        experience.forEach(e => events.push({ year: e.end || e.start, label: `${e.role} at ${e.company}` }));
        activities.forEach(a => events.push({ year: a.end || a.start, label: `${a.role} — ${a.organization}` }));
        // sort by year desc
        events.sort((a, b) => String(b.year).localeCompare(String(a.year)));
        return '# Timeline\n\n' + events.map(ev => `## ${ev.year}\n${ev.label}`).join('\n\n');
    }

    function experienceToMarkdown(exp) {
        const lines = [
            `# ${exp.role}`,
            `## ${exp.company}`,
            `${exp.start} — ${exp.end || 'Present'}`,
            '',
            exp.summary,
            '',
            '## Responsibilities',
            ...exp.responsibilities.map(r => `- ${r}`),
            '',
            '## Stack',
            exp.stack.join(' · ')
        ];
        return lines.join('\n');
    }

    function projectToMarkdown(p) {
        const lines = [
            `# ${p.name}`,
            `**${p.category}**`,
            '',
            p.description,
            '',
            '## Role',
            p.role,
            '',
            '## Responsibilities',
            ...p.responsibilities.map(r => `- ${r}`),
            '',
            '## Technologies',
            p.technologies.join(' · '),
            '',
            '## Links',
            ...p.links.map(l => `- ${l.label}: ${l.url}`)
        ];
        return lines.join('\n');
    }

    // Flat text corpus for AI context retrieval (simple keyword search).
    function buildKnowledgeCorpus() {
        const chunks = [];
        chunks.push({
            id: 'profile',
            category: 'profile',
            text: `${profile.name}. ${profile.title}. ${profile.headline}. ${profile.summary}. Location: ${profile.location}. Email: ${profile.email}. LinkedIn: ${profile.linkedin.url}. GitHub: ${profile.github.url}.`
        });
        experience.forEach(exp => {
            chunks.push({
                id: `exp-${exp.id}`,
                category: 'experience',
                text: `${exp.role} at ${exp.company} (${exp.start} — ${exp.end || 'Present'}). ${exp.summary} ${exp.responsibilities.join(' ')} Stack: ${exp.stack.join(', ')}.`
            });
        });
        projects.forEach(p => {
            chunks.push({
                id: `proj-${p.id}`,
                category: 'projects',
                text: `${p.name}: ${p.summary} ${p.description} Role: ${p.role}. ${p.responsibilities.join(' ')} Technologies: ${p.technologies.join(', ')}.`
            });
        });
        Object.entries(skills).forEach(([cat, data]) => {
            chunks.push({
                id: `skill-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.replace(/(^-|-$)/g, ''),
                category: 'skills',
                text: `${cat}: ${data.items.join(', ')}.`
            });
        });
        education.forEach(e => {
            chunks.push({
                id: `edu-${e.id}`,
                category: 'education',
                text: `${e.degree} at ${e.institution} (${e.start} — ${e.end || 'Present'}), ${e.location}.`
            });
        });
        activities.forEach(a => {
            chunks.push({
                id: `act-${a.id}`,
                category: 'activities',
                text: `${a.role} at ${a.organization} (${a.start} — ${a.end || 'Present'}). ${a.description}`
            });
        });
        return chunks;
    }

    return {
        VERSION,
        profile,
        experience,
        education,
        certifications,
        projects,
        activities,
        skills,
        links,
        fileSystem: buildFileSystem(),
        knowledgeCorpus: buildKnowledgeCorpus(),
        getExperienceById(id) { return experience.find(e => e.id === id) || null; },
        getProjectById(id) { return projects.find(p => p.id === id) || null; },
        getSkillCategory(name) { return skills[name] || null; }
    };
}));