const { BrowserWindow } = require('electron');

// OpenRouter API configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Available OpenRouter models that support vision
const OPENROUTER_MODELS = [
    { id: 'qwen/qwen-2-vl-72b-instruct', name: 'Qwen2-VL 72B Instruct', supportsVision: true },
    { id: 'qwen/qwen-2-vl-7b-instruct', name: 'Qwen2-VL 7B Instruct', supportsVision: true },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', supportsVision: true },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', supportsVision: true },
    { id: 'openai/gpt-4o', name: 'GPT-4o', supportsVision: true },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', supportsVision: true },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', supportsVision: true },
    { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', supportsVision: true },
    { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', supportsVision: true },
    { id: 'qwen/qwen3-coder', name: 'Qwen3 Coder', supportsVision: false }
];

/**
 * Get available OpenRouter models
 */
function getAvailableModels() {
    return OPENROUTER_MODELS;
}

/**
 * Get stored OpenRouter settings from localStorage
 */
async function getOpenRouterSettings() {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) {
            return { enabled: false, apiKey: '', model: 'qwen/qwen3-coder' };
        }
        
        const settings = await windows[0].webContents.executeJavaScript(`
            (function() {
                try {
                    return {
                        enabled: localStorage.getItem('openRouterEnabled') === 'true',
                        apiKey: localStorage.getItem('openRouterApiKey') || '',
                        model: localStorage.getItem('openRouterModel') || 'qwen/qwen3-coder'
                    };
                } catch (e) {
                    return { enabled: false, apiKey: '', model: 'qwen/qwen3-coder' };
                }
            })()
        `);
        
        return settings;
    } catch (error) {
        console.error('Error getting OpenRouter settings:', error);
        return { enabled: false, apiKey: '', model: 'qwen/qwen3-coder' };
    }
}

/**
 * Send a message to OpenRouter API with streaming support
 */
async function sendToOpenRouter(messages, apiKey, model, onChunk, onComplete, onError) {
    try {
        console.log('Sending request to OpenRouter:', { model, messageCount: messages.length });
        
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://jarvis-ai.app',
                'X-Title': 'Jarvis AI Assistant'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                        onComplete(fullResponse);
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        // Ignore parsing errors for individual chunks
                    }
                }
            }
        }

        onComplete(fullResponse);
    } catch (error) {
        console.error('OpenRouter request failed:', error);
        onError(error);
    }
}

/**
 * Process context with screenshot using OpenRouter
 */
async function processContextWithOpenRouter(contextText, screenshotBase64) {
    const settings = await getOpenRouterSettings();
    
    if (!settings.enabled || !settings.apiKey) {
        throw new Error('OpenRouter not enabled or API key missing');
    }

    const selectedModel = OPENROUTER_MODELS.find(m => m.id === settings.model);
    if (!selectedModel) {
        throw new Error(`Model ${settings.model} not found`);
    }

    // Prepare messages array
    const messages = [
        {
            role: 'user',
            content: []
        }
    ];

    // Add text content
    if (contextText && contextText.trim()) {
        messages[0].content.push({
            type: 'text',
            text: contextText
        });
    }

    // Add image if model supports vision and screenshot is available
    if (selectedModel.supportsVision && screenshotBase64) {
        messages[0].content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${screenshotBase64}`
            }
        });
    } else if (screenshotBase64) {
        // If model doesn't support vision, add a note about the screenshot
        messages[0].content.push({
            type: 'text',
            text: '\n\n[Note: A screenshot was captured but this model does not support image analysis]'
        });
    }

    // If no content was added, add a default message
    if (messages[0].content.length === 0) {
        messages[0].content.push({
            type: 'text',
            text: 'Please provide assistance based on the current context.'
        });
    }

    return new Promise((resolve, reject) => {
        let fullResponse = '';
        let hasStarted = false;

        sendToOpenRouter(
            messages,
            settings.apiKey,
            settings.model,
            // onChunk
            (chunk) => {
                if (!hasStarted) {
                    // Send signal that new response is starting
                    sendToRenderer('new-response-starting');
                    hasStarted = true;
                }
                fullResponse += chunk;
                sendToRenderer('update-response', fullResponse);
            },
            // onComplete
            (response) => {
                sendToRenderer('update-response', response);
                resolve({ success: true, response });
            },
            // onError
            (error) => {
                reject(error);
            }
        );
    });
}

/**
 * Send message to renderer process
 */
function sendToRenderer(channel, data) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send(channel, data);
        }
    } catch (error) {
        console.error('Error sending to renderer:', error);
    }
}

module.exports = {
    getAvailableModels,
    getOpenRouterSettings,
    processContextWithOpenRouter,
    sendToOpenRouter
};