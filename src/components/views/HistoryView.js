import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class HistoryView extends LitElement {
    static styles = css`
        * {
            font-family:
                'Inter',
                -apple-system,
                BlinkMacSystemFont,
                sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .history-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .sessions-list {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 16px;
            padding-bottom: 20px;
        }

        .session-item {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .session-item:hover {
            background: var(--hover-background);
            border-color: var(--focus-border-color);
        }

        .session-item.selected {
            background: var(--focus-box-shadow);
            border-color: var(--focus-border-color);
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .session-date {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-color);
        }

        .session-time {
            font-size: 11px;
            color: var(--description-color);
        }

        .session-preview {
            font-size: 11px;
            color: var(--description-color);
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .conversation-view {
            flex: 1;
            overflow-y: auto;
            background: var(--main-content-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 12px;
            padding-bottom: 20px;
        }

        .message {
            margin-bottom: 6px;
            padding: 6px 10px;
            border-left: 3px solid transparent;
            font-size: 12px;
            line-height: 1.4;
            background: var(--input-background);
            border-radius: 0 4px 4px 0;
        }

        /* Code highlighting styles */
        .message code {
            background: rgb(240 141 73 / 0%);
            padding: 0.3em 0.4em;
            border-radius: 3px;
            font-family: Menlo, "Ubuntu Mono", monospace;
            font-size: 1em;
            color: gold;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .message pre {
            background: var(--input-background);
            border: 1px solid var(--button-border);
            border-radius: 6px;
            padding: 1em;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 1em 0;
            overflow-x: auto;
        }

        .message pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }

        /* Prism.js syntax highlighting overrides */
        .message pre[class*="language-"] {
            background: var(--code-block-background) !important;
            color: #ccc !important;
        }
        
        .message code[class*="language-"] {
            color: #ccc !important;
        }
        
        .message .token.comment,
        .message .token.prolog,
        .message .token.doctype,
        .message .token.cdata {
            color: #999 !important;
        }
        
        .message .token.punctuation {
            color: #ccc !important;
        }
        
        .message .token.property,
        .message .token.tag,
        .message .token.boolean,
        .message .token.number,
        .message .token.constant,
        .message .token.symbol,
        .message .token.deleted {
            color: #f08d49 !important;
        }
        
        .message .token.selector,
        .message .token.attr-name,
        .message .token.string,
        .message .token.char,
        .message .token.builtin,
        .message .token.inserted {
            color: #7ec699 !important;
        }
        
        .message .token.operator,
        .message .token.entity,
        .message .token.url,
        .message .language-css .token.string,
        .message .style .token.string {
            color: #67cdcc !important;
        }
        
        .message .token.atrule,
        .message .token.attr-value,
        .message .token.keyword {
            color: #cc99cd !important;
        }
        
        .message .token.function,
        .message .token.class-name {
            color: #f8c555 !important;
        }
        
        .message .token.regex,
        .message .token.important,
        .message .token.variable {
            color: #e2777a !important;
        }

        .message.user {
            border-left-color: #5865f2; /* Discord blue */
        }

        .message.ai {
            border-left-color: #ed4245; /* Discord red */
        }

        .back-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .back-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        .back-button:hover {
            background: var(--hover-background);
        }

        .legend {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: var(--description-color);
        }

        .legend-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }

        .legend-dot.user {
            background-color: #5865f2; /* Discord blue */
        }

        .legend-dot.ai {
            background-color: #ed4245; /* Discord red */
        }

        .copy-button {
            background: var(--button-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s ease;
        }

        .copy-button:hover {
            background: var(--hover-background);
        }

        .copy-button.copied {
            background: #28a745;
            border-color: #28a745;
            color: white;
        }

        .empty-state {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        .empty-state-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-color);
        }

        .loading {
            text-align: center;
            color: var(--description-color);
            font-size: 12px;
            margin-top: 32px;
        }

        /* Scrollbar styles for scrollable elements */
        .sessions-list::-webkit-scrollbar {
            width: 6px;
        }

        .sessions-list::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .sessions-list::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }

        .conversation-view::-webkit-scrollbar {
            width: 6px;
        }

        .conversation-view::-webkit-scrollbar-track {
            background: var(--scrollbar-track, rgba(0, 0, 0, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255, 255, 255, 0.2));
            border-radius: 3px;
        }

        .conversation-view::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover, rgba(255, 255, 255, 0.3));
        }
    `;

    static properties = {
        sessions: { type: Array },
        selectedSession: { type: Object },
        loading: { type: Boolean },
        copyButtonState: { type: String },
    };

    constructor() {
        super();
        this.sessions = [];
        this.selectedSession = null;
        this.loading = true;
        this.copyButtonState = 'copy';
        this.loadSessions();
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    async loadSessions() {
        try {
            this.loading = true;
                    this.sessions = await cheddar.getAllConversationSessions();
        } catch (error) {
            console.error('Error loading conversation sessions:', error);
            this.sessions = [];
        } finally {
            this.loading = false;
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    getSessionPreview(session) {
        if (!session.conversationHistory || session.conversationHistory.length === 0) {
            return 'No conversation yet';
        }

        const firstTurn = session.conversationHistory[0];
        const preview = firstTurn.transcription || firstTurn.ai_response || 'Empty conversation';
        return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
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
                rendered = this.highlightJavaCode(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }

        return content; // Fallback if marked is not available
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

    handleSessionClick(session) {
        this.selectedSession = session;
    }

    handleBackClick() {
        this.selectedSession = null;
    }

    async copyConversation() {
        if (!this.selectedSession || !this.selectedSession.conversationHistory) {
            return;
        }

        const { conversationHistory } = this.selectedSession;
        let conversationText = '';

        conversationHistory.forEach(turn => {
            if (turn.transcription) {
                conversationText += `User: ${turn.transcription}\n\n`;
            }
            if (turn.ai_response) {
                conversationText += `AI: ${turn.ai_response}\n\n`;
            }
        });

        try {
            await navigator.clipboard.writeText(conversationText.trim());
            this.copyButtonState = 'copied';
            setTimeout(() => {
                this.copyButtonState = 'copy';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy conversation:', error);
        }
    }

    renderSessionsList() {
        if (this.loading) {
            return html`<div class="loading">Loading conversation history...</div>`;
        }

        if (this.sessions.length === 0) {
            return html`
                <div class="empty-state">
                    <div class="empty-state-title">No conversations yet</div>
                    <div>Start a session to see your conversation history here</div>
                </div>
            `;
        }

        return html`
            <div class="sessions-list">
                ${this.sessions.map(
                    session => html`
                        <div class="session-item" @click=${() => this.handleSessionClick(session)}>
                            <div class="session-header">
                                <div class="session-date">${this.formatDate(session.timestamp)}</div>
                                <div class="session-time">${this.formatTime(session.timestamp)}</div>
                            </div>
                            <div class="session-preview">${this.getSessionPreview(session)}</div>
                        </div>
                    `
                )}
            </div>
        `;
    }

    renderConversationView() {
        if (!this.selectedSession) return html``;

        const { conversationHistory } = this.selectedSession;

        // Flatten the conversation turns into individual messages
        const messages = [];
        if (conversationHistory) {
            conversationHistory.forEach(turn => {
                if (turn.transcription) {
                    messages.push({
                        type: 'user',
                        content: turn.transcription,
                        timestamp: turn.timestamp,
                    });
                }
                if (turn.ai_response) {
                    messages.push({
                        type: 'ai',
                        content: turn.ai_response,
                        timestamp: turn.timestamp,
                    });
                }
            });
        }

        return html`
            <div class="back-header">
                <button class="back-button" @click=${this.handleBackClick}>
                    <svg
                        width="16px"
                        height="16px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="currentColor"
                    >
                        <path d="M15 6L9 12L15 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                    Back to Sessions
                </button>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="copy-button ${this.copyButtonState === 'copied' ? 'copied' : ''}" @click=${this.copyConversation}>
                        ${this.copyButtonState === 'copied' ? 
                            html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20,6 9,17 4,12"></polyline>
                            </svg>Copied!` :
                            html`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>Copy`
                        }
                    </button>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="legend-dot user"></div>
                            <span>Them</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot ai"></div>
                            <span>Suggestion</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="conversation-view">
                ${messages.length > 0
                    ? messages.map(message => html`
                        <div class="message ${message.type}">
                            ${message.type === 'ai' 
                                ? html`<div .innerHTML="${this.renderMarkdown(message.content)}"></div>`
                                : message.content
                            }
                        </div>
                    `)
                    : html`<div class="empty-state">No conversation data available</div>`}
            </div>
        `;
    }

    render() {
        return html` <div class="history-container">${this.selectedSession ? this.renderConversationView() : this.renderSessionsList()}</div> `;
    }
}

customElements.define('history-view', HistoryView);
