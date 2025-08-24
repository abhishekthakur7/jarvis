/**
 * Teleprompter Formatter Utility
 * Provides reading-optimized typography, content segmentation, and visual hierarchy
 * for the screen reader interface enhancement.
 */

export class TeleprompterFormatter {
    constructor() {
        this.config = {
            // Typography scales for different content types (relative to centralized font size)
            typography: {
                primary: {
                    //fontSize: '1.125em', // 18px relative to 16px base
                    lineHeight: 1.8,
                    letterSpacing: '0.02em',
                    wordSpacing: '0.1em',
                    fontWeight: 600
                },
                secondary: {
                    //fontSize: '1em', // Use base font size
                    lineHeight: 1.6,
                    letterSpacing: '0.01em',
                    wordSpacing: '0.05em',
                    fontWeight: 500,
                    opacity: 0.9
                },
                tertiary: {
                    //fontSize: '0.875em', // 14px relative to 16px base
                    lineHeight: 1.5,
                    letterSpacing: '0.005em',
                    wordSpacing: '0.02em',
                    fontWeight: 400,
                    opacity: 0.75
                },
                code: {
                    //fontSize: '1em', // Use base font size
                    lineHeight: 1.7,
                    letterSpacing: '0.03em',
                    fontWeight: 500
                }
            },
            
            // Layout modes with optimized dimensions (font sizes now inherited from centralized system)
            layoutModes: {
                'ultra-discrete': {
                    width: 280,
                    height: 200,
                    fontSizeScale: 0.875, // 87.5% of base font size
                    lineHeight: 1.4,
                    maxLinesPerSection: 3
                },
                'balanced': {
                    width: 350,
                    height: 300,
                    fontSizeScale: 1.0, // 100% of base font size
                    lineHeight: 1.6,
                    maxLinesPerSection: 5
                },
                'presentation': {
                    width: 400,
                    height: 350,
                    fontSizeScale: 1.125, // 112.5% of base font size
                    lineHeight: 1.8,
                    maxLinesPerSection: 7
                }
            },
            
            // Content segmentation settings
            segmentation: {
                naturalPausePoints: ['.', '!', '?', ':', ';'],
                sectionBreakMinWords: 15,
                maxWordsPerSegment: 50,
                keyInformationMarkers: ['key', 'important', 'critical', 'note', 'remember']
            }
        };
        
        this.currentMode = 'balanced';
        this.progressCallbacks = [];
    }

    /**
     * Set the current layout mode for the teleprompter
     */
    setLayoutMode(mode) {
        if (this.config.layoutModes[mode]) {
            this.currentMode = mode;
            this.applyLayoutMode();
        }
    }

    /**
     * Apply current layout mode styles to the document
     */
    applyLayoutMode() {
        const mode = this.config.layoutModes[this.currentMode];
        const root = document.documentElement;
        
        // Get current centralized font size and apply scale
        const baseFontSize = getComputedStyle(root).getPropertyValue('--response-font-size') || '16px';
        const baseFontSizeNum = parseInt(baseFontSize, 10);
        const scaledFontSize = Math.round(baseFontSizeNum * mode.fontSizeScale);
        
        // Apply teleprompter-specific CSS variables (referencing centralized font size)
        root.style.setProperty('--teleprompter-font-size', `${scaledFontSize}px`);
        root.style.setProperty('--teleprompter-line-height', mode.lineHeight);
        root.style.setProperty('--teleprompter-max-lines', mode.maxLinesPerSection);
        
        // Apply reading-optimized spacing
        root.style.setProperty('--reading-line-height', this.config.typography.primary.lineHeight);
        root.style.setProperty('--reading-letter-spacing', this.config.typography.primary.letterSpacing);
        root.style.setProperty('--reading-word-spacing', this.config.typography.primary.wordSpacing);
        root.style.setProperty('--reading-paragraph-spacing', '1.5em');
    }

    /**
     * Analyze content type and return appropriate formatting
     */
    analyzeContentType(text) {
        const analysis = {
            type: 'text',
            priority: 'secondary',
            hasCode: false,
            hasSteps: false,
            hasDiagram: false,
            keyTerms: [],
            readingDifficulty: 'medium'
        };

        // Code detection
        if (text.includes('```') || text.includes('`') || 
            /\.(js|ts|py|java|cpp|c|html|css)/.test(text)) {
            analysis.hasCode = true;
            analysis.type = 'code';
        }

        // Step-by-step detection
        if (/\d+\.\s/.test(text) || /step\s*\d+/i.test(text)) {
            analysis.hasSteps = true;
            analysis.type = 'steps';
        }

        // Diagram detection
        if (/diagram|flowchart|architecture|system design/i.test(text)) {
            analysis.hasDiagram = true;
            analysis.type = 'diagram';
        }

        // Priority detection based on key indicators
        const highPriorityTerms = ['answer', 'solution', 'key', 'important', 'critical'];
        const lowPriorityTerms = ['note', 'example', 'context', 'background'];
        
        const lowerText = text.toLowerCase();
        if (highPriorityTerms.some(term => lowerText.includes(term))) {
            analysis.priority = 'primary';
        } else if (lowPriorityTerms.some(term => lowerText.includes(term))) {
            analysis.priority = 'tertiary';
        }

        // Extract key terms
        analysis.keyTerms = this.extractKeyTerms(text);
        
        // Assess reading difficulty
        analysis.readingDifficulty = this.assessReadingDifficulty(text);

        return analysis;
    }

    /**
     * Extract key technical terms from text
     */
    extractKeyTerms(text) {
        const technicalTerms = [];
        const patterns = [
            /\b[A-Z][a-zA-Z]*(?:[A-Z][a-zA-Z]*)*\b/g, // PascalCase
            /\b[a-z]+(?:[A-Z][a-zA-Z]*)+\b/g,         // camelCase
            /\b[A-Z_]+\b/g,                           // CONSTANTS
            /\b(?:class|function|method|interface|API|HTTP|JSON|SQL|REST)\b/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            technicalTerms.push(...matches);
        });
        
        return [...new Set(technicalTerms)].slice(0, 10); // Limit to 10 most relevant
    }

    /**
     * Assess reading difficulty based on text complexity
     */
    assessReadingDifficulty(text) {
        const words = text.split(/\s+/);
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        const sentenceCount = text.split(/[.!?]+/).length;
        const avgWordsPerSentence = words.length / sentenceCount;
        
        if (avgWordLength > 8 || avgWordsPerSentence > 20) {
            return 'high';
        } else if (avgWordLength < 5 && avgWordsPerSentence < 12) {
            return 'low';
        }
        return 'medium';
    }

    /**
     * Segment content into reading-friendly chunks with natural pause points
     */
    segmentContent(text) {
        const segments = [];
        const sentences = text.split(/(?<=[.!?])\s+/);
        let currentSegment = '';
        let currentWordCount = 0;
        
        for (const sentence of sentences) {
            const words = sentence.split(/\s+/).length;
            
            if (currentWordCount + words > this.config.segmentation.maxWordsPerSegment && currentSegment) {
                segments.push({
                    text: currentSegment.trim(),
                    wordCount: currentWordCount,
                    type: 'paragraph',
                    hasNaturalPause: true
                });
                currentSegment = sentence;
                currentWordCount = words;
            } else {
                currentSegment += (currentSegment ? ' ' : '') + sentence;
                currentWordCount += words;
            }
        }
        
        if (currentSegment) {
            segments.push({
                text: currentSegment.trim(),
                wordCount: currentWordCount,
                type: 'paragraph',
                hasNaturalPause: true
            });
        }
        
        return segments;
    }

    /**
     * Apply visual hierarchy formatting to HTML content
     */
    applyVisualHierarchy(htmlContent, analysis) {
        let formattedContent = htmlContent;
        
        // Wrap key terms with emphasis classes
        analysis.keyTerms.forEach(term => {
            const regex = new RegExp(`\\b(${term})\\b`, 'gi');
            formattedContent = formattedContent.replace(regex, 
                '<span class="key-term" data-term="$1">$1</span>');
        });
        
        // Apply priority-based styling
        const priorityClass = `priority-${analysis.priority}`;
        formattedContent = `<div class="${priorityClass} content-type-${analysis.type}">
            ${formattedContent}
        </div>`;
        
        return formattedContent;
    }

    /**
     * Generate CSS for reading-optimized typography
     */
    generateTypographyCSS() {
        const { typography } = this.config;
        
        return `
            /* Teleprompter Typography System - Inherits from centralized font size */
            .teleprompter-container {
                margin-top: -15px;
                font-size: var(--response-font-size, 16px); /* Inherit centralized font size */
                line-height: 1.5;
                word-spacing: var(--reading-word-spacing, 0.1em);
                font-feature-settings: "liga" 1, "kern" 1;
                text-rendering: optimizeLegibility;
            }
            
            .priority-primary {
                font-size: ${typography.primary.fontSize}; /* Relative to container font size */
                line-height: ${typography.primary.lineHeight};
                font-weight: ${typography.primary.fontWeight};
                letter-spacing: ${typography.primary.letterSpacing};
                color: var(--primary-text-color, #ffffff);
            }
            
            .priority-secondary {
                font-size: ${typography.secondary.fontSize}; /* Relative to container font size */
                line-height: ${typography.secondary.lineHeight};
                font-weight: ${typography.secondary.fontWeight};
                opacity: ${typography.secondary.opacity};
                color: var(--secondary-text-color, #e0e0e0);
            }
            
            .priority-tertiary {
                font-size: ${typography.tertiary.fontSize}; /* Relative to container font size */
                line-height: ${typography.tertiary.lineHeight};
                font-weight: ${typography.tertiary.fontWeight};
                opacity: ${typography.tertiary.opacity};
                color: var(--tertiary-text-color, #c0c0c0);
            }
            
            .content-type-code {
                font-family: var(--code-font-family, 'SF Mono', 'Monaco', 'Cascadia Code', monospace);
                font-size: ${typography.code.fontSize}; /* Relative to container font size */
                line-height: ${typography.code.lineHeight};
                letter-spacing: ${typography.code.letterSpacing};
                background: var(--code-background, rgba(0, 0, 0, 0.3));
                border-radius: 4px;
                border-left: 1px solid var(--accent-color, #007aff);
                border-right: 1px solid var(--accent-color, #007aff);
                border-top: 1px solid var(--accent-color, #007aff);
            }
            
            .key-term {
                font-size: 0.9em;
                font-weight: 600;
                color: var(--key-term-color, #ffd700);
                background: var(--key-term-background, rgba(255, 215, 0, 0.1));
                border-radius: 3px;
            }
            
            /* Reading flow indicators */
            .segment-boundary {
                border-bottom: 1px solid var(--segment-border, rgba(255, 255, 255, 0.1));
                margin-bottom: 1em;
            }
            
            .natural-pause {
                margin-right: 0.3em;
                position: relative;
            }
            
            .natural-pause::after {
                content: '';
                display: inline-block;
                width: 2px;
                height: 2px;
                background: var(--pause-indicator, rgba(255, 255, 255, 0.3));
                border-radius: 50%;
                margin-left: 0.2em;
                vertical-align: middle;
            }
        `;
    }

    /**
     * Register progress callback for reading flow tracking
     */
    onProgress(callback) {
        this.progressCallbacks.push(callback);
    }

    /**
     * Trigger progress update
     */
    updateProgress(data) {
        this.progressCallbacks.forEach(callback => callback(data));
    }

    /**
     * Calculate estimated reading time for content
     */
    calculateReadingTime(text, wordsPerMinute = 200) {
        const words = text.split(/\s+/).length;
        const minutes = words / wordsPerMinute;
        return Math.ceil(minutes * 60); // Return seconds
    }

    /**
     * Generate reading pacing data for auto-scroll
     */
    generatePacingData(segments) {
        return segments.map(segment => ({
            text: segment.text,
            duration: this.calculateReadingTime(segment.text),
            pauseDuration: segment.hasNaturalPause ? 1000 : 500, // ms
            wordCount: segment.wordCount
        }));
    }
}

// Export singleton instance
export const teleprompterFormatter = new TeleprompterFormatter();