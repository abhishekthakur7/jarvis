import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
            cursor: default;
            user-select: none;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 500px;
            position: relative;
            overflow: hidden;
            font-size: inherit; /* Inherit font size from view-container */
        }

        .welcome-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 20px 10px;
            position: relative;
        }

        .background-gradient {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(
                ellipse at center,
                rgba(0, 122, 255, 0.1) 0%,
                rgba(0, 122, 255, 0.05) 30%,
                transparent 70%
            );
            animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
        }

        .logo-container {
            position: relative;
            z-index: 2;
        }

        .logo {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
                0 4px 16px rgba(0, 122, 255, 0.3),
                0 2px 8px rgba(0, 0, 0, 0.2);
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }

        .logo svg {
            width: 16px;
            height: 16px;
            color: white;
        }

        .welcome-text {
            text-align: center;
            margin-bottom: 20px;
            position: relative;
            z-index: 2;
        }

        .welcome-title {
            font-size: 1em; /* Relative to centralized font size */
            font-weight: 700;
            margin-bottom: 4px;
            background: linear-gradient(135deg, #ffffff 0%, #e5e5e7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.25px;
        }

        .welcome-subtitle {
            font-size: 0.7em; /* Relative to centralized font size */
            color: var(--description-color, rgba(255, 255, 255, 0.7));
            font-weight: 400;
            line-height: 1.5;
        }

        .input-section {
            width: 70%;
            position: relative;
            z-index: 2;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
        }

        .input-wrapper {
            position: relative;
        }

        .input-icon {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 10px;
            height: 10px;
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
            z-index: 1;
        }

        input {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text-color);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 8px 8px 8px 24px;
            width: 87%;
            border-radius: 6px;
            font-size: 0.5em; /* Relative to centralized font size */
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            position: relative;
        }

        input:focus {
            outline: none;
            border-color: #007aff;
            box-shadow: 
                0 0 0 3px rgba(0, 122, 255, 0.2),
                0 8px 32px rgba(0, 122, 255, 0.15);
            background: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }

        input::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.5));
        }

        input.api-key-error {
            animation: shake 0.5s ease-in-out, blink-red 1s ease-in-out;
            border-color: #ff4444;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }

        @keyframes blink-red {
            0%, 100% {
                border-color: rgba(255, 255, 255, 0.15);
                background: rgba(255, 255, 255, 0.08);
            }
            25%, 75% {
                border-color: #ff4444;
                background: rgba(255, 68, 68, 0.1);
            }
            50% {
                border-color: #ff6666;
                background: rgba(255, 68, 68, 0.15);
            }
        }

        .start-button {
            background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.75em; /* Relative to centralized font size */
            font-weight: 600;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            cursor: default;
            transition: all 0.3s ease;
            box-shadow: 
                0 2px 8px rgba(0, 122, 255, 0.3),
                0 1px 4px rgba(0, 0, 0, 0.2);
            position: relative;
            overflow: hidden;
        }

        .start-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }

        .start-button:hover {
            transform: translateY(-2px);
            box-shadow: 
                0 8px 32px rgba(0, 122, 255, 0.4),
                0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .start-button:hover::before {
            left: 100%;
        }

        .start-button:active {
            transform: translateY(0);
        }

        .start-button.initializing {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .start-button.initializing:hover {
            transform: none;
            box-shadow: 
                0 4px 16px rgba(0, 122, 255, 0.3),
                0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .shortcut-icons {
            display: flex;
            align-items: center;
            gap: 2px;
            margin-left: 4px;
        }

        .shortcut-icons svg {
            width: 8px;
            height: 8px;
            opacity: 0.8;
        }

        .description {
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            font-size: 11px;
            text-align: center;
            line-height: 1.5;
            position: relative;
            z-index: 2;
        }

        .link {
            color: #007aff;
            text-decoration: none;
            cursor: default;
            font-weight: 500;
            transition: all 0.2s ease;
            border-bottom: 1px solid transparent;
        }

        .link:hover {
            color: #5856d6;
            border-bottom-color: #5856d6;
        }

        .features-preview {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 16px;
            opacity: 0.6;
        }

        .feature-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-size: 6px;
            color: var(--description-color);
        }

        .feature-icon {
            width: 12px;
            height: 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .feature-icon svg {
            width: 7px;
            height: 7px;
            color: var(--text-color);
        }

        @media (max-height: 600px) {
            .welcome-container {
                padding: 20px;
            }
            
            .logo {
                width: 48px;
                height: 48px;
            }
            
            .logo svg {
                width: 24px;
                height: 24px;
            }
            
            .welcome-title {
                font-size: 24px;
            }
            
            .features-preview {
                display: none;
            }
        }
    `;

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function },
        isInitializing: { type: Boolean },
        onLayoutModeChange: { type: Function },
        showApiKeyError: { type: Boolean },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onAPIKeyHelp = () => {};
        this.isInitializing = false;
        this.onLayoutModeChange = () => {};
        this.showApiKeyError = false;
        this.boundKeydownHandler = this.handleKeydown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        window.electron?.ipcRenderer?.on('session-initializing', (event, isInitializing) => {
            this.isInitializing = isInitializing;
        });

        // Add keyboard event listener for Ctrl+Enter (or Cmd+Enter on Mac)
        document.addEventListener('keydown', this.boundKeydownHandler);

        // Load and apply layout mode on startup
        this.loadLayoutMode();
        // Resize window for this view
        resizeLayout();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.electron?.ipcRenderer?.removeAllListeners('session-initializing');
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.boundKeydownHandler);
    }

    handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            this.handleStartClick();
        }
    }

    handleInput(e) {
        localStorage.setItem('apiKey', e.target.value);
        // Clear error state when user starts typing
        if (this.showApiKeyError) {
            this.showApiKeyError = false;
        }
    }

    handleOpenAiInput(e) {
        localStorage.setItem('openaiApiKey', e.target.value);
        // Clear error state when user starts typing
        if (this.showApiKeyError) {
            this.showApiKeyError = false;
        }
    }

    handleStartClick() {
        if (this.isInitializing) {
            return;
        }
        this.onStart();
    }

    handleAPIKeyHelpClick() {
        this.onAPIKeyHelp();
    }

    handleResetOnboarding() {
        localStorage.removeItem('onboardingCompleted');
        // Refresh the page to trigger onboarding
        window.location.reload();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode && savedLayoutMode !== 'normal') {
            // Notify parent component to apply the saved layout mode
            this.onLayoutModeChange(savedLayoutMode);
        }
    }

    // Method to trigger the red blink animation
    triggerApiKeyError() {
        this.showApiKeyError = true;
        // Remove the error class after 1 second
        setTimeout(() => {
            this.showApiKeyError = false;
        }, 1000);
    }

    getStartButtonText() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        const cmdIcon = html`<svg width="14px" height="14px" viewBox="0 0 24 24" stroke-width="2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M15 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path
                d="M9 6C9 4.34315 7.65685 3 6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9H18C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21C16.3431 21 15 19.6569 15 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        const enterIcon = html`<svg width="14px" height="14px" stroke-width="2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M10.25 19.25L6.75 15.75L10.25 12.25"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
            <path
                d="M6.75 15.75H12.75C14.9591 15.75 16.75 13.9591 16.75 11.75V4.75"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            ></path>
        </svg>`;

        if (isMac) {
            return html`Start Session <span class="shortcut-icons">${cmdIcon}${enterIcon}</span>`;
        } else {
            return html`Start Session <span class="shortcut-icons">Shift+Alt+4</span>`;
        }
    }

    render() {
        return html`
            <div class="welcome-container">
                <div class="background-gradient"></div>
                
                <div class="logo-container">
                    <div class="logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>

                <div class="welcome-text">
                    <h1 class="welcome-title">Welcome to Jarvis</h1>
                    <p class="welcome-subtitle">Your intelligent AI assistant is ready to help</p>
                </div>

                <div class="input-section">
                    <div class="input-group">
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <input
                                type="password"
                                placeholder="Enter your Gemini API Key"
                                .value=${localStorage.getItem('apiKey') || ''}
                                @input=${this.handleInput}
                                class="${this.showApiKeyError ? 'api-key-error' : ''}"
                            />
                        </div>
                        <div class="input-wrapper">
                            <svg class="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="12" cy="16" r="1" fill="currentColor"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <input
                                type="password"
                                placeholder="Enter your ChatGPT API Key"
                                .value=${localStorage.getItem('openaiApiKey') || ''}
                                @input=${this.handleOpenAiInput}
                                class="${this.showApiKeyError ? 'api-key-error' : ''}"
                            />
                        </div>
                        <button @click=${this.handleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                            ${this.getStartButtonText()}
                        </button>
                    </div>
                    
                    <p class="description">
                        Don't have an API key?
                        <span @click=${this.handleAPIKeyHelpClick} class="link">Get one here</span>
                    </p>
                </div>

                <div class="features-preview">
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Smart Chat</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <rect x="9" y="9" width="6" height="6" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Screen Capture</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <span>Customizable</span>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('main-view', MainView);
