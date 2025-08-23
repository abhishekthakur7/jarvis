/**
 * Layout Settings Validation Test Suite
 * 
 * Comprehensive test cases to validate all properties (transparency, font size, 
 * auto scroll, animate response, scroll speed, dimensions) for all three layout modes:
 * - Normal Layout
 * - Compact Layout  
 * - System Design Layout
 * 
 * Tests cover:
 * 1. Default value initialization
 * 2. Setting persistence in localStorage
 * 3. Setting application and CSS variable updates
 * 4. Layout mode switching behavior
 * 5. Cross-component synchronization
 */

// Mock dependencies
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
        }),
        get length() {
            return Object.keys(store).length;
        },
        key: jest.fn((index) => Object.keys(store)[index] || null)
    };
})();

// Mock DOM and CSS custom properties
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
    dispatchEvent: jest.fn()
};

// Setup global mocks
global.localStorage = mockLocalStorage;
global.document = mockDocument;

// Import the modules to test
import { LayoutSettingsManager } from '../src/utils/layoutSettingsManager.js';

describe('Layout Settings Validation Test Suite', () => {
    
    beforeEach(() => {
        // Clear all mocks and localStorage before each test
        jest.clearAllMocks();
        mockLocalStorage.clear();
        mockDocumentElement.style.setProperty.mockClear();
        mockDocumentElement.classList.add.mockClear();
        mockDocumentElement.classList.remove.mockClear();
        mockDocument.dispatchEvent.mockClear();
    });

    describe('Default Settings Validation', () => {
        
        test('should have correct default transparency values for all layouts', () => {
            const expectedDefaults = {
                normal: 0.65,
                compact: 0.85,
                'system-design': 0.85
            };

            Object.entries(expectedDefaults).forEach(([layout, expectedTransparency]) => {
                const defaults = LayoutSettingsManager.DEFAULT_SETTINGS[layout];
                expect(defaults.transparency).toBe(expectedTransparency);
            });
        });

        test('should have correct default font size values for all layouts', () => {
            const expectedDefaults = {
                normal: 13,
                compact: 12,
                'system-design': 14
            };

            Object.entries(expectedDefaults).forEach(([layout, expectedFontSize]) => {
                const defaults = LayoutSettingsManager.DEFAULT_SETTINGS[layout];
                expect(defaults.fontSize).toBe(expectedFontSize);
            });
        });

        test('should have correct default boolean settings for all layouts', () => {
            const layoutModes = ['normal', 'compact', 'system-design'];
            
            layoutModes.forEach(layout => {
                const defaults = LayoutSettingsManager.DEFAULT_SETTINGS[layout];
                expect(defaults.autoScroll).toBe(false);
                expect(defaults.animateResponse).toBe(false);
            });
        });

        test('should have correct default scroll speed for all layouts', () => {
            const layoutModes = ['normal', 'compact', 'system-design'];
            
            layoutModes.forEach(layout => {
                const defaults = LayoutSettingsManager.DEFAULT_SETTINGS[layout];
                expect(defaults.scrollSpeed).toBe(2);
            });
        });

        test('should have correct default dimensions for all layouts', () => {
            const expectedDimensions = {
                normal: { width: 450, height: 500 },
                compact: { width: 320, height: 270 },
                'system-design': { width: 900, height: 500 }
            };

            Object.entries(expectedDimensions).forEach(([layout, expectedDims]) => {
                const defaults = LayoutSettingsManager.DEFAULT_SETTINGS[layout];
                expect(defaults.width).toBe(expectedDims.width);
                expect(defaults.height).toBe(expectedDims.height);
            });
        });
    });

    describe('Settings Initialization and Persistence', () => {
        
        test('should initialize default settings in localStorage when not present', () => {
            LayoutSettingsManager.initializeDefaultsInLocalStorage();

            // Check that all settings were initialized
            const layoutModes = ['normal', 'compact', 'system-design'];
            const settingKeys = ['transparency', 'fontSize', 'autoScroll', 'animateResponse', 'scrollSpeed', 'width', 'height'];

            layoutModes.forEach(layout => {
                settingKeys.forEach(key => {
                    const storageKey = `${layout}${key.charAt(0).toUpperCase() + key.slice(1)}`;
                    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                        storageKey,
                        expect.any(String)
                    );
                });
            });
        });

        test('should not overwrite existing localStorage values during initialization', () => {
            // Pre-populate some settings
            mockLocalStorage.setItem('normalTransparency', '0.75');
            mockLocalStorage.setItem('compactFontSize', '15');
            
            LayoutSettingsManager.initializeDefaultsInLocalStorage();

            // These should remain unchanged
            expect(mockLocalStorage.getItem('normalTransparency')).toBe('0.75');
            expect(mockLocalStorage.getItem('compactFontSize')).toBe('15');
        });
    });

    describe('Settings Loading and Parsing', () => {
        
        test('should correctly load and parse transparency settings from localStorage', () => {
            mockLocalStorage.setItem('normalTransparency', '0.75');
            mockLocalStorage.setItem('compactTransparency', '0.90');
            mockLocalStorage.setItem('system-designTransparency', '0.50');

            const normalSettings = LayoutSettingsManager.loadSettings('normal');
            const compactSettings = LayoutSettingsManager.loadSettings('compact');
            const systemDesignSettings = LayoutSettingsManager.loadSettings('system-design');

            expect(normalSettings.transparency).toBe(0.75);
            expect(compactSettings.transparency).toBe(0.90);
            expect(systemDesignSettings.transparency).toBe(0.50);
        });

        test('should correctly load and parse font size settings from localStorage', () => {
            mockLocalStorage.setItem('normalFontSize', '16');
            mockLocalStorage.setItem('compactFontSize', '10');
            mockLocalStorage.setItem('system-designFontSize', '18');

            const normalSettings = LayoutSettingsManager.loadSettings('normal');
            const compactSettings = LayoutSettingsManager.loadSettings('compact');
            const systemDesignSettings = LayoutSettingsManager.loadSettings('system-design');

            expect(normalSettings.fontSize).toBe(16);
            expect(compactSettings.fontSize).toBe(10);
            expect(systemDesignSettings.fontSize).toBe(18);
        });

        test('should correctly load and parse boolean settings from localStorage', () => {
            mockLocalStorage.setItem('normalAutoScroll', 'true');
            mockLocalStorage.setItem('compactAnimateResponse', 'true');
            mockLocalStorage.setItem('system-designAutoScroll', 'false');

            const normalSettings = LayoutSettingsManager.loadSettings('normal');
            const compactSettings = LayoutSettingsManager.loadSettings('compact');
            const systemDesignSettings = LayoutSettingsManager.loadSettings('system-design');

            expect(normalSettings.autoScroll).toBe(true);
            expect(compactSettings.animateResponse).toBe(true);
            expect(systemDesignSettings.autoScroll).toBe(false);
        });

        test('should fall back to default values when localStorage is empty', () => {
            const normalSettings = LayoutSettingsManager.loadSettings('normal');
            const compactSettings = LayoutSettingsManager.loadSettings('compact');
            const systemDesignSettings = LayoutSettingsManager.loadSettings('system-design');

            // Should match default values
            expect(normalSettings.transparency).toBe(0.65);
            expect(normalSettings.fontSize).toBe(13);
            expect(compactSettings.transparency).toBe(0.85);
            expect(compactSettings.fontSize).toBe(12);
            expect(systemDesignSettings.transparency).toBe(0.85);
            expect(systemDesignSettings.fontSize).toBe(14);
        });
    });

    describe('Settings Update and Application', () => {
        
        test('should update transparency setting and apply CSS variables', () => {
            mockLocalStorage.setItem('layoutMode', 'normal');
            
            LayoutSettingsManager.updateSetting('normal', 'transparency', 0.75);

            // Check localStorage update
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('normalTransparency', '0.75');
            
            // Check CSS variables update
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--header-background', 'rgba(0, 0, 0, 0.75)');
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--main-content-background', 'rgba(0, 0, 0, 0.75)');
        });

        test('should update font size setting and apply CSS variables', () => {
            mockLocalStorage.setItem('layoutMode', 'compact');
            
            LayoutSettingsManager.updateSetting('compact', 'fontSize', 16);

            // Check localStorage update
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('compactFontSize', '16');
            
            // Check CSS variables update
            expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--response-font-size', '16px');
        });

        test('should dispatch events for boolean settings when current layout matches', () => {
            mockLocalStorage.setItem('layoutMode', 'system-design');
            
            LayoutSettingsManager.updateSetting('system-design', 'autoScroll', true);

            // Check localStorage update
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('system-designAutoScroll', 'true');
            
            // Check event dispatch
            expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'auto-scroll-change',
                    detail: expect.objectContaining({
                        layoutMode: 'system-design',
                        enabled: true,
                        source: 'customize-view'
                    })
                })
            );
        });

        test('should not apply settings immediately when layout mode does not match current', () => {
            mockLocalStorage.setItem('layoutMode', 'normal');
            
            LayoutSettingsManager.updateSetting('compact', 'transparency', 0.95);

            // Should save to localStorage
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('compactTransparency', '0.95');
            
            // Should not apply CSS changes immediately
            expect(mockDocumentElement.style.setProperty).not.toHaveBeenCalled();
        });
    });

    describe('Cross-Layout Settings Validation', () => {
        
        test('should load all settings for all layouts correctly', () => {
            // Set up some custom values
            mockLocalStorage.setItem('normalTransparency', '0.80');
            mockLocalStorage.setItem('compactFontSize', '9');
            mockLocalStorage.setItem('system-designAutoScroll', 'true');

            const allSettings = LayoutSettingsManager.loadAllSettings();

            expect(allSettings).toHaveProperty('normal');
            expect(allSettings).toHaveProperty('compact');
            expect(allSettings).toHaveProperty('system-design');

            expect(allSettings.normal.transparency).toBe(0.80);
            expect(allSettings.compact.fontSize).toBe(9);
            expect(allSettings['system-design'].autoScroll).toBe(true);
        });

        test('should handle layout mode changes and dispatch appropriate events', () => {
            mockLocalStorage.setItem('layoutMode', 'normal');
            
            // Setup settings for different layouts
            mockLocalStorage.setItem('normalAutoScroll', 'false');
            mockLocalStorage.setItem('compactAutoScroll', 'true');
            
            LayoutSettingsManager.handleLayoutModeChange('compact');

            expect(mockDocument.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'auto-scroll-change',
                    detail: expect.objectContaining({
                        layoutMode: 'compact',
                        enabled: true,
                        source: 'customize-view-layout-change'
                    })
                })
            );
        });
    });

    describe('Setting Constraints Validation', () => {
        
        test('should provide correct dimension constraints for each layout', () => {
            const normalConstraints = LayoutSettingsManager.getSettingDefinition('width', 'normal');
            const compactConstraints = LayoutSettingsManager.getSettingDefinition('height', 'compact');
            const systemDesignConstraints = LayoutSettingsManager.getSettingDefinition('width', 'system-design');

            expect(normalConstraints.min).toBe(400);
            expect(normalConstraints.max).toBe(800);
            expect(compactConstraints.min).toBe(150);
            expect(compactConstraints.max).toBe(500);
            expect(systemDesignConstraints.min).toBe(600);
            expect(systemDesignConstraints.max).toBe(1200);
        });

        test('should provide correct transparency constraints for all layouts', () => {
            const layoutModes = ['normal', 'compact', 'system-design'];
            
            layoutModes.forEach(layout => {
                const transparencyDef = LayoutSettingsManager.getSettingDefinition('transparency', layout);
                expect(transparencyDef.min).toBe(0);
                expect(transparencyDef.max).toBe(1);
                expect(transparencyDef.step).toBe(0.01);
            });
        });

        test('should provide correct font size constraints for all layouts', () => {
            const layoutModes = ['normal', 'compact', 'system-design'];
            
            layoutModes.forEach(layout => {
                const fontSizeDef = LayoutSettingsManager.getSettingDefinition('fontSize', layout);
                expect(fontSizeDef.min).toBe(10);
                expect(fontSizeDef.max).toBe(32);
                expect(fontSizeDef.step).toBe(1);
            });
        });
    });

    describe('Layout Mode Information Validation', () => {
        
        test('should provide correct display names for all layout modes', () => {
            expect(LayoutSettingsManager.getLayoutModeDisplayName('normal')).toBe('Normal');
            expect(LayoutSettingsManager.getLayoutModeDisplayName('compact')).toBe('Compact');
            expect(LayoutSettingsManager.getLayoutModeDisplayName('system-design')).toBe('System Design');
        });

        test('should provide descriptions for all layout modes', () => {
            const normalDesc = LayoutSettingsManager.getLayoutModeDescription('normal');
            const compactDesc = LayoutSettingsManager.getLayoutModeDescription('compact');
            const systemDesignDesc = LayoutSettingsManager.getLayoutModeDescription('system-design');

            expect(normalDesc).toContain('Standard layout');
            expect(compactDesc).toContain('Smaller window size');
            expect(systemDesignDesc).toContain('Large window optimized');
        });

        test('should return all layout modes with correct structure', () => {
            const allModes = LayoutSettingsManager.getAllLayoutModes();
            
            expect(allModes).toHaveLength(3);
            expect(allModes[0]).toHaveProperty('key');
            expect(allModes[0]).toHaveProperty('name');
            expect(allModes[0]).toHaveProperty('description');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        
        test('should handle invalid transparency values gracefully', () => {
            mockLocalStorage.setItem('normalTransparency', 'invalid');
            
            const settings = LayoutSettingsManager.loadSettings('normal');
            expect(settings.transparency).toBe(0.65); // Should fall back to default
        });

        test('should handle invalid font size values gracefully', () => {
            mockLocalStorage.setItem('compactFontSize', 'not-a-number');
            
            const settings = LayoutSettingsManager.loadSettings('compact');
            expect(settings.fontSize).toBe(12); // Should fall back to default
        });

        test('should handle unknown layout modes gracefully', () => {
            const settings = LayoutSettingsManager.loadSettings('unknown-layout');
            expect(settings).toEqual({}); // Should return empty object
        });

        test('should handle missing DEFAULT_SETTINGS gracefully', () => {
            const originalDefaults = LayoutSettingsManager.DEFAULT_SETTINGS;
            LayoutSettingsManager.DEFAULT_SETTINGS = {};
            
            const settings = LayoutSettingsManager.loadSettings('normal');
            expect(settings).toEqual({});
            
            // Restore original
            LayoutSettingsManager.DEFAULT_SETTINGS = originalDefaults;
        });
    });

    describe('Performance and Memory Validation', () => {
        
        test('should not create excessive localStorage calls during initialization', () => {
            mockLocalStorage.setItem.mockClear();
            
            LayoutSettingsManager.initializeDefaultsInLocalStorage();
            
            // Should be exactly 21 calls (3 layouts × 7 settings each)
            expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(21);
        });

        test('should efficiently load all settings without redundant localStorage access', () => {
            mockLocalStorage.getItem.mockClear();
            
            LayoutSettingsManager.loadAllSettings();
            
            // Should access localStorage exactly once per setting key
            expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(21); // 3 layouts × 7 settings
        });
    });
});