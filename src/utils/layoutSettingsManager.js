/**
 * LayoutSettingsManager - Centralized management for layout-specific settings
 * 
 * This utility class manages all layout-specific settings for Normal, Compact, 
 * and System Design layout modes. It provides a unified interface for getting,
 * setting, and persisting layout settings while maintaining backward compatibility.
 * 
 * @class LayoutSettingsManager
 */
export class LayoutSettingsManager {
    
    /**
     * Layout mode definitions with their display names and descriptions
     */
    static LAYOUT_MODES = {
        normal: {
            name: 'Normal',
            description: 'Standard layout with comfortable spacing and font sizes'
        },
        compact: {
            name: 'Compact', 
            description: 'Smaller window size with reduced padding and font sizes for minimal screen footprint'
        },
        'system-design': {
            name: 'System Design',
            description: 'Large window optimized for system design diagrams and architectural discussions'
        }
    };

    /**
     * Default settings for each layout mode
     */
    static DEFAULT_SETTINGS = {
        normal: {
            transparency: 0.60,
            fontSize: 11,
            autoScroll: false,
            animateResponse: false,
            scrollSpeed: 3,
            width: 410,
            height: 350
        },
        compact: {
            transparency: 0.85,
            fontSize: 11,
            autoScroll: false,
            animateResponse: false,
            scrollSpeed: 3,
            width: 280,
            height: 260
        },
        'system-design': {
            transparency: 0.90,
            fontSize: 12,
            autoScroll: false,
            animateResponse: false,
            scrollSpeed: 3,
            width: 1000,
            height: 800
        }
    };

    /**
     * Setting definitions with their constraints and metadata
     */
    static SETTING_DEFINITIONS = {
        transparency: {
            type: 'slider',
            min: 0,
            max: 1,
            step: 0.01,
            unit: '%',
            label: 'Window Transparency',
            description: 'Overall window transparency for this layout mode',
            formatValue: (value) => Math.round(value * 100),
            minLabel: 'Transparent',
            maxLabel: 'Opaque'
        },
        fontSize: {
            type: 'slider',
            min: 10,
            max: 32,
            step: 1,
            unit: 'px',
            label: 'Font Size',
            description: 'Font size for AI responses in this layout mode',
            formatValue: (value) => value,
            minLabel: '10px',
            maxLabel: '32px'
        },
        autoScroll: {
            type: 'checkbox',
            label: 'Auto Scroll',
            description: 'Automatically scroll to new content in this layout mode'
        },
        animateResponse: {
            type: 'checkbox',
            label: 'Animate Response',
            description: 'Word-by-word animation reveal for AI responses in this layout mode'
        },
        scrollSpeed: {
            type: 'slider',
            min: 1,
            max: 10,
            step: 1,
            unit: '',
            label: 'Auto Scroll Speed',
            description: 'Speed of automatic scrolling in this layout mode',
            formatValue: (value) => value,
            minLabel: 'Slow',
            maxLabel: 'Fast'
        },
        width: {
            type: 'slider',
            min: null, // Set dynamically based on layout mode
            max: null, // Set dynamically based on layout mode
            step: 5,
            unit: 'px',
            label: 'Window Width',
            description: 'Window width for this layout mode',
            formatValue: (value) => value
        },
        height: {
            type: 'slider',
            min: null, // Set dynamically based on layout mode
            max: null, // Set dynamically based on layout mode
            step: 5,
            unit: 'px',
            label: 'Window Height',
            description: 'Window height for this layout mode',
            formatValue: (value) => value
        }
    };

    /**
     * Get width/height constraints for each layout mode
     */
    static DIMENSION_CONSTRAINTS = {
        normal: {
            width: { min: 300, max: 800, step: 10 },
            height: { min: 300, max: 700, step: 10 }
        },
        compact: {
            width: { min: 150, max: 500, step: 5 },
            height: { min: 150, max: 500, step: 5 }
        },
        'system-design': {
            width: { min: 600, max: 1200, step: 10 },
            height: { min: 400, max: 800, step: 10 }
        }
    };

    /**
     * Initialize default settings in localStorage if they don't exist
     */
    static initializeDefaultsInLocalStorage() {
        Object.entries(this.DEFAULT_SETTINGS).forEach(([layoutMode, settings]) => {
            Object.entries(settings).forEach(([key, defaultValue]) => {
                const storageKey = `${layoutMode}${this.capitalizeFirst(key)}`;
                if (localStorage.getItem(storageKey) === null) {
                    localStorage.setItem(storageKey, defaultValue.toString());
                }
            });
        });
    }

    /**
     * Load all settings for a specific layout mode
     * 
     * @param {string} layoutMode - The layout mode (normal, compact, system-design)
     * @returns {Object} Settings object for the layout mode
     */
    static loadSettings(layoutMode) {
        const defaultSettings = this.DEFAULT_SETTINGS[layoutMode] || {};
        const settings = {};

        Object.keys(defaultSettings).forEach(key => {
            const storageKey = `${layoutMode}${this.capitalizeFirst(key)}`;
            const saved = localStorage.getItem(storageKey);
            
            if (saved !== null) {
                // Parse based on setting type
                if (key === 'autoScroll' || key === 'animateResponse') {
                    settings[key] = saved === 'true';
                } else if (key === 'transparency') {
                    settings[key] = parseFloat(saved);
                } else {
                    settings[key] = parseInt(saved, 10) || defaultSettings[key];
                }
            } else {
                settings[key] = defaultSettings[key];
            }
        });

        return settings;
    }

    /**
     * Load all settings for all layout modes
     * 
     * @returns {Object} Settings object with all layout modes
     */
    static loadAllSettings() {
        const allSettings = {};
        Object.keys(this.DEFAULT_SETTINGS).forEach(layoutMode => {
            allSettings[layoutMode] = this.loadSettings(layoutMode);
        });
        return allSettings;
    }

    /**
     * Update a specific setting for a layout mode
     * 
     * @param {string} layoutMode - The layout mode
     * @param {string} settingKey - The setting key
     * @param {*} value - The new value
     */
    static updateSetting(layoutMode, settingKey, value) {
        const storageKey = `${layoutMode}${this.capitalizeFirst(settingKey)}`;
        localStorage.setItem(storageKey, value.toString());

        // Dispatch event for immediate application if current layout mode
        const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
        if (currentLayoutMode === layoutMode) {
            this.applySettingImmediately(settingKey, value);
        }

        // Dispatch specific events for cross-component communication
        this.dispatchSettingEvent(layoutMode, settingKey, value);
    }

    /**
     * Apply setting immediately if it's for the current layout mode
     * 
     * @param {string} settingKey - The setting key
     * @param {*} value - The new value
     */
    static applySettingImmediately(settingKey, value) {
        switch (settingKey) {
            case 'transparency':
                this.updateTransparency(value);
                break;
            case 'fontSize':
                this.updateFontSize(value);
                break;
        }
    }

    /**
     * Dispatch setting change events for cross-component communication
     * 
     * @param {string} layoutMode - The layout mode
     * @param {string} settingKey - The setting key
     * @param {*} value - The new value
     */
    static dispatchSettingEvent(layoutMode, settingKey, value) {
        const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        if (currentLayoutMode === layoutMode) {
            switch (settingKey) {
                case 'autoScroll':
                    document.dispatchEvent(new CustomEvent('auto-scroll-change', {
                        detail: {
                            layoutMode,
                            enabled: value,
                            source: 'customize-view'
                        }
                    }));
                    break;
                case 'animateResponse':
                    document.dispatchEvent(new CustomEvent('animate-response-change', {
                        detail: {
                            layoutMode,
                            enabled: value,
                            source: 'customize-view'
                        }
                    }));
                    break;
                case 'fontSize':
                    document.dispatchEvent(new CustomEvent('font-size-change', {
                        detail: {
                            layoutMode,
                            fontSize: value,
                            source: 'customize-view'
                        }
                    }));
                    break;
            }
        }
    }

    /**
     * Update transparency CSS variables and window opacity
     * 
     * @param {number} transparency - Transparency value (0-1)
     */
    static updateTransparency(transparency) {
        const root = document.documentElement;
        root.style.setProperty('--header-background', `rgba(0, 0, 0, ${transparency})`);
        root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${transparency})`);
        root.style.setProperty('--card-background', `rgba(255, 255, 255, ${transparency * 0.05})`);
        root.style.setProperty('--input-background', `rgba(0, 0, 0, ${transparency * 0.375})`);
        root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${transparency * 0.625})`);
        root.style.setProperty('--button-background', `rgba(0, 0, 0, ${transparency * 0.625})`);
        root.style.setProperty('--preview-video-background', `rgba(0, 0, 0, ${transparency * 1.125})`);
        root.style.setProperty('--screen-option-background', `rgba(0, 0, 0, ${transparency * 0.5})`);
        root.style.setProperty('--screen-option-hover-background', `rgba(0, 0, 0, ${transparency * 0.75})`);
        root.style.setProperty('--scrollbar-background', `rgba(0, 0, 0, ${transparency * 0.5})`);
        root.style.setProperty('--code-block-background', `rgba(6, 6, 6, ${transparency})`);
        root.style.setProperty('--inline-code-background', `rgba(255, 255, 255, ${transparency * 0.08})`);
        root.style.setProperty('--pre-code-background', `rgba(0, 0, 0, ${transparency * 0.4})`);
        root.style.setProperty('--blockquote-background', `rgba(0, 122, 255, ${transparency * 0.08})`);
        
        // Update window opacity via IPC
        if (typeof window !== 'undefined' && window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                // Convert transparency to opacity (inverse relationship)
                // Higher transparency value = more opaque window
                const windowOpacity = Math.max(0.3, transparency); // Minimum 30% opacity for visibility
                
                ipcRenderer.invoke('update-window-opacity', windowOpacity)
                    .catch(error => {
                        console.error('Failed to update window opacity:', error);
                    });
            } catch (error) {
                console.error('Error accessing ipcRenderer:', error);
            }
        }
    }

    /**
     * Update font size CSS variable
     * 
     * @param {number} fontSize - Font size in pixels
     */
    static updateFontSize(fontSize) {
        document.documentElement.style.setProperty('--response-font-size', `${fontSize}px`);
    }

    /**
     * Get setting definition with layout-specific constraints
     * 
     * @param {string} settingKey - The setting key
     * @param {string} layoutMode - The layout mode
     * @returns {Object} Setting definition object
     */
    static getSettingDefinition(settingKey, layoutMode) {
        const definition = { ...this.SETTING_DEFINITIONS[settingKey] };
        
        // Apply layout-specific constraints for dimensions
        if ((settingKey === 'width' || settingKey === 'height') && this.DIMENSION_CONSTRAINTS[layoutMode]) {
            const constraints = this.DIMENSION_CONSTRAINTS[layoutMode][settingKey];
            if (constraints) {
                definition.min = constraints.min;
                definition.max = constraints.max;
                definition.step = constraints.step;
                definition.minLabel = `${constraints.min}px`;
                definition.maxLabel = `${constraints.max}px`;
            }
        }
        
        return definition;
    }

    /**
     * Get all layout modes
     * 
     * @returns {Array} Array of layout mode objects
     */
    static getAllLayoutModes() {
        return Object.entries(this.LAYOUT_MODES).map(([key, value]) => ({
            key,
            ...value
        }));
    }

    /**
     * Get layout mode display name
     * 
     * @param {string} layoutMode - The layout mode key
     * @returns {string} Display name
     */
    static getLayoutModeDisplayName(layoutMode) {
        return this.LAYOUT_MODES[layoutMode]?.name || 'Unknown';
    }

    /**
     * Get layout mode description
     * 
     * @param {string} layoutMode - The layout mode key
     * @returns {string} Description
     */
    static getLayoutModeDescription(layoutMode) {
        return this.LAYOUT_MODES[layoutMode]?.description || '';
    }

    /**
     * Handle layout mode change and dispatch appropriate events
     * 
     * @param {string} newLayoutMode - The new layout mode
     */
    static handleLayoutModeChange(newLayoutMode) {
        localStorage.setItem('layoutMode', newLayoutMode);
        
        // Load settings for new layout mode
        const settings = this.loadSettings(newLayoutMode);
        
        // Apply all settings immediately
        this.applyAllSettingsForLayoutMode(newLayoutMode, settings);
        
        // Dispatch events for auto scroll and animate response
        requestAnimationFrame(() => {
            document.dispatchEvent(new CustomEvent('auto-scroll-change', {
                detail: {
                    layoutMode: newLayoutMode,
                    enabled: settings.autoScroll,
                    source: 'customize-view-layout-change'
                }
            }));
            
            document.dispatchEvent(new CustomEvent('animate-response-change', {
                detail: {
                    layoutMode: newLayoutMode,
                    enabled: settings.animateResponse,
                    source: 'customize-view-layout-change'
                }
            }));
        });
    }

    /**
     * Apply all settings for a specific layout mode immediately
     * 
     * @param {string} layoutMode - The layout mode
     * @param {Object} settings - The settings object (optional, will load if not provided)
     */
    static applyAllSettingsForLayoutMode(layoutMode, settings = null) {
        if (!settings) {
            settings = this.loadSettings(layoutMode);
        }
        
        const root = document.documentElement;
        
        // Apply transparency
        this.updateTransparency(settings.transparency);
        
        // Apply font size
        root.style.setProperty('--response-font-size', `${settings.fontSize}px`);
        
        // Update auto-scroll setting in localStorage for global access
        localStorage.setItem('autoScrollEnabled', settings.autoScroll.toString());
        
        // Update scroll speed in localStorage for global access
        localStorage.setItem('scrollSpeed', settings.scrollSpeed.toString());
    }

    /**
     * Capitalize first letter of a string
     * 
     * @param {string} str - Input string
     * @returns {string} String with first letter capitalized
     */
    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get all setting keys for a layout mode
     * 
     * @returns {Array} Array of setting keys
     */
    static getSettingKeys() {
        return Object.keys(this.SETTING_DEFINITIONS);
    }

    /**
     * Reset all settings for a layout mode to defaults
     * 
     * @param {string} layoutMode - The layout mode to reset
     */
    static resetLayoutSettings(layoutMode) {
        const defaultSettings = this.DEFAULT_SETTINGS[layoutMode];
        if (defaultSettings) {
            Object.entries(defaultSettings).forEach(([key, value]) => {
                this.updateSetting(layoutMode, key, value);
            });
        }
    }

    /**
     * Export all settings for backup/transfer
     * 
     * @returns {Object} All settings object
     */
    static exportSettings() {
        return this.loadAllSettings();
    }

    /**
     * Import settings from backup/transfer
     * 
     * @param {Object} settings - Settings object to import
     */
    static importSettings(settings) {
        Object.entries(settings).forEach(([layoutMode, layoutSettings]) => {
            Object.entries(layoutSettings).forEach(([key, value]) => {
                this.updateSetting(layoutMode, key, value);
            });
        });
    }
}