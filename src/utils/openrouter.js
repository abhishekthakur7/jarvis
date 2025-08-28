const { BrowserWindow, ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { getSystemPrompt } = require('./prompts');
const { getMultipleNotionContents } = require('./notion');
const apiKeyManagerInstance = require('./apiKeyManager');

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';

// Session tracking variables
let currentSessionId = null;
let conversationHistory = [];
let isInitializingSession = false;
let apiKeyManager = null;

// Reconnection tracking variables
let reconnectionAttempts = 0;
let maxReconnectionAttempts = 3;
let reconnectionDelay = 2000;
let lastSessionParams = null;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                         .replace(/[\uFFFD\uFEFF]/g, '')
                         .replace(/[\u200B-\u200D\uFEFF]/g, '')
                         .trim();
    
    return sanitized;
}

function initializeNewSession() {
    currentSessionId = uuidv4();
    conversationHistory = [];
    console.log(`🆕 New OpenRouter session initialized: ${currentSessionId}`);
}

function saveConversationTurn(userMessage, aiResponse, isSuppressed = false) {
    if (!currentSessionId) {
        initializeNewSession();
    }
    
    const turn = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userMessage: sanitizeText(userMessage),
        aiResponse: sanitizeText(aiResponse),
        sessionId: currentSessionId,
        isSuppressed
    };
    
    conversationHistory.push(turn);
    
    // Keep conversation history manageable
    if (conversationHistory.length > 25) {
        conversationHistory = conversationHistory.slice(-20);
    }
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory
    };
}

async function getEnabledTools() {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) return [];
        
        const tools = await windows[0].webContents.executeJavaScript(`
            (function() {
                try {
                    const googleSearchEnabled = localStorage.getItem('googleSearchEnabled') === 'true';
                    return [{ googleSearch: googleSearchEnabled }];
                } catch (e) {
                    return [];
                }
            })()
        `);
        
        return tools || [];
    } catch (error) {
        console.error('Error getting enabled tools:', error);
        return [];
    }
}

async function getStoredSetting(key, defaultValue) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) return defaultValue;
        
        const value = await windows[0].webContents.executeJavaScript(`
            (function() {
                try {
                    return localStorage.getItem('${key}');
                } catch (e) {
                    return null;
                }
            })()
        `);

        console.log('Select model: ' + value);
        
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.error(`Error getting stored setting ${key}:`, error);
        return defaultValue;
    }
}

async function sendMessageToOpenRouter(message, apiKey, model = DEFAULT_MODEL) {
    try {
        // Get configuration options from localStorage
        const openRouterModel = await getStoredSetting('openRouterModel', DEFAULT_MODEL);
        const openRouterTemperature = await getStoredSetting('openRouterTemperature', 0.7);
        const openRouterMaxTokens = await getStoredSetting('openRouterMaxTokens', 4000);
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jarvis-ai.app',
                'X-Title': 'Jarvis AI Assistant'
            },
            body: JSON.stringify({
                model: openRouterModel,
                messages: [
                    ...conversationHistory.map(turn => ([
                        { role: 'user', content: turn.userMessage },
                        { role: 'assistant', content: turn.aiResponse }
                    ])).flat(),
                    { role: 'user', content: message }
                ],
                stream: true,
                temperature: parseFloat(openRouterTemperature),
                max_tokens: parseInt(openRouterMaxTokens)
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error('Error sending message to OpenRouter:', error);
        throw error;
    }
}

async function processStreamingResponse(response, userMessage) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    
                    if (data === '[DONE]') {
                        break;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        
                        if (content) {
                            fullResponse += content;
                            sendToRenderer('update-response', fullResponse);
                        }
                    } catch (parseError) {
                        // Skip invalid JSON chunks
                        continue;
                    }
                }
            }
        }
        
        // Save the completed conversation turn
        saveConversationTurn(userMessage, fullResponse);
        
        return fullResponse;
    } catch (error) {
        console.error('Error processing streaming response:', error);
        throw error;
    } finally {
        reader.releaseLock();
    }
}

async function attemptReconnection() {
    if (reconnectionAttempts >= maxReconnectionAttempts) {
        sendToRenderer('update-status', 'Maximum reconnection attempts reached');
        return false;
    }
    
    reconnectionAttempts++;
    sendToRenderer('update-status', `Reconnecting... (${reconnectionAttempts}/${maxReconnectionAttempts})`);
    
    try {
        await new Promise(resolve => setTimeout(resolve, reconnectionDelay));
        
        if (lastSessionParams) {
            await initializeOpenRouterSession(
                lastSessionParams.apiKeys,
                lastSessionParams.customPrompt,
                lastSessionParams.profile,
                lastSessionParams.language,
                true // isReconnection
            );
            return true;
        }
    } catch (error) {
        console.error('Reconnection failed:', error);
    }
    
    return false;
}

async function initializeOpenRouterSession(apiKeys, customPrompt = '', profile = 'interview', language = 'en-US', isReconnection = false) {
    if (isInitializingSession) {
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    try {
        // Initialize API key manager if not already done
        if (!apiKeyManager) {
            apiKeyManager = apiKeyManagerInstance;
            
            // Set API keys (can be comma-separated string or array)
            const keyString = Array.isArray(apiKeys) ? apiKeys.join(',') : apiKeys;
            apiKeyManager.setApiKeys(keyString);
        }

        if (!isReconnection) {
            lastSessionParams = {
                apiKeys,
                customPrompt,
                profile,
                language,
            };
            reconnectionAttempts = 0;
        }

        // Get current API key to use
        const currentApiKey = apiKeyManager.getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error('No valid API keys available');
        }

        console.log(`🔑 Using OpenRouter API key: ${currentApiKey.substring(0, 8)}...`);

        const enabledTools = await getEnabledTools();
        const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

        // Get Notion context if available
        const getNotionContext = async () => {
            try {
                const windows = BrowserWindow.getAllWindows();
                if (windows.length === 0) {
                    return '';
                }
                
                const notionSettings = await windows[0].webContents.executeJavaScript(`
                    (function() {
                        try {
                            const notionApiKey = localStorage.getItem('notionApiKey');
                            const notionPagesJson = localStorage.getItem('notionPages');
                            return { notionApiKey, notionPagesJson };
                        } catch (e) {
                            return { notionApiKey: null, notionPagesJson: null };
                        }
                    })()
                `);
                
                if (!notionSettings.notionApiKey || !notionSettings.notionPagesJson) {
                    return '';
                }
                
                const notionPages = JSON.parse(notionSettings.notionPagesJson);
                if (!notionPages || notionPages.length === 0) {
                    return '';
                }
                
                const result = await getMultipleNotionContents(notionSettings.notionApiKey, notionPages);
                
                if (result && result.success) {
                    return result.content || '';
                } else {
                    console.error('Error getting Notion content:', result?.error);
                    return '';
                }
            } catch (error) {
                console.error('Error getting Notion context:', error);
                return '';
            }
        };

        const notionContext = await getNotionContext();
        const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled, notionContext);

        if (!isReconnection) {
            initializeNewSession();
        }

        // Test the API key with a simple request
        const testResponse = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jarvis-ai.app',
                'X-Title': 'Jarvis AI Assistant'
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 1
            })
        });

        if (!testResponse.ok) {
            if (testResponse.status === 401) {
                throw new Error('Invalid API key');
            }
            throw new Error(`OpenRouter API error: ${testResponse.status}`);
        }

        sendToRenderer('update-status', 'OpenRouter session connected');
        sendToRenderer('session-initialized', true);
        
        reconnectionAttempts = 0;
        return true;

    } catch (error) {
        console.error('Error initializing OpenRouter session:', error);
        sendToRenderer('update-status', `Error: ${error.message}`);
        
        if (error.message.includes('Invalid API key')) {
            sendToRenderer('api-key-error', true);
        }
        
        return false;
    } finally {
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
    }
}

async function sendTextToOpenRouter(text) {
    try {
        if (!apiKeyManager) {
            throw new Error('OpenRouter session not initialized');
        }
        
        const currentApiKey = apiKeyManager.getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error('No valid API keys available');
        }
        
        sendToRenderer('new-response-starting');
        
        const response = await sendMessageToOpenRouter(text, currentApiKey);
        const fullResponse = await processStreamingResponse(response, text);
        
        return fullResponse;
    } catch (error) {
        console.error('Error sending text to OpenRouter:', error);
        
        if (error.message.includes('401') || error.message.includes('Invalid API key')) {
            sendToRenderer('api-key-error', true);
        } else {
            sendToRenderer('update-status', `Error: ${error.message}`);
        }
        
        throw error;
    }
}

async function sendImageToOpenRouter(imageData) {
    try {
        if (!apiKeyManager) {
            throw new Error('OpenRouter session not initialized');
        }
        
        const currentApiKey = apiKeyManager.getCurrentApiKey();
        if (!currentApiKey) {
            throw new Error('No valid API keys available');
        }
        
        if (!imageData || typeof imageData !== 'string') {
            throw new Error('Invalid image data');
        }
        
        // Validate base64 image data
        const buffer = Buffer.from(imageData, 'base64');
        if (buffer.length < 1000) {
            throw new Error('Image buffer too small');
        }
        
        sendToRenderer('new-response-starting');
        
        // Get configuration options
        const openRouterModel = await getStoredSetting('openRouterModel', 'google/gemini-2.5-flash');
        const openRouterTemperature = await getStoredSetting('openRouterTemperature', 0.7);
        const openRouterMaxTokens = await getStoredSetting('openRouterMaxTokens', 4000);
        
        // Create the image message in OpenRouter format
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jarvis-ai.app',
                'X-Title': 'Jarvis AI Assistant'
            },
            body: JSON.stringify({
                model: openRouterModel,
                messages: [
                    ...conversationHistory.map(turn => ([
                        { role: 'user', content: turn.userMessage },
                        { role: 'assistant', content: turn.aiResponse }
                    ])).flat(),
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Please analyze this image and provide assistance based on what you can see.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageData}`
                                }
                            }
                        ]
                    }
                ],
                stream: true,
                temperature: parseFloat(openRouterTemperature),
                max_tokens: parseInt(openRouterMaxTokens)
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }
        
        const fullResponse = await processStreamingResponse(response, 'Image analysis request');
        
        return fullResponse;
    } catch (error) {
        console.error('Error sending image to OpenRouter:', error);
        
        if (error.message.includes('401') || error.message.includes('Invalid API key')) {
            sendToRenderer('api-key-error', true);
        } else {
            sendToRenderer('update-status', `Error: ${error.message}`);
        }
        
        throw error;
    }
}

function setupOpenRouterIpcHandlers() {
    // Remove existing handlers to prevent duplicates
    ipcMain.removeAllListeners('initialize-openrouter');
    ipcMain.removeAllListeners('send-text-openrouter');
    ipcMain.removeAllListeners('send-image-openrouter');
    ipcMain.removeAllListeners('get-openrouter-session-data');
    
    ipcMain.handle('initialize-openrouter', async (event, apiKeys, customPrompt, profile, language) => {
        try {
            return await initializeOpenRouterSession(apiKeys, customPrompt, profile, language);
        } catch (error) {
            console.error('IPC initialize-openrouter error:', error);
            return false;
        }
    });
    
    ipcMain.handle('send-text-openrouter', async (event, text) => {
        try {
            return await sendTextToOpenRouter(text);
        } catch (error) {
            console.error('IPC send-text-openrouter error:', error);
            throw error;
        }
    });
    
    ipcMain.handle('send-image-openrouter', async (event, imageData) => {
        try {
            return await sendImageToOpenRouter(imageData);
        } catch (error) {
            console.error('IPC send-image-openrouter error:', error);
            throw error;
        }
    });
    
    ipcMain.handle('get-openrouter-session-data', async () => {
        return getCurrentSessionData();
    });
}

module.exports = {
    initializeOpenRouterSession,
    sendTextToOpenRouter,
    sendImageToOpenRouter,
    getCurrentSessionData,
    setupOpenRouterIpcHandlers,
    attemptReconnection,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getEnabledTools,
    getStoredSetting
};