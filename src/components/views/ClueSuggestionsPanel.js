import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class ClueSuggestionsPanel extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family, 'Inter', sans-serif);
            cursor: default;
            user-select: none;
        }

        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: var(--panel-background, #1a1a1a);
            border-radius: var(--border-radius, 12px);
            overflow: hidden;
        }

        .panel-header {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color, #333);
            background: var(--header-background, #2a2a2a);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }

        .panel-title {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-color, #ffffff);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
        }

        .dropdown-menu {
            position: absolute;
            top: 48px;
            left: 16px;
            background: var(--card-background, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            padding: 8px 0;
            display: flex;
            flex-direction: column;
            width: 160px;
            z-index: 2;
        }

        .dropdown-item {
            padding: 6px 12px;
            color: var(--text-color, #fff);
            font-size: 12px;
            transition: background 0.2s ease;
        }

        .dropdown-item:hover {
            background: var(--hover-background, #3a3a3a);
        }

        .more-actions {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color, #333);
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-top: 8px;
        }

        .action-btn {
            background: var(--card-background, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 4px;
            padding: 8px;
            font-size: 10px;
            color: var(--text-color, #fff);
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 6px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        }

        .action-btn:hover {
            background: var(--hover-background, #3a3a3a);
            border-color: var(--accent-color, #007aff);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .action-btn-icon {
            width: 12px;
            height: 12px;
            opacity: 0.7;
            flex-shrink: 0;
        }

        .action-btn:hover .action-btn-icon {
            opacity: 1;
        }

        .panel-content {
            flex: 1;
            padding: 12px;
            overflow-y: auto;
        }

        .suggestions-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .suggestion-card {
            background: var(--card-background, #2a2a2a);
            border: 1px solid var(--border-color, #333);
            border-radius: 6px;
            padding: 7px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 6px;
        }

        .suggestion-card:hover {
            background: var(--hover-background, #3a3a3a);
            border-color: var(--accent-color, #007aff);
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .suggestion-icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }

        .suggestion-card:hover .suggestion-icon {
            opacity: 1;
        }

        .suggestion-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .suggestion-title {
            font-size: 12px;
            font-weight: 500;
            line-height: 1.2;
            color: var(--text-color, #ffffff);
            margin: 0;
        }

        .suggestion-text {
            font-size: 12px;
            line-height: 1.3;
            color: var(--text-color-secondary, #888);
            margin: 0;
            display: none;
        }

        .suggestion-arrow {
            width: 12px;
            height: 12px;
            opacity: 0.3;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .suggestion-card:hover .suggestion-arrow {
            opacity: 0.6;
            transform: translateX(2px);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 12px;
            text-align: center;
            color: var(--text-color-secondary, #888);
        }

        .empty-state-icon {
            width: 24px;
            height: 24px;
            margin-bottom: 8px;
            opacity: 0.3;
        }

        .empty-state-text {
            font-size: 10px;
            line-height: 1.3;
        }

        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 12px;
            text-align: center;
            color: var(--text-color-secondary, #888);
        }

        .loading-spinner {
            width: 18px;
            height: 18px;
            margin-bottom: 8px;
            border: 2px solid var(--border-color, #333);
            border-top: 2px solid var(--accent-color, #007aff);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Responsive scaling for different layout modes */
        @media (max-width: 400px) {
            .panel-header {
                padding: 6px 8px;
            }
            
            .panel-title {
                font-size: 10px;
                gap: 3px;
            }
            
            .panel-content {
                padding: 8px;
            }
            
            .suggestion-card {
                padding: 8px;
                gap: 6px;
                margin-bottom: 4px;
            }
            
            .suggestion-title {
                font-size: 10px;
            }
            
            .suggestion-icon {
                width: 14px;
                height: 14px;
            }
            
            .suggestion-arrow {
                width: 10px;
                height: 10px;
            }
            
            .action-btn {
                padding: 6px;
                font-size: 9px;
                gap: 4px;
            }
            
            .action-btn-icon {
                width: 10px;
                height: 10px;
            }
            
            .actions-grid {
                gap: 4px;
            }
        }
        
        @media (min-width: 600px) {
            .panel-header {
                padding: 10px 14px;
            }
            
            .panel-title {
                font-size: 13px;
            }
            
            .panel-content {
                padding: 14px;
            }
            
            .suggestion-card {
                padding: 6px;
                gap: 10px;
            }
            
            .suggestion-title {
                font-size: 13px;
            }
            
            .action-btn {
                padding: 10px;
                font-size: 11px;
            }
        }
    `;

    static properties = {
        suggestions: { type: Array },
        isLoading: { type: Boolean },
        onSuggestionSelect: { type: Function },
        actions: { type: Array },
        onActionSelect: { type: Function },
        views: { type: Array },
        selectedView: { type: String },
        _dropdownOpen: { state: true },
    };

    constructor() {
        super();
        this.suggestions = [];
        this.isLoading = false;
        this.onSuggestionSelect = () => {};
        this.actions = [
            'What should I say next?',
            'Fact-check statements',
            'Follow-up questions',
            'Recap',
        ];
        this.onActionSelect = () => {};
        this.views = ['Live Insights', 'User Instructions', 'Summary', 'Show Transcript'];
        this.selectedView = 'Live Insights';
        this._dropdownOpen = false;
    }

    // Reset the suggestions panel to initial state
    reset() {
        this.suggestions = [];
        this.isLoading = false;
        this._dropdownOpen = false;
        this.selectedView = 'Live Insights';
        console.log('🔄 [CLUE_PANEL] Suggestions panel reset');
    }

    getSuggestionIcon(suggestion) {
        // Return appropriate icon based on suggestion content
        if (suggestion.toLowerCase().includes('design') || suggestion.toLowerCase().includes('button')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M9 9h6v6H9z" fill="currentColor" opacity="0.3"/>
            </svg>`;
        }
        if (suggestion.toLowerCase().includes('merge') || suggestion.toLowerCase().includes('conflict')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.2"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        // Default icon
        return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.2"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    }

    getSuggestionTitle(suggestion) {
        // Extract or create a title from the suggestion
        if (suggestion.toLowerCase().includes('design button')) {
            return 'Define "design button"';
        }
        if (suggestion.toLowerCase().includes('merge conflicts')) {
            return suggestion.split('?')[0] + '?';
        }
        return suggestion.length > 50 ? suggestion.substring(0, 47) + '...' : suggestion;
    }

    getSuggestionDescription(suggestion) {
        // Create a description or return empty for short suggestions
        if (suggestion.toLowerCase().includes('design button')) {
            return 'Clarify the design requirements and specifications';
        }
        if (suggestion.toLowerCase().includes('merge conflicts')) {
            return 'Best practices for handling code conflicts during development';
        }
        return suggestion.length > 50 ? suggestion : '';
    }

    getActionIcon(action) {
        if (action.includes('What should I say')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        if (action.includes('Fact-check')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        if (action.includes('Follow-up')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        if (action.includes('Recap')) {
            return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        }
        return html`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        </svg>`;
    }

    toggleDropdown() {
        this._dropdownOpen = !this._dropdownOpen;
    }

    selectView(view) {
        this.selectedView = view;
        this._dropdownOpen = false;
    }

    handleSuggestionClick(suggestion) {
        this.onSuggestionSelect(suggestion);
    }

    render() {
        return html`
            <div class="panel-header">
                <h2 class="panel-title" @click=${this.toggleDropdown}>
                    ${this.selectedView}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </h2>
                ${this._dropdownOpen
                    ? html`
                          <div class="dropdown-menu">
                              ${this.views.map(
                                  v => html`<div class="dropdown-item" @click=${() => this.selectView(v)}>${v}</div>`
                              )}
                          </div>
                      `
                    : null}
            </div>
            <div class="panel-content">
                ${this.isLoading
                    ? html`
                          <div class="loading-state">
                              <div class="loading-spinner"></div>
                              <div>Generating suggestions...</div>
                          </div>
                      `
                    : this.suggestions.length > 0
                    ? html`
                          <div class="suggestions-list">
                              ${this.suggestions.map(
                                  (suggestion, index) => {
                                      const title = this.getSuggestionTitle(suggestion);
                                      return html`
                                          <div
                                              class="suggestion-card"
                                              @click=${() => this.handleSuggestionClick(suggestion)}
                                          >
                                              <div class="suggestion-icon">
                                                  ${this.getSuggestionIcon(suggestion)}
                                              </div>
                                              <div class="suggestion-content">
                                                  <h4 class="suggestion-title">${title}</h4>
                                              </div>
                                              <svg class="suggestion-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                  <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                              </svg>
                                          </div>
                                      `;
                                  }
                              )}
                          </div>
                      `
                    : html`
                          <div class="empty-state">
                              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                              </svg>
                              <div class="empty-state-text">
                                  Start speaking to see suggested questions appear here.
                              </div>
                          </div>
                      `}
                <div class="more-actions">
                    <h3 class="panel-title" style="font-size:14px; font-weight:500;">More Actions</h3>
                    <div class="actions-grid">
                        ${this.actions.map(
                            action => html`
                                <div class="action-btn" @click=${() => this.onActionSelect(action)}>
                                    <div class="action-btn-icon">
                                        ${this.getActionIcon(action)}
                                    </div>
                                    <span>${action}</span>
                                </div>
                            `
                        )}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('clue-suggestions-panel', ClueSuggestionsPanel);