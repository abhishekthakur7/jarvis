import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: 'Inter', sans-serif;
            cursor: default;
        }

        .response-container {
            height: calc(100% - 5px);
            overflow-x: hidden;
            overflow-y: auto;
            border-radius: 5px;
            font-size: var(--response-font-size, 18px);
            line-height: 1.2;
            background: var(--main-content-background);
            padding: 2px;
        }

        /* Animated word-by-word reveal */
        .response-container [data-word] {
            opacity: 0;
            filter: blur(10px);
            display: inline-block;
            transition: opacity 0.5s, filter 0.5s;
        }
        .response-container [data-word].visible {
            opacity: 1;
            filter: blur(0px);
        }

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1.2em 0 0.6em 0;
            color: var(--text-color);
            font-weight: 600;
        }

        .response-container h1 {
            font-size: 1.8em;
        }
        .response-container h2 {
            font-size: 1.5em;
        }
        .response-container h3 {
            font-size: 1.3em;
        }
        .response-container h4 {
            font-size: 1.1em;
        }
        .response-container h5 {
            font-size: 1em;
        }
        .response-container h6 {
            font-size: 0.9em;
        }

        .response-container p {
            margin: 0.8em 0;
            color: var(--text-color);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.8em 0;
            padding-left: 2em;
            color: var(--text-color);
        }

        .response-container li {
            margin: 0.4em 0;
        }

        .response-container blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid var(--focus-border-color);
            background: rgba(0, 122, 255, 0.1);
            font-style: italic;
        }

        .response-container code {
            background: rgb(240 141 73 / 0%);
            padding: 0.3em 0.4em;
            border-radius: 3px;
            font-family: Menlo, "Ubuntu Mono", monospace;
            font-size: 1em;
            color: gold;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .response-container pre {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 1em;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0px;
        }

        .response-container pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }

        /* Prism.js syntax highlighting overrides */
        .response-container pre[class*="language-"] {
            background: var(--code-block-background) !important;
            color: #ccc !important;
        }
        
        .response-container code[class*="language-"] {
            color: #ccc !important;
        }
        
        .response-container .token.comment,
        .response-container .token.prolog,
        .response-container .token.doctype,
        .response-container .token.cdata {
            color: #999 !important;
        }
        
        .response-container .token.punctuation {
            color: #ccc !important;
        }
        
        .response-container .token.property,
        .response-container .token.tag,
        .response-container .token.boolean,
        .response-container .token.number,
        .response-container .token.constant,
        .response-container .token.symbol,
        .response-container .token.deleted {
            color: #f08d49 !important;
        }
        
        .response-container .token.selector,
        .response-container .token.attr-name,
        .response-container .token.string,
        .response-container .token.char,
        .response-container .token.builtin,
        .response-container .token.inserted {
            color: #7ec699 !important;
        }
        
        .response-container .token.operator,
        .response-container .token.entity,
        .response-container .token.url,
        .response-container .language-css .token.string,
        .response-container .style .token.string {
            color: #67cdcc !important;
        }
        
        .response-container .token.atrule,
        .response-container .token.attr-value,
        .response-container .token.keyword {
            color: #cc99cd !important;
        }
        
        .response-container .token.function,
        .response-container .token.class-name {
            color: #f8c555 !important;
        }
        
        .response-container .token.regex,
        .response-container .token.important,
        .response-container .token.variable {
            color: #e2777a !important;
        }

        .response-container a {
            color: var(--link-color);
            text-decoration: none;
        }

        .response-container a:hover {
            text-decoration: underline;
        }

        .response-container strong,
        .response-container b {
            font-weight: 600;
            color: var(--text-color);
        }

        .response-container em,
        .response-container i {
            font-style: italic;
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 2em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            overflow-wrap: anywhere;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border-color);
            padding: 0.5em;
            text-align: left;
        }

        .response-container th {
            background: var(--input-background);
            font-weight: 600;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* Mermaid diagram styling */
        .response-container .mermaid-diagram {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 1em;
            margin: 1em 0;
            text-align: center;
            overflow-x: auto;
        }

        .response-container .mermaid-diagram svg {
            max-width: 100%;
            height: auto;
        }

        /* Override mermaid's default colors for dark theme */
        .response-container .mermaid-diagram .node rect,
        .response-container .mermaid-diagram .node circle,
        .response-container .mermaid-diagram .node ellipse,
        .response-container .mermaid-diagram .node polygon {
            fill: var(--input-background) !important;
            stroke: var(--button-border) !important;
        }

        .response-container .mermaid-diagram .node .label {
            color: var(--text-color) !important;
            fill: var(--text-color) !important;
        }

        .response-container .mermaid-diagram .edgePath .path {
            stroke: var(--text-color) !important;
        }

        .response-container .mermaid-diagram .edgeLabel {
            background-color: var(--input-background) !important;
            color: var(--text-color) !important;
        }



        /* Enhanced text formatting styles for dark theme */
        .response-container p,
        .response-container li {
            line-height: 1.6;
            font-family: Arial, sans-serif;
        }

        .response-container .chunk-a {
            color: #eaeaea;
        } /* Primary text: Light grey, visible on black */
        
        .response-container .chunk-b {
            color:rgb(255, 122, 122);
        } /* Secondary text: Soft red, high contrast */
        
        .response-container strong {
            font-weight: 600;
            color: #80bfff;
        } /* Emphasis: Vibrant blue */
        
        .response-container .filler {
            font-style: italic;
            color: #b0b0b0;
        } /* Filler words */
        
        .response-container .connector {
            text-decoration: underline;
            text-decoration-color: #777;
            text-decoration-thickness: 1px;
        } /* Connectors */
        
        .response-container .pace-slow {
            font-weight: 500;
            letter-spacing: 0.5px;
            color: #f5f5f5;
        }
        
        .response-container .pace-fast {
            letter-spacing: -0.4px;
            color: #bdbdbd;
        }
        
        .response-container .aside {
            font-size: 0.9em;
            color: rgb(227 139 231);
        } /* Delivery enhancers */
        
        .response-container .pause {
            letter-spacing: 0.1em;
            color: #b0b0b0;
        } /* Micro-pause marker "…" */
        
        .response-container .volume-loud {
            font-size: 1.15em;
            font-weight: 700;
            color: #ffd35c;
        } /* Louder pitch */
        
        .response-container .volume-soft {
            font-size: 0.9em;
            color: #c0c0c0;
        } /* Softer pitch */
        
        .response-container .tone-warm {
            color: #ffb366;
        } /* Warm emotion */
        
        .response-container .tone-cool {
            color: #66ccff;
        } /* Cool/calming emotion */
        
        .response-container .closing-cue {
            color: #f5f5f5;
        } /* Final ♦ end cue */
        
        .response-container .closing-soon {
            font-size: 1.1em;
            color: #ffd35c;
            font-weight: 600;
        } /* Early wrap-up icon */
        
        .response-container .fade-out {
            -webkit-mask-image: linear-gradient(180deg, #000 60%, transparent);
            mask-image: linear-gradient(180deg, #000 60%, transparent);
        } /* Gradual fade */
        
        #progress::after {
            content: "";
            position: fixed;
            bottom: 0;
            left: 0;
            height: 2px;
            background: #80bfff;
            width: 0;
        } /* Optional minimal progress bar */

        .text-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
            transform: scale(0.78);
            transform-origin: left center;
        }

        .text-input-container input {
            flex: 1;
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 8px;
            border-radius: 5px;
            font-size: 8px;
        }

        .text-input-container input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 2px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .text-input-container button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 0;
            border-radius: 100px;
        }

        .text-input-container button:hover {
            background: var(--text-input-button-hover);
        }

        .nav-button {
            background: transparent;
            color: white;
            border: none;
            padding: 4px;
            border-radius: 50%;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .nav-button:disabled {
            opacity: 0.3;
        }

        .nav-button svg {
            stroke: white !important;
        }

        .response-counter {
            font-size: 12px;
            color: var(--description-color);
            white-space: nowrap;
            min-width: 15px;
            text-align: center;
        }

        .microphone-button {
            background: transparent;
            border: 2px solid #666;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .microphone-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .microphone-button.off {
            border-color: #666;
        }

        .microphone-button.recording {
            border-color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }

        .microphone-button.speaking {
            border-color: #44ff44;
            background: rgba(68, 255, 68, 0.1);
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .microphone-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        .microphone-button.off .microphone-icon {
            color: #666;
        }

        .microphone-button.recording .microphone-icon {
            color: #ff4444;
        }

        .microphone-button.speaking .microphone-icon {
            color: #44ff44;
        }

        .response-time-display {
            font-size: 12px;
            color: #888;
            margin-left: 3px;
            white-space: nowrap;
            display: flex;
            align-items: center;
        }

        .response-time-display.fast {
            color:rgb(232, 232, 232);
        }

        .response-time-display.medium {
            color: #ffaa44;
        }

        .response-time-display.slow {
            color: #ff4444;
        }

        .scroll-speed-controls {
            display: -webkit-box;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin-left: 5px;
        }

        .scroll-speed-controls button {
            background: transparent;
            color: white;
            border: none;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
            min-width: 18px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .scroll-speed-controls button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .scroll-speed-controls span {
            font-size: 10px;
            padding: 0 4px;
            min-width: 100px;
            text-align: center;
        }

        .font-size-controls {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        .font-size-button {
            background: transparent;
            color: white;
            border: none;
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
            min-width: 18px;
            height: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .font-size-button:hover {
            background: rgba(255, 255, 255, 0.2);
        }

        .font-size-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 10px;
            font-weight: 500;
        }

        .auto-scroll-toggle {
            background: transparent;
            border: 2px solid #666;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 8px;
        }

        .auto-scroll-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .auto-scroll-toggle.enabled {
            border-color: #007aff;
            background: rgba(0, 122, 255, 0.1);
        }

        .auto-scroll-toggle.disabled {
            border-color: #666;
        }

        .auto-scroll-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .auto-scroll-toggle.enabled .auto-scroll-icon {
            color: #007aff;
        }

        .auto-scroll-toggle.disabled .auto-scroll-icon {
            color: #666;
        }

        .speaker-button {
            background: transparent;
            border: 2px solid #666;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .speaker-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .speaker-button.enabled {
            border-color: #007aff;
            background: rgba(0, 122, 255, 0.1);
        }

        .speaker-button.disabled {
            border-color: #666;
        }

        .speaker-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .speaker-button.enabled .speaker-icon {
            color: #007aff;
        }

        .speaker-button.disabled .speaker-icon {
            color: #666;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        microphoneEnabled: { type: Boolean },
        microphoneState: { type: String }, // 'off', 'recording', 'speaking'
        speakerDetectionEnabled: { type: Boolean },
        autoScrollEnabled: { type: Boolean },
        scrollSpeed: { type: Number },
        _autoScrollPaused: { type: Boolean },
        lastResponseTime: { type: Number },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.microphoneEnabled = false;
        this.microphoneState = 'off'; // 'off', 'recording', 'speaking'
        this.speakerDetectionEnabled = true; // Default to enabled
        this.lastResponseTime = null;
        
        // Initialize with layout-specific defaults
        this.loadLayoutSpecificSettings();
        
        this._autoScrollPaused = false;
        this._autoScrollAnimationId = null;
        this._userInteractionTimeout = null;
        
        // Bind event handlers
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleMousedown = this._handleMousedown.bind(this);
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };
    }

    getCurrentResponse() {
        const profileNames = this.getProfileNames();
        if (this.responses.length > 0 && this.currentResponseIndex >= 0) {
            const response = this.responses[this.currentResponseIndex];
            return typeof response === 'string' ? response : (response?.content || '');
        }
        return `Hey, Im listening to your ${profileNames[this.selectedProfile] || 'session'}?`;
    }

    renderMarkdown(content) {
        // Check if marked is available
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Configure marked for better security and formatting
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false, // We trust the AI responses
                });
                let rendered = window.marked.parse(content);
                rendered = this.renderMermaidDiagrams(rendered);
                rendered = this.highlightJavaCode(rendered);
                rendered = this.wrapWordsInSpans(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }

        return content; // Fallback if marked is not available
    }

    renderMermaidDiagrams(html) {
        // Check if mermaid is available
        if (typeof window !== 'undefined' && window.mermaid) {
            try {
                // Initialize mermaid with dark theme
                window.mermaid.initialize({
                    theme: 'dark',
                    startOnLoad: false,
                    securityLevel: 'loose',
                    fontFamily: 'Inter, sans-serif'
                });

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const codeBlocks = doc.querySelectorAll('pre code');
                
                codeBlocks.forEach((codeBlock, index) => {
                    const code = codeBlock.textContent.trim();
                    
                    // Check if this is a mermaid code block
                    if (this.isMermaidCode(code)) {
                        const mermaidId = `mermaid-${Date.now()}-${index}`;
                        
                        // Create a div to hold the mermaid diagram
                        const mermaidDiv = doc.createElement('div');
                        mermaidDiv.className = 'mermaid-diagram';
                        mermaidDiv.id = mermaidId;
                        mermaidDiv.style.cssText = `
                            background: var(--input-background);
                            border: 1px solid var(--button-border);
                            border-radius: 6px;
                            padding: 1em;
                            margin: 1em 0;
                            text-align: center;
                            overflow-x: auto;
                        `;
                        
                        // Store the mermaid code in a data attribute for later rendering
                        mermaidDiv.setAttribute('data-mermaid-code', code);
                        
                        // Replace the code block with the mermaid div
                        const preElement = codeBlock.parentElement;
                        preElement.parentElement.replaceChild(mermaidDiv, preElement);
                    }
                });
                
                return doc.body.innerHTML;
            } catch (error) {
                console.warn('Error processing mermaid diagrams:', error);
                return html; // Fallback to original HTML
            }
        }
        
        return html; // Fallback if mermaid is not available
    }

    isMermaidCode(code) {
        // Check for common mermaid diagram types
        const mermaidPatterns = [
            /^\s*graph\s+(TD|TB|BT|RL|LR)/i,
            /^\s*flowchart\s+(TD|TB|BT|RL|LR)/i,
            /^\s*sequenceDiagram/i,
            /^\s*classDiagram/i,
            /^\s*stateDiagram/i,
            /^\s*erDiagram/i,
            /^\s*journey/i,
            /^\s*gantt/i,
            /^\s*pie/i,
            /^\s*gitgraph/i,
            /^\s*mindmap/i,
            /^\s*timeline/i,
            // General mermaid pattern - catches any content that looks like mermaid
            /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitgraph|mindmap|timeline)/i,
            // Catch any code that contains typical mermaid syntax
            /-->|\|\||\[\[|\]\]|\{\{|\}\}|\(\(|\)\)|subgraph|end/i
        ];
        
        return mermaidPatterns.some(pattern => pattern.test(code));
    }

    async renderMermaidDiagramsInDOM(container) {
        // Check if mermaid is available and container exists
        if (typeof window !== 'undefined' && window.mermaid && container) {
            try {
                const mermaidDivs = container.querySelectorAll('.mermaid-diagram[data-mermaid-code]');
                
                for (const div of mermaidDivs) {
                    const mermaidCode = div.getAttribute('data-mermaid-code');
                    if (mermaidCode) {
                        try {
                            // Generate unique ID for this diagram
                            const diagramId = div.id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            
                            // Render the mermaid diagram
                            const { svg } = await window.mermaid.render(diagramId, mermaidCode);
                            
                            // Insert the rendered SVG
                            div.innerHTML = svg;
                            
                            // Remove the data attribute as it's no longer needed
                            div.removeAttribute('data-mermaid-code');
                            
                            console.log('Mermaid diagram rendered successfully:', diagramId);
                        } catch (error) {
                            console.warn('Error rendering individual mermaid diagram:', error);
                            // Fallback: show the original code in a pre block
                            div.innerHTML = `<pre><code>${mermaidCode}</code></pre>`;
                        }
                    }
                }
            } catch (error) {
                console.warn('Error rendering mermaid diagrams in DOM:', error);
            }
        }
    }

    highlightJavaCode(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const codeBlocks = doc.querySelectorAll('pre code');
        
        codeBlocks.forEach(codeBlock => {
            const code = codeBlock.textContent;
            if (this.isJavaCode(code)) {
                codeBlock.className = 'language-java';
                codeBlock.textContent = code;
                
                // Use Prism.js to highlight the code
                if (window.Prism) {
                    window.Prism.highlightElement(codeBlock);
                }
            }
        });
        
        return doc.body.innerHTML;
    }

    isJavaCode(code) {
        const javaKeywords = [
            'public', 'private', 'protected', 'static', 'final', 'abstract',
            'class', 'interface', 'extends', 'implements', 'package', 'import',
            'void', 'int', 'String', 'boolean', 'double', 'float', 'long',
            'System.out.println', 'new', 'this', 'super', 'return'
        ];
        
        const javaPatterns = [
            /\bpublic\s+class\s+\w+/,
            /\bpublic\s+static\s+void\s+main/,
            /\bSystem\.out\.println/,
            /\bprivate\s+\w+\s+\w+/,
            /\bpublic\s+\w+\s+\w+\s*\(/
        ];
        
        // Check for Java-specific patterns
        for (const pattern of javaPatterns) {
            if (pattern.test(code)) {
                return true;
            }
        }
        
        // Check for multiple Java keywords
        const keywordCount = javaKeywords.filter(keyword => 
            code.includes(keyword)
        ).length;
        
        return keywordCount >= 2;
    }

    wrapWordsInSpans(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE', 'CODE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    getResponseCounter() {
        return this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';
    }

    navigateToPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            // Temporarily disable auto-scroll during navigation
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            if (wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            this.currentResponseIndex--;
            
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
            
            // Reset scroll position to top and re-enable auto-scroll after DOM update
            requestAnimationFrame(() => {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    container.scrollTop = 0;
                }
                
                // Re-enable auto-scroll after navigation is complete
                if (wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                    
                    // Dispatch event to parent to keep it in sync
                    this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                        detail: { enabled: true },
                        bubbles: true,
                        composed: true
                    }));
                }
            });
        }
    }

    navigateToNextResponse() {
        if (this.currentResponseIndex < this.responses.length - 1) {
            // Temporarily disable auto-scroll during navigation
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            if (wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            this.currentResponseIndex++;
            
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
            
            // Reset scroll position to top and re-enable auto-scroll after DOM update
            requestAnimationFrame(() => {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    container.scrollTop = 0;
                }
                
                // Re-enable auto-scroll after navigation is complete
                if (wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                    
                    // Dispatch event to parent to keep it in sync
                    this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                        detail: { enabled: true },
                        bubbles: true,
                        composed: true
                    }));
                }
            });
        }
    }

    scrollResponseUp() {
        this._pauseAutoScrollOnUserInteraction();
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.5;
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        this._pauseAutoScrollOnUserInteraction();
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.5;
            const maxScroll = container.scrollHeight - container.clientHeight;
            container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollAmount);
        }
    }







       replacePronounsInResponse() {
           const container = this.shadowRoot.querySelector('.response-container');
           if (!container) return;

           // Get all word spans created by wrapWordsInSpans
           const wordSpans = container.querySelectorAll('[data-word]');
           if (wordSpans.length === 0) return;

           // Replace pronouns in each word span
           wordSpans.forEach(span => {
               const originalText = span.textContent;
               let replacedText = originalText;

               // Replace "you" (case insensitive) with "we"
               replacedText = replacedText.replace(/\byou\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'YOU') return 'WE/US';
                   if (match === 'You') return 'We/Us';
                   return 'we/us';
               });

               // Replace "your" (case insensitive) with "our"
               replacedText = replacedText.replace(/\byour\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'YOUR') return 'OUR';
                   if (match === 'Your') return 'Our';
                   return 'our';
               });

               // Replace "Here's Here are" (case insensitive) with ""
               replacedText = replacedText.replace(/\here\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'Here\'s' || match === 'Here is' || match === 'Here are' || match === 'Here\'re') return '';
                   return '';
               });

               // Update the span content if it changed
               if (replacedText !== originalText) {
                   span.textContent = replacedText;
               }
           });

           console.log('Pronouns replaced in response');
       }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            const fontSizeValue = parseInt(fontSize, 10) || 20;
            const root = document.documentElement;
            root.style.setProperty('--response-font-size', `${fontSizeValue}px`);
        }
    }

    loadLayoutSpecificSettings() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        if (layoutMode === 'normal') {
            // Load normal layout settings
            const normalAutoScroll = localStorage.getItem('normalAutoScroll');
            this.autoScrollEnabled = normalAutoScroll === 'true';
            this.scrollSpeed = parseInt(localStorage.getItem('normalScrollSpeed'), 10);
        } else if (layoutMode === 'compact') {
            // Load compact layout settings
            const compactAutoScroll = localStorage.getItem('compactAutoScroll');
            this.autoScrollEnabled = compactAutoScroll === 'true';
            this.scrollSpeed = parseInt(localStorage.getItem('compactScrollSpeed'), 10);
        } else if (layoutMode === 'system-design') {
            // Load system design layout settings
            const systemDesignAutoScroll = localStorage.getItem('systemDesignAutoScroll');
            this.autoScrollEnabled = systemDesignAutoScroll === 'true';
            this.scrollSpeed = parseInt(localStorage.getItem('systemDesignScrollSpeed'), 10);
        }
    }

    increaseFontSize() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        const currentFontSize = this.getCurrentFontSize();
        const newFontSize = Math.min(currentFontSize + 1, 16); // Max font size 32px
        
        if (layoutMode === 'normal') {
            localStorage.setItem('normalFontSize', newFontSize.toString());
        } else if (layoutMode === 'compact') {
            localStorage.setItem('compactFontSize', newFontSize.toString());
        } else {
            localStorage.setItem('fontSize', newFontSize.toString());
        }
        
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${newFontSize}px`);
        this.requestUpdate(); // Trigger re-render to update font size display
    }

    decreaseFontSize() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        const currentFontSize = this.getCurrentFontSize();
        const newFontSize = Math.max(currentFontSize - 1, 10); // Min font size 12px
        
        if (layoutMode === 'normal') {
            localStorage.setItem('normalFontSize', newFontSize.toString());
        } else if (layoutMode === 'compact') {
            localStorage.setItem('compactFontSize', newFontSize.toString());
        } else {
            localStorage.setItem('fontSize', newFontSize.toString());
        }
        
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${newFontSize}px`);
        this.requestUpdate(); // Trigger re-render to update font size display
    }

    getCurrentFontSize() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        if (layoutMode === 'normal') {
            return parseInt(localStorage.getItem('normalFontSize'), 10);
        } else if (layoutMode === 'compact') {
            return parseInt(localStorage.getItem('compactFontSize'), 10);
        } else {
            return parseInt(localStorage.getItem('fontSize')) || 16;
        }
    }

    connectedCallback() {
        super.connectedCallback();

        // Load and apply font size
        this.loadFontSize();

        // Set up IPC listeners for keyboard shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handlePreviousResponse = () => {
                //console.log('[IPC] navigate-previous-response triggered');
                this.navigateToPreviousResponse();
            };

            this.handleNextResponse = () => {
                //console.log('[IPC] navigate-next-response triggered');
                this.navigateToNextResponse();
            };

            this.handleScrollUp = () => {
                this.scrollResponseUp();
            };

            this.handleScrollDown = () => {
                this.scrollResponseDown();
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
            

            
            // Listen for layout mode changes to reload settings
            this.handleLayoutModeChange = () => {
                console.log('[AssistantView] Layout mode changed, reloading settings');
                this.loadLayoutSpecificSettings();
                this.requestUpdate();
            };
            
            ipcRenderer.on('layout-mode-changed', this.handleLayoutModeChange);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handlePreviousResponse) {
                ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            }
            if (this.handleNextResponse) {
                ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            }
            if (this.handleScrollUp) {
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            }
            if (this.handleScrollDown) {
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
            }

            if (this.handleLayoutModeChange) {
                ipcRenderer.removeListener('layout-mode-changed', this.handleLayoutModeChange);
            }
        }
        
        // Clean up event listeners
        document.removeEventListener('keydown', this._handleKeydown, true);
        document.removeEventListener('mousedown', this._handleMousedown, true);
        
        if (this.shadowRoot) {
            this.shadowRoot.removeEventListener('keydown', this._handleKeydown, true);
            this.shadowRoot.removeEventListener('mousedown', this._handleMousedown, true);
        }
        
        // Clear any pending timeouts
        if (this._userInteractionTimeout) {
            clearTimeout(this._userInteractionTimeout);
        }
        
        // Clear any pending animation frames
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = ''; // Clear input
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        // Only handle plain Enter (not Ctrl+Enter or Cmd+Enter, which should bubble up to parent)
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    toggleMicrophone() {
        // Don't modify local state directly - let the parent component handle it
        // and the updated state will flow back down through props
        const newEnabled = !this.microphoneEnabled;
        
        // Notify parent component about microphone state change
        this.dispatchEvent(new CustomEvent('microphone-toggle', {
            detail: { enabled: newEnabled },
            bubbles: true,
            composed: true
        }));
    }

    updateMicrophoneState(state) {
        this.microphoneState = state;
        this.requestUpdate();
    }

    toggleSpeakerDetection() {
        this.speakerDetectionEnabled = !this.speakerDetectionEnabled;
        this.dispatchEvent(new CustomEvent('speaker-detection-toggle', {
            detail: { enabled: this.speakerDetectionEnabled },
            bubbles: true,
            composed: true
        }));
        this.requestUpdate();
    }

    increaseScrollSpeed() {
        if (this.scrollSpeed < 10) {
            this.scrollSpeed += 1;
            
            // Save to layout-specific setting
            const layoutMode = localStorage.getItem('layoutMode') || 'normal';
            if (layoutMode === 'normal') {
                localStorage.setItem('normalScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'compact') {
                localStorage.setItem('compactScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'system-design') {
                localStorage.setItem('systemDesignScrollSpeed', this.scrollSpeed.toString());
            }
            
            this.requestUpdate(); // Trigger re-render to update scroll speed display
            this.dispatchEvent(new CustomEvent('scroll-speed-change', {
                detail: { speed: this.scrollSpeed },
                bubbles: true,
                composed: true
            }));
        }
    }

    decreaseScrollSpeed() {
        if (this.scrollSpeed > 1) {
            this.scrollSpeed -= 1;
            
            // Save to layout-specific setting
            const layoutMode = localStorage.getItem('layoutMode') || 'normal';
            if (layoutMode === 'normal') {
                localStorage.setItem('normalScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'compact') {
                localStorage.setItem('compactScrollSpeed', this.scrollSpeed.toString());
            }
            
            this.requestUpdate(); // Trigger re-render to update scroll speed display
            this.dispatchEvent(new CustomEvent('scroll-speed-change', {
                detail: { speed: this.scrollSpeed },
                bubbles: true,
                composed: true
            }));
        }
    }

    toggleAutoScroll() {
        // Toggle the local state
        this.autoScrollEnabled = !this.autoScrollEnabled;
        
        // Save to layout-specific setting
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        if (layoutMode === 'normal') {
            localStorage.setItem('normalAutoScroll', this.autoScrollEnabled.toString());
        } else if (layoutMode === 'compact') {
            localStorage.setItem('compactAutoScroll', this.autoScrollEnabled.toString());
        } else if (layoutMode === 'system-design') {
            localStorage.setItem('systemDesignAutoScroll', this.autoScrollEnabled.toString());
        }
        
        // If disabling auto-scroll, stop any current animation
        if (!this.autoScrollEnabled) {
            // Cancel any existing animation
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
            }
            
            // Clear any existing timeout
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Reset pause state
            this._autoScrollPaused = false;
        } else {
            // If enabling auto-scroll, start scrolling immediately from current position
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                this.smoothScrollToBottom(container);
            }
        }
        
        // Trigger UI update
        this.requestUpdate();
        
        // Dispatch event to parent to keep it in sync
        this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
            detail: { enabled: this.autoScrollEnabled },
            bubbles: true,
            composed: true
        }));
    }

    getCurrentMessage() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        return textInput ? textInput.value : '';
    }

    clearMessage() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput) {
            textInput.value = '';
        }
    }

    getResponseTimeDisplay() {
        if (this.responses.length === 0 || this.currentResponseIndex < 0) {
            return { text: '', className: '' };
        }
        
        const response = this.responses[this.currentResponseIndex];
        const responseTime = typeof response === 'object' ? response?.responseTime : null;
        
        if (!responseTime) {
            return { text: '', className: '' };
        }
        
        const timeMs = responseTime;
        let className = '';
        
        if (timeMs < 2000) {
            className = 'fast';
        } else if (timeMs < 5000) {
            className = 'medium';
        } else {
            className = 'slow';
        }
        
        const timeText = `${timeMs}`;
        
        return { text: timeText, className };
    }

    scrollToBottom() {
        if (!this.autoScrollEnabled || this._autoScrollPaused) {
            return;
        }
        
        // Wait 7 seconds before starting auto-scroll to let user see some content
        setTimeout(() => {
            // Check again if auto-scroll is still enabled and not paused
            if (this.autoScrollEnabled && !this._autoScrollPaused) {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    this.smoothScrollToBottom(container);
                }
            }
        }, 7000);
    }

    smoothScrollToBottom(container) {
        const start = container.scrollTop;
        const target = container.scrollHeight - container.clientHeight;
        const distance = target - start;
        
        // Only scroll if there's content to scroll to
        if (distance <= 0) {
            return;
        }
        
        // Cancel any existing auto-scroll animation
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
        }
        
        // Calculate pixels per frame based on scroll speed (1-10 scale)
        // Higher speed = more pixels per frame for faster scrolling
        // Reduced by 80% + additional 30% + further 50% + additional 70% + further 20% for even slower overall speed
        const pixelsPerFrame = (0.5 + (this.scrollSpeed - 1) * 1.5) * 0.2 * 0.7 * 0.5 * 0.3 * 0.8; // 0.0084 to 0.2352 pixels per frame
        let currentPosition = start;

        const animateScroll = () => {
            // Check if auto-scroll is disabled or paused
            if (!this.autoScrollEnabled || this._autoScrollPaused) {
                this._autoScrollAnimationId = null;
                return;
            }
            
            // Move by fixed pixels per frame for consistent speed
            currentPosition += pixelsPerFrame;
            
            // Don't overshoot the target
            if (currentPosition >= target) {
                container.scrollTop = target;
                this._autoScrollAnimationId = null;
            } else {
                container.scrollTop = currentPosition;
                this._autoScrollAnimationId = requestAnimationFrame(animateScroll);
            }
        };

        this._autoScrollAnimationId = requestAnimationFrame(animateScroll);
    }

    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
        
        // Ensure event listeners are added after component is fully rendered
        setTimeout(() => {
            console.log('Adding event listeners...');
            // Add global event listeners for user interactions
            document.addEventListener('keydown', this._handleKeydown, true);
            document.addEventListener('mousedown', this._handleMousedown, true);
            
            // Also add to shadow root for better event capture
            if (this.shadowRoot) {
                this.shadowRoot.addEventListener('keydown', this._handleKeydown, true);
                this.shadowRoot.addEventListener('mousedown', this._handleMousedown, true);
            }
            
            // Test that handlers are bound correctly
            console.log('Event handlers bound:', {
                keydown: typeof this._handleKeydown,
                mousedown: typeof this._handleMousedown
            });
        }, 100);
    }
    

    
    _handleKeydown(event) {
        //console.log('Keyboard event detected:', event.key, 'autoScrollEnabled:', this.autoScrollEnabled);
        
        // Toggle off auto-scroll on any keyboard interaction
        if (this.autoScrollEnabled) {
            console.log('Disabling auto-scroll due to keyboard interaction');
            this.autoScrollEnabled = false;
            
            // Cancel any existing animation
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
            }
            
            // Clear any existing timeout
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Reset pause state
            this._autoScrollPaused = false;
            
            // Trigger UI update to reflect the change
            this.requestUpdate();
            
            // Dispatch event to parent to update the toggle state
            this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                detail: { enabled: false },
                bubbles: true,
                composed: true
            }));
        }
    }
    
    _handleMousedown(event) {
        // Don't pause auto-scroll for clicks on control buttons
        const target = event.target;
        const isControlButton = target.closest('.scroll-speed-button') || 
                               target.closest('.font-size-button') || 
                               target.closest('.auto-scroll-toggle') || 
                               target.closest('.nav-button') || 
                               target.closest('.microphone-button');
        
        if (!isControlButton) {
            // Pause auto-scroll on content area clicks
            this._pauseAutoScrollOnUserInteraction();
        }
    }
    
    _pauseAutoScrollOnUserInteraction() {
        // Pause auto-scroll immediately
        this._autoScrollPaused = true;
        
        // Cancel any existing animation
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
            this._autoScrollAnimationId = null;
        }
        
        // Clear any existing timeout
        if (this._userInteractionTimeout) {
            clearTimeout(this._userInteractionTimeout);
        }
        
        // Set a timeout to resume auto-scroll after 3 seconds of no interaction
        this._userInteractionTimeout = setTimeout(() => {
            this._autoScrollPaused = false;
            this._userInteractionTimeout = null;
        }, 3000);
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex')) {
            if (changedProperties.has('currentResponseIndex')) {
                this._lastAnimatedWordCount = 0;
                // Mark this as a navigation update to ensure scroll reset
                this._isNavigationUpdate = true;
            }
            this.updateResponseContent();
        }
        
        // Handle scroll speed changes
        if (changedProperties.has('scrollSpeed')) {
            // Cancel current animation if running and restart with new speed
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
                
                // Restart scrolling with new speed if auto-scroll is active
                if (this.autoScrollEnabled && !this._autoScrollPaused) {
                    const container = this.shadowRoot.querySelector('.response-container');
                    if (container) {
                        this.smoothScrollToBottom(container);
                    }
                }
            }
        }
    }



    updateResponseContent() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            // Reset auto-scroll pause state for new responses
            this._autoScrollPaused = false;
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Temporarily disable auto-scroll for new responses to allow scroll reset
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            const isNewResponse = !this._isNavigationUpdate;
            
            if (isNewResponse && wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            const currentResponse = this.getCurrentResponse();
            const renderedResponse = this.renderMarkdown(currentResponse);
            container.innerHTML = renderedResponse;
            
            // Render mermaid diagrams after DOM insertion
            this.renderMermaidDiagramsInDOM(container);
            
            // Replace pronouns in the response content
            this.replacePronounsInResponse();
            
            // Always reset scroll position to top after content update
            requestAnimationFrame(() => {
                container.scrollTop = 0;
                
                // Re-enable auto-scroll for new responses after scroll reset
                if (isNewResponse && wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                }
            });
            
            // Clear the navigation flag
            this._isNavigationUpdate = false;
            const words = container.querySelectorAll('[data-word]');
            if (this.shouldAnimateResponse) {
                for (let i = 0; i < this._lastAnimatedWordCount && i < words.length; i++) {
                    words[i].classList.add('visible');
                }
                for (let i = this._lastAnimatedWordCount; i < words.length; i++) {
                    words[i].classList.remove('visible');
                    setTimeout(() => {
                        words[i].classList.add('visible');
                        if (i === words.length - 1) {
                            this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
                            // Auto-scroll only after all words are animated
                            if (this.autoScrollEnabled) {
                                this.scrollToBottom();
                            }
                        }
                    }, (i - this._lastAnimatedWordCount) * 100);
                }
                this._lastAnimatedWordCount = words.length;
            } else {
                words.forEach(word => word.classList.add('visible'));
                this._lastAnimatedWordCount = words.length;
                // Auto-scroll after content update
                if (this.autoScrollEnabled) {
                    this.scrollToBottom();
                }
            }
        }
    }

    render() {
        const currentResponse = this.getCurrentResponse();
        const responseCounter = this.getResponseCounter();

        return html`
            <div class="response-container"></div>

            <div class="text-input-container">
                <button class="nav-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M15 6L9 12L15 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>

                ${this.responses.length > 0 ? html` <span class="response-counter">${responseCounter}</span> ` : ''}

                <div class="font-size-controls">
                    <button class="font-size-button" @click=${this.increaseFontSize}>+</button>
                    <span class="font-size-label">${this.getCurrentFontSize()}</span>
                    <button class="font-size-button" @click=${this.decreaseFontSize}>-</button>
                </div>

                <div class="scroll-speed-controls">
                    <button class="scroll-speed-button" @click=${this.decreaseScrollSpeed}>-</button>
                    <span class="scroll-speed-display">${this.scrollSpeed}</span>
                    <button class="scroll-speed-button" @click=${this.increaseScrollSpeed}>+</button>
                </div>

                <button class="auto-scroll-toggle ${this.autoScrollEnabled ? 'enabled' : 'disabled'}" @click=${this.toggleAutoScroll}>
                    <svg class="auto-scroll-icon" viewBox="0 0 24 24">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                </button>

                <button class="microphone-button ${this.microphoneState}" @click=${this.toggleMicrophone}>
                    <svg class="microphone-icon" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                </button>

                <button class="speaker-button ${this.speakerDetectionEnabled ? 'enabled' : 'disabled'}" @click=${this.toggleSpeakerDetection}>
                    <svg class="speaker-icon" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                </button>
                
                ${(() => {
                    const timeDisplay = this.getResponseTimeDisplay();
                    return timeDisplay.text ? html`
                        <div class="response-time-display ${timeDisplay.className}">
                            ${timeDisplay.text}
                        </div>
                    ` : '';
                })()}

                <button class="nav-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M9 6L15 12L9 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            </div>
        `;
    }
}

customElements.define('jarvis-view', AssistantView);