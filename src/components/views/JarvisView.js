import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { AssistantView } from './AssistantView.js';
import { ClueSuggestionsPanel } from './ClueSuggestionsPanel.js';

export class JarvisView extends LitElement {
    static styles = css`
        :host {
            display: flex;
            height: 100%;
            width: 100%;
            gap: 8px;
        }

        .clue-panel-container {
            width: 300px;
            min-width: 250px;
            max-width: 400px;
            height: 100%;
            transition: all 0.3s ease;
            overflow: hidden;
        }

        .clue-panel-container.hidden {
            width: 0;
            min-width: 0;
            opacity: 0;
        }

        .assistant-container {
            flex: 1;
            height: 100%;
            min-width: 0;
        }

        assistant-view {
            width: 100%;
            height: 100%;
        }

        clue-suggestions-panel {
            width: 100%;
            height: 100%;
        }
    `;

    static properties = {
        clueMode: { type: Boolean },
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        microphoneEnabled: { type: Boolean },
        microphoneState: { type: String },
        speakerDetectionEnabled: { type: Boolean },
        autoScrollEnabled: { type: Boolean },
        scrollSpeed: { type: Number },
        lastResponseTime: { type: Number },
        clueSuggestions: { type: Array },
        clueSuggestionsLoading: { type: Boolean },
    };

    constructor() {
        super();
        this.clueMode = false;
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this.shouldAnimateResponse = false;
        this.microphoneEnabled = false;
        this.microphoneState = 'off';
        this.speakerDetectionEnabled = true;
        this.autoScrollEnabled = true;
        this.scrollSpeed = 2;
        this.lastResponseTime = null;
        this.clueSuggestions = [];
        this.clueSuggestionsLoading = false;
    }

    // Forward methods to AssistantView
    toggleMicrophone() {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        if (assistantView && assistantView.toggleMicrophone) {
            assistantView.toggleMicrophone();
        }
    }

    updateMicrophoneState(state) {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        if (assistantView && assistantView.updateMicrophoneState) {
            assistantView.updateMicrophoneState(state);
        }
    }

    toggleAutoScroll() {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        if (assistantView && assistantView.toggleAutoScroll) {
            assistantView.toggleAutoScroll();
        }
    }

    scrollToBottom() {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        if (assistantView && assistantView.scrollToBottom) {
            assistantView.scrollToBottom();
        }
    }

    getCurrentMessage() {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        return assistantView && assistantView.getCurrentMessage ? assistantView.getCurrentMessage() : '';
    }

    clearMessage() {
        const assistantView = this.shadowRoot.querySelector('assistant-view');
        if (assistantView && assistantView.clearMessage) {
            assistantView.clearMessage();
        }
    }

    handleSuggestionSelect(suggestion) {
        // Send the selected suggestion as a message
        if (this.onSendText) {
            this.onSendText(suggestion);
        }
    }

    render() {
        return html`
            <div class="clue-panel-container ${this.clueMode ? '' : 'hidden'}">
                <clue-suggestions-panel
                    .suggestions=${this.clueSuggestions}
                    .isLoading=${this.clueSuggestionsLoading}
                    .onSuggestionSelect=${(suggestion) => this.handleSuggestionSelect(suggestion)}
                ></clue-suggestions-panel>
            </div>
            <div class="assistant-container">
                <assistant-view
                    .responses=${this.responses}
                    .currentResponseIndex=${this.currentResponseIndex}
                    .selectedProfile=${this.selectedProfile}
                    .onSendText=${this.onSendText}
                    .shouldAnimateResponse=${this.shouldAnimateResponse}
                    .microphoneEnabled=${this.microphoneEnabled}
                    .microphoneState=${this.microphoneState}
                    .speakerDetectionEnabled=${this.speakerDetectionEnabled}
                    .autoScrollEnabled=${this.autoScrollEnabled}
                    .scrollSpeed=${this.scrollSpeed}
                    .lastResponseTime=${this.lastResponseTime}
                    @microphone-toggle=${this.handleMicrophoneToggle}
                    @speaker-detection-toggle=${this.handleSpeakerDetectionToggle}
                    @scroll-speed-change=${this.handleScrollSpeedChange}
                    @auto-scroll-toggle=${this.handleAutoScrollToggle}
                ></assistant-view>
            </div>
        `;
    }

    // Event handlers to forward to parent
    handleMicrophoneToggle(e) {
        this.dispatchEvent(new CustomEvent('microphone-toggle', {
            detail: e.detail,
            bubbles: true,
            composed: true
        }));
    }

    handleSpeakerDetectionToggle(e) {
        this.dispatchEvent(new CustomEvent('speaker-detection-toggle', {
            detail: e.detail,
            bubbles: true,
            composed: true
        }));
    }

    handleScrollSpeedChange(e) {
        this.dispatchEvent(new CustomEvent('scroll-speed-change', {
            detail: e.detail,
            bubbles: true,
            composed: true
        }));
    }

    handleAutoScrollToggle(e) {
        this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
            detail: e.detail,
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('jarvis-view', JarvisView);