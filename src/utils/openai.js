const OpenAI = require('openai');
const { BrowserWindow } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { getSystemPrompt } = require('./prompts');
const apiKeyManagerInstance = require('./apiKeyManager');
const { getStoredSetting, setStoredSetting } = require('./settingsManager');
const { recordMetric } = require('./metricsCollector');
const { ipcMain } = require('electron');
const https = require('https');
const { searchGoogle } = require('./googleSearch');

// Conversation tracking variables
let currentSessionId = null;
let conversationHistory = [];
let isInitializingSession = false;
let openaiClient = null;

// API key management
let apiKeyManager = null;

// Response timing tracking
let requestStartTime = null;
let lastResponseTime = null;

// Abort management for in-flight OpenAI requests
let currentAbortController = null;
let currentConversationId = null;

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

const MAX_TURNS_IN_HISTORY = 25;
const MAX_SUMMARY_CHAR = 800;

function summariseHistoryIfNeeded() {
    if (conversationHistory.length > MAX_TURNS_IN_HISTORY) {
        const oldTurns = conversationHistory.splice(0, conversationHistory.length - MAX_TURNS_IN_HISTORY);
        const summary = oldTurns.map(turn => `User: ${turn.user}\nAI: ${turn.ai}`).join('\n\n');
        const truncatedSummary = summary.length > MAX_SUMMARY_CHAR ? 
            summary.substring(0, MAX_SUMMARY_CHAR) + '...' : summary;
        
        conversationHistory.unshift({
            user: '[CONVERSATION SUMMARY]',
            ai: truncatedSummary,
            timestamp: Date.now()
        });
    }
}

function recordMetric(event, data = {}) {
    console.log(`[OpenAI Metric] ${event}:`, data);
}

function computeQualityScore(responseText) {
    return responseText && responseText.length > 10 ? 0.8 : 0.3;
}

// Get OpenAI API key
function getOpenAiApiKey() {
    try {
        return apiKeyManager.getOpenAiApiKey();
    } catch (error) {
        console.error('No OpenAI API key configured:', error.message);
        return null;
    }
}

// Set OpenAI API key
function setOpenAiApiKey(apiKey) {
    try {
        apiKeyManager.setOpenAiApiKey(apiKey);
        console.log('✅ OpenAI API key configured successfully');
        return true;
    } catch (error) {
        console.error('Failed to set OpenAI API key:', error.message);
        return false;
    }
}

async function sendChatCompletionRequest(messages, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            currentAbortController = new AbortController();
            
            const response = await openaiClient.chat.completions.create({
                model: 'gpt-4o', // Using GPT-4o as the latest model
                messages: messages,
                stream: true,
                max_tokens: 4000,
                temperature: 0.7
            }, {
                signal: currentAbortController.signal
            });
            
            return response;
        } catch (error) {
            console.error(`OpenAI request attempt ${attempt} failed:`, error);
            if (attempt === maxRetries || error.name === 'AbortError') {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

function initializeNewSession() {
    currentSessionId = uuidv4();
    conversationHistory = [];
    console.log(`[OpenAI] New session initialized: ${currentSessionId}`);
}

function saveConversationTurn(transcription, aiResponse, isSuppressed = false) {
    if (!transcription || !aiResponse) return;
    
    const turn = {
        user: sanitizeText(transcription),
        ai: sanitizeText(aiResponse),
        timestamp: Date.now(),
        sessionId: currentSessionId,
        suppressed: isSuppressed
    };
    
    conversationHistory.push(turn);
    summariseHistoryIfNeeded();
    
    console.log(`[OpenAI] Conversation turn saved. History length: ${conversationHistory.length}`);
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        conversationHistory: conversationHistory
    };
}

async function getEnabledTools() {
    try {
        const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', false);
        const tools = [];
        
        if (googleSearchEnabled) {
            tools.push({
                type: 'function',
                function: {
                    name: 'google_search',
                    description: 'Search Google for current information',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The search query'
                            }
                        },
                        required: ['query']
                    }
                }
            });
        }
        
        return tools;
    } catch (error) {
        console.error('[OpenAI] Error getting enabled tools:', error);
        return [];
    }
}

async function getStoredSetting(key, defaultValue) {
    return new Promise((resolve) => {
        try {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].webContents.executeJavaScript(`
                    (() => {
                        try {
                            const value = localStorage.getItem('${key}');
                            return value !== null ? JSON.parse(value) : ${JSON.stringify(defaultValue)};
                        } catch (e) {
                            return ${JSON.stringify(defaultValue)};
                        }
                    })()
                `).then(resolve).catch(() => resolve(defaultValue));
            } else {
                resolve(defaultValue);
            }
        } catch (error) {
            console.error(`[OpenAI] Error getting stored setting ${key}:`, error);
            resolve(defaultValue);
        }
    });
}

async function initializeOpenAISession(apiKeys, customPrompt = '', profile = 'interview', language = 'en-IN') {
    try {
        if (isInitializingSession) {
            console.log('[OpenAI] Session initialization already in progress');
            return null;
        }
        
        isInitializingSession = true;
        
        // Initialize API key manager
        if (!apiKeyManager) {
            apiKeyManager = apiKeyManagerInstance;
        }
        
        // Get OpenAI API key
        const openaiApiKey = await apiKeyManager.getApiKey('openai');
        if (!openaiApiKey) {
            throw new Error('OpenAI API key not found');
        }
        
        // Initialize OpenAI client
        openaiClient = new OpenAI({
            apiKey: openaiApiKey
        });
        
        // Initialize new session
        initializeNewSession();
        
        console.log('[OpenAI] Session initialized successfully');
        
        sendToRenderer('openai-session-status', {
            status: 'connected',
            sessionId: currentSessionId
        });
        
        return {
            sessionId: currentSessionId,
            client: openaiClient
        };
        
    } catch (error) {
        console.error('[OpenAI] Session initialization failed:', error);
        
        sendToRenderer('openai-session-status', {
            status: 'error',
            error: error.message
        });
        
        throw error;
    } finally {
        isInitializingSession = false;
    }
}

async function sendCombinedQuestionsToOpenAI(combinedText, customPrompt = '', profile = 'interview', language = 'en-IN') {
    try {
        if (!openaiClient) {
            throw new Error('OpenAI client not initialized');
        }
        
        requestStartTime = Date.now();
        currentConversationId = uuidv4();
        
        recordMetric('request_start', {
            conversationId: currentConversationId,
            inputLength: combinedText.length,
            profile: profile
        });
        
        // Get system prompt
        const systemPrompt = getSystemPrompt(profile, language, customPrompt);
        
        // Build conversation messages
        const messages = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];
        
        // Add conversation history
        conversationHistory.forEach(turn => {
            if (!turn.suppressed) {
                messages.push(
                    { role: 'user', content: turn.user },
                    { role: 'assistant', content: turn.ai }
                );
            }
        });
        
        // Add current input
        messages.push({
            role: 'user',
            content: combinedText
        });
        
        // Get enabled tools
        const tools = await getEnabledTools();
        
        // Send request to OpenAI
        const requestOptions = {
            model: 'gpt-4o',
            messages: messages,
            stream: true,
            max_tokens: 4000,
            temperature: 0.7
        };
        
        if (tools.length > 0) {
            requestOptions.tools = tools;
            requestOptions.tool_choice = 'auto';
        }
        
        const stream = await openaiClient.chat.completions.create(requestOptions);
        
        let fullResponse = '';
        let toolCalls = [];
        
        // Process streaming response
        for await (const chunk of stream) {
            if (currentAbortController?.signal.aborted) {
                console.log('[OpenAI] Request aborted');
                return;
            }
            
            const delta = chunk.choices[0]?.delta;
            
            if (delta?.content) {
                fullResponse += delta.content;
                
                // Send incremental response to renderer
                sendToRenderer('ai-response-chunk', {
                    text: delta.content,
                    isComplete: false,
                    conversationId: currentConversationId,
                    provider: 'openai'
                });
            }
            
            if (delta?.tool_calls) {
                toolCalls.push(...delta.tool_calls);
            }
        }
        
        // Handle tool calls if any
        if (toolCalls.length > 0) {
            // Process tool calls (e.g., Google Search)
            for (const toolCall of toolCalls) {
                if (toolCall.function?.name === 'google_search') {
                    try {
                        const searchQuery = JSON.parse(toolCall.function.arguments).query;
                        // Implement Google Search integration here
                        console.log('[OpenAI] Google Search requested:', searchQuery);
                    } catch (error) {
                        console.error('[OpenAI] Tool call error:', error);
                    }
                }
            }
        }
        
        const responseTime = Date.now() - requestStartTime;
        lastResponseTime = responseTime;
        
        recordMetric('response_complete', {
            conversationId: currentConversationId,
            responseTime: responseTime,
            responseLength: fullResponse.length,
            qualityScore: computeQualityScore(fullResponse)
        });
        
        // Send final response
        sendToRenderer('ai-response-chunk', {
            text: '',
            isComplete: true,
            conversationId: currentConversationId,
            provider: 'openai',
            fullResponse: fullResponse
        });
        
        // Save conversation turn
        saveConversationTurn(combinedText, fullResponse);
        
        return fullResponse;
        
    } catch (error) {
        console.error('[OpenAI] Error sending request:', error);
        
        sendToRenderer('ai-response-error', {
            error: error.message,
            conversationId: currentConversationId,
            provider: 'openai'
        });
        
        throw error;
    }
}

function abortCurrentRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        console.log('[OpenAI] Current request aborted');
    }
}

function closeSession() {
    try {
        abortCurrentRequest();
        
        openaiClient = null;
        currentSessionId = null;
        conversationHistory = [];
        
        sendToRenderer('openai-session-status', {
            status: 'disconnected'
        });
        
        console.log('[OpenAI] Session closed successfully');
    } catch (error) {
        console.error('[OpenAI] Error closing session:', error);
    }
}

module.exports = {
    initializeOpenAISession,
    sendCombinedQuestionsToOpenAI,
    abortCurrentRequest,
    closeSession,
    getCurrentSessionData,
    saveConversationTurn,
    initializeNewSession,
    sendToRenderer,
    getEnabledTools,
    getStoredSetting,
    getOpenAiApiKey,
    setOpenAiApiKey
};