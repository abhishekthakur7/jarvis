import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import { UIComponentTemplates } from '../../utils/uiComponentTemplates.js';
import { LayoutSettingsManager } from '../../utils/layoutSettingsManager.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 12px;
            margin: 0 auto;
            max-width: 700px;
        }

        .settings-container {
            display: grid;
            gap: 12px;
            padding-bottom: 20px;
        }

        .settings-section {
            background: var(--card-background, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            border-radius: 6px;
            padding: 16px;
            backdrop-filter: blur(10px);
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-color);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .section-title::before {
            content: '';
            width: 3px;
            height: 14px;
            background: var(--accent-color, #007aff);
            border-radius: 1.5px;
        }

        .form-grid {
            display: grid;
            gap: 12px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            align-items: start;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            line-height: 1.3;
            margin-top: 2px;
        }

        .form-control {
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            color: var(--text-color);
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.15s ease;
            min-height: 16px;
            font-weight: 400;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
            background: var(--input-focus-background, rgba(0, 0, 0, 0.4));
        }

        .form-control:hover:not(:focus) {
            border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
            background: var(--input-hover-background, rgba(0, 0, 0, 0.35));
        }

        select.form-control {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 12px;
            padding-right: 28px;
        }

        textarea.form-control {
            resize: vertical;
            min-height: 60px;
            line-height: 1.4;
            font-family: inherit;
        }

        textarea.form-control::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
        }

        .profile-option {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            border: 1px solid var(--success-border, rgba(52, 211, 153, 0.2));
        }

        .current-selection::before {
            content: '✓';
            font-weight: 600;
        }

        .keybind-input {
            cursor: pointer;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: text;
            background: var(--input-focus-background, rgba(0, 122, 255, 0.1));
        }

        .keybind-input::placeholder {
            color: var(--placeholder-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
        }

        .reset-keybinds-button {
            background: var(--button-background, rgba(255, 255, 255, 0.1));
            color: var(--text-color);
            border: 1px solid var(--button-border, rgba(255, 255, 255, 0.15));
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .reset-keybinds-button:hover {
            background: var(--button-hover-background, rgba(255, 255, 255, 0.15));
            border-color: var(--button-hover-border, rgba(255, 255, 255, 0.25));
        }

        .reset-keybinds-button:active {
            transform: translateY(1px);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border-radius: 4px;
            overflow: hidden;
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: 8px 10px;
            text-align: left;
            border-bottom: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .keybinds-table th {
            background: var(--table-header-background, rgba(255, 255, 255, 0.04));
            font-weight: 600;
            font-size: 11px;
            color: var(--label-color, rgba(255, 255, 255, 0.8));
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .keybinds-table td {
            vertical-align: middle;
        }

        .keybinds-table .action-name {
            font-weight: 500;
            color: var(--text-color);
            font-size: 12px;
        }

        .keybinds-table .action-description {
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: 4px 8px;
            margin: 0;
            font-size: 11px;
        }

        .keybinds-table tr:hover {
            background: var(--table-row-hover, rgba(255, 255, 255, 0.02));
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--table-border, rgba(255, 255, 255, 0.08));
        }

        .table-reset-row td {
            padding-top: 10px;
            padding-bottom: 8px;
            border-bottom: none;
        }

        .settings-note {
            font-size: 10px;
            color: var(--note-color, rgba(255, 255, 255, 0.4));
            font-style: italic;
            text-align: center;
            margin-top: 10px;
            padding: 8px;
            background: var(--note-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--note-border, rgba(255, 255, 255, 0.08));
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 8px;
            background: var(--checkbox-background, rgba(255, 255, 255, 0.02));
            border-radius: 4px;
            border: 1px solid var(--checkbox-border, rgba(255, 255, 255, 0.06));
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--focus-border-color, #007aff);
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--label-color, rgba(255, 255, 255, 0.9));
            cursor: pointer;
            user-select: none;
        }

        /* Better focus indicators */
        .form-control:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Improved button states */
        .reset-keybinds-button:focus-visible {
            outline: none;
            border-color: var(--focus-border-color, #007aff);
            box-shadow: 0 0 0 2px var(--focus-shadow, rgba(0, 122, 255, 0.1));
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-value {
            font-size: 11px;
            color: var(--success-color, #34d399);
            background: var(--success-background, rgba(52, 211, 153, 0.1));
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            outline: none;
            border: 1px solid var(--input-border, rgba(255, 255, 255, 0.15));
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: pointer;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--focus-border-color, #007aff);
            cursor: pointer;
            border: 2px solid var(--text-color, white);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-input:hover::-webkit-slider-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-input:hover::-moz-range-thumb {
            background: var(--text-input-button-hover, #0056b3);
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--description-color, rgba(255, 255, 255, 0.5));
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        focusMode: { type: Boolean },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        selectedFontFamily: { type: String },
        selectedCodeFontFamily: { type: String },
        teleprompterMode: { type: String },
        advancedMode: { type: Boolean },
        // Unified layout settings object
        layoutSettings: { type: Object },
        // Selected layout mode for configuration (separate from active layout mode)
        selectedLayoutModeForConfig: { type: String },
        // Event handlers
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onScreenshotIntervalChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        onTeleprompterModeChange: { type: Function },
        onFocusModeChange: { type: Function },
        onAdvancedModeChange: { type: Function },
    };

    constructor() {
        super();
        
        // Core settings
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-IN';
        this.selectedScreenshotInterval = 'manual';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'compact';
        this.teleprompterMode = localStorage.getItem('teleprompterMode') || 'balanced';
        this.focusMode = false;
        this.keybinds = this.getDefaultKeybinds();
        this.googleSearchEnabled = false;
        this.advancedMode = false;
        this.backgroundTransparency = 0.45;
        this.fontSize = 11;
        this.selectedFontFamily = 'Inter';
        this.selectedCodeFontFamily = 'Fira Code';
        
        // Event handlers (default no-ops)
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onScreenshotIntervalChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.onTeleprompterModeChange = () => {};
        this.onFocusModeChange = () => {};
        this.onAdvancedModeChange = () => {};

        // Initialize layout settings using LayoutSettingsManager
        LayoutSettingsManager.initializeDefaultsInLocalStorage();
        this.layoutSettings = LayoutSettingsManager.loadAllSettings();
        
        // Set initial layout mode for configuration (defaults to current active layout mode)
        this.selectedLayoutModeForConfig = localStorage.getItem('layoutMode') || 'normal';

        // Load other settings
        this.loadKeybinds();
        this.loadGoogleSearchSettings();
        this.loadAdvancedModeSettings();
        this.loadBackgroundTransparency();
        this.loadFontSize();
        this.loadCodeFontFamily();
    }

    connectedCallback() {
        super.connectedCallback();
        // Load layout mode for display purposes
        this.loadLayoutMode();
        // Load font family setting
        this.loadFontFamily();
        // Load code font family setting
        this.loadCodeFontFamily();
        // Load Google Fonts
        this.loadGoogleFonts();
        
        // Listen for font size changes from AssistantView
        this.handleFontSizeChange = this.handleFontSizeChange.bind(this);
        document.addEventListener('font-size-change', this.handleFontSizeChange);
        
        // Listen for auto scroll changes from AssistantView
        this.handleAutoScrollChangeFromAssistantView = this.handleAutoScrollChangeFromAssistantView.bind(this);
        document.addEventListener('auto-scroll-change', this.handleAutoScrollChangeFromAssistantView);
        
        // Dispatch initial state using actual saved localStorage values
        requestAnimationFrame(() => {
            const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
            

            
            // Get actual saved auto-scroll setting from localStorage, not default settings
            let savedAutoScroll;
            if (currentLayoutMode === 'normal') {
                savedAutoScroll = localStorage.getItem('normalAutoScroll');
            } else if (currentLayoutMode === 'compact') {
                savedAutoScroll = localStorage.getItem('compactAutoScroll');
            } else if (currentLayoutMode === 'system-design') {
                savedAutoScroll = localStorage.getItem('systemDesignAutoScroll');
            }
            
            // Get actual saved animate response setting from localStorage
            let savedAnimateResponse;
            if (currentLayoutMode === 'normal') {
                savedAnimateResponse = localStorage.getItem('normalAnimateResponse');
            } else if (currentLayoutMode === 'compact') {
                savedAnimateResponse = localStorage.getItem('compactAnimateResponse');
            } else if (currentLayoutMode === 'system-design') {
                savedAnimateResponse = localStorage.getItem('systemDesignAnimateResponse');
            }
            
            // Use saved values if they exist, otherwise fall back to defaults
            const currentSettings = this.layoutSettings[currentLayoutMode];
            const autoScrollEnabled = savedAutoScroll !== null ? savedAutoScroll === 'true' : (currentSettings ? currentSettings.autoScroll : false);
            const animateResponseEnabled = savedAnimateResponse !== null ? savedAnimateResponse === 'true' : (currentSettings ? currentSettings.animateResponse : false);
            
            console.log('  savedAutoScroll for', currentLayoutMode, ':', savedAutoScroll);
            console.log('  autoScrollEnabled resolved to:', autoScrollEnabled);
            console.log('  Dispatching auto-scroll-change event with enabled:', autoScrollEnabled);
            
            document.dispatchEvent(new CustomEvent('auto-scroll-change', {
                detail: {
                    layoutMode: currentLayoutMode,
                    enabled: autoScrollEnabled,
                    source: 'customize-view-init'
                }
            }));
            
            document.dispatchEvent(new CustomEvent('animate-response-change', {
                detail: {
                    layoutMode: currentLayoutMode,
                    enabled: animateResponseEnabled,
                    source: 'customize-view-init'
                }
            }));
        });
        
        // Resize window for this view
        resizeLayout();
    }
    
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clean up event listeners
        document.removeEventListener('font-size-change', this.handleFontSizeChange);
        document.removeEventListener('auto-scroll-change', this.handleAutoScrollChangeFromAssistantView);
    }
    
    /**
     * Handle auto scroll changes from AssistantView
     */
    handleAutoScrollChangeFromAssistantView(event) {
        const { layoutMode, enabled, source } = event.detail;
        
        // Only handle if the change comes from AssistantView to avoid loops
        if (source === 'assistant-view') {
            // Update the layoutSettings object
            if (this.layoutSettings[layoutMode]) {
                this.layoutSettings[layoutMode].autoScroll = enabled;
                // Trigger re-render to update the checkbox state
                this.requestUpdate();
                
                // Auto scroll updated from AssistantView handled
            }
        }
    }

    /**
     * Handle font size changes from AssistantView
     */
    handleFontSizeChange(event) {
        const { layoutMode, fontSize, source } = event.detail;
        
        // Only handle if the change comes from AssistantView to avoid loops
        if (source === 'assistant-view') {
            // Update the layoutSettings object
            if (this.layoutSettings[layoutMode]) {
                this.layoutSettings[layoutMode].fontSize = fontSize;
                // Trigger re-render to update the slider values
                this.requestUpdate();
                
                // Font size updated from AssistantView handled
            }
        }
    }

    getProfiles() {
        return [
            {
                value: 'interview',
                name: 'Job Interview',
                description: 'Get help with answering interview questions',
            }
        ];
    }

    getLanguages() {
        return [
            { value: 'en-IN', name: 'English (India)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-US', name: 'English (US)' },
        ];
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
        };
    }

    /**
     * Handle layout mode selection change for configuration
     * This changes which layout mode's settings are being displayed/edited
     * @param {Event} e - Change event
     */
    handleLayoutModeForConfigSelect(e) {
        this.selectedLayoutModeForConfig = e.target.value;
        // Layout mode for configuration changed
        this.requestUpdate();
    }

    /**
     * Render a unified layout settings section with dropdown selector
     * @returns {TemplateResult} Unified layout settings HTML
     */
    renderUnifiedLayoutSettings() {
        const layoutModes = LayoutSettingsManager.getAllLayoutModes();
        const currentSettings = this.layoutSettings[this.selectedLayoutModeForConfig] || {};
        const currentModeInfo = LayoutSettingsManager.LAYOUT_MODES[this.selectedLayoutModeForConfig];
        
        const settingKeys = LayoutSettingsManager.getSettingKeys();
        const settingsGroups = this.groupSettingsForLayout(settingKeys, this.selectedLayoutModeForConfig);
        
        return UIComponentTemplates.section({
            title: 'Layout Mode Settings',
            content: html`
                <!-- Layout Mode Selector -->
                <div class="form-group full-width">
                    <label class="form-label">
                        Configure Settings For
                        <span class="current-selection">${currentModeInfo?.name || 'Unknown'}</span>
                    </label>
                    <select 
                        class="form-control" 
                        .value=${this.selectedLayoutModeForConfig} 
                        @change=${this.handleLayoutModeForConfigSelect}
                    >
                        ${layoutModes.map(mode => html`
                            <option 
                                value="${mode.key}" 
                                ?selected=${this.selectedLayoutModeForConfig === mode.key}
                            >
                                ${mode.name}
                            </option>
                        `)}
                    </select>
                    <div class="form-description">
                        ${currentModeInfo?.description || 'Select a layout mode to configure its settings'}
                    </div>
                </div>
                
                <!-- Settings for Selected Layout Mode -->
                <div class="layout-settings-content">
                    ${settingsGroups.map(group => this.renderSettingsGroup(group, this.selectedLayoutModeForConfig, currentSettings))}
                </div>
            `
        });
    }

    handleProfileSelect(e) {
        localStorage.setItem('selectedProfile', this.selectedProfile);
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        localStorage.setItem('selectedLanguage', this.selectedLanguage);
        this.onLanguageChange(this.selectedLanguage);
    }

    handleScreenshotIntervalSelect(e) {
        this.selectedScreenshotInterval = e.target.value;
        localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        this.onScreenshotIntervalChange(this.selectedScreenshotInterval);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(e.target.value);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        // Use LayoutSettingsManager to handle the layout mode change
        LayoutSettingsManager.handleLayoutModeChange(this.layoutMode);
        this.onLayoutModeChange(e.target.value);
        
        // Layout mode changed
    }

    handleTeleprompterModeSelect(e) {
        this.teleprompterMode = e.target.value;
        localStorage.setItem('teleprompterMode', this.teleprompterMode);
        this.onTeleprompterModeChange(e.target.value);
    }

    getTeleprompterModeDisplayName() {
        switch (this.teleprompterMode) {
            case 'ultra-discrete': return 'Ultra Discrete';
            case 'presentation': return 'Presentation';
            default: return 'Balanced';
        }
    }

    getTeleprompterModeDescription() {
        switch (this.teleprompterMode) {
            case 'ultra-discrete':
                return 'Minimal 280×200px interface with single-line key points for maximum discretion';
            case 'presentation':
                return 'Spacious 400×350px layout with enhanced visual indicators for clear presentation';
            default:
                return 'Balanced 350×300px layout with structured information blocks and moderate hierarchy';
        }
    }

    handleFocusModeChange(e) {
        this.focusMode = e.target.checked;
        localStorage.setItem('focusMode', this.focusMode.toString());
        this.onFocusModeChange(this.focusMode);
    }

    getLayoutModeDisplayName() {
        return LayoutSettingsManager.getLayoutModeDisplayName(this.layoutMode);
    }

    getLayoutModeDescription() {
        return LayoutSettingsManager.getLayoutModeDescription(this.layoutMode);
    }

    /**
     * Unified handler for layout setting changes
     * @param {string} layoutMode - The layout mode (normal, compact, system-design)
     * @param {string} settingKey - The setting key (transparency, fontSize, etc.)
     * @param {*} value - The new value
     */
    handleLayoutSettingChange(layoutMode, settingKey, value) {
        // Update local state
        if (this.layoutSettings[layoutMode]) {
            this.layoutSettings[layoutMode][settingKey] = value;
        }
        
        // Update using LayoutSettingsManager (handles localStorage and events)
        LayoutSettingsManager.updateSetting(layoutMode, settingKey, value);
        
        // Check what was actually stored
        if (settingKey === 'autoScroll') {
            const storageKey = `${layoutMode}${settingKey.charAt(0).toUpperCase() + settingKey.slice(1)}`;
            const storedValue = localStorage.getItem(storageKey);
            console.log('  After updateSetting, localStorage[' + storageKey + ']:', storedValue);
        }
        
        // Trigger re-render
        this.requestUpdate();
        
        // Layout setting updated
    }

    handleCustomPromptInput(e) {
        localStorage.setItem('customPrompt', e.target.value);
    }

    getDefaultKeybinds() {
        // // Centralized shortcut configuration
        // if (window.getDefaultKeybinds) return window.getDefaultKeybinds();
        // try {
        //     console.log('Loading customize view shortcuts');
        //     return require('../../utils/shortcutConfig.js').getDefaultKeybinds();
        // } catch (e) {
        //     console.error('Failed to load default keybinds:', e);
        //     return {};
        // }
        const isMac = cheddar.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            microphoneToggle: isMac ? 'Shift+Alt+8' : 'Shift+Alt+8',
            speakerDetectionToggle: isMac ? 'Shift+Alt+0' : 'Shift+Alt+0',
            reinitializeSession: isMac ? 'Cmd+G' : 'Ctrl+G',
            toggleLayoutMode: 'Shift+Alt+/',
            nextStep: isMac ? 'Shift+Alt+4' : 'Shift+Alt+4',
            nextStepPro: isMac ? 'Shift+Alt+,' : 'Shift+Alt+,',
            previousResponse: isMac ? 'Cmd+Alt+[' : 'Ctrl+Alt+[',
            nextResponse: isMac ? 'Cmd+Alt+]' : 'Ctrl+Alt+]',
            scrollUp: 'Shift+Alt+1',
            scrollDown: 'Shift+Alt+2',
            toggleAutoScroll: isMac ? 'Shift+Alt+3' : 'Shift+Alt+3',
            windowClose: 'Shift+Alt+;',
            increaseTransparency: 'Ctrl+Alt+PageUp',
            decreaseTransparency: 'Ctrl+Alt+PageDown'
        };
    }

    loadKeybinds() {
        const savedKeybinds = localStorage.getItem('customKeybinds');
        if (savedKeybinds) {
            try {
                this.keybinds = { ...this.getDefaultKeybinds(), ...JSON.parse(savedKeybinds) };
            } catch (e) {
                console.error('Failed to parse saved keybinds:', e);
                this.keybinds = this.getDefaultKeybinds();
            }
        }
    }

    saveKeybinds() {
        localStorage.setItem('customKeybinds', JSON.stringify(this.keybinds));
        // Send to main process to update global shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        localStorage.removeItem('customKeybinds');
        this.requestUpdate();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    getKeybindActions() {
        return [
            {
                key: 'moveUp',
                name: 'Move Window Up',
                description: 'Move the application window up',
            },
            {
                key: 'moveDown',
                name: 'Move Window Down',
                description: 'Move the application window down',
            },
            {
                key: 'moveLeft',
                name: 'Move Window Left',
                description: 'Move the application window left',
            },
            {
                key: 'moveRight',
                name: 'Move Window Right',
                description: 'Move the application window right',
            },
            {
                key: 'toggleVisibility',
                name: 'Toggle Window Visibility',
                description: 'Show/hide the application window',
            },
            {
                key: 'toggleClickThrough',
                name: 'Toggle Click-through Mode',
                description: 'Enable/disable click-through functionality',
            },
            {
                key: 'microphoneToggle',
                name: 'Toggle Microphone',
                description: 'Enable/disable microphone input',
            },
            {
                key: 'speakerDetectionToggle',
                name: 'Toggle Speaker Detection',
                description: 'Enable/disable speaker audio detection',
            },
            {
                key: 'reinitializeSession',
                name: 'Reinitialize Session',
                description: 'Restart the AI session',
            },
            {
                key: 'toggleLayoutMode',
                name: 'Toggle Layout Mode',
                description: 'Switch between compact and normal layout modes',
            },
            {
                key: 'nextStep',
                name: 'Ask Next Step',
                description: 'Take screenshot and ask AI for the next step suggestion',
            },
            {
                key: 'previousResponse',
                name: 'Previous Response',
                description: 'Navigate to the previous AI response',
            },
            {
                key: 'nextResponse',
                name: 'Next Response',
                description: 'Navigate to the next AI response',
            },
            {
                key: 'scrollUp',
                name: 'Scroll Response Up',
                description: 'Scroll the AI response content up',
            },
            {
                key: 'scrollDown',
                name: 'Scroll Response Down',
                description: 'Scroll the AI response content down',
            },
            {
                key: 'toggleAutoScroll',
                name: 'Toggle Auto-Scroll',
                description: 'Enable/disable automatic scrolling in jarvis view',
            },
            {
                key: 'windowClose',
                name: 'Close Window/Session',
                description: 'Close the current session or application window',
            },
            {
                key: 'increaseTransparency',
                name: 'Increase Transparency',
                description: 'Increase transparency of the current layout mode by 5%',
            },
            {
                key: 'decreaseTransparency',
                name: 'Decrease Transparency',
                description: 'Decrease transparency of the current layout mode by 5%',
            },
        ];
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();

        const modifiers = [];
        const keys = [];

        // Check modifiers
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get the main key
        let mainKey = e.key;

        // Handle special keys
        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            case 'KeyS':
                if (e.shiftKey) mainKey = 'S';
                break;
            case 'KeyM':
                mainKey = 'M';
                break;
            default:
                if (e.key.length === 1) {
                    mainKey = e.key.toUpperCase();
                }
                break;
        }

        // Skip if only modifier keys are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        // Construct keybind string
        const keybind = [...modifiers, mainKey].join('+');

        // Get the action from the input's data attribute
        const action = e.target.dataset.action;

        // Update the keybind
        this.handleKeybindChange(action, keybind);

        // Update the input value
        e.target.value = keybind;
        e.target.blur();
    }

    loadGoogleSearchSettings() {
        const googleSearchEnabled = localStorage.getItem('googleSearchEnabled');
        if (googleSearchEnabled !== null) {
            this.googleSearchEnabled = googleSearchEnabled === 'true';
        }
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        localStorage.setItem('googleSearchEnabled', this.googleSearchEnabled.toString());

        // Notify main process if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }

        this.requestUpdate();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode) {
            this.layoutMode = savedLayoutMode;
        }
        this.focusMode = localStorage.getItem('focusMode') === 'true';
    }

    loadAdvancedModeSettings() {
        const advancedMode = localStorage.getItem('advancedMode');
        if (advancedMode !== null) {
            this.advancedMode = advancedMode === 'true';
        }
    }

    async handleAdvancedModeChange(e) {
        this.advancedMode = e.target.checked;
        localStorage.setItem('advancedMode', this.advancedMode.toString());
        this.onAdvancedModeChange(this.advancedMode);
        this.requestUpdate();
    }

    loadBackgroundTransparency() {
        const backgroundTransparency = localStorage.getItem('backgroundTransparency');
        if (backgroundTransparency !== null) {
            this.backgroundTransparency = parseFloat(backgroundTransparency) || 0.6;
        }
        this.updateBackgroundTransparency();
    }

    handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        localStorage.setItem('backgroundTransparency', this.backgroundTransparency.toString());
        this.updateBackgroundTransparency();
        this.requestUpdate();
    }

    updateBackgroundTransparency() {
        const root = document.documentElement;
        root.style.setProperty('--header-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--card-background', `rgba(255, 255, 255, ${this.backgroundTransparency * 0.05})`);
        root.style.setProperty('--input-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.375})`);
        root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--button-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--preview-video-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 1.125})`);
        root.style.setProperty('--screen-option-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
        root.style.setProperty('--screen-option-hover-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.75})`);
        root.style.setProperty('--scrollbar-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
        root.style.setProperty('--code-block-background', `rgba(6, 6, 6, ${this.backgroundTransparency})`);
        // Add new variables for response container content
        root.style.setProperty('--inline-code-background', `rgba(255, 255, 255, ${this.backgroundTransparency * 0.08})`);
        root.style.setProperty('--pre-code-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.4})`);
        root.style.setProperty('--blockquote-background', `rgba(0, 122, 255, ${this.backgroundTransparency * 0.08})`);
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            this.fontSize = parseInt(fontSize, 10) || 20;
        }
        this.updateFontSize();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        localStorage.setItem('fontSize', this.fontSize.toString());
        this.updateFontSize();
        this.requestUpdate();
    }

    // Transparency adjustment methods for shortcuts
    increaseTransparency() {
        const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
        const settings = LayoutSettingsManager.loadSettings(currentLayoutMode);
        const currentTransparency = Math.round(settings.transparency * 100);
        const newTransparency = Math.min(100, currentTransparency + 5);
        LayoutSettingsManager.updateSetting(currentLayoutMode, 'transparency', newTransparency / 100);
    }

    decreaseTransparency() {
        const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
        const settings = LayoutSettingsManager.loadSettings(currentLayoutMode);
        const currentTransparency = Math.round(settings.transparency * 100);
        const newTransparency = Math.max(30, currentTransparency - 5);
        LayoutSettingsManager.updateSetting(currentLayoutMode, 'transparency', newTransparency / 100);
    }











    loadFontFamily() {
        const savedFontFamily = localStorage.getItem('selectedFontFamily');
        if (savedFontFamily) {
            this.selectedFontFamily = savedFontFamily;
        } else {
            // Set default font family if none is saved
            this.selectedFontFamily = 'Inter';
            localStorage.setItem('selectedFontFamily', this.selectedFontFamily);
        }
        this.updateFontFamily();
    }

    handleFontFamilyChange(e) {
        this.selectedFontFamily = e.target.value;
        localStorage.setItem('selectedFontFamily', this.selectedFontFamily);
        this.updateFontFamily();
    }

    updateFontFamily() {
        // Ensure we have a valid font family value
        let fontFamily = this.selectedFontFamily;
        
        // If it's just a simple name like 'Inter', convert it to the full font stack
        if (fontFamily && !fontFamily.includes(',')) {
            const fontOptions = this.getFontFamilyOptions();
            const matchingOption = fontOptions.find(option => option.label === fontFamily);
            if (matchingOption) {
                fontFamily = matchingOption.value;
            }
        }
        
        // Set the CSS variable with the full font stack
        document.documentElement.style.setProperty('--font-family', fontFamily);
        window.electronAPI?.ipcRenderer?.send('font-family-changed', fontFamily);
    }

    getFontFamilyOptions() {
        // Load Google Fonts for non-web-safe fonts
        this.loadGoogleFonts();
        
        return [
            { value: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'Inter' },
            { value: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'SF Pro Display' },
            { value: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', label: 'Segoe UI' },
            { value: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'Roboto' },
            { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica Neue' },
            { value: 'Arial, "Helvetica Neue", Helvetica, sans-serif', label: 'Arial' },
            { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'System UI' },
            { value: 'Georgia, "Times New Roman", Times, serif', label: 'Georgia' },
            { value: '"Times New Roman", Times, Georgia, serif', label: 'Times New Roman' },
            { value: '"Courier New", Courier, "Lucida Console", monospace', label: 'Courier New' },
            { value: 'Monaco, "Lucida Console", "Courier New", monospace', label: 'Monaco' },
            { value: '"Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', label: 'Fira Code' }
        ];
    }

    loadCodeFontFamily() {
        const savedCodeFontFamily = localStorage.getItem('selectedCodeFontFamily');
        if (savedCodeFontFamily) {
            this.selectedCodeFontFamily = savedCodeFontFamily;
        } else {
            // Set default code font family if none is saved
            this.selectedCodeFontFamily = 'Fira Code';
            localStorage.setItem('selectedCodeFontFamily', this.selectedCodeFontFamily);
        }
        this.updateCodeFontFamily();
    }

    handleCodeFontFamilyChange(e) {
        this.selectedCodeFontFamily = e.target.value;
        localStorage.setItem('selectedCodeFontFamily', this.selectedCodeFontFamily);
        this.updateCodeFontFamily();
    }

    updateCodeFontFamily() {
        // Ensure we have a valid font family value
        let fontFamily = this.selectedCodeFontFamily;
        
        // If it's just a simple name like 'Fira Code', convert it to the full font stack
        if (fontFamily && !fontFamily.includes(',')) {
            const fontOptions = this.getCodeFontFamilyOptions();
            const matchingOption = fontOptions.find(option => option.label === fontFamily);
            if (matchingOption) {
                fontFamily = matchingOption.value;
            }
        }
        
        // Set the CSS variable with the full font stack for code blocks
        document.documentElement.style.setProperty('--code-font-family', fontFamily);
    }

    getCodeFontFamilyOptions() {
        // Load Google Fonts for code fonts
        this.loadGoogleFonts();
        
        return [
            { value: '"Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', label: 'Fira Code' },
            { value: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', label: 'SF Mono' },
            { value: 'Monaco, "Lucida Console", "Courier New", monospace', label: 'Monaco' },
            { value: '"Cascadia Code", "Fira Code", "SF Mono", Monaco, "Roboto Mono", Consolas, monospace', label: 'Cascadia Code' },
            { value: '"Roboto Mono", "Fira Code", "SF Mono", Monaco, Consolas, "Courier New", monospace', label: 'Roboto Mono' },
            { value: 'Consolas, "Courier New", Monaco, "Lucida Console", monospace', label: 'Consolas' },
            { value: '"Courier New", Courier, "Lucida Console", monospace', label: 'Courier New' },
            { value: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace', label: 'JetBrains Mono' },
            { value: '"Source Code Pro", "Fira Code", "SF Mono", Monaco, Consolas, monospace', label: 'Source Code Pro' },
            { value: '"Ubuntu Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace', label: 'Ubuntu Mono' }
        ];
    }

    /**
     * Render a layout-specific settings section
     * @param {string} layoutMode - The layout mode key
     * @returns {TemplateResult} Layout section HTML
     */
    renderLayoutSection(layoutMode) {
        const settings = this.layoutSettings[layoutMode] || {};
        const modeInfo = LayoutSettingsManager.LAYOUT_MODES[layoutMode];
        
        if (!modeInfo) return html``;
        
        const settingKeys = LayoutSettingsManager.getSettingKeys();
        const settingsGroups = this.groupSettingsForLayout(settingKeys, layoutMode);
        
        return UIComponentTemplates.section({
            title: `${modeInfo.name} Layout Settings`,
            content: html`
                ${settingsGroups.map(group => this.renderSettingsGroup(group, layoutMode, settings))}
            `
        });
    }
    
    /**
     * Group settings for better layout organization
     * @param {Array} settingKeys - Array of setting keys
     * @param {string} layoutMode - The layout mode
     * @returns {Array} Grouped settings
     */
    groupSettingsForLayout(settingKeys, layoutMode) {
        return [
            {
                type: 'sliders',
                keys: ['transparency', 'fontSize', 'scrollSpeed']
            },
            {
                type: 'checkboxes', 
                keys: ['autoScroll', 'animateResponse']
            },
            {
                type: 'dimensions',
                keys: ['width', 'height']
            }
        ];
    }
    
    /**
     * Render a group of settings
     * @param {Object} group - Settings group
     * @param {string} layoutMode - The layout mode
     * @param {Object} settings - Current settings
     * @returns {TemplateResult} Settings group HTML
     */
    renderSettingsGroup(group, layoutMode, settings) {
        const { type, keys } = group;
        
        switch (type) {
            case 'sliders':
                return html`
                    ${keys.map(key => this.renderLayoutSlider(layoutMode, key, settings[key]))}
                `;
            case 'checkboxes':
                return UIComponentTemplates.formRow([
                    ...keys.map(key => this.renderLayoutCheckbox(layoutMode, key, settings[key]))
                ]);
            case 'dimensions':
                return UIComponentTemplates.formRow([
                    ...keys.map(key => this.renderLayoutSlider(layoutMode, key, settings[key]))
                ]);
            default:
                return html``;
        }
    }
    
    /**
     * Render a slider for a layout setting
     * @param {string} layoutMode - The layout mode
     * @param {string} settingKey - The setting key
     * @param {*} value - Current value
     * @returns {TemplateResult} Slider HTML
     */
    renderLayoutSlider(layoutMode, settingKey, value) {
        const definition = LayoutSettingsManager.getSettingDefinition(settingKey, layoutMode);
        
        // Pass raw value to slider, but format value for display
        const displayValue = definition.formatValue ? definition.formatValue(value) : value;
        
        return UIComponentTemplates.slider({
            label: definition.label,
            value: displayValue,
            min: definition.min,
            max: definition.max,
            step: definition.step,
            unit: definition.unit,
            description: definition.description,
            minLabel: definition.minLabel,
            maxLabel: definition.maxLabel,
            onChange: (e) => {
                const newValue = settingKey === 'transparency' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
                this.handleLayoutSettingChange(layoutMode, settingKey, newValue);
            },
            // Pass the raw value to the slider input
            rawValue: value
        });
    }
    
    /**
     * Render a checkbox for a layout setting
     * @param {string} layoutMode - The layout mode
     * @param {string} settingKey - The setting key
     * @param {boolean} value - Current value
     * @returns {TemplateResult} Checkbox HTML
     */
    renderLayoutCheckbox(layoutMode, settingKey, value) {
        const definition = LayoutSettingsManager.getSettingDefinition(settingKey, layoutMode);
        
        return UIComponentTemplates.checkbox({
            id: `${layoutMode}-${settingKey}`,
            label: definition.label,
            checked: value,
            description: definition.description,
            onChange: (e) => this.handleLayoutSettingChange(layoutMode, settingKey, e.target.checked)
        });
    }

    loadGoogleFonts() {
        // Check if Google Fonts are already loaded
        if (document.querySelector('link[href*="fonts.googleapis.com"]')) {
            return;
        }

        // Create and append Google Fonts link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Fira+Code:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500;600&family=Source+Code+Pro:wght@300;400;500;600&family=Ubuntu+Mono:wght@400;700&display=swap';
        document.head.appendChild(link);
    }

    render() {
        const profiles = this.getProfiles();
        const languages = this.getLanguages();
        const profileNames = this.getProfileNames();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);

        return html`
            <div class="settings-container">
                <!-- Profile & Behavior Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>AI Profile & Behavior</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Profile Type
                                    <span class="current-selection">${currentProfile?.name || 'Unknown'}</span>
                                </label>
                                <select class="form-control" .value=${this.selectedProfile} @change=${this.handleProfileSelect}>
                                    ${profiles.map(
                                        profile => html`
                                            <option value=${profile.value} ?selected=${this.selectedProfile === profile.value}>
                                                ${profile.name}
                                            </option>
                                        `
                                    )}
                                </select>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">Custom AI Instructions</label>
                            <textarea
                                class="form-control"
                                placeholder="Add specific instructions for how you want the AI to behave during ${
                                    profileNames[this.selectedProfile] || 'this interaction'
                                }..."
                                .value=${localStorage.getItem('customPrompt') || ''}
                                rows="4"
                                @input=${this.handleCustomPromptInput}
                            ></textarea>
                            <div class="form-description">
                                Personalize the AI's behavior with specific instructions that will be added to the
                                ${profileNames[this.selectedProfile] || 'selected profile'} base prompts
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Language & Audio Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Language & Audio</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Speech Language
                                    <span class="current-selection">${currentLanguage?.name || 'Unknown'}</span>
                                </label>
                                <select class="form-control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                                    ${languages.map(
                                        language => html`
                                            <option value=${language.value} ?selected=${this.selectedLanguage === language.value}>
                                                ${language.name}
                                            </option>
                                        `
                                    )}
                                </select>
                                <div class="form-description">Language for speech recognition and AI responses</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Interface Layout Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>Interface Layout</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    Layout Mode
                                    <span class="current-selection">${this.getLayoutModeDisplayName()}</span>
                                </label>
                                <select class="form-control" .value=${this.layoutMode} @change=${this.handleLayoutModeSelect}>
                                    <option value="normal" ?selected=${this.layoutMode === 'normal'}>Normal</option>
                                    <option value="compact" ?selected=${this.layoutMode === 'compact'}>Compact</option>
                                    <option value="system-design" ?selected=${this.layoutMode === 'system-design'}>System Design</option>
                                </select>
                                <div class="form-description">
                                    ${this.getLayoutModeDescription()}
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    Teleprompter Mode
                                    <span class="current-selection">${this.getTeleprompterModeDisplayName()}</span>
                                </label>
                                <select class="form-control" .value=${this.teleprompterMode} @change=${this.handleTeleprompterModeSelect}>
                                    <option value="balanced" ?selected=${this.teleprompterMode === 'balanced'}>Balanced</option>
                                    <option value="ultra-discrete" ?selected=${this.teleprompterMode === 'ultra-discrete'}>Ultra Discrete</option>
                                    <option value="presentation" ?selected=${this.teleprompterMode === 'presentation'}>Presentation</option>
                                </select>
                                <div class="form-description">
                                    ${this.getTeleprompterModeDescription()}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Font Family</label>
                                <select
                                    class="form-control"
                                    .value=${this.selectedFontFamily}
                                    @change=${this.handleFontFamilyChange}
                                >
                                    ${this.getFontFamilyOptions().map(font => html`
                                        <option value="${font.value}" ?selected=${this.selectedFontFamily === font.value}>
                                            ${font.label}
                                        </option>
                                    `)}
                                </select>
                                <div class="form-description">
                                    Choose the font family for the interface and AI responses
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Code Font Family</label>
                                <select
                                    class="form-control"
                                    .value=${this.selectedCodeFontFamily}
                                    @change=${this.handleCodeFontFamilyChange}
                                >
                                    ${this.getCodeFontFamilyOptions().map(font => html`
                                        <option value="${font.value}" ?selected=${this.selectedCodeFontFamily === font.value}>
                                            ${font.label}
                                        </option>
                                    `)}
                                </select>
                                <div class="form-description">
                                    Choose the font family specifically for code snippets
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <div class="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="focus-mode"
                                        class="checkbox-input"
                                        .checked=${this.focusMode}
                                        @change=${this.handleFocusModeChange}
                                    />
                                    <label for="focus-mode" class="checkbox-label">Focus Mode</label>
                                </div>
                                <div class="form-description">
                                    Hide non-essential UI elements to minimize eye movement and distractions
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

                <!-- Unified Layout Settings Section -->
                ${this.renderUnifiedLayoutSettings()}
                <!-- Screen Capture Section -->
                ${UIComponentTemplates.section({
                    title: 'Screen Capture Settings',
                    content: UIComponentTemplates.formRow([
                        UIComponentTemplates.select({
                            label: 'Capture Interval',
                            value: this.selectedScreenshotInterval,
                            currentSelection: this.selectedScreenshotInterval === 'manual' ? 'Manual' : this.selectedScreenshotInterval + 's',
                            options: [
                                { value: 'manual', label: 'Manual (On demand)' },
                                { value: '1', label: 'Every 1 second' },
                                { value: '2', label: 'Every 2 seconds' },
                                { value: '5', label: 'Every 5 seconds' },
                                { value: '10', label: 'Every 10 seconds' }
                            ],
                            onChange: this.handleScreenshotIntervalSelect.bind(this),
                            description: this.selectedScreenshotInterval === 'manual' 
                                ? 'Screenshots will only be taken when you use the "Ask Next Step" shortcut'
                                : 'Automatic screenshots will be taken at the specified interval'
                        }),
                        UIComponentTemplates.select({
                            label: 'Image Quality',
                            value: this.selectedImageQuality,
                            currentSelection: this.selectedImageQuality.charAt(0).toUpperCase() + this.selectedImageQuality.slice(1),
                            options: [
                                { value: 'high', label: 'High Quality' },
                                { value: 'medium', label: 'Medium Quality' },
                                { value: 'low', label: 'Low Quality' }
                            ],
                            onChange: this.handleImageQualitySelect.bind(this),
                            description: this.selectedImageQuality === 'high' 
                                ? 'Best quality, uses more tokens'
                                : this.selectedImageQuality === 'medium'
                                  ? 'Balanced quality and token usage'
                                  : 'Lower quality, uses fewer tokens'
                        })
                    ])
                })}

                <!-- Keyboard Shortcuts Section -->
                ${UIComponentTemplates.section({
                    title: 'Keyboard Shortcuts',
                    content: UIComponentTemplates.keybindsTable({
                        actions: this.getKeybindActions(),
                        keybinds: this.keybinds,
                        onKeydown: this.handleKeybindInput.bind(this),
                        onFocus: this.handleKeybindFocus.bind(this),
                        onReset: this.resetKeybinds.bind(this)
                    })
                })}



                <!-- Google Search Section -->
                ${UIComponentTemplates.section({
                    title: 'Google Search',
                    content: html`
                        ${UIComponentTemplates.checkbox({
                            id: 'google-search-enabled',
                            label: 'Enable Google Search',
                            checked: this.googleSearchEnabled,
                            onChange: this.handleGoogleSearchChange.bind(this),
                            description: 'Allow the AI to search Google for up-to-date information and facts during conversations. Changes take effect when starting a new AI session.'
                        })}
                    `
                })}

                ${UIComponentTemplates.settingsNote('Settings are automatically saved as you change them. Changes will take effect immediately or on the next session start.')}

                <!-- Advanced Mode Section (Danger Zone) -->
                ${UIComponentTemplates.section({
                    title: '⚠️ Advanced Mode',
                    content: UIComponentTemplates.checkbox({
                        id: 'advanced-mode',
                        label: 'Enable Advanced Mode',
                        checked: this.advancedMode,
                        onChange: this.handleAdvancedModeChange.bind(this),
                        description: 'Unlock experimental features, developer tools, and advanced configuration options. Advanced mode adds a new icon to the main navigation bar.'
                    }),
                    style: {
                        'border-color': 'var(--danger-border, rgba(239, 68, 68, 0.3))',
                        'background': 'var(--danger-background, rgba(239, 68, 68, 0.05))'
                    }
                })}
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
