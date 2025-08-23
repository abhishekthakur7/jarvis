import { html } from '../assets/lit-core-2.7.4.min.js';

/**
 * UIComponentTemplates - Reusable UI component templates for CustomizeView
 * 
 * This utility class provides standardized UI component templates to reduce
 * HTML duplication and ensure consistent styling across the application.
 * 
 * @class UIComponentTemplates
 */
export class UIComponentTemplates {
    
    /**
     * Creates a slider component with label, value display, and description
     * 
     * @param {Object} config - Slider configuration
     * @param {string} config.label - Label text for the slider
     * @param {number} config.value - Current value
     * @param {number} config.min - Minimum value
     * @param {number} config.max - Maximum value
     * @param {number} config.step - Step increment
     * @param {string} config.unit - Unit suffix (e.g., 'px', '%')
     * @param {Function} config.onChange - Change handler function
     * @param {string} config.description - Description text
     * @param {string} [config.minLabel] - Label for minimum value
     * @param {string} [config.maxLabel] - Label for maximum value
     * @returns {TemplateResult} Slider HTML template
     */
    static slider(config) {
        const {
            label,
            value,
            min,
            max,
            step = 1,
            unit = '',
            onChange,
            description,
            minLabel,
            maxLabel,
            rawValue // Raw value for the slider input (used for transparency)
        } = config;

        // Use rawValue if provided, otherwise use value
        const sliderValue = rawValue !== undefined ? rawValue : value;

        return html`
            <div class="form-group full-width">
                <div class="slider-container">
                    <div class="slider-header">
                        <label class="form-label">${label}</label>
                        <span class="slider-value">${value}${unit}</span>
                    </div>
                    <input
                        type="range"
                        class="slider-input"
                        min="${min}"
                        max="${max}"
                        step="${step}"
                        .value=${sliderValue}
                        @input=${onChange}
                    />
                    ${minLabel || maxLabel ? html`
                        <div class="slider-labels">
                            <span>${minLabel || min}</span>
                            <span>${maxLabel || max}</span>
                        </div>
                    ` : ''}
                    ${description ? html`
                        <div class="form-description">${description}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Creates a checkbox component with label and description
     * 
     * @param {Object} config - Checkbox configuration
     * @param {string} config.id - Unique ID for the checkbox
     * @param {string} config.label - Label text
     * @param {boolean} config.checked - Checked state
     * @param {Function} config.onChange - Change handler function
     * @param {string} [config.description] - Description text
     * @returns {TemplateResult} Checkbox HTML template
     */
    static checkbox(config) {
        const {
            id,
            label,
            checked,
            onChange,
            description
        } = config;

        return html`
            <div class="form-group">
                <div class="checkbox-group">
                    <input
                        type="checkbox"
                        id="${id}"
                        class="checkbox-input"
                        .checked=${checked}
                        @change=${onChange}
                    />
                    <label for="${id}" class="checkbox-label">${label}</label>
                </div>
                ${description ? html`
                    <div class="form-description">${description}</div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Creates a select dropdown component with label and description
     * 
     * @param {Object} config - Select configuration
     * @param {string} config.label - Label text
     * @param {string} config.value - Current value
     * @param {Array} config.options - Array of options {value, label}
     * @param {Function} config.onChange - Change handler function
     * @param {string} [config.description] - Description text
     * @param {string} [config.currentSelection] - Current selection display text
     * @returns {TemplateResult} Select HTML template
     */
    static select(config) {
        const {
            label,
            value,
            options,
            onChange,
            description,
            currentSelection
        } = config;

        return html`
            <div class="form-group">
                <label class="form-label">
                    ${label}
                    ${currentSelection ? html`
                        <span class="current-selection">${currentSelection}</span>
                    ` : ''}
                </label>
                <select class="form-control" .value=${value} @change=${onChange}>
                    ${options.map(option => html`
                        <option value="${option.value}" ?selected=${value === option.value}>
                            ${option.label}
                        </option>
                    `)}
                </select>
                ${description ? html`
                    <div class="form-description">${description}</div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Creates a textarea component with label and description
     * 
     * @param {Object} config - Textarea configuration
     * @param {string} config.label - Label text
     * @param {string} config.value - Current value
     * @param {string} config.placeholder - Placeholder text
     * @param {Function} config.onInput - Input handler function
     * @param {string} [config.description] - Description text
     * @param {number} [config.rows] - Number of rows
     * @returns {TemplateResult} Textarea HTML template
     */
    static textarea(config) {
        const {
            label,
            value,
            placeholder,
            onInput,
            description,
            rows = 4
        } = config;

        return html`
            <div class="form-group full-width">
                <label class="form-label">${label}</label>
                <textarea
                    class="form-control"
                    placeholder="${placeholder}"
                    .value=${value}
                    rows="${rows}"
                    @input=${onInput}
                ></textarea>
                ${description ? html`
                    <div class="form-description">${description}</div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Creates a form row container with responsive layout
     * 
     * @param {Array} children - Array of child elements
     * @returns {TemplateResult} Form row HTML template
     */
    static formRow(children) {
        return html`
            <div class="form-row">
                ${children}
            </div>
        `;
    }

    /**
     * Creates a settings section with title and content
     * 
     * @param {Object} config - Section configuration
     * @param {string} config.title - Section title
     * @param {TemplateResult} config.content - Section content
     * @param {string} [config.className] - Additional CSS class
     * @param {Object} [config.style] - Additional styles
     * @returns {TemplateResult} Section HTML template
     */
    static section(config) {
        const {
            title,
            content,
            className = '',
            style = {}
        } = config;

        const styleStr = Object.entries(style)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');

        return html`
            <div class="settings-section ${className}" style="${styleStr}">
                <div class="section-title">
                    <span>${title}</span>
                </div>
                <div class="form-grid">
                    ${content}
                </div>
            </div>
        `;
    }

    /**
     * Creates a keybind input component for keyboard shortcuts
     * 
     * @param {Object} config - Keybind configuration
     * @param {string} config.actionKey - Action key identifier
     * @param {string} config.actionName - Display name of the action
     * @param {string} config.actionDescription - Description of the action
     * @param {string} config.value - Current keybind value
     * @param {Function} config.onKeydown - Keydown handler function
     * @param {Function} config.onFocus - Focus handler function
     * @returns {TemplateResult} Keybind input row HTML template
     */
    static keybindRow(config) {
        const {
            actionKey,
            actionName,
            actionDescription,
            value,
            onKeydown,
            onFocus
        } = config;

        return html`
            <tr>
                <td>
                    <div class="action-name">${actionName}</div>
                    <div class="action-description">${actionDescription}</div>
                </td>
                <td>
                    <input
                        type="text"
                        class="form-control keybind-input"
                        .value=${value}
                        placeholder="Press keys..."
                        data-action=${actionKey}
                        @keydown=${onKeydown}
                        @focus=${onFocus}
                        readonly
                    />
                </td>
            </tr>
        `;
    }

    /**
     * Creates a complete keybinds table with all actions
     * 
     * @param {Object} config - Keybinds table configuration
     * @param {Array} config.actions - Array of keybind actions
     * @param {Object} config.keybinds - Current keybinds object
     * @param {Function} config.onKeydown - Keydown handler function
     * @param {Function} config.onFocus - Focus handler function
     * @param {Function} config.onReset - Reset button handler function
     * @returns {TemplateResult} Keybinds table HTML template
     */
    static keybindsTable(config) {
        const {
            actions,
            keybinds,
            onKeydown,
            onFocus,
            onReset
        } = config;

        return html`
            <table class="keybinds-table">
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Shortcut</th>
                    </tr>
                </thead>
                <tbody>
                    ${actions.map(action => this.keybindRow({
                        actionKey: action.key,
                        actionName: action.name,
                        actionDescription: action.description,
                        value: keybinds[action.key],
                        onKeydown,
                        onFocus
                    }))}
                    <tr class="table-reset-row">
                        <td colspan="2">
                            <button class="reset-keybinds-button" @click=${onReset}>
                                Reset to Defaults
                            </button>
                            <div class="form-description" style="margin-top: 8px;">
                                Restore all keyboard shortcuts to their default values
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    /**
     * Creates a settings note/info box
     * 
     * @param {string} content - Note content
     * @param {string} [icon] - Optional icon (emoji or text)
     * @returns {TemplateResult} Settings note HTML template
     */
    static settingsNote(content, icon = '💡') {
        return html`
            <div class="settings-note">
                ${icon} ${content}
            </div>
        `;
    }
}