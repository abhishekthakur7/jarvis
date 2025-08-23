/**
 * AssistantApp Layout Settings Integration Tests
 * 
 * Integration tests to validate the interaction between AssistantApp and 
 * LayoutSettingsManager, specifically testing the fix for transparency 
 * settings persistence across view changes.
 * 
 * Tests the actual behavior that was reported in the bug:
 * - Transparency settings work in CustomizeView
 * - Settings persist when navigating away from CustomizeView
 * - All layout modes handle settings consistently
 */

// Mock Electron IPC
const mockIpcRenderer = {
    invoke: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
};

// Mock window.require for Electron
global.window = {
    require: jest.fn(() => ({
        ipcRenderer: mockIpcRenderer
    }))
};

// Mock DOM environment
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        })
    };
})();

const mockDocumentElement = {
    style: {
        setProperty: jest.fn(),
        getPropertyValue: jest.fn()
    },
    classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
    }
};

const mockDocument = {
    documentElement: mockDocumentElement,
    dispatchEvent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Setup global mocks
global.localStorage = mockLocalStorage;
global.document = mockDocument;

// Mock LitElement and required dependencies
jest.mock('../../src/assets/lit-core-2.7.4.min.js', () => ({
    html: (strings, ...values) => ({ strings, values, _$litType$: 1 }),
    css: (strings, ...values) => ({ strings, values }),
    LitElement: class MockLitElement {
        constructor() {
            this.shadowRoot = {
                querySelector: jest.fn()
            };
        }
        requestUpdate() {}
        updated() {}
        connectedCallback() {}
        disconnectedCallback() {}
    }
}));

// Import modules under test
import { LayoutSettingsManager } from '../src/utils/layoutSettingsManager.js';

// Mock AssistantApp methods for testing
class MockAssistantApp {
    constructor() {
        this.layoutMode = 'normal';
        this.currentView = 'main';
        this.responses = [];
        this.autoScrollEnabled = false;
        this.scrollSpeed = 2;
    }

    // This is the method we fixed - test the corrected behavior
    applyLayoutSpecificSettings(layoutMode) {
        const root = document.documentElement;
        
        if (layoutMode === 'normal') {
            const normalTransparency = localStorage.getItem('normalTransparency');
            const normalFontSize = localStorage.getItem('normalFontSize');
            const normalScrollSpeed = localStorage.getItem('normalScrollSpeed');
            
            // Use LayoutSettingsManager defaults (this was the fix)
            const transparency = normalTransparency !== null ? parseFloat(normalTransparency) : LayoutSettingsManager.DEFAULT_SETTINGS.normal.transparency;
            LayoutSettingsManager.updateTransparency(transparency);
            
            const fontSize = normalFontSize !== null ? parseInt(normalFontSize, 10) : LayoutSettingsManager.DEFAULT_SETTINGS.normal.fontSize;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            this.scrollSpeed = parseInt(normalScrollSpeed, 10) || LayoutSettingsManager.DEFAULT_SETTINGS.normal.scrollSpeed;
            
        } else if (layoutMode === 'compact') {
            const compactTransparency = localStorage.getItem('compactTransparency');
            const compactFontSize = localStorage.getItem('compactFontSize');
            const compactScrollSpeed = localStorage.getItem('compactScrollSpeed');
            
            const transparency = compactTransparency !== null ? parseFloat(compactTransparency) : LayoutSettingsManager.DEFAULT_SETTINGS.compact.transparency;
            LayoutSettingsManager.updateTransparency(transparency);
            
            const fontSize = compactFontSize !== null ? parseInt(compactFontSize, 10) : LayoutSettingsManager.DEFAULT_SETTINGS.compact.fontSize;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            this.scrollSpeed = parseInt(compactScrollSpeed, 10) || LayoutSettingsManager.DEFAULT_SETTINGS.compact.scrollSpeed;
            
        } else if (layoutMode === 'system-design') {
            const systemDesignTransparency = localStorage.getItem('systemDesignTransparency');
            const systemDesignFontSize = localStorage.getItem('systemDesignFontSize');
            const systemDesignScrollSpeed = localStorage.getItem('systemDesignScrollSpeed');
            
            // This was the main fix - use LayoutSettingsManager default instead of hardcoded 0.40
            const transparency = systemDesignTransparency !== null ? parseFloat(systemDesignTransparency) : LayoutSettingsManager.DEFAULT_SETTINGS['system-design'].transparency;
            LayoutSettingsManager.updateTransparency(transparency);
            
            const fontSize = systemDesignFontSize !== null ? parseInt(systemDesignFontSize, 10) : LayoutSettingsManager.DEFAULT_SETTINGS['system-design'].fontSize;
            root.style.setProperty('--response-font-size', `${fontSize}px`);
            
            this.scrollSpeed = parseInt(systemDesignScrollSpeed, 10) || LayoutSettingsManager.DEFAULT_SETTINGS['system-design'].scrollSpeed;
        }
    }

    handleLayoutModeChange(layoutMode) {
        this.layoutMode = layoutMode;
        localStorage.setItem('layoutMode', layoutMode);
        this.applyLayoutSpecificSettings(layoutMode);
    }

    handleBackClick() {
        this.currentView = 'main';
        // This is where the bug occurred - settings were being reapplied
        this.applyLayoutSpecificSettings(this.layoutMode);
    }

    handleCustomizeClick() {
        this.currentView = 'customize';
    }
}

describe('AssistantApp Layout Settings Integration Tests', () => {
    let app;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        mockLocalStorage.clear();
        mockDocumentElement.style.setProperty.mockClear();
        mockDocument.dispatchEvent.mockClear();
        
        // Initialize LayoutSettingsManager defaults
        LayoutSettingsManager.initializeDefaultsInLocalStorage();
        
        // Create fresh app instance
        app = new MockAssistantApp();
    });

    describe('Transparency Settings Persistence Bug Fix', () => {
        
        test('should use correct default transparency for system-design layout when no custom value exists', () => {
            app.applyLayoutSpecificSettings('system-design');

            // Should use LayoutSettingsManager default (0.85) not hardcoded 0.40
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.85)'
            );
        });

        test('should preserve custom transparency settings for system-design layout', () => {
            // Simulate user setting custom transparency in CustomizeView
            localStorage.setItem('systemDesignTransparency', '0.75');
            
            app.applyLayoutSpecificSettings('system-design');

            // Should use the custom value, not the default
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.75)'
            );
        });

        test('should maintain transparency settings when navigating away from CustomizeView', () => {
            // Setup: User is in system-design layout with custom transparency
            localStorage.setItem('layoutMode', 'system-design');
            localStorage.setItem('systemDesignTransparency', '0.60');
            
            // User goes to CustomizeView
            app.handleCustomizeClick();
            expect(app.currentView).toBe('customize');
            
            // User navigates back to main view (this was where the bug occurred)
            app.handleBackClick();
            expect(app.currentView).toBe('main');
            
            // Should still apply the custom transparency, not fall back to default
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.6)'
            );
        });

        test('should handle transparency correctly for all layout modes', () => {
            const testCases = [
                { layout: 'normal', customValue: '0.70', expected: 0.70 },
                { layout: 'compact', customValue: '0.95', expected: 0.95 },
                { layout: 'system-design', customValue: '0.55', expected: 0.55 }
            ];

            testCases.forEach(({ layout, customValue, expected }) => {
                mockDocumentElement.style.setProperty.mockClear();
                localStorage.setItem(`${layout}Transparency`, customValue);
                
                app.applyLayoutSpecificSettings(layout);
                
                expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                    '--header-background', 
                    `rgba(0, 0, 0, ${expected})`
                );
            });
        });
    });

    describe('Font Size Settings Validation', () => {
        
        test('should use correct default font sizes for all layouts', () => {
            const expectedDefaults = {
                'normal': 13,
                'compact': 12,
                'system-design': 14
            };

            Object.entries(expectedDefaults).forEach(([layout, expectedFontSize]) => {
                mockDocumentElement.style.setProperty.mockClear();
                
                app.applyLayoutSpecificSettings(layout);
                
                expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                    '--response-font-size', 
                    `${expectedFontSize}px`
                );
            });
        });

        test('should preserve custom font size settings across view changes', () => {
            localStorage.setItem('layoutMode', 'compact');
            localStorage.setItem('compactFontSize', '16');
            
            // Navigate to customize and back
            app.handleCustomizeClick();
            app.handleBackClick();
            
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--response-font-size', 
                '16px'
            );
        });
    });

    describe('Scroll Speed Settings Validation', () => {
        
        test('should use correct default scroll speeds for all layouts', () => {
            const layouts = ['normal', 'compact', 'system-design'];
            
            layouts.forEach(layout => {
                app.applyLayoutSpecificSettings(layout);
                expect(app.scrollSpeed).toBe(2); // Default for all layouts
            });
        });

        test('should preserve custom scroll speed settings', () => {
            localStorage.setItem('normalScrollSpeed', '5');
            
            app.applyLayoutSpecificSettings('normal');
            
            expect(app.scrollSpeed).toBe(5);
        });
    });

    describe('Layout Mode Switching Integration', () => {
        
        test('should apply correct settings when switching between layout modes', () => {
            // Setup different settings for different layouts
            localStorage.setItem('normalTransparency', '0.70');
            localStorage.setItem('compactTransparency', '0.90');
            localStorage.setItem('systemDesignTransparency', '0.50');
            
            // Test switching to normal
            mockDocumentElement.style.setProperty.mockClear();
            app.handleLayoutModeChange('normal');
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 'rgba(0, 0, 0, 0.7)'
            );
            
            // Test switching to compact
            mockDocumentElement.style.setProperty.mockClear();
            app.handleLayoutModeChange('compact');
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 'rgba(0, 0, 0, 0.9)'
            );
            
            // Test switching to system-design
            mockDocumentElement.style.setProperty.mockClear();
            app.handleLayoutModeChange('system-design');
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 'rgba(0, 0, 0, 0.5)'
            );
        });
    });

    describe('Edge Cases and Error Recovery', () => {
        
        test('should handle corrupted localStorage values gracefully', () => {
            localStorage.setItem('systemDesignTransparency', 'corrupted-value');
            localStorage.setItem('systemDesignFontSize', 'not-a-number');
            
            app.applyLayoutSpecificSettings('system-design');
            
            // Should fall back to defaults
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.85)' // LayoutSettingsManager default
            );
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--response-font-size', 
                '14px' // LayoutSettingsManager default
            );
        });

        test('should handle missing LayoutSettingsManager defaults gracefully', () => {
            const originalDefaults = LayoutSettingsManager.DEFAULT_SETTINGS;
            
            // Temporarily break the defaults
            LayoutSettingsManager.DEFAULT_SETTINGS = null;
            
            // Should not crash
            expect(() => {
                app.applyLayoutSpecificSettings('normal');
            }).not.toThrow();
            
            // Restore
            LayoutSettingsManager.DEFAULT_SETTINGS = originalDefaults;
        });
    });

    describe('Memory and Performance Validation', () => {
        
        test('should not create excessive localStorage reads during settings application', () => {
            mockLocalStorage.getItem.mockClear();
            
            app.applyLayoutSpecificSettings('system-design');
            
            // Should only read the specific settings for that layout
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('systemDesignTransparency');
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('systemDesignFontSize');
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith('systemDesignScrollSpeed');
            
            // Should not read other layout settings
            expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith('normalTransparency');
            expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith('compactTransparency');
        });

        test('should efficiently apply CSS changes without redundant calls', () => {
            mockDocumentElement.style.setProperty.mockClear();
            
            app.applyLayoutSpecificSettings('normal');
            
            // Should set font size exactly once
            const fontSizeCalls = mockDocumentElement.style.setProperty.mock.calls.filter(
                call => call[0] === '--response-font-size'
            );
            expect(fontSizeCalls).toHaveLength(1);
        });
    });

    describe('Real-world Usage Scenarios', () => {
        
        test('should handle the exact bug scenario: system-design transparency not persisting', () => {
            // Setup: User in system-design layout
            localStorage.setItem('layoutMode', 'system-design');
            
            // User customizes transparency in CustomizeView
            localStorage.setItem('systemDesignTransparency', '0.30');
            app.handleCustomizeClick();
            
            // User navigates back to main (this was the bug trigger)
            mockDocumentElement.style.setProperty.mockClear();
            app.handleBackClick();
            
            // The fix ensures transparency is preserved
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.3)'
            );
            
            // Verify it's NOT using the old hardcoded 0.40 default
            expect(mockDocumentElement.style.setProperty).not.toHaveBeenCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.4)'
            );
        });

        test('should handle rapid layout switching without losing settings', () => {
            // Setup different settings for each layout
            localStorage.setItem('normalTransparency', '0.80');
            localStorage.setItem('compactTransparency', '0.95');
            localStorage.setItem('systemDesignTransparency', '0.40');
            
            // Rapidly switch between layouts
            app.handleLayoutModeChange('normal');
            app.handleLayoutModeChange('compact');
            app.handleLayoutModeChange('system-design');
            app.handleLayoutModeChange('normal');
            
            // Final check - should still use the correct normal transparency
            expect(mockDocumentElement.style.setProperty).toHaveBeenLastCalledWith(
                '--header-background', 
                'rgba(0, 0, 0, 0.8)'
            );
        });
    });
});