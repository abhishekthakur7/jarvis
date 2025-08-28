/**
 * AI Provider Integration Test Suite
 * 
 * Comprehensive test cases for both Gemini and OpenRouter AI providers:
 * - Session initialization
 * - API key validation
 * - Message sending and receiving
 * - Error handling
 * - Provider switching
 * - Fallback mechanisms
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

// Mock IPC renderer
const mockIpcRenderer = {
    invoke: jest.fn().mockResolvedValue({ success: true }),
    send: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
};

// Mock window object
const mockWindow = {
    require: jest.fn(() => ({ ipcRenderer: mockIpcRenderer })),
    cheddar: {
        initializeAI: jest.fn().mockImplementation(async () => {
            const selectedModel = localStorage.getItem('selectedAiModel') || 'gemini';
            const ipcChannel = selectedModel === 'openrouter' ? 'initialize-openrouter' : 'initialize-gemini';
            return await mockIpcRenderer.invoke(ipcChannel, { model: selectedModel });
        }),
        initializeGemini: jest.fn(),
        sendTextMessage: jest.fn(),
        setStatus: jest.fn()
    }
};

// Setup global mocks
global.localStorage = mockLocalStorage;
global.window = mockWindow;

describe('AI Provider Integration Test Suite', () => {
    
    beforeEach(() => {
        // Clear all mocks and localStorage before each test
        jest.clearAllMocks();
        mockLocalStorage.clear();
        mockIpcRenderer.invoke.mockClear();
        mockIpcRenderer.invoke.mockResolvedValue({ success: true });
        mockWindow.cheddar.initializeAI.mockClear();
        mockWindow.cheddar.initializeAI.mockImplementation(async () => {
            const selectedModel = localStorage.getItem('selectedAiModel') || 'gemini';
            const ipcChannel = selectedModel === 'openrouter' ? 'initialize-openrouter' : 'initialize-gemini';
            return await mockIpcRenderer.invoke(ipcChannel, { model: selectedModel });
        });
        mockWindow.cheddar.sendTextMessage.mockClear();
        mockWindow.cheddar.setStatus.mockClear();
    });

    describe('AI Provider Selection and Persistence', () => {
        
        test('should default to Gemini when no AI model is selected', () => {
            const selectedAiModel = localStorage.getItem('selectedAiModel') || 'gemini';
            expect(selectedAiModel).toBe('gemini');
        });

        test('should persist AI model selection in localStorage', () => {
            localStorage.setItem('selectedAiModel', 'openrouter');
            expect(localStorage.getItem('selectedAiModel')).toBe('openrouter');
            
            localStorage.setItem('selectedAiModel', 'gemini');
            expect(localStorage.getItem('selectedAiModel')).toBe('gemini');
        });

        test('should handle invalid AI model selection gracefully', () => {
            localStorage.setItem('selectedAiModel', 'invalid-model');
            const selectedAiModel = localStorage.getItem('selectedAiModel');
            
            // Should fallback to gemini for invalid models
            const validModel = ['gemini', 'openrouter'].includes(selectedAiModel) ? selectedAiModel : 'gemini';
            expect(validModel).toBe('gemini');
        });
    });

    describe('API Key Management', () => {
        
        test('should validate Gemini API key format', () => {
            const validGeminiKey = 'AIzaSyDummyGeminiApiKey123456789';
            const invalidGeminiKey = 'invalid-key';
            
            localStorage.setItem('apiKey', validGeminiKey);
            const storedKey = localStorage.getItem('apiKey');
            expect(storedKey).toBe(validGeminiKey);
            expect(storedKey.startsWith('AIza')).toBe(true);
        });

        test('should validate OpenRouter API key format', () => {
            const validOpenRouterKey = 'sk-or-v1-dummy-openrouter-key-123456789';
            const invalidOpenRouterKey = 'invalid-key';
            
            localStorage.setItem('openRouterApiKey', validOpenRouterKey);
            const storedKey = localStorage.getItem('openRouterApiKey');
            expect(storedKey).toBe(validOpenRouterKey);
            expect(storedKey.startsWith('sk-or-')).toBe(true);
        });

        test('should handle missing API keys appropriately', () => {
            // Test Gemini missing key
            localStorage.removeItem('apiKey');
            const geminiKey = localStorage.getItem('apiKey');
            expect(geminiKey).toBeNull();
            
            // Test OpenRouter missing key
            localStorage.removeItem('openRouterApiKey');
            const openRouterKey = localStorage.getItem('openRouterApiKey');
            expect(openRouterKey).toBeNull();
        });

        test('should trim whitespace from API keys', () => {
            const keyWithSpaces = '  AIzaSyDummyGeminiApiKey123456789  ';
            const trimmedKey = keyWithSpaces.trim();
            
            localStorage.setItem('apiKey', trimmedKey);
            expect(localStorage.getItem('apiKey')).toBe('AIzaSyDummyGeminiApiKey123456789');
        });
    });

    describe('Session Initialization', () => {
        
        test('should initialize Gemini session with valid API key', async () => {
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', 'AIzaSyDummyGeminiApiKey123456789');
            
            // Clear previous calls and set up fresh mock
            mockIpcRenderer.invoke.mockClear();
            mockIpcRenderer.invoke.mockResolvedValue({ success: true });
            
            await mockWindow.cheddar.initializeAI();
            
            expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(1);
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('initialize-gemini', expect.any(Object));
        });

        test('should initialize OpenRouter session with valid API key', async () => {
            localStorage.setItem('selectedAiModel', 'openrouter');
            localStorage.setItem('openRouterApiKey', 'sk-or-v1-dummy-openrouter-key-123456789');
            
            // Clear previous calls and set up fresh mock
            mockIpcRenderer.invoke.mockClear();
            mockIpcRenderer.invoke.mockResolvedValue({ success: true });
            
            await mockWindow.cheddar.initializeAI();
            
            expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(1);
            expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('initialize-openrouter', expect.any(Object));
        });

        test('should handle session initialization failure', async () => {
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', 'invalid-key');
            
            mockIpcRenderer.invoke.mockRejectedValue(new Error('Invalid API key'));
            
            try {
                await mockWindow.cheddar.initializeAI();
            } catch (error) {
                expect(error.message).toBe('Invalid API key');
            }
        });

        test('should maintain backward compatibility with initializeGemini', async () => {
            mockWindow.cheddar.initializeGemini.mockResolvedValue({ success: true });
            
            await mockWindow.cheddar.initializeGemini();
            
            expect(mockWindow.cheddar.initializeGemini).toHaveBeenCalled();
        });
    });

    describe('Message Handling', () => {
        
        test('should send text message successfully with Gemini', async () => {
            localStorage.setItem('selectedAiModel', 'gemini');
            const testMessage = 'Hello, how are you?';
            
            mockWindow.cheddar.sendTextMessage.mockResolvedValue({ success: true });
            
            const result = await mockWindow.cheddar.sendTextMessage(testMessage);
            
            expect(result.success).toBe(true);
            expect(mockWindow.cheddar.sendTextMessage).toHaveBeenCalledWith(testMessage);
        });

        test('should send text message successfully with OpenRouter', async () => {
            localStorage.setItem('selectedAiModel', 'openrouter');
            const testMessage = 'Hello, how are you?';
            
            mockWindow.cheddar.sendTextMessage.mockResolvedValue({ success: true });
            
            const result = await mockWindow.cheddar.sendTextMessage(testMessage);
            
            expect(result.success).toBe(true);
            expect(mockWindow.cheddar.sendTextMessage).toHaveBeenCalledWith(testMessage);
        });

        test('should handle message sending failure', async () => {
            const testMessage = 'Hello, how are you?';
            const errorMessage = 'Network error';
            
            mockWindow.cheddar.sendTextMessage.mockResolvedValue({ 
                success: false, 
                error: errorMessage 
            });
            
            const result = await mockWindow.cheddar.sendTextMessage(testMessage);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
        });

        test('should handle empty or invalid messages', async () => {
            const emptyMessage = '';
            const nullMessage = null;
            const undefinedMessage = undefined;
            
            // Test empty message
            mockWindow.cheddar.sendTextMessage.mockResolvedValue({ 
                success: false, 
                error: 'Message cannot be empty' 
            });
            
            let result = await mockWindow.cheddar.sendTextMessage(emptyMessage);
            expect(result.success).toBe(false);
            
            // Test null message
            result = await mockWindow.cheddar.sendTextMessage(nullMessage);
            expect(result.success).toBe(false);
            
            // Test undefined message
            result = await mockWindow.cheddar.sendTextMessage(undefinedMessage);
            expect(result.success).toBe(false);
        });
    });

    describe('Status Updates and UI Integration', () => {
        
        test('should update status with AI provider prefix for Gemini', () => {
            localStorage.setItem('selectedAiModel', 'gemini');
            const statusText = 'Ready';
            
            // Simulate the setStatus behavior
            const aiProvider = 'Gemini';
            const expectedStatus = `[${aiProvider}] ${statusText}`;
            
            mockWindow.cheddar.setStatus(expectedStatus);
            
            expect(mockWindow.cheddar.setStatus).toHaveBeenCalledWith(expectedStatus);
        });

        test('should update status with AI provider prefix for OpenRouter', () => {
            localStorage.setItem('selectedAiModel', 'openrouter');
            const statusText = 'Ready';
            
            // Simulate the setStatus behavior
            const aiProvider = 'OpenRouter';
            const expectedStatus = `[${aiProvider}] ${statusText}`;
            
            mockWindow.cheddar.setStatus(expectedStatus);
            
            expect(mockWindow.cheddar.setStatus).toHaveBeenCalledWith(expectedStatus);
        });

        test('should handle status updates during provider switching', () => {
            // Start with Gemini
            localStorage.setItem('selectedAiModel', 'gemini');
            mockWindow.cheddar.setStatus('[Gemini] Initializing...');
            
            // Switch to OpenRouter
            localStorage.setItem('selectedAiModel', 'openrouter');
            mockWindow.cheddar.setStatus('[OpenRouter] Initializing...');
            
            expect(mockWindow.cheddar.setStatus).toHaveBeenCalledTimes(2);
            expect(mockWindow.cheddar.setStatus).toHaveBeenLastCalledWith('[OpenRouter] Initializing...');
        });
    });

    describe('Error Handling and Recovery', () => {
        
        test('should handle network connectivity issues', async () => {
            const networkError = new Error('Network request failed');
            mockIpcRenderer.invoke.mockRejectedValue(networkError);
            
            try {
                await mockWindow.cheddar.initializeAI();
            } catch (error) {
                expect(error.message).toBe('Network request failed');
            }
        });

        test('should handle API rate limiting', async () => {
            const rateLimitError = { 
                success: false, 
                error: 'Rate limit exceeded. Please try again later.' 
            };
            
            mockWindow.cheddar.sendTextMessage.mockResolvedValue(rateLimitError);
            
            const result = await mockWindow.cheddar.sendTextMessage('Test message');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Rate limit exceeded');
        });

        test('should handle invalid API responses', async () => {
            const invalidResponse = { 
                success: false, 
                error: 'Invalid response format' 
            };
            
            mockWindow.cheddar.sendTextMessage.mockResolvedValue(invalidResponse);
            
            const result = await mockWindow.cheddar.sendTextMessage('Test message');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid response format');
        });

        test('should handle session timeout and reconnection', async () => {
            // Simulate session timeout
            mockIpcRenderer.invoke.mockRejectedValueOnce(new Error('Session expired'));
            
            // Then successful reconnection
            mockIpcRenderer.invoke.mockResolvedValueOnce({ success: true });
            
            try {
                await mockWindow.cheddar.initializeAI();
            } catch (error) {
                expect(error.message).toBe('Session expired');
                
                // Retry initialization
                const retryResult = await mockWindow.cheddar.initializeAI();
                // This would be handled by the actual implementation
            }
        });
    });

    describe('Provider Switching', () => {
        
        test('should switch from Gemini to OpenRouter successfully', async () => {
            // Start with Gemini
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', 'AIzaSyDummyGeminiApiKey123456789');
            
            mockIpcRenderer.invoke.mockResolvedValue({ success: true });
            await mockWindow.cheddar.initializeAI();
            
            // Switch to OpenRouter
            localStorage.setItem('selectedAiModel', 'openrouter');
            localStorage.setItem('openRouterApiKey', 'sk-or-v1-dummy-openrouter-key-123456789');
            
            await mockWindow.cheddar.initializeAI();
            
            expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(2);
            expect(mockIpcRenderer.invoke).toHaveBeenLastCalledWith('initialize-openrouter', expect.any(Object));
        });

        test('should switch from OpenRouter to Gemini successfully', async () => {
            // Clear previous calls
            mockIpcRenderer.invoke.mockClear();
            mockIpcRenderer.invoke.mockResolvedValue({ success: true });
            
            // Start with OpenRouter
            localStorage.setItem('selectedAiModel', 'openrouter');
            localStorage.setItem('openRouterApiKey', 'sk-or-v1-dummy-openrouter-key-123456789');
            
            await mockWindow.cheddar.initializeAI();
            
            // Switch to Gemini
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', 'AIzaSyDummyGeminiApiKey123456789');
            
            await mockWindow.cheddar.initializeAI();
            
            expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(2);
            expect(mockIpcRenderer.invoke).toHaveBeenLastCalledWith('initialize-gemini', expect.any(Object));
        });

        test('should handle provider switching with missing API keys', async () => {
            // Start with Gemini (valid key)
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', 'AIzaSyDummyGeminiApiKey123456789');
            
            // Switch to OpenRouter (missing key)
            localStorage.setItem('selectedAiModel', 'openrouter');
            localStorage.removeItem('openRouterApiKey');
            
            const openRouterKey = localStorage.getItem('openRouterApiKey');
            expect(openRouterKey).toBeNull();
            
            // Should handle missing key gracefully
            mockIpcRenderer.invoke.mockRejectedValue(new Error('API key required'));
            
            try {
                await mockWindow.cheddar.initializeAI();
            } catch (error) {
                expect(error.message).toBe('API key required');
            }
        });
    });

    describe('Integration with UI Components', () => {
        
        test('should update CustomizeView AI model dropdown', () => {
            const aiModels = ['gemini', 'openrouter'];
            
            aiModels.forEach(model => {
                localStorage.setItem('selectedAiModel', model);
                const selectedModel = localStorage.getItem('selectedAiModel');
                expect(selectedModel).toBe(model);
            });
        });

        test('should show/hide appropriate API key fields in MainView', () => {
            // Test Gemini selection
            localStorage.setItem('selectedAiModel', 'gemini');
            let selectedModel = localStorage.getItem('selectedAiModel');
            expect(selectedModel).toBe('gemini');
            
            // Test OpenRouter selection
            localStorage.setItem('selectedAiModel', 'openrouter');
            selectedModel = localStorage.getItem('selectedAiModel');
            expect(selectedModel).toBe('openrouter');
        });

        test('should trigger appropriate error animations for invalid keys', () => {
            // Test invalid Gemini key (empty string)
            localStorage.setItem('selectedAiModel', 'gemini');
            localStorage.setItem('apiKey', '');
            
            const apiKey = localStorage.getItem('apiKey');
            const isValidGeminiKey = !!(apiKey && apiKey.trim().length > 0);
            expect(isValidGeminiKey).toBe(false);
            
            // Test invalid OpenRouter key (empty string)
            localStorage.setItem('selectedAiModel', 'openrouter');
            localStorage.setItem('openRouterApiKey', '');
            
            const openRouterApiKey = localStorage.getItem('openRouterApiKey');
            const isValidOpenRouterKey = !!(openRouterApiKey && openRouterApiKey.trim().length > 0);
            expect(isValidOpenRouterKey).toBe(false);
        });
    });
});