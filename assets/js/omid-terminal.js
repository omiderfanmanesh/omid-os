/* ============================================================================
   OMID/OS Terminal Controller
   Adapted from the original terminal-portfolio terminal.js implementation.
   Preserves XTerm.js lifecycle, fit addon, history, tab completion, Ctrl+C/L.
   Adds: portfolio-backed commands, virtual filesystem, AI routing, streaming.
   ============================================================================ */
(function () {
    'use strict';

    const portfolio = (typeof OMID_OS !== 'undefined' && OMID_OS.portfolio) || {};
    const P = portfolio.profile || {};
    const VERSION = portfolio.VERSION || '1.0.0';
    const HOST = 'omid-os.dev';

    // DOM refs
    const bootEl = document.getElementById('boot');
    const bootLog = document.getElementById('boot-log');
    const bootBar = document.getElementById('boot-bar');
    const bootTagline = document.getElementById('boot-tagline');
    const bootHint = document.getElementById('boot-hint');
    const terminalContainer = document.getElementById('terminal-container');
    const modeTerminalBtn = document.getElementById('mode-terminal');
    const modeVisualBtn = document.getElementById('mode-visual');
    const visualContent = document.getElementById('visual-content');

    // State
    let term = null;
    let fitAddon = null;
    let currentLine = '';
    let commandHistory = [];
    let historyIndex = -1;
    let isBusy = false;
    let currentPath = ['~'];
    let fileSystem = portfolio.fileSystem || {};
    let aiAbortController = null;
    let aiAbortReason = null;
    let bootDone = false;
    let terminalInitialized = false;
    let historyDraft = '';
    let lastTabAt = 0;
    let visualQuery = '';

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Color theme
    const crtTheme = {
        background: '#030704',
        foreground: '#80ff44',
        cursor: '#80ff44',
        cursorAccent: '#030704',
        selection: 'rgba(118, 255, 78, 0.25)',
        black: '#030704',
        red: '#ff5c5c',
        green: '#80ff44',
        yellow: '#d4ff5c',
        blue: '#55cc34',
        magenta: '#6ee7b7',
        cyan: '#80ff44',
        white: '#cbd1cc',
        brightBlack: '#384034',
        brightRed: '#ff7a7a',
        brightGreen: '#9fff7a',
        brightYellow: '#e0ff7a',
        brightBlue: '#7ce05c',
        brightMagenta: '#8fffc4',
        brightCyan: '#9fff7a',
        brightWhite: '#e8efe8'
    };

    // --------------------------------------------------------------------------
    // Boot sequence
    // --------------------------------------------------------------------------
    const bootLines = [
        { text: 'Initializing kernel                [ OK ]', delay: 120 },
        { text: 'Loading experience                 [ OK ]', delay: 140 },
        { text: 'Loading projects                   [ OK ]', delay: 130 },
        { text: 'Loading skills                     [ OK ]', delay: 120 },
        { text: 'Loading knowledge base             [ OK ]', delay: 160 },
        { text: 'Connecting to Omid AI              [ OK ]', delay: 200 }
    ];

    function skipBoot() {
        if (bootDone) return;
        if (bootEl) bootEl.classList.add('gone');
        bootDone = true;
        initTerminalWhenReady();
    }

    function runBoot() {
        if (!bootEl || !bootLog) { initTerminalWhenReady(); return; }
        if (prefersReducedMotion) {
            skipBoot();
            return;
        }

        const skipHandler = () => { skipBoot(); cleanup(); };
        const cleanup = () => {
            document.removeEventListener('keydown', skipHandler);
            document.removeEventListener('pointerdown', skipHandler);
            document.removeEventListener('touchstart', skipHandler);
        };
        document.addEventListener('keydown', skipHandler, { once: true });
        document.addEventListener('pointerdown', skipHandler, { once: true });
        document.addEventListener('touchstart', skipHandler, { once: true });

        let i = 0;
        let progress = 0;

        function next() {
            if (bootDone) return;
            if (i >= bootLines.length) {
                if (bootBar) bootBar.style.width = '100%';
                if (bootTagline) bootTagline.hidden = false;
                if (bootHint) bootHint.hidden = false;
                setTimeout(() => {
                    if (bootDone) return;
                    if (bootEl) bootEl.classList.add('gone');
                    bootDone = true;
                    cleanup();
                    initTerminalWhenReady();
                }, 260);
                return;
            }
            const line = bootLines[i];
            const div = document.createElement('div');
            div.innerHTML = line.text.replace(/\[ OK \]/g, '<span class="ok">[ OK ]</span>');
            bootLog.appendChild(div);
            progress = Math.min(100, Math.round(((i + 1) / bootLines.length) * 100));
            if (bootBar) bootBar.style.width = progress + '%';
            i++;
            setTimeout(next, line.delay);
        }

        // Shorten boot for returning visitors
        try {
            if (localStorage.getItem('omid-os-returning') === '1') {
                bootLines.forEach(l => {
                    const div = document.createElement('div');
                    div.innerHTML = l.text.replace(/\[ OK \]/g, '<span class="ok">[ OK ]</span>');
                    bootLog.appendChild(div);
                });
                if (bootBar) bootBar.style.width = '100%';
                if (bootTagline) bootTagline.hidden = false;
                if (bootHint) bootHint.hidden = false;
                setTimeout(() => {
                    if (bootDone) return;
                    if (bootEl) bootEl.classList.add('gone');
                    bootDone = true;
                    cleanup();
                    initTerminalWhenReady();
                }, 220);
                return;
            }
        } catch (e) {}

        next();
    }

    // --------------------------------------------------------------------------
    // Terminal init
    // --------------------------------------------------------------------------
    let initRetries = 0;
    const MAX_RETRIES = 20; // 20 * 250ms = 5 seconds

    function initTerminalWhenReady() {
        if (terminalInitialized) return;
        if (typeof Terminal === 'undefined' || typeof FitAddon === 'undefined') {
            initRetries++;
            if (initRetries >= MAX_RETRIES) {
                showTerminalFailure(new Error('XTerm.js did not load'));
                return;
            }
            setTimeout(initTerminalWhenReady, 250);
            return;
        }
        if (!terminalContainer) return;
        terminalInitialized = true;
        try {
            initTerminal();
            try { localStorage.setItem('omid-os-returning', '1'); } catch (e) {}
        } catch (error) {
            terminalInitialized = false;
            showTerminalFailure(error);
        }
    }

    function showTerminalFailure(error) {
        console.error('[OMID/OS] Terminal initialization failed:', error);
        if (bootEl) bootEl.classList.add('gone');
        document.body.classList.add('visual-mode-on');
        if (terminalContainer) terminalContainer.hidden = true;
        if (visualContent?.parentElement) visualContent.parentElement.hidden = false;
        modeTerminalBtn?.classList.remove('active');
        modeTerminalBtn?.setAttribute('aria-selected', 'false');
        modeVisualBtn?.classList.add('active');
        modeVisualBtn?.setAttribute('aria-selected', 'true');
        if (terminalContainer) {
            terminalContainer.innerHTML = '<div class="terminal-error" role="alert">Terminal mode could not start. Use Visual mode to view the portfolio.</div>';
        }
    }

    function initTerminal() {
        term = new Terminal({
            cursorStyle: 'block',
            fontFamily: '"JetBrains Mono", "IBM Plex Mono", "Fira Code", monospace',
            fontSize: isMobile ? 12 : 14,
            theme: crtTheme,
            screenReaderMode: true,
            scrollback: isMobile ? 500 : 2000,
            convertEol: true,
            cursorBlink: !prefersReducedMotion
        });

        fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalContainer);
        fitAddon.fit();
        if (!isMobile) term.focus();

        window.addEventListener('resize', () => { if (fitAddon) fitAddon.fit(); });

        term.attachCustomKeyEventHandler((event) => {
            if (event.key === 'Tab') {
                if (event.shiftKey) return true;
                event.preventDefault();
                if (event.type === 'keydown' && !isBusy) handleTabCompletion();
                return false;
            }
            return true;
        });

        term.onData(handleData);

        writeBanner();
        writePrompt();

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => fitAddon?.fit()).catch(() => {});
        }
    }

    function writeBanner() {
        const lines = [
            'OMID/OS                                  v' + VERSION,
            '',
            P.name || 'Omid Erfanmanesh',
            P.headline || 'AI Engineer • Data Scientist',
            '',
            P.tagline || 'Production AI • LLMs • RAG • ML • Data Engineering',
            '',
            "Type 'help' or ask anything."
        ];
        lines.forEach(line => term.writeln(colorize(line, 'phosphor')));
        term.writeln('');
    }

    function colorize(text, role) {
        if (role === 'phosphor') return '\x1b[38;5;120m' + text + '\x1b[0m';
        if (role === 'muted') return '\x1b[38;5;243m' + text + '\x1b[0m';
        if (role === 'error') return '\x1b[31m' + text + '\x1b[0m';
        if (role === 'warn') return '\x1b[33m' + text + '\x1b[0m';
        if (role === 'prompt') return '\x1b[38;5;120m' + text + '\x1b[0m';
        return text;
    }

    function getPromptPath() {
        if (currentPath.length === 1) return '~';
        return '~/' + currentPath.slice(1).join('/');
    }

    function writePrompt() {
        const path = getPromptPath();
        const prompt = `visitor@omid:${path}$ `;
        term.write('\r\n' + colorize(prompt, 'prompt'));
    }

    // --------------------------------------------------------------------------
    // Input handling
    // --------------------------------------------------------------------------
    function handleData(data) {
        const code = data.charCodeAt(0);

        if (code === 3) { // Ctrl+C
            if (aiAbortController) {
                aiAbortReason = 'user';
                cancelAI();
            } else if (!isBusy) {
                term.write('^C');
                currentLine = '';
                historyIndex = -1;
                writePrompt();
            }
            return;
        }

        if (isBusy) return;

        if (code === 13) { // Enter
            term.write('\r\n');
            executeInput(currentLine);
            currentLine = '';
            return;
        }

        if (code === 127) { // Backspace
            if (currentLine.length > 0) {
                currentLine = Array.from(currentLine).slice(0, -1).join('');
                term.write('\b \b');
                historyIndex = -1;
            }
            return;
        }

        if (data === '\x1b[A') { // Up
            if (historyIndex === -1) historyDraft = currentLine;
            if (historyIndex > 0) {
                historyIndex--;
                setLine(commandHistory[historyIndex] || '');
            } else if (historyIndex === -1 && commandHistory.length > 0) {
                historyIndex = commandHistory.length - 1;
                setLine(commandHistory[historyIndex]);
            }
            return;
        }

        if (data === '\x1b[B') { // Down
            if (historyIndex >= 0 && historyIndex < commandHistory.length - 1) {
                historyIndex++;
                setLine(commandHistory[historyIndex]);
            } else {
                historyIndex = -1;
                setLine(historyDraft);
            }
            return;
        }

        if (data === '\x1b[D' || data === '\x1b[C') return; // Ignore arrows for now
        if (data.startsWith('\x1b')) return; // Ignore unsupported terminal key sequences

        if (code === 12) { // Ctrl+L
            term.clear();
            writePrompt();
            term.write(currentLine);
            return;
        }

        const printable = data
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
        if (printable) {
            currentLine += printable;
            historyIndex = -1;
            term.write(printable);
        }
    }

    function setLine(value) {
        const prompt = `visitor@omid:${getPromptPath()}$ `;
        const promptAnsi = colorize(prompt, 'prompt');
        currentLine = value;
        term.write('\r\x1b[2K' + promptAnsi + currentLine);
    }

    function handleTabCompletion() {
        const now = Date.now();
        if (now - lastTabAt < 100) return;
        lastTabAt = now;

        const parts = currentLine.split(/\s+/);
        const isFirstWord = parts.length <= 1;
        const rawLastWord = parts[parts.length - 1] || '';
        const lastWord = rawLastWord.toLowerCase();
        const prefix = isFirstWord ? '' : currentLine.slice(0, currentLine.length - rawLastWord.length);

        const slashIndex = rawLastWord.lastIndexOf('/');
        const pathPrefix = slashIndex >= 0 ? rawLastWord.slice(0, slashIndex + 1) : '';
        const baseName = slashIndex >= 0 ? rawLastWord.slice(slashIndex + 1).toLowerCase() : lastWord;
        const targetPath = slashIndex >= 0 ? resolvePath(pathPrefix || '/') : currentPath;
        const targetNode = getNode(targetPath);
        const fsMatches = targetNode?.type === 'dir'
            ? Object.keys(targetNode.children || {})
                .filter(name => name.toLowerCase().startsWith(baseName))
                .map(name => ({
                    name,
                    value: pathPrefix + name + (targetNode.children[name].type === 'dir' ? '/' : '')
                }))
            : [];

        if (isFirstWord && lastWord) {
            const cmdMatches = commandNames.filter(cmd => cmd.startsWith(lastWord));
            const allMatches = cmdMatches.concat(fsMatches.map(match => match.value));

            if (fsMatches.length === 1) {
                setLine(fsMatches[0].value);
            } else if (cmdMatches.length === 1 && fsMatches.length === 0) {
                setLine(cmdMatches[0]);
            } else if (allMatches.length > 1) {
                term.writeln('');
                term.writeln(allMatches.join('  '));
                writePrompt();
                term.write(currentLine);
            }
            return;
        }

        // Filesystem completion (last argument)
        if (lastWord !== undefined) {
            if (fsMatches.length === 1) {
                setLine(prefix + fsMatches[0].value);
            } else if (fsMatches.length > 1) {
                term.writeln('');
                term.writeln(fsMatches.map(match => match.value).join('  '));
                writePrompt();
                term.write(currentLine);
            }
        }
    }

    // --------------------------------------------------------------------------
    // Command dispatch
    // --------------------------------------------------------------------------
    function executeInput(input) {
        const trimmed = input.trim();
        if (!trimmed) { writePrompt(); return; }

        // history
        if (commandHistory[commandHistory.length - 1] !== trimmed) {
            commandHistory.push(trimmed);
        }
        historyIndex = -1;

        const lower = trimmed.toLowerCase();

        // Command parsing: support quoted args simply by split for now
        const tokens = trimmed.split(/\s+/);
        const cmd = tokens[0].toLowerCase();
        const args = tokens.slice(1);

        // Aliases
        const aliasMap = {
            '?': 'help', h: 'help', cls: 'clear', resume: 'cv',
            work: 'experience', exp: 'experience', proj: 'projects'
        };
        const resolvedCmd = aliasMap[cmd] || cmd;

        // Known command?
        if (commands[resolvedCmd]) {
            const result = commands[resolvedCmd](args, trimmed);
            if (result !== null) {
                if (typeof result === 'string') {
                    term.writeln(result.replace(/\n/g, '\r\n'));
                }
                writePrompt();
            }
            return;
        }

        // Unknown multi-word input is natural language, never a typo correction.
        if (tokens.length > 1) {
            askOmidAI(trimmed);
            return;
        }

        // Mistyped known command suggestion
        const suggestion = findSuggestion(cmd);
        if (suggestion) {
            term.writeln(colorize(`Did you mean: ${suggestion}?`, 'warn'));
            writePrompt();
            return;
        }

        // Natural language → AI
        askOmidAI(trimmed);
    }

    function findSuggestion(input) {
        const candidates = commandNames.filter(c => c.length > 2 && levenshtein(input, c) <= 2 && c !== input);
        return candidates[0] || null;
    }

    function levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                matrix[i][j] = b[i - 1] === a[j - 1]
                    ? matrix[i - 1][j - 1]
                    : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[b.length][a.length];
    }

    // --------------------------------------------------------------------------
    // Virtual filesystem helpers
    // --------------------------------------------------------------------------
    function getDir(pathArray) {
        let current = fileSystem['~'];
        for (let i = 1; i < pathArray.length; i++) {
            current = current.children[pathArray[i]];
        }
        return current;
    }

    function resolvePath(arg) {
        if (!arg || arg === '~') return ['~'];
        if (arg === '.') return currentPath.slice();
        if (arg === '..') {
            if (currentPath.length > 1) return currentPath.slice(0, -1);
            return ['~'];
        }
        let parts;
        if (arg.startsWith('~/')) {
            parts = ['~'].concat(arg.slice(2).split('/').filter(Boolean));
        } else if (arg.startsWith('/')) {
            parts = ['~'].concat(arg.slice(1).split('/').filter(Boolean));
        } else {
            parts = currentPath.concat(arg.split('/').filter(Boolean));
        }
        // resolve .. within path
        const resolved = [];
        for (const p of parts) {
            if (p === '..') { if (resolved.length > 1) resolved.pop(); }
            else if (p !== '.') resolved.push(p);
        }
        return resolved;
    }

    function getNode(pathArray) {
        let current = fileSystem['~'];
        for (let i = 1; i < pathArray.length; i++) {
            if (!current || !current.children || !current.children[pathArray[i]]) return null;
            current = current.children[pathArray[i]];
        }
        return current;
    }

    // --------------------------------------------------------------------------
    // Commands
    // --------------------------------------------------------------------------
    const commands = {};
    const commandNames = [];

    function register(name, fn) {
        commands[name] = fn;
        commandNames.push(name);
    }

    register('help', () => {
        return `
AVAILABLE COMMANDS

PORTFOLIO
about          About Omid
experience     Professional experience
projects       Selected projects
skills         Technical skills
education      Education
timeline       Career timeline
contact        Contact details
cv             Open CV
github         GitHub
linkedin       LinkedIn

FILESYSTEM
ls             List files
cd             Change directory
pwd            Current directory
cat            Read file
tree           Show filesystem

SYSTEM
history        Command history
clear          Clear terminal
whoami         Current user
uname          System information
neofetch       OMID/OS overview
reset          Reset local terminal state

AI
Simply ask a question naturally.

Example:
What kind of AI systems has Omid built?`.trim();
    });

    register('about', () => {
        return `ABOUT OMID

${P.name || 'Omid Erfanmanesh'}
${P.title || 'AI Engineer'} • ${P.location || 'Milan, Italy'}

${P.summary || ''}

Current focus:
${(P.focusAreas || []).map(a => `• ${a}`).join('\n')}`;
    });

    register('experience', (args, raw) => {
        const exps = portfolio.experience || [];
        if (args[0]) {
            const exp = exps.find(e => e.id === args[0]);
            if (!exp) return colorize(`No experience entry: ${args[0]}`, 'error');
            return formatExperience(exp);
        }
        let out = 'EXPERIENCE\n';
        exps.forEach(exp => {
            out += `\n[${exp.start} — ${exp.end || 'Present'}]\n\n${exp.company}\n${exp.role}\n`;
            out += exp.responsibilities.slice(0, 4).map(r => `> ${r}`).join('\n');
            out += `\n\nSTACK\n${exp.stack.slice(0, 8).join(' · ')}\n`;
        });
        return out;
    });

    register('projects', (args) => {
        const projs = portfolio.projects || [];
        if (args[0]) {
            const p = projs.find(x => x.id === args[0]);
            if (!p) return colorize(`No project: ${args[0]}`, 'error');
            return formatProject(p);
        }
        let out = 'PROJECTS\n';
        projs.forEach(p => {
            out += `\n┌${'─'.repeat(38)}┐\n`;
            out += `│ ${padEnd(p.name, 36)} │\n`;
            out += `│ ${padEnd(p.category, 36)} │\n`;
            out += `│ ${padEnd(p.technologies.slice(0, 5).join(' · '), 36)} │\n`;
            out += `└${'─'.repeat(38)}┘`;
        });
        return out;
    });

    register('project', (args) => commands.projects(args));

    register('skills', () => {
        const skills = portfolio.skills || {};
        let out = 'SKILLS\n';
        Object.entries(skills).forEach(([cat, data]) => {
            out += `\n${cat.toUpperCase()}\n${data.items.join(' · ')}\n`;
        });
        return out;
    });

    register('education', () => {
        const edu = portfolio.education || [];
        let out = 'EDUCATION\n';
        edu.forEach(e => {
            out += `\n${e.degree}\n${e.institution}\n${e.start} — ${e.end || 'Present'}\n${e.location}\n`;
        });
        const certs = portfolio.certifications || [];
        if (certs.length) {
            out += '\nCERTIFICATIONS\n' + certs.map(c => `• ${c.name}`).join('\n');
        }
        return out;
    });

    register('timeline', () => {
        const events = [];
        (portfolio.education || []).forEach(e => events.push({ year: e.end || e.start, label: `${e.degree}, ${e.institution}` }));
        (portfolio.experience || []).forEach(e => events.push({ year: e.end || e.start, label: `${e.role} at ${e.company}` }));
        (portfolio.activities || []).forEach(a => events.push({ year: a.end || a.start, label: `${a.role} — ${a.organization}` }));
        events.sort((a, b) => String(b.year).localeCompare(String(a.year)));

        const grouped = {};
        events.forEach(ev => { (grouped[ev.year] = grouped[ev.year] || []).push(ev.label); });

        let out = 'TIMELINE\n';
        Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(year => {
            out += `\n${year}\n│\n`;
            out += grouped[year].map(l => `├── ${l}`).join('\n') + '\n';
        });
        return out;
    });

    register('contact', () => {
        return `CONTACT

Email:    ${P.email || ''}
Phone:    ${P.phone || ''}
LinkedIn: ${portfolio.links?.linkedin || ''}
GitHub:   ${portfolio.links?.github || ''}
Location: ${P.location || ''}`;
    });

    register('cv', () => {
        const cvUrl = portfolio.links?.cv || '/assets/cv/Omid_Erfanmanesh_CV.pdf';
        window.open(cvUrl, '_blank', 'noopener,noreferrer');
        return `Opening Omid_Erfanmanesh_CV.pdf...`;
    });

    register('github', () => {
        window.open(portfolio.links?.github || 'https://github.com/OmidErfanmanesh', '_blank', 'noopener,noreferrer');
        return 'Opening GitHub...';
    });

    register('linkedin', () => {
        window.open(portfolio.links?.linkedin || 'https://www.linkedin.com/in/OmidErfanmanesh', '_blank', 'noopener,noreferrer');
        return 'Opening LinkedIn...';
    });

    // Filesystem commands
    register('ls', (args) => {
        const target = args[0] || '.';
        const path = resolvePath(target);
        const node = getNode(path);
        if (!node) return colorize(`ls: cannot access '${target}': No such file or directory`, 'error');
        if (node.type !== 'dir') return colorize(`ls: '${target}': Not a directory`, 'error');
        const items = Object.keys(node.children || {}).map(name => {
            const child = node.children[name];
            if (child.type === 'dir') return colorize(name + '/', 'muted');
            return name;
        });
        return items.join('  ') || colorize('(empty)', 'muted');
    });

    register('cd', (args) => {
        const target = args[0] || '~';
        const path = resolvePath(target);
        const node = getNode(path);
        if (!node) return colorize(`cd: no such file or directory: ${target}`, 'error');
        if (node.type !== 'dir') return colorize(`cd: not a directory: ${target}`, 'error');
        currentPath = path;
        return '';
    });

    register('pwd', () => {
        return '/' + currentPath.slice(1).join('/');
    });

    register('cat', (args) => {
        if (!args[0]) return colorize('Usage: cat <file>', 'warn');
        const path = resolvePath(args[0]);
        const node = getNode(path);
        if (!node) return colorize(`cat: ${args[0]}: No such file or directory`, 'error');
        if (node.type === 'dir') return colorize(`cat: ${args[0]}: Is a directory`, 'error');
        if (node.binary) return node.content;
        return node.content || '';
    });

    register('tree', () => {
        function render(node, prefix) {
            const names = Object.keys(node.children || {}).sort();
            let out = '';
            names.forEach((name, i) => {
                const isLast = i === names.length - 1;
                const child = node.children[name];
                const branch = isLast ? '└── ' : '├── ';
                const icon = child.type === 'dir' ? '📁 ' : '📄 ';
                out += prefix + branch + icon + name + '\n';
                if (child.type === 'dir') {
                    out += render(child, prefix + (isLast ? '    ' : '│   '));
                }
            });
            return out;
        }
        return '~\n' + render(fileSystem['~'], '');
    });

    // System commands
    register('history', () => {
        if (commandHistory.length === 0) return colorize('No commands in history.', 'muted');
        return commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n');
    });

    register('clear', () => {
        term.clear();
        writePrompt();
        return null;
    });

    register('whoami', () => 'visitor');

    register('uname', () => `OMID/OS ${VERSION} xterm.js terminal-portfolio`);

    register('neofetch', () => {
        return `
        OMID/OS

OS        OMID/OS ${VERSION}
Host      ${HOST}
User      visitor
Role      ${P.title || 'AI Engineer'}
Shell     omid-shell
Terminal  xterm.js
AI        Ollama Cloud
Theme     phosphor-green
Location  ${P.location || 'Milan, Italy'}`.trim();
    });

    register('reset', () => {
        currentPath = ['~'];
        commandHistory = [];
        historyIndex = -1;
        currentLine = '';
        try { localStorage.removeItem('omid-os-returning'); } catch (e) {}
        term.clear();
        writeBanner();
        writePrompt();
        return null;
    });

    // Fun commands
    register('sudo', (args) => {
        if (args.join(' ').toLowerCase() === 'hire omid') {
            window.open(portfolio.links?.linkedin || 'https://www.linkedin.com/in/OmidErfanmanesh', '_blank', 'noopener,noreferrer');
            return 'Permission granted.\n\nOpening contact information...';
        }
        return 'Nice try.\n\nOMID/OS is read-only.';
    });

    register('coffee', () => {
        const art = [
            '      ( (',
            '       ) )',
            '    ..........',
            '    |       |]',
            '    \\       /',
            '     `-----\''
        ];
        isBusy = true;
        art.forEach(l => term.writeln(l));
        setTimeout(() => {
            term.writeln('☕ Brewing your coffee...');
            setTimeout(() => {
                term.writeln('✓ Coffee ready. Time to ship AI to production.');
                isBusy = false;
                writePrompt();
            }, 900);
        }, 400);
        return null;
    });

    register('matrix', () => {
        isBusy = true;
        const chars = '01';
        let count = 0;
        const max = 10;
        const iv = setInterval(() => {
            if (count >= max) {
                clearInterval(iv);
                term.writeln('');
                term.writeln('Wake up, Omid...');
                isBusy = false;
                writePrompt();
                return;
            }
            let line = '';
            for (let i = 0; i < 40; i++) line += chars[Math.floor(Math.random() * chars.length)] + ' ';
            term.writeln(line);
            count++;
        }, 80);
        return null;
    });

    // AI commands
    register('ai', (args, raw) => {
        const rest = raw.slice(2).trim();
        if (rest) { askOmidAI(rest); return null; }
        return 'Omid AI: ask me anything about Omid\'s work, skills or projects.';
    });

    // Hidden easter egg / command parity with original repo
    register('xyzzy', () => 'Nothing happens.');
    register('hello', () => 'Hello. Type \'help\' to see what I can do.');

    commandNames.sort();

    // --------------------------------------------------------------------------
    // Formatters
    // --------------------------------------------------------------------------
    function formatExperience(exp) {
        let out = `${exp.company}\n${exp.role}\n${exp.start} — ${exp.end || 'Present'}\n\n${exp.summary}\n\nResponsibilities:\n${exp.responsibilities.map(r => `• ${r}`).join('\n')}\n\nStack: ${exp.stack.join(' · ')}`;
        return out;
    }

    function formatProject(p) {
        let out = `${p.name}\n${p.category}\n\n${p.description}\n\nRole: ${p.role}\n\nResponsibilities:\n${p.responsibilities.map(r => `• ${r}`).join('\n')}\n\nTechnologies: ${p.technologies.join(' · ')}`;
        if (p.links && p.links.length) {
            out += '\n\nLinks:\n' + p.links.map(l => `${l.label}: ${l.url}`).join('\n');
        }
        return out;
    }

    function padEnd(str, len) {
        str = String(str);
        return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
    }

    // --------------------------------------------------------------------------
    // AI integration
    // --------------------------------------------------------------------------
    function cancelAI() {
        if (aiAbortController) {
            aiAbortController.abort();
            aiAbortController = null;
        }
    }

    function askOmidAI(input) {
        if (!input) { writePrompt(); return; }
        personalizeVisualMode(input);
        isBusy = true;
        aiAbortReason = null;
        term.writeln('');
        term.write(colorize('omid.ai:~$ ', 'prompt'));
        term.write('connecting...');

        aiAbortController = new AbortController();
        const timeout = setTimeout(() => {
            aiAbortReason = 'timeout';
            aiAbortController?.abort();
        }, 40000);

        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input }),
            signal: aiAbortController.signal
        })
        .then(async res => {
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error || `Request failed with HTTP ${res.status}`);
            }
            if (!res.body) throw new Error('Streaming response unavailable');
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            // clear connecting text
            term.write('\r\x1b[K');
            term.write(colorize('omid.ai:~$ ', 'prompt'));

            let buffer = '';
            const processLine = (line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                let msg;
                try {
                    msg = JSON.parse(trimmed);
                } catch {
                    return;
                }
                if (msg.error) throw new Error(msg.error);
                if (typeof msg.text === 'string') {
                    term.write(sanitizeTerminalText(msg.text).replace(/\n/g, '\r\n'));
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n');
                buffer = parts.pop();
                parts.forEach(processLine);
            }
            buffer += decoder.decode();
            processLine(buffer);
            term.writeln('');
        })
        .catch(err => {
            if (err.name === 'AbortError') {
                term.writeln(aiAbortReason === 'timeout' ? '\n[ERROR] Request timed out.' : '\n^C');
            } else {
                term.writeln('');
                term.writeln(colorize('Omid AI is unavailable right now. Please try again later.', 'error'));
            }
        })
        .finally(() => {
            clearTimeout(timeout);
            isBusy = false;
            aiAbortController = null;
            aiAbortReason = null;
            writePrompt();
        });
    }

    function sanitizeTerminalText(text) {
        return String(text)
            .replace(/\x1b(?:\[[0-?]*[ -\/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)?)/g, '')
            .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '');
    }

    // --------------------------------------------------------------------------
    // Portfolio context retrieval
    // --------------------------------------------------------------------------
    function retrievePortfolioContext(query) {
        const q = query.toLowerCase();
        const corpus = portfolio.knowledgeCorpus || [];
        const scored = corpus.map(chunk => {
            const text = chunk.text.toLowerCase();
            const words = q.split(/\s+/).filter(w => w.length > 2);
            let score = 0;
            words.forEach(w => { if (text.includes(w)) score += 1; });
            // category boosts
            if (q.includes('experience') || q.includes('work') || q.includes('job')) {
                if (chunk.category === 'experience') score += 2;
            }
            if (q.includes('project')) {
                if (chunk.category === 'projects') score += 2;
            }
            if (q.includes('skill') || q.includes('technology') || q.includes('stack')) {
                if (chunk.category === 'skills') score += 2;
            }
            if (q.includes('education') || q.includes('degree')) {
                if (chunk.category === 'education') score += 2;
            }
            return { chunk, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, 6).map(s => s.chunk.text).join('\n\n---\n\n');
        return top;
    }

    // --------------------------------------------------------------------------
    // Visual mode
    // --------------------------------------------------------------------------
    function buildVisualMode() {
        if (!visualContent) return;
        const queryWords = getQueryWords(visualQuery);
        const rankedExperience = rankForQuery(portfolio.experience || [], queryWords);
        const rankedProjects = rankForQuery(portfolio.projects || [], queryWords);
        const rankedSkills = rankForQuery(
            Object.entries(portfolio.skills || {}).map(([category, data]) => ({ category, ...data })),
            queryWords
        );
        const tailoredIntro = visualQuery ? `
            <aside class="tailored-view" aria-live="polite">
                <div>
                    <strong>AI-tailored resume view</strong>
                    <span>Most relevant verified evidence is shown first for: “${esc(visualQuery)}”</span>
                </div>
                <button id="reset-personalization" type="button">Reset view</button>
            </aside>
        ` : '';

        const expItems = rankedExperience.map(({ item: exp, score }) => `
            <div class="card${score > 0 ? ' relevant-card' : ''}">
                <h3>${esc(exp.role)} — ${esc(exp.company)}</h3>
                <div class="meta">${esc(exp.start)} — ${esc(exp.end || 'Present')}</div>
                <p>${esc(exp.summary)}</p>
                <ul>${exp.responsibilities.slice(0, 4).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
                <div class="chips">${exp.stack.slice(0, 8).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>
            </div>
        `).join('');

        const projItems = rankedProjects.map(({ item: p, score }) => `
            <div class="card${score > 0 ? ' relevant-card' : ''}">
                <h3>${esc(p.name)}</h3>
                <div class="meta">${esc(p.category)}${p.status ? ' • ' + esc(p.status) : ''}</div>
                <p>${esc(p.description)}</p>
                <div class="chips">${p.technologies.slice(0, 6).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
                <div class="links">${p.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>
            </div>
        `).join('');

        const skillItems = rankedSkills.map(({ item: data, score }) => `
            <div class="skill-group${score > 0 ? ' relevant-skill' : ''}">
                <h3>${esc(data.category)}</h3>
                <div class="chips">${data.items.map(i => `<span class="chip">${esc(i)}</span>`).join('')}</div>
            </div>
        `).join('');

        visualContent.innerHTML = `
            <div class="tagline">OMID/OS v${esc(VERSION)}</div>
            <h1>${esc(P.name)}</h1>
            <div class="roleline">${esc(P.headline)}</div>
            <p class="summary">${esc(P.summary)}</p>
            ${tailoredIntro}
            <div class="links">
                <a href="${esc(portfolio.links?.cv || '#')}">Download CV</a>
                <a href="${esc(portfolio.links?.linkedin || '#')}" target="_blank" rel="noopener">LinkedIn</a>
                <a href="${esc(portfolio.links?.github || '#')}" target="_blank" rel="noopener">GitHub</a>
                <a href="${esc(P.email ? 'mailto:' + P.email : '#')}">Email</a>
            </div>

            <h2>Experience</h2>
            ${expItems}

            <h2>Projects</h2>
            ${projItems || '<p class="summary">No public project listings available.</p>'}

            <h2>Skills</h2>
            ${skillItems}

            <h2>Education</h2>
            ${(portfolio.education || []).map(e => `
                <div class="card">
                    <h3>${esc(e.degree)}</h3>
                    <div class="meta">${esc(e.institution)} • ${esc(e.start)} — ${esc(e.end || 'Present')}</div>
                </div>
            `).join('')}

            <h2>Contact</h2>
            <p class="summary">${esc(P.email)} • ${esc(P.phone)} • ${esc(P.location)}</p>
        `;

        document.getElementById('reset-personalization')?.addEventListener('click', () => {
            visualQuery = '';
            modeVisualBtn?.classList.remove('personalized');
            buildVisualMode();
        });
    }

    function personalizeVisualMode(query) {
        visualQuery = query.trim().slice(0, 180);
        if (!visualQuery) return;
        modeVisualBtn?.classList.add('personalized');
        buildVisualMode();
    }

    function getQueryWords(query) {
        const stopWords = new Set(['about', 'and', 'are', 'does', 'for', 'good', 'has', 'have', 'he', 'his', 'how', 'in', 'is', 'of', 'omid', 'the', 'this', 'to', 'what', 'with']);
        return query.toLowerCase()
            .replace(/[^a-z0-9+#.]+/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 2 && !stopWords.has(word));
    }

    function rankForQuery(items, queryWords) {
        return items.map((item, index) => {
            const text = JSON.stringify(item).toLowerCase();
            const score = queryWords.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
            return { item, index, score };
        }).sort((a, b) => b.score - a.score || a.index - b.index);
    }

    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/\u003c/g, '&lt;')
            .replace(/\u003e/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    if (modeTerminalBtn && modeVisualBtn) {
        modeTerminalBtn.addEventListener('click', () => {
            document.body.classList.remove('visual-mode-on');
            terminalContainer.hidden = false;
            visualContent.parentElement.hidden = true;
            modeTerminalBtn.classList.add('active');
            modeTerminalBtn.setAttribute('aria-selected', 'true');
            modeTerminalBtn.tabIndex = 0;
            modeVisualBtn.classList.remove('active');
            modeVisualBtn.setAttribute('aria-selected', 'false');
            modeVisualBtn.tabIndex = -1;
            if (term) {
                setTimeout(() => {
                    fitAddon?.fit();
                    term.focus();
                }, 50);
            }
        });
        modeVisualBtn.addEventListener('click', () => {
            document.body.classList.add('visual-mode-on');
            terminalContainer.hidden = true;
            visualContent.parentElement.hidden = false;
            modeVisualBtn.classList.add('active');
            modeVisualBtn.setAttribute('aria-selected', 'true');
            modeVisualBtn.tabIndex = 0;
            modeTerminalBtn.classList.remove('active');
            modeTerminalBtn.setAttribute('aria-selected', 'false');
            modeTerminalBtn.tabIndex = -1;
        });

        [modeTerminalBtn, modeVisualBtn].forEach((button) => {
            button.addEventListener('keydown', (event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const target = event.key === 'ArrowLeft' || event.key === 'Home' ? modeTerminalBtn : modeVisualBtn;
                target.click();
                target.focus();
            });
        });
    }

    // --------------------------------------------------------------------------
    // Start
    // --------------------------------------------------------------------------
    buildVisualMode();
    document.body.classList.remove('no-js');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runBoot);
    } else {
        runBoot();
    }
})();
