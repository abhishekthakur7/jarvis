import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { teleprompterFormatter } from '../../utils/teleprompterFormatter.js';

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: var(--font-family, 'Inter', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif);
            cursor: default;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
        }

        .response-container {
            height: calc(100% - 5px);
            overflow-x: hidden;
            overflow-y: auto;
            border-radius: 8px;
            font-size: 11px !important;
            line-height: 1.3;
            background: var(--main-content-background);
            padding: 3px;
            letter-spacing: 0.01em;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
            container-type: inline-size;
        }

        /* Use media query as fallback since container queries might not be working */
        @media (min-width: 300px) {
            .response-container {
                font-size: 13px !important;
            }
        }

        /* Animated word-by-word reveal */
        .response-container [data-word] {
            opacity: 0;
            filter: blur(10px);
            display: inline-block;
            transition: opacity 0.5s, filter 0.5s;
        }
        .response-container [data-word].visible {
            opacity: 1;
            filter: blur(0px);
        }
        
        /* Disable transitions when animations are disabled */
        .response-container.no-animation [data-word] {
            transition: none !important;
            opacity: 1 !important;
            filter: blur(0px) !important;
        }

        /* Markdown styling */
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            color: var(--text-color);
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.3;
        }

        .response-container h1 {
            font-size: 1.2em;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff, #e0e0e0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .response-container h2 {
            font-size: 1.1em;
            font-weight: 650;
            color: #f0f0f0;
            margin: 0;
            padding: 0.2em 0 0.2em 0;
        }
        .response-container h3 {
            font-weight: 600;
            color: rgb(244 76 76);
            margin: 0.5px;
            font-size: 1.13em;
        }
        .response-container h4 {
            font-weight: 600;
            color: #e0e0e0;
        }
        .response-container h5 {
            font-size: 1em;
            font-weight: 600;
            color: #d8d8d8;
        }
        .response-container h6 {
            font-size: 0.9em;
            font-weight: 600;
            color: #d0d0d0;
        }

        .response-container p {
            margin: 0.05em 0;
            color: var(--text-color);
            line-height: 1.3;
            letter-spacing: 0.005em;
        }

        .response-container ul,
        .response-container ol {
            margin: 0.1em 0;
            padding-left: 1.7em;
            color: var(--text-color);
            line-height: 1.6;
        }

        .response-container li {
            margin: 0.05em 0;
            line-height: 1.3;
            letter-spacing: 0.005em;
        }

        /* Constrain text content width but keep code blocks full width */
        /* Default: full width for narrow containers */
        .response-container p,
        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6,
        .response-container ul,
        .response-container ol,
        .response-container blockquote,
        .response-container div:not(.code-block):not([class*="code"]):not(.language-java) {
            max-width: 100%;
        }
        
        /* Ensure pre elements with Java code are not constrained */
        .response-container pre,
        .response-container pre code {
            max-width: 100% !important;
        }

        /* Only constrain to 75% when container is wider than 300px */
        @container (min-width: 300px) {
            .response-container p,
            .response-container h1,
            .response-container h2,
            .response-container h3,
            .response-container h4,
            .response-container h5,
            .response-container h6,
            .response-container ul,
            .response-container ol,
            .response-container blockquote,
            .response-container div:not(.code-block):not([class*="code"]):not(.language-java) {
                max-width: 95%;
                margin-left: auto;
                margin-right: auto;
            }
            
            /* Ensure pre elements with Java code are not constrained even in wider containers */
            .response-container pre,
            .response-container pre code {
                max-width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
            }
        }

        .response-container ul li::marker {
            color: #007aff;
        }

        .response-container ol li::marker {
            color: #007aff;
            font-weight: 600;
        }

        .response-container blockquote {
            margin: 1.5em 0;
            padding: 1em 1.5em;
            border-left: 4px solid #007aff;
            background: var(--blockquote-background, rgba(0, 122, 255, 0.08));
            font-style: italic;
            border-radius: 0 6px 6px 0;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 122, 255, 0.2);
            border-left: 4px solid #007aff;
            box-shadow: 0 2px 8px rgba(0, 122, 255, 0.1);
        }

        .response-container code {
            background: var(--inline-code-background, rgba(255, 255, 255, 0.08));
            border-radius: 4px;
            font-family: var(--code-font-family, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace) !important;
            font-size: 0.9em;
            color: #ffd700;
            white-space: pre-wrap;
            word-break: break-word;
            font-weight: 500;
        }

        .response-container pre {
            margin-top: -0.4em;
            background: var(--pre-code-background, rgba(0, 0, 0, 0.4));
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 0.3em;
            white-space: pre-wrap;
            word-break: break-word;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        }

        .response-container pre code {
            background: none;
            padding: 0;
            border-radius: 0;
        }

        /* Prism.js syntax highlighting overrides */
        .response-container pre[class*="language-"] {
            background: var(--code-block-background) !important;
            color: #ccc !important;
            font-family: var(--code-font-family, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace) !important;
        }
        
        .response-container code[class*="language-"] {
            color: #ccc !important;
            font-family: var(--code-font-family, 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace) !important;
        }
        
        .response-container .token.comment,
        .response-container .token.prolog,
        .response-container .token.doctype,
        .response-container .token.cdata {
            color: #999 !important;
        }
        
        .response-container .token.punctuation {
            color: #ccc !important;
        }
        
        .response-container .token.property,
        .response-container .token.tag,
        .response-container .token.boolean,
        .response-container .token.number,
        .response-container .token.constant,
        .response-container .token.symbol,
        .response-container .token.deleted {
            color: #f08d49 !important;
        }
        
        .response-container .token.selector,
        .response-container .token.attr-name,
        .response-container .token.string,
        .response-container .token.char,
        .response-container .token.builtin,
        .response-container .token.inserted {
            color: #7ec699 !important;
        }
        
        .response-container .token.operator,
        .response-container .token.entity,
        .response-container .token.url,
        .response-container .language-css .token.string,
        .response-container .style .token.string {
            color: #67cdcc !important;
        }
        
        .response-container .token.atrule,
        .response-container .token.attr-value,
        .response-container .token.keyword {
            color: #cc99cd !important;
        }
        
        .response-container .token.function,
        .response-container .token.class-name {
            color: #f8c555 !important;
        }
        
        .response-container .token.regex,
        .response-container .token.important,
        .response-container .token.variable {
            color: #e2777a !important;
        }

        .response-container a {
            color: var(--link-color);
            text-decoration: none;
        }

        .response-container a:hover {
            text-decoration: underline;
        }

        .response-container strong,
        .response-container b {
            font-weight: 600;
            color: var(--text-color);
        }

        .response-container em,
        .response-container i {
            font-style: italic;
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 0.2em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
            overflow-wrap: anywhere;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border-color);
            padding: 0.5em;
            text-align: left;
        }

        .response-container th {
            background: var(--input-background);
            font-weight: 600;
        }

        .response-container::-webkit-scrollbar {
            width: 8px;
        }

        .response-container::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        /* Enhanced text formatting styles for dark theme */
        .response-container p,
        .response-container li {
            line-height: 1.4;
            font-family: var(--font-family, Arial, sans-serif);
        }

        .response-container .chunk-a {
            color: #eaeaea;
        } /* Primary text: Light grey, visible on black */
        
        .response-container .chunk-b {
            color:rgb(255, 122, 122);
        } /* Secondary text: Soft red, high contrast */
        
        .response-container strong {
            font-weight: 600;
            color: #80bfff;
            font-size: 1.1em;
        } /* Emphasis: Vibrant blue */
        
        .response-container .filler {
            font-style: italic;
            color: #b0b0b0;
        } /* Filler words */
        
        .response-container .connector {
            text-decoration: underline;
            text-decoration-color: #777;
            text-decoration-thickness: 1px;
        } /* Connectors */
        
        .response-container .pace-slow {
            font-weight: 500;
            letter-spacing: 0.5px;
            color: #f5f5f5;
        }
        
        .response-container .pace-fast {
            letter-spacing: -0.4px;
            color: #bdbdbd;
        }
        
        .response-container .aside {
            font-size: 0.9em;
            color: rgb(227 139 231);
        } /* Delivery enhancers */
        
        .response-container .pause {
            letter-spacing: 0.1em;
            color: #b0b0b0;
        } /* Micro-pause marker "…" */
        
        .response-container .volume-loud {
            font-size: 1.15em;
            font-weight: 700;
            color: #ffd35c;
        } /* Louder pitch */
        
        .response-container .volume-soft {
            font-size: 0.9em;
            color: #c0c0c0;
        } /* Softer pitch */
        
        .response-container .tone-warm {
            color: #ffb366;
        } /* Warm emotion */
        
        .response-container .tone-cool {
            color: #66ccff;
        } /* Cool/calming emotion */
        
        .response-container .closing-cue {
            color: #f5f5f5;
        } /* Final ♦ end cue */
        
        .response-container .closing-soon {
            font-size: 1.1em;
            color: #ffd35c;
            font-weight: 600;
        } /* Early wrap-up icon */
        
        .response-container .fade-out {
            -webkit-mask-image: linear-gradient(180deg, #000 60%, transparent);
            mask-image: linear-gradient(180deg, #000 60%, transparent);
        } /* Gradual fade */
        
        #progress::after {
            content: "";
            position: fixed;
            bottom: 0;
            left: 0;
            height: 2px;
            background: #80bfff;
            width: 0;
        } /* Optional minimal progress bar */

        .text-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
            transform-origin: left center;
        }

        .text-input-container input {
            flex: 1;
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--button-border);
            padding: 6px 8px;
            border-radius: 5px;
            font-size: 8px;
        }

        .text-input-container input:focus {
            outline: none;
            border-color: var(--focus-border-color);
            box-shadow: 0 0 0 2px var(--focus-box-shadow);
            background: var(--input-focus-background);
        }

        .text-input-container input::placeholder {
            color: var(--placeholder-color);
        }

        .text-input-container button {
            background: transparent;
            color: var(--start-button-background);
            border: none;
            padding: 0;
            border-radius: 100px;
        }

        .text-input-container button:hover {
            background: var(--text-input-button-hover);
        }

        .nav-button {
            background: rgba(255, 255, 255, 0.05);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 4px;
            border-radius: 8px;
            font-size: 12px;
            display: flex;
            align-items: center;
            width: 36px;
            height: 36px;
            justify-content: center;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }

        .nav-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .nav-button:disabled {
            opacity: 0.3;
            transform: none;
            box-shadow: none;
        }

        .nav-button svg {
            stroke: white !important;
        }

        .response-counter {
            font-size: 12px;
            color: var(--description-color);
            white-space: nowrap;
            min-width: 15px;
            text-align: center;
        }

        .microphone-button.error {
            border-color: #ff8800;
            background: rgba(255, 136, 0, 0.1);
            animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
        }

        .microphone-button.error .microphone-icon {
            color: #ff8800;
        }

        .microphone-button {
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid #666;
            border-radius: 12px;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .microphone-button:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .microphone-button.off {
            border-color: #666;
        }

        .microphone-button.recording {
            border-color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
        }

        .microphone-button.speaking {
            border-color: #44ff44;
            background: rgba(68, 255, 68, 0.1);
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .microphone-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        .microphone-button.off .microphone-icon {
            color: #666;
        }

        .microphone-button.recording .microphone-icon {
            color: #ff4444;
        }

        .microphone-button.speaking .microphone-icon {
            color: #44ff44;
        }

        .response-time-display {
            font-size: 12px;
            color: #888;
            margin-left: 3px;
            white-space: nowrap;
            display: flex;
            align-items: center;
        }

        .response-time-display.fast {
            color:rgb(232, 232, 232);
        }

        .response-time-display.medium {
            color: #ffaa44;
        }

        .response-time-display.slow {
            color: #ff4444;
        }

        .scroll-speed-controls {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            margin-left: 5px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }

        .scroll-speed-controls button {
            background: transparent;
            color: white;
            border: none;
            padding: 4px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            cursor: default;
            transition: all 0.2s ease;
            min-width: 5px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .scroll-speed-controls button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }

        .scroll-speed-controls span {
            font-size: 10px;
            padding: 0 4px;
            text-align: center;
        }

        .font-size-controls {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }

        .font-size-button {
            background: transparent;
            color: white;
            border: none;
            padding: 4px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            cursor: default;
            transition: all 0.2s ease;
            min-width: 20px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .font-size-button:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }

        .font-size-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 10px;
            font-weight: 500;
        }

        .auto-scroll-toggle {
            background: transparent;
            border: 2px solid #666;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            transition: all 0.2s ease;
            margin-left: 8px;
        }

        .auto-scroll-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .auto-scroll-toggle.enabled {
            border-color: #007aff;
            background: rgba(0, 122, 255, 0.1);
        }

        .auto-scroll-toggle.disabled {
            border-color: #666;
        }

        .auto-scroll-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .auto-scroll-toggle.enabled .auto-scroll-icon {
            color: #007aff;
        }

        .auto-scroll-toggle.disabled .auto-scroll-icon {
            color: #666;
        }
        
        /* Reading Flow Controls */
        .reading-flow-controls {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-evenly;
            gap: 4px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 2px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .flow-control-button {
            background: transparent;
            border: none;
            border-radius: 6px;
            width: 40px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            transition: all 0.2s ease;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .flow-control-button:hover {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            transform: scale(1.05);
        }
        
        .flow-control-button:active {
            transform: scale(0.95);
        }
        
        .flow-control-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        
        /* Breathing and pacing visual cues */
        .breathing-cue {
            display: none;
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            margin: 0 4px;
            animation: breathe 3s ease-in-out infinite;
        }
        
        @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        .breathing-cue.long-pause {
            animation-duration: 4s;
            background: rgba(0, 122, 255, 0.5);
        }
        
        .breathing-cue.short-pause {
            animation-duration: 2s;
            background: rgba(255, 215, 0, 0.5);
        }
        
        /* Enhanced highlighting system */
        .key-term.highlighted {
            background: rgba(255, 215, 0, 0.4) !important;
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
            transform: scale(1.02);
            transition: all 0.3s ease;
        }
        
        .priority-primary.current-focus {
            background: rgba(0, 122, 255, 0.3) !important;
            border-left-color: #007aff !important;
            border-left-width: 5px !important;
            box-shadow: 0 0 12px rgba(0, 122, 255, 0.4);
            animation: focusPulse 2s ease-in-out infinite;
        }
        
        @keyframes focusPulse {
            0%, 100% { box-shadow: 0 0 12px rgba(0, 122, 255, 0.4); }
            50% { box-shadow: 0 0 16px rgba(0, 122, 255, 0.6); }
        }
        
        /* Reading rhythm indicators */
        .rhythm-marker {
            display: none;
            position: absolute;
            left: -20px;
            top: 50%;
            transform: translateY(-50%);
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            animation: rhythmPulse 1s ease-in-out infinite;
        }
        
        .rhythm-marker.fast {
            display: none;
            animation-duration: 0.8s;
            background: rgba(255, 165, 0, 0.6);
        }
        
        .rhythm-marker.slow {
            display: none;
            animation-duration: 1.5s;
            background: rgba(0, 255, 127, 0.6);
        }
        
        @keyframes rhythmPulse {
            0%, 100% { opacity: 0.2; transform: translateY(-50%) scale(1); }
            50% { opacity: 0.8; transform: translateY(-50%) scale(1.3); }
        }
        
        /* Completion signaling */
        .completion-indicator {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(52, 211, 153, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            z-index: 2000;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(52, 211, 153, 0.5);
            animation: completionPop 0.5s ease-out;
        }
        
        @keyframes completionPop {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        
        /* Visual breathing guides */
        .paragraph-breathing {
            position: relative;
        }
        
        .paragraph-breathing::after {
            content: '';
            position: absolute;
            right: -8px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, 
                transparent 0%, 
                rgba(255, 255, 255, 0.1) 20%, 
                rgba(255, 255, 255, 0.2) 50%, 
                rgba(255, 255, 255, 0.1) 80%, 
                transparent 100%);
            border-radius: 2px;
        }

        .speaker-button {
            background: transparent;
            border: 2px solid #666;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: default;
            transition: all 0.2s ease;
        }

        .speaker-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .speaker-button.enabled {
            border-color: #007aff;
            background: rgba(0, 122, 255, 0.1);
        }

        .speaker-button.disabled {
            border-color: #666;
        }

        .speaker-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .speaker-button.enabled .speaker-icon {
            color: #007aff;
        }

        .speaker-button.disabled .speaker-icon {
            color: #666;
        }

        /* Compact mode specific improvements */
        :host(.compact-mode) .response-container {
            padding: 8px;
            line-height: 1.7;
            letter-spacing: 0.02em;
        }

        :host(.compact-mode) .response-container p {
            line-height: 1.4;
            margin: 0.4em 0;
        }

        :host(.compact-mode) .response-container h1,
        :host(.compact-mode) .response-container h2,
        :host(.compact-mode) .response-container h3,
        :host(.compact-mode) .response-container h4,
        :host(.compact-mode) .response-container h5,
        :host(.compact-mode) .response-container h6 {
            line-height: 1.4;
            margin: 1.2em 0 0.6em 0;
        }

        :host(.compact-mode) .response-container code {
            font-size: 0.95em;
            padding: 0.1em 0.2em;
        }

        :host(.compact-mode) .response-container ul,
        :host(.compact-mode) .response-container ol {
            line-height: 1.8;
        }

        :host(.compact-mode) .response-container li {
            margin: 0.05em 0;
        }

        /* Enhanced readability for very small fonts */
        @media (max-width: 400px) {
            .response-container {
                letter-spacing: 0.03em;
                line-height: 1.3;
            }
            
            .response-container p {
                line-height: 1.3;
            }
        }

        /* Teleprompter Typography System */
        .teleprompter-container {
            margin-top: -15px;
            line-height: 1.5;
            letter-spacing: var(--reading-letter-spacing, 0.02em);
            font-feature-settings: "liga" 1, "kern" 1;
            text-rendering: optimizeLegibility;
        }
        
        .priority-primary {
            line-height: 1.3;
            letter-spacing: 0.02em;
            color: var(--primary-text-color, #ffffff);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
            padding-left: 0.3em;
            padding-top: 0.2em;
            border-radius: 6px;
            border-left: 1px solid var(--accent-color, #007aff);
            border-right: 1px solid var(--accent-color, #007aff);
            border-top: 1px solid var(--accent-color, #007aff);
        }
        
        .priority-secondary {
            font-size: 1em; /* Use base font size */
            line-height: 1.6;
            font-weight: 500;
            opacity: 0.9;
            color: var(--secondary-text-color, #e0e0e0);
            margin: 0.6em 0;
        }
        
        .priority-tertiary {
            line-height: 1.5;
            font-weight: 400;
            opacity: 0.75;
            color: var(--tertiary-text-color, #c0c0c0);
            margin: 0.4em 0;
        }
        
        .content-type-code {
            font-family: var(--code-font-family, 'SF Mono', 'Monaco', 'Cascadia Code', monospace);
            line-height: 1.7;
            letter-spacing: 0.03em;
            background: var(--code-background, rgba(0, 0, 0, 0.3));
            border-radius: 6px;
            border-left: 1px solid var(--accent-color, #007aff);
            border-right: 1px solid var(--accent-color, #007aff);
            border-top: 1px solid var(--accent-color, #007aff);
        }
        
        .content-type-steps {
            counter-reset: step-counter;
        }
        
        .content-type-steps .step-item {
            counter-increment: step-counter;
            position: relative;
            padding-left: 2.5em;
            margin: 1em 0;
            border-left: 2px solid rgba(0, 122, 255, 0.3);
            padding-left: 1.5em;
        }
        
        .content-type-steps .step-item::before {
            content: counter(step-counter);
            position: absolute;
            left: -1.8em;
            top: 0;
            background: var(--accent-color, #007aff);
            color: white;
            width: 1.5em;
            height: 1.5em;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            font-weight: 600;
        }
        
        .key-term {
            font-size: 0.9em;
            font-weight: 600;
            background: var(--key-term-background, rgba(255, 215, 0, 0.1));
            border-radius: 3px;
        }
        
        /* Reading flow indicators */
        .segment-boundary {
            border-bottom: 1px solid var(--segment-border, rgba(255, 255, 255, 0.1));
            margin-bottom: 1em;
            padding-right:10%;
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
        
        /* Progress indication */
        .reading-progress {
            position: fixed;
            bottom: 0px;
            left: 4px;
            right: 4px;
            height: 2px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1px;
            overflow: hidden;
        }
        
        .reading-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #007aff, #00bcd4);
            width: 0%;
            transition: width 0.3s ease;
        }
        
        /* Layout mode specific enhancements */
        :host(.ultra-discrete-mode) .response-container {
            font-size: var(--teleprompter-font-size, var(--response-font-size, 14px));
            line-height: var(--teleprompter-line-height, 1.3);
            padding: 6px;
        }
        
        :host(.balanced-mode) .response-container {
            font-size: var(--teleprompter-font-size, var(--response-font-size, 16px));
            line-height: var(--teleprompter-line-height, 1.3);
            padding: 8px;
        }
        
        :host(.presentation-mode) .response-container {
            font-size: var(--teleprompter-font-size, var(--response-font-size, 18px));
            line-height: var(--teleprompter-line-height, 1.3);
            padding: 12px;
        }
            
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        microphoneEnabled: { type: Boolean },
        microphoneState: { type: String }, // 'off', 'recording', 'speaking'
        speakerDetectionEnabled: { type: Boolean },
        autoScrollEnabled: { type: Boolean },
        scrollSpeed: { type: Number },
        _autoScrollPaused: { type: Boolean },
        lastResponseTime: { type: Number },
        teleprompterMode: { type: String }, // 'balanced', 'ultra-discrete', 'presentation'
        readingProgress: { type: Number },
        contentAnalysis: { type: Object },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this._lastAnimatedWordCount = 0;
        this.microphoneEnabled = false;
        this.microphoneState = 'off'; // 'off', 'recording', 'speaking'
        this.speakerDetectionEnabled = true; // Default to enabled
        this.lastResponseTime = null;
        
        // Initialize shouldAnimateResponse to false by default (will be overridden by loadLayoutSpecificSettings)
        this.shouldAnimateResponse = false;
        console.log(` Constructor - shouldAnimateResponse initialized to: ${this.shouldAnimateResponse}`);
        
        // Debug: Check current localStorage values
        console.log(` Constructor - Current localStorage values:`);
        console.log(`  normalAnimateResponse: ${localStorage.getItem('normalAnimateResponse')}`);
        console.log(`  compactAnimateResponse: ${localStorage.getItem('compactAnimateResponse')}`);
        console.log(`  systemDesignAnimateResponse: ${localStorage.getItem('systemDesignAnimateResponse')}`);
        console.log(`  layoutMode: ${localStorage.getItem('layoutMode')}`);
        
        
        // Teleprompter enhancements
        this.teleprompterMode = localStorage.getItem('teleprompterMode') || 'balanced';
        this.readingProgress = 0;
        this.contentAnalysis = null;
        
        // Track response state for animation optimization
        this._lastResponseContent = '';
        this._isStreamingResponse = false;
        
        // Initialize teleprompter formatter
        teleprompterFormatter.setLayoutMode(this.teleprompterMode);
        teleprompterFormatter.onProgress((data) => {
            this.readingProgress = data.progress;
            this.requestUpdate();
        });
        
        // Initialize with layout-specific defaults
        this.loadLayoutSpecificSettings();
        
        // Initialize default values if not loaded from layout-specific settings
        if (this.scrollSpeed === undefined || isNaN(this.scrollSpeed)) {
            this.scrollSpeed = 2;
        }
        if (this.autoScrollEnabled === undefined) {
            this.autoScrollEnabled = false;
        }
        
        this._autoScrollPaused = false;
        this._autoScrollAnimationId = null;
        this._userInteractionTimeout = null;
        
        // Bind event handlers
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleMousedown = this._handleMousedown.bind(this);
        
        // Bind auto scroll change handler for synchronization with CustomizeView
        this.handleAutoScrollChange = this.handleAutoScrollChange.bind(this);
        
        // Bind animate response change handler for synchronization with CustomizeView
        this.handleAnimateResponseChange = this.handleAnimateResponseChange.bind(this);
        
        // Initialize enhanced keyboard shortcuts
        this._initializeEnhancedShortcuts();
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
        };
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        
        // Clean up event listeners
        document.removeEventListener('auto-scroll-change', this.handleAutoScrollChange);
        document.removeEventListener('animate-response-change', this.handleAnimateResponseChange);
        
        // Clean up IPC listeners if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
                ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
                ipcRenderer.removeListener('layout-mode-changed', this.handleLayoutModeChange);
            } catch (error) {
                console.warn('Failed to remove IPC listeners:', error);
            }
        }
    }
    
    /**
     * Handle auto scroll changes from CustomizeView
     */
    handleAutoScrollChange(event) {
        const { layoutMode, enabled, source } = event.detail;
        
        // Handle changes from CustomizeView (including initialization and layout changes)
        if (source === 'customize-view' || source === 'customize-view-init' || source === 'customize-view-layout-change') {
            // Get current layout mode
            const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
            
            // Only update if the change is for the current layout mode
            if (layoutMode === currentLayoutMode) {
                this.autoScrollEnabled = enabled;
                
                // Trigger re-render to update the button state
                this.requestUpdate();
                
                console.log(` Auto scroll updated from CustomizeView: ${layoutMode} mode = ${enabled} (source: ${source})`);
            }
        }
    }

    /**
     * Handle animate response changes from CustomizeView
     */
    handleAnimateResponseChange(event) {
        const { layoutMode, enabled, source } = event.detail;
        
        console.log(` handleAnimateResponseChange called - layoutMode: ${layoutMode}, enabled: ${enabled}, source: ${source}`);
        
        // Handle changes from CustomizeView (including initialization and layout changes)
        if (source === 'customize-view' || source === 'customize-view-init' || source === 'customize-view-layout-change') {
            // Get current layout mode
            const currentLayoutMode = localStorage.getItem('layoutMode') || 'normal';
            
            console.log(` Current layout mode: ${currentLayoutMode}, event layout mode: ${layoutMode}`);
            
            // Only update if the change is for the current layout mode
            if (layoutMode === currentLayoutMode) {
                console.log(` Updating shouldAnimateResponse from ${this.shouldAnimateResponse} to ${enabled}`);
                this.shouldAnimateResponse = enabled;
                
                // Trigger re-render to update any relevant UI
                this.requestUpdate();
                
                console.log(` Animate response updated from CustomizeView: ${layoutMode} mode = ${enabled} (source: ${source})`);
            } else {
                console.log(` Ignoring animate response change for different layout mode`);
            }
        }
    }
    _initializeEnhancedShortcuts() {
        this._enhancedShortcuts = {
            'shift+alt+p': () => this.pauseResumeReading(),
            'shift+alt+r': () => this.restartCurrentSection(),
            'shift+alt+s': () => this.skipToNextKeyBlock(),
            'shift+alt+e': () => this.jumpToResponseEnd(),
            'shift+alt+c': () => this.cycleCodeBlocks(),
            'shift+alt+d': () => this.jumpBetweenDiagrams(),
            'shift+alt+h': () => this.highlightNextKeyConcept(),
            'shift+alt+q': () => this.showQuickSummary(),
            'shift+alt+l': () => this.adjustLineSpacing(),
            'shift+alt+k': () => this.toggleKeyInformationEmphasis(),
            'shift+alt+t': () => this.adjustReadingTempo(),
            'shift+alt+f': () => this.toggleFocusMode(),
            // Font size shortcuts
            'ctrl+shift+=': () => this.increaseFontSize(),
            'ctrl+shift+plus': () => this.increaseFontSize(),
            'ctrl+shift+-': () => this.decreaseFontSize(),
            'ctrl+shift+minus': () => this.decreaseFontSize()
        };
    }

    getCurrentResponse() {
        const profileNames = this.getProfileNames();
        if (this.responses.length > 0 && this.currentResponseIndex >= 0) {
            const response = this.responses[this.currentResponseIndex];
            return typeof response === 'string' ? response : (response?.content || '');
        }
        return `Hey, Im listening to your ${profileNames[this.selectedProfile] || 'session'}?`;
    }

    renderMarkdown(content) {
        // Check if marked is available
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Fix incomplete code blocks during streaming
                let processedContent = this.fixIncompleteCodeBlocks(content);
                
                // Analyze content for teleprompter optimization
                this.contentAnalysis = teleprompterFormatter.analyzeContentType(processedContent);
                
                // Configure marked for better security and formatting
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false, // We trust the AI responses
                });
                
                let rendered = window.marked.parse(processedContent);
                rendered = this.highlightJavaCode(rendered);
                
                // Apply teleprompter visual hierarchy
                rendered = teleprompterFormatter.applyVisualHierarchy(rendered, this.contentAnalysis);
                
                rendered = this.wrapWordsInSpans(rendered);
                
                // Segment content for progressive disclosure
                this._contentSegments = teleprompterFormatter.segmentContent(processedContent);
                
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content; // Fallback to plain text
            }
        }

        return content; // Fallback if marked is not available
    }

    highlightJavaCode(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const codeBlocks = doc.querySelectorAll('pre code');
        
        codeBlocks.forEach(codeBlock => {
            const code = codeBlock.textContent;
            if (this.isJavaCode(code)) {
                codeBlock.className = 'language-java';
                codeBlock.textContent = code;
                
                // Use Prism.js to highlight the code
                if (window.Prism) {
                    window.Prism.highlightElement(codeBlock);
                }
            }
        });
        
        return doc.body.innerHTML;
    }

    isJavaCode(code) {
        const javaKeywords = [
            'public', 'private', 'protected', 'static', 'final', 'abstract',
            'class', 'interface', 'extends', 'implements', 'package', 'import',
            'void', 'int', 'String', 'boolean', 'double', 'float', 'long',
            'System.out.println', 'new', 'this', 'super', 'return'
        ];
        
        const javaPatterns = [
            /\bpublic\s+class\s+\w+/,
            /\bpublic\s+static\s+void\s+main/,
            /\bSystem\.out\.println/,
            /\bprivate\s+\w+\s+\w+/,
            /\bpublic\s+\w+\s+\w+\s*\(/
        ];
        
        // Check for Java-specific patterns
        for (const pattern of javaPatterns) {
            if (pattern.test(code)) {
                return true;
            }
        }
        
        // Check for multiple Java keywords
        const keywordCount = javaKeywords.filter(keyword => 
            code.includes(keyword)
        ).length;
        
        return keywordCount >= 2;
    }

    fixIncompleteCodeBlocks(content) {
        // Handle streaming code blocks that might be incomplete or concatenated
        
        // First, fix concatenated code blocks (e.g., "text```java" -> "text\n```java")
        content = content.replace(/(\S)```(\w*)/g, '$1\n```$2');
        
        // Second, fix text concatenated after closing backticks (e.g., "```text" -> "```\ntext")
        content = content.replace(/```(\S)/g, '```\n$1');
        
        const lines = content.split('\n');
        const processedLines = [];
        let inCodeBlock = false;
        let codeBlockStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for code block start
            if (line.trim().startsWith('```')) {
                if (!inCodeBlock) {
                    // Starting a new code block
                    inCodeBlock = true;
                    codeBlockStart = i;
                    processedLines.push(line);
                } else {
                    // Ending a code block
                    inCodeBlock = false;
                    processedLines.push(line);
                    codeBlockStart = -1;
                }
            } else {
                processedLines.push(line);
            }
        }
        
        // If we're still in a code block at the end (incomplete), close it temporarily
        if (inCodeBlock && codeBlockStart !== -1) {
            // Add a temporary closing marker for proper rendering
            processedLines.push('```');
        }
        
        return processedLines.join('\n');
    }

    wrapWordsInSpans(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE', 'CODE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    getResponseCounter() {
        return this.responses.length > 0 ? `${this.currentResponseIndex + 1}/${this.responses.length}` : '';
    }

    navigateToPreviousResponse() {
        if (this.currentResponseIndex > 0) {
            // Temporarily disable auto-scroll during navigation
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            if (wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            this.currentResponseIndex--;
            
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
            
            // Reset scroll position to top and re-enable auto-scroll after DOM update
            requestAnimationFrame(() => {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    container.scrollTop = 0;
                }
                
                // Re-enable auto-scroll after navigation is complete
                if (wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                    
                    // Dispatch event to parent to keep it in sync
                    this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                        detail: { enabled: true },
                        bubbles: true,
                        composed: true
                    }));
                }
            });
        }
    }

    navigateToNextResponse() {
        if (this.currentResponseIndex < this.responses.length - 1) {
            // Temporarily disable auto-scroll during navigation
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            if (wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            this.currentResponseIndex++;
            
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
            
            // Reset scroll position to top and re-enable auto-scroll after DOM update
            requestAnimationFrame(() => {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    container.scrollTop = 0;
                }
                
                // Re-enable auto-scroll after navigation is complete
                if (wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                    
                    // Dispatch event to parent to keep it in sync
                    this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                        detail: { enabled: true },
                        bubbles: true,
                        composed: true
                    }));
                }
            });
        }
    }

    scrollResponseUp() {
        this._pauseAutoScrollOnUserInteraction();
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        this._pauseAutoScrollOnUserInteraction();
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            const maxScroll = container.scrollHeight - container.clientHeight;
            container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollAmount);
        }
    }







       replacePronounsInResponse() {
           const container = this.shadowRoot.querySelector('.response-container');
           if (!container) return;

           // Get all word spans created by wrapWordsInSpans
           const wordSpans = container.querySelectorAll('[data-word]');
           if (wordSpans.length === 0) return;

           // Replace pronouns in each word span
           wordSpans.forEach(span => {
               const originalText = span.textContent;
               let replacedText = originalText;

               // Replace "you" (case insensitive) with "we"
               replacedText = replacedText.replace(/\byou\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'YOU') return 'WE/US';
                   if (match === 'You') return 'We/Us';
                   return 'we/us';
               });

               // Replace "your" (case insensitive) with "our"
               replacedText = replacedText.replace(/\byour\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'YOUR') return 'OUR';
                   if (match === 'Your') return 'Our';
                   return 'our';
               });

               // Replace "Here's Here are" (case insensitive) with ""
               replacedText = replacedText.replace(/\here\b/gi, (match) => {
                   // Preserve the original case
                   if (match === 'Here\'s' || match === 'Here is' || match === 'Here are' || match === 'Here\'re') return '';
                   return '';
               });

               // Update the span content if it changed
               if (replacedText !== originalText) {
                   span.textContent = replacedText;
               }
           });

           console.log('Pronouns replaced in response');
       }

    loadFontFamily() {
        const savedFontFamily = localStorage.getItem('selectedFontFamily');
        if (savedFontFamily) {
            // Get the font options to find the full CSS font stack
            const fontOptions = this.getFontFamilyOptions();
            const fontOption = fontOptions.find(option => option.name === savedFontFamily);
            const fontStack = fontOption ? fontOption.value : savedFontFamily;
            
            // Apply the font family to the document
            document.documentElement.style.setProperty('--font-family', fontStack);
        } else {
            // Default to Inter if no font is saved
            const defaultFont = "'Inter', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
            document.documentElement.style.setProperty('--font-family', defaultFont);
            localStorage.setItem('selectedFontFamily', 'Inter');
        }
    }

    getFontFamilyOptions() {
        return [
            { name: 'Inter', value: "'Inter', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" },
            { name: 'SF Pro Display', value: "'SF Pro Display', 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" },
            { name: 'Segoe UI', value: "'Segoe UI', 'Inter', 'SF Pro Display', 'Roboto', 'Helvetica Neue', sans-serif" },
            { name: 'Roboto', value: "'Roboto', 'Inter', 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', sans-serif" },
            { name: 'Helvetica Neue', value: "'Helvetica Neue', 'Inter', 'SF Pro Display', 'Segoe UI', 'Roboto', sans-serif" },
            { name: 'Arial', value: "'Arial', 'Helvetica', sans-serif" },
            { name: 'Times New Roman', value: "'Times New Roman', 'Times', serif" },
            { name: 'Georgia', value: "'Georgia', 'Times New Roman', serif" },
            { name: 'Courier New', value: "'Courier New', 'Courier', monospace" },
            { name: 'Verdana', value: "'Verdana', 'Geneva', sans-serif" },
            { name: 'Trebuchet MS', value: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
            { name: 'Tahoma', value: "'Tahoma', 'Geneva', sans-serif" },
            { name: 'Palatino', value: "'Palatino', 'Palatino Linotype', serif" },
            { name: 'Garamond', value: "'Garamond', 'Times New Roman', serif" },
            { name: 'Bookman', value: "'Bookman', 'Times New Roman', serif" },
            { name: 'Comic Sans MS', value: "'Comic Sans MS', 'Comic Sans', cursive" },
            { name: 'Impact', value: "'Impact', 'Arial Black', sans-serif" },
            { name: 'Lucida Console', value: "'Lucida Console', 'Monaco', monospace" },
            { name: 'Open Sans', value: "'Open Sans', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Lato', value: "'Lato', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Montserrat', value: "'Montserrat', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Poppins', value: "'Poppins', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Nunito', value: "'Nunito', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Source Sans Pro', value: "'Source Sans Pro', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Raleway', value: "'Raleway', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Ubuntu', value: "'Ubuntu', 'Helvetica Neue', 'Arial', sans-serif" },
            { name: 'Playfair Display', value: "'Playfair Display', 'Georgia', 'Times New Roman', serif" },
            { name: 'Merriweather', value: "'Merriweather', 'Georgia', 'Times New Roman', serif" },
            { name: 'Crimson Text', value: "'Crimson Text', 'Georgia', 'Times New Roman', serif" },
            { name: 'Libre Baskerville', value: "'Libre Baskerville', 'Georgia', 'Times New Roman', serif" },
            { name: 'PT Serif', value: "'PT Serif', 'Georgia', 'Times New Roman', serif" },
            { name: 'Lora', value: "'Lora', 'Georgia', 'Times New Roman', serif" },
            { name: 'Fira Code', value: "'Fira Code', 'Consolas', 'Monaco', monospace" },
            { name: 'Source Code Pro', value: "'Source Code Pro', 'Consolas', 'Monaco', monospace" },
            { name: 'JetBrains Mono', value: "'JetBrains Mono', 'Consolas', 'Monaco', monospace" },
            { name: 'Inconsolata', value: "'Inconsolata', 'Consolas', 'Monaco', monospace" }
        ];
    }

    loadLayoutSpecificSettings() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        console.log(` loadLayoutSpecificSettings called for mode: ${layoutMode}`);
        
        if (layoutMode === 'normal') {
            // Load normal layout settings with fallback to defaults
            const normalAutoScroll = localStorage.getItem('normalAutoScroll');
            this.autoScrollEnabled = normalAutoScroll !== null ? normalAutoScroll === 'true' : false; // Default: false
            this.scrollSpeed = parseInt(localStorage.getItem('normalScrollSpeed'), 10) || 2;
            
            const normalAnimateResponse = localStorage.getItem('normalAnimateResponse');
            this.shouldAnimateResponse = normalAnimateResponse !== null ? normalAnimateResponse === 'true' : false; // Default: false
            
            console.log(` Normal mode - normalAnimateResponse localStorage: '${normalAnimateResponse}', shouldAnimateResponse set to: ${this.shouldAnimateResponse}`);
        } else if (layoutMode === 'compact') {
            // Load compact layout settings with fallback to defaults
            const compactAutoScroll = localStorage.getItem('compactAutoScroll');
            this.autoScrollEnabled = compactAutoScroll !== null ? compactAutoScroll === 'true' : true; // Default: true
            this.scrollSpeed = parseInt(localStorage.getItem('compactScrollSpeed'), 10) || 2;
            
            const compactAnimateResponse = localStorage.getItem('compactAnimateResponse');
            this.shouldAnimateResponse = compactAnimateResponse !== null ? compactAnimateResponse === 'true' : false; // Default: false
            
            console.log(` Compact mode - compactAnimateResponse localStorage: '${compactAnimateResponse}', shouldAnimateResponse set to: ${this.shouldAnimateResponse}`);
        } else if (layoutMode === 'system-design') {
            // Load system design layout settings with fallback to defaults
            const systemDesignAutoScroll = localStorage.getItem('systemDesignAutoScroll');
            this.autoScrollEnabled = systemDesignAutoScroll !== null ? systemDesignAutoScroll === 'true' : false; // Default: false
            this.scrollSpeed = parseInt(localStorage.getItem('systemDesignScrollSpeed'), 10) || 2;
            
            const systemDesignAnimateResponse = localStorage.getItem('systemDesignAnimateResponse');
            this.shouldAnimateResponse = systemDesignAnimateResponse !== null ? systemDesignAnimateResponse === 'true' : false; // Default: false
            
            console.log(` System design mode - systemDesignAnimateResponse localStorage: '${systemDesignAnimateResponse}', shouldAnimateResponse set to: ${this.shouldAnimateResponse}`);
        }
        
        // Load and apply font size for current layout
        const currentFontSize = this.getCurrentFontSize();
        this.updateFontSizeForCurrentLayout(currentFontSize);
        console.log(` Applied font size for ${layoutMode}: ${currentFontSize}px`);
        
        console.log(` Loaded settings for ${layoutMode} - autoScroll: ${this.autoScrollEnabled}, animateResponse: ${this.shouldAnimateResponse}`);
    }

    updateLayoutModeClass() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        // Remove all layout mode classes
        this.classList.remove('compact-mode', 'system-design-mode', 'focus-mode');
        
        // Add the current layout mode class
        if (layoutMode === 'compact') {
            this.classList.add('compact-mode');
        } else if (layoutMode === 'system-design') {
            this.classList.add('system-design-mode');
        } else if (layoutMode === 'focus-mode') {
            this.classList.add('focus-mode');
        }
    }

    connectedCallback() {
        super.connectedCallback();

        // Load and apply font family
        this.loadFontFamily();
        
        // Update layout mode class
        this.updateLayoutModeClass();

        // Set up IPC listeners for keyboard shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this.handlePreviousResponse = () => {
                //console.log('[IPC] navigate-previous-response triggered');
                this.navigateToPreviousResponse();
            };

            this.handleNextResponse = () => {
                //console.log('[IPC] navigate-next-response triggered');
                this.navigateToNextResponse();
            };

            this.handleScrollUp = () => {
                this.scrollResponseUp();
            };

            this.handleScrollDown = () => {
                this.scrollResponseDown();
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
            
            // Listen for layout mode changes to reload settings
            this.handleLayoutModeChange = () => {
                console.log(' Layout mode changed, reloading settings');
                this.loadLayoutSpecificSettings();
                this.updateLayoutModeClass();
                this.requestUpdate();
                console.log(` After layout change - auto scroll: ${this.autoScrollEnabled}`);
            };
            
            ipcRenderer.on('layout-mode-changed', this.handleLayoutModeChange);
        }
        
        // Listen for auto scroll changes from CustomizeView (outside IPC block)
        document.addEventListener('auto-scroll-change', this.handleAutoScrollChange);
        
        // Listen for animate response changes from CustomizeView
        document.addEventListener('animate-response-change', this.handleAnimateResponseChange);
        
        // Ensure auto scroll state is properly loaded and synchronized
        this.loadLayoutSpecificSettings();
        this.requestUpdate();
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up IPC listeners
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this.handlePreviousResponse) {
                ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            }
            if (this.handleNextResponse) {
                ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            }
            if (this.handleScrollUp) {
                ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            }
            if (this.handleScrollDown) {
                ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
            }

            if (this.handleLayoutModeChange) {
                ipcRenderer.removeListener('layout-mode-changed', this.handleLayoutModeChange);
            }
        }
        
        // Clean up event listeners
        document.removeEventListener('keydown', this._handleKeydown, true);
        document.removeEventListener('mousedown', this._handleMousedown, true);

        
        if (this.shadowRoot) {
            this.shadowRoot.removeEventListener('keydown', this._handleKeydown, true);
            this.shadowRoot.removeEventListener('mousedown', this._handleMousedown, true);
        }
        
        // Clear any pending timeouts
        if (this._userInteractionTimeout) {
            clearTimeout(this._userInteractionTimeout);
        }
        
        // Clear any pending animation frames
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
        }
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = ''; // Clear input
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        // Only handle plain Enter (not Ctrl+Enter or Cmd+Enter, which should bubble up to parent)
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    toggleMicrophone() {
        // Don't modify local state directly - let the parent component handle it
        // and the updated state will flow back down through props
        const newEnabled = !this.microphoneEnabled;
        
        // Notify parent component about microphone state change
        this.dispatchEvent(new CustomEvent('microphone-toggle', {
            detail: { enabled: newEnabled },
            bubbles: true,
            composed: true
        }));
    }

    updateMicrophoneState(state) {
        this.microphoneState = state;
        this.requestUpdate();
    }

    toggleSpeakerDetection() {
        this.speakerDetectionEnabled = !this.speakerDetectionEnabled;
        this.dispatchEvent(new CustomEvent('speaker-detection-toggle', {
            detail: { enabled: this.speakerDetectionEnabled },
            bubbles: true,
            composed: true
        }));
        this.requestUpdate();
    }





    increaseScrollSpeed() {
        if (this.scrollSpeed < 10) {
            this.scrollSpeed += 1;
            
            // Save to layout-specific setting
            const layoutMode = localStorage.getItem('layoutMode') || 'normal';
            if (layoutMode === 'normal') {
                localStorage.setItem('normalScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'compact') {
                localStorage.setItem('compactScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'system-design') {
                localStorage.setItem('systemDesignScrollSpeed', this.scrollSpeed.toString());
            }
            
            this.requestUpdate(); // Trigger re-render to update scroll speed display
            this.dispatchEvent(new CustomEvent('scroll-speed-change', {
                detail: { speed: this.scrollSpeed },
                bubbles: true,
                composed: true
            }));
        }
    }

    decreaseScrollSpeed() {
        if (this.scrollSpeed > 1) {
            this.scrollSpeed -= 1;
            
            // Save to layout-specific setting
            const layoutMode = localStorage.getItem('layoutMode') || 'normal';
            if (layoutMode === 'normal') {
                localStorage.setItem('normalScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'compact') {
                localStorage.setItem('compactScrollSpeed', this.scrollSpeed.toString());
            } else if (layoutMode === 'system-design') {
                localStorage.setItem('systemDesignScrollSpeed', this.scrollSpeed.toString());
            }
            
            this.requestUpdate(); // Trigger re-render to update scroll speed display
            this.dispatchEvent(new CustomEvent('scroll-speed-change', {
                detail: { speed: this.scrollSpeed },
                bubbles: true,
                composed: true
            }));
        }
    }

    toggleAutoScroll() {
        // Toggle the local state
        this.autoScrollEnabled = !this.autoScrollEnabled;
        
        // Save to layout-specific setting
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        if (layoutMode === 'normal') {
            localStorage.setItem('normalAutoScroll', this.autoScrollEnabled.toString());
        } else if (layoutMode === 'compact') {
            localStorage.setItem('compactAutoScroll', this.autoScrollEnabled.toString());
        } else if (layoutMode === 'system-design') {
            localStorage.setItem('systemDesignAutoScroll', this.autoScrollEnabled.toString());
        }
        
        // If disabling auto-scroll, stop any current animation
        if (!this.autoScrollEnabled) {
            // Cancel any existing animation
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
            }
            
            // Clear any existing timeout
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Reset pause state
            this._autoScrollPaused = false;
        } else {
            // If enabling auto-scroll, start scrolling immediately from current position
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                this.smoothScrollToBottom(container);
            }
        }
        
        // Trigger UI update
        this.requestUpdate();
        
        // Dispatch event to parent to keep it in sync
        this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
            detail: { enabled: this.autoScrollEnabled },
            bubbles: true,
            composed: true
        }));
        
        // Dispatch event to notify CustomizeView about the change
        document.dispatchEvent(new CustomEvent('auto-scroll-change', {
            detail: {
                layoutMode,
                enabled: this.autoScrollEnabled,
                source: 'assistant-view'
            }
        }));
    }

    /**
     * Get current font size for the active layout mode
     */
    getCurrentFontSize() {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        let fontSize;
        
        if (layoutMode === 'normal') {
            fontSize = localStorage.getItem('normalFontSize');
        } else if (layoutMode === 'compact') {
            fontSize = localStorage.getItem('compactFontSize');
        } else if (layoutMode === 'system-design') {
            fontSize = localStorage.getItem('systemDesignFontSize');
        }
        
        return parseInt(fontSize, 10) || 12;
    }

    /**
     * Increase font size for the current layout mode
     */
    increaseFontSize() {
        const currentSize = this.getCurrentFontSize();
        if (currentSize < 32) {
            const newSize = currentSize + 1;
            this.updateFontSizeForCurrentLayout(newSize);
            console.log(`Font size increased to ${newSize}px`);
        }
    }

    /**
     * Decrease font size for the current layout mode
     */
    decreaseFontSize() {
        const currentSize = this.getCurrentFontSize();
        if (currentSize > 10) {
            const newSize = currentSize - 1;
            this.updateFontSizeForCurrentLayout(newSize);
            console.log(`Font size decreased to ${newSize}px`);
        }
    }

    /**
     * Update font size for the current layout mode
     */
    updateFontSizeForCurrentLayout(fontSize) {
        const layoutMode = localStorage.getItem('layoutMode') || 'normal';
        
        // Save to layout-specific localStorage
        if (layoutMode === 'normal') {
            localStorage.setItem('normalFontSize', fontSize.toString());
        } else if (layoutMode === 'compact') {
            localStorage.setItem('compactFontSize', fontSize.toString());
        } else if (layoutMode === 'system-design') {
            localStorage.setItem('systemDesignFontSize', fontSize.toString());
        }
        
        // Apply the font size immediately to the centralized CSS variable
        document.documentElement.style.setProperty('--response-font-size', `${fontSize}px`);
        
        // Trigger re-render to update font size display
        this.requestUpdate();
        
        // Dispatch event to notify other components (like CustomizeView) about the change
        this.dispatchEvent(new CustomEvent('font-size-change', {
            detail: { 
                layoutMode,
                fontSize,
                source: 'assistant-view'
            },
            bubbles: true,
            composed: true
        }));
    }

    getCurrentMessage() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        return textInput ? textInput.value : '';
    }

    clearMessage() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput) {
            textInput.value = '';
        }
    }

    getResponseTimeDisplay() {
        if (this.responses.length === 0 || this.currentResponseIndex < 0) {
            return { text: '', className: '' };
        }
        
        const response = this.responses[this.currentResponseIndex];
        const responseTime = typeof response === 'object' ? response?.responseTime : null;
        
        if (!responseTime) {
            return { text: '', className: '' };
        }
        
        const timeMs = responseTime;
        let className = '';
        
        if (timeMs < 2000) {
            className = 'fast';
        } else if (timeMs < 5000) {
            className = 'medium';
        } else {
            className = 'slow';
        }
        
        const timeText = `${timeMs}`;
        
        return { text: timeText, className };
    }

    scrollToBottom() {
        if (!this.autoScrollEnabled || this._autoScrollPaused) {
            return;
        }
        
        // Immediate scroll for new responses, shorter delay for streaming updates
        const delay = this._isNewResponse ? 500 : 2000; // 0.5s for new, 2s for streaming
        
        setTimeout(() => {
            // Check again if auto-scroll is still enabled and not paused
            if (this.autoScrollEnabled && !this._autoScrollPaused) {
                const container = this.shadowRoot.querySelector('.response-container');
                if (container) {
                    this.smoothScrollToBottom(container);
                }
            }
        }, delay);
    }

    smoothScrollToBottom(container) {
        const start = container.scrollTop;
        const target = container.scrollHeight - container.clientHeight;
        const distance = target - start;
        
        // Only scroll if there's content to scroll to
        if (distance <= 0) {
            return;
        }
        
        // Cancel any existing auto-scroll animation
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
        }
        
        // Smart scrolling with content-aware speed adjustment
        const basePixelsPerFrame = (0.5 + (this.scrollSpeed - 1) * 1.5) * 0.2 * 0.7 * 0.5 * 0.3 * 0.8;
        
        let currentPosition = start;
        let pauseDetected = false;
        let pauseStartTime = null;
        const pauseDuration = 2000; // 2 seconds pause at natural breakpoints

        const animateScroll = () => {
            // Check if auto-scroll is disabled or paused
            if (!this.autoScrollEnabled || this._autoScrollPaused) {
                this._autoScrollAnimationId = null;
                return;
            }
            
            // Smart pause detection at content boundaries
            const currentElement = this._getElementAtScrollPosition(container, currentPosition);
            const shouldPause = this._shouldPauseAtElement(currentElement, currentPosition, container);
            
            if (shouldPause && !pauseDetected) {
                pauseDetected = true;
                pauseStartTime = Date.now();
                
                // Visual indicator for pause
                this._showPauseIndicator(currentElement);
            }
            
            // Handle pause duration
            if (pauseDetected) {
                const elapsedPause = Date.now() - pauseStartTime;
                if (elapsedPause < pauseDuration) {
                    // Still pausing, continue animation without moving
                    this._autoScrollAnimationId = requestAnimationFrame(animateScroll);
                    return;
                } else {
                    // Pause complete, continue scrolling
                    pauseDetected = false;
                    pauseStartTime = null;
                    this._hidePauseIndicator();
                }
            }
            
            // Adaptive scrolling speed based on content type
            let adaptiveSpeed = basePixelsPerFrame;
            if (currentElement) {
                adaptiveSpeed = this._getAdaptiveScrollSpeed(currentElement, basePixelsPerFrame);
            }
            
            // Move by calculated pixels per frame
            currentPosition += adaptiveSpeed;
            
            // Don't overshoot the target
            if (currentPosition >= target) {
                container.scrollTop = target;
                this._autoScrollAnimationId = null;
                this._hidePauseIndicator();
            } else {
                container.scrollTop = currentPosition;
                this._autoScrollAnimationId = requestAnimationFrame(animateScroll);
            }
        };

        this._autoScrollAnimationId = requestAnimationFrame(animateScroll);
    }
    
    /**
     * Get the DOM element at a specific scroll position
     */
    _getElementAtScrollPosition(container, scrollPosition) {
        const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, .priority-primary, .segment-boundary');
        let targetElement = null;
        
        for (const element of elements) {
            const elementTop = element.offsetTop;
            const elementBottom = elementTop + element.offsetHeight;
            
            if (scrollPosition >= elementTop - 50 && scrollPosition <= elementBottom + 50) {
                targetElement = element;
                break;
            }
        }
        
        return targetElement;
    }
    
    /**
     * Determine if scrolling should pause at a specific element
     */
    _shouldPauseAtElement(element, scrollPosition, container) {
        if (!element) return false;
        
        // Pause at segment boundaries
        if (element.classList.contains('segment-boundary')) {
            return true;
        }
        
        // Pause at headers
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
            return true;
        }
        
        // Pause at priority content
        if (element.classList.contains('priority-primary')) {
            return true;
        }
        
        // Pause at code blocks
        if (element.tagName === 'PRE' || element.querySelector('code')) {
            return true;
        }
        
        // Pause at long paragraphs (>200 characters)
        if (element.tagName === 'P' && element.textContent.length > 200) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get adaptive scroll speed based on content type
     */
    _getAdaptiveScrollSpeed(element, baseSpeed) {
        if (!element) return baseSpeed;
        
        // Slower speed for complex content
        if (element.classList.contains('content-type-code') || element.tagName === 'PRE') {
            return baseSpeed * 0.5; // 50% slower for code
        }
        
        // Slower speed for primary content
        if (element.classList.contains('priority-primary')) {
            return baseSpeed * 0.7; // 30% slower for important content
        }
        
        // Faster speed for tertiary content
        if (element.classList.contains('priority-tertiary')) {
            return baseSpeed * 1.3; // 30% faster for less important content
        }
        
        // Slower speed for headings
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
            return baseSpeed * 0.6; // 40% slower for headings
        }
        
        return baseSpeed;
    }
    
    /**
     * Show visual pause indicator
     */
    _showPauseIndicator(element) {
        if (element && !element.querySelector('.pause-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'pause-indicator';
            indicator.style.cssText = `
                position: absolute;
                right: -30px;
                top: 50%;
                transform: translateY(-50%);
                width: 20px;
                height: 20px;
                background: rgba(0, 122, 255, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: white;
                font-weight: bold;
                animation: pulse 1s infinite;
                z-index: 100;
            `;
            indicator.textContent = '⏸';
            
            // Position relative to element
            element.style.position = 'relative';
            element.appendChild(indicator);
        }
    }
    
    /**
     * Hide visual pause indicator
     */
    _hidePauseIndicator() {
        const indicators = document.querySelectorAll('.pause-indicator');
        indicators.forEach(indicator => {
            indicator.remove();
        });
    }

    // Teleprompter Control Methods
    
    /**
     * Pause or resume reading at natural breakpoints
     */
    pauseResumeReading() {
        this._autoScrollPaused = !this._autoScrollPaused;
        const container = this.shadowRoot.querySelector('.response-container');
        
        if (this._autoScrollPaused) {
            // Pause scrolling
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
            }
            console.log('Reading paused at natural breakpoint');
        } else {
            // Resume scrolling
            if (container && this.autoScrollEnabled) {
                this.smoothScrollToBottom(container);
            }
            console.log('Reading resumed');
        }
        this.requestUpdate();
    }
    
    /**
     * Restart reading from the current section
     */
    restartCurrentSection() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            // Find current segment based on scroll position
            const scrollTop = container.scrollTop;
            const segments = container.querySelectorAll('.segment-boundary');
            
            let targetSegment = null;
            for (const segment of segments) {
                if (segment.offsetTop <= scrollTop + 100) {
                    targetSegment = segment;
                } else {
                    break;
                }
            }
            
            if (targetSegment) {
                container.scrollTop = targetSegment.offsetTop;
            } else {
                container.scrollTop = 0;
            }
            
            console.log('Restarted current section');
        }
    }
    
    /**
     * Skip to next key information block
     */
    skipToNextKeyBlock() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const keyElements = container.querySelectorAll('.priority-primary, .key-term');
            const scrollTop = container.scrollTop;
            
            for (const element of keyElements) {
                if (element.offsetTop > scrollTop + 50) {
                    container.scrollTop = element.offsetTop - 20;
                    element.style.background = 'rgba(0, 122, 255, 0.2)';
                    setTimeout(() => {
                        element.style.background = '';
                    }, 1500);
                    break;
                }
            }
            
            console.log('Skipped to next key block');
        }
    }
    
    /**
     * Jump to response end/summary
     */
    jumpToResponseEnd() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
            console.log('Jumped to response end');
        }
    }
    
    /**
     * Cycle through code blocks
     */
    cycleCodeBlocks() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const codeBlocks = container.querySelectorAll('pre code, .content-type-code');
            if (codeBlocks.length === 0) return;
            
            if (!this._currentCodeBlockIndex) {
                this._currentCodeBlockIndex = 0;
            } else {
                this._currentCodeBlockIndex = (this._currentCodeBlockIndex + 1) % codeBlocks.length;
            }
            
            const targetBlock = codeBlocks[this._currentCodeBlockIndex];
            container.scrollTop = targetBlock.offsetTop - 20;
            
            // Highlight the code block
            targetBlock.style.boxShadow = '0 0 0 2px #007aff';
            setTimeout(() => {
                targetBlock.style.boxShadow = '';
            }, 2000);
            
            console.log(`Cycled to code block ${this._currentCodeBlockIndex + 1}/${codeBlocks.length}`);
        }
    }
    
    /**
     * Jump between diagrams and visual content
     */
    jumpBetweenDiagrams() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const diagrams = container.querySelectorAll('.mermaid-diagram, .content-type-diagram');
            if (diagrams.length === 0) return;
            
            if (!this._currentDiagramIndex) {
                this._currentDiagramIndex = 0;
            } else {
                this._currentDiagramIndex = (this._currentDiagramIndex + 1) % diagrams.length;
            }
            
            const targetDiagram = diagrams[this._currentDiagramIndex];
            container.scrollTop = targetDiagram.offsetTop - 20;
            
            console.log(`Jumped to diagram ${this._currentDiagramIndex + 1}/${diagrams.length}`);
        }
    }
    
    /**
     * Highlight next key concept
     */
    highlightNextKeyConcept() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const keyTerms = container.querySelectorAll('.key-term');
            if (keyTerms.length === 0) return;
            
            // Remove previous highlights
            keyTerms.forEach(term => term.classList.remove('highlighted'));
            
            if (!this._currentKeyTermIndex) {
                this._currentKeyTermIndex = 0;
            } else {
                this._currentKeyTermIndex = (this._currentKeyTermIndex + 1) % keyTerms.length;
            }
            
            const targetTerm = keyTerms[this._currentKeyTermIndex];
            targetTerm.classList.add('highlighted');
            container.scrollTop = targetTerm.offsetTop - 50;
            
            console.log(`Highlighted key concept: ${targetTerm.textContent}`);
        }
    }
    
    /**
     * Show quick summary of current response
     */
    showQuickSummary() {
        if (this.contentAnalysis && this.contentAnalysis.keyTerms.length > 0) {
            const summary = `Key concepts: ${this.contentAnalysis.keyTerms.slice(0, 5).join(', ')}`;
            
            // Create temporary summary overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 1000;
                border: 1px solid #007aff;
            `;
            overlay.textContent = summary;
            
            document.body.appendChild(overlay);
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 3000);
            
            console.log('Showed quick summary:', summary);
        }
    }
    
    /**
     * Adjust line spacing for easier reading
     */
    adjustLineSpacing() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const currentLineHeight = parseFloat(getComputedStyle(container).lineHeight) || 1.5;
            const newLineHeight = currentLineHeight >= 2.0 ? 1.5 : currentLineHeight + 0.1;
            
            container.style.lineHeight = newLineHeight;
            console.log(`Adjusted line spacing to ${newLineHeight}`);
        }
    }
    
    /**
     * Toggle key information emphasis
     */
    toggleKeyInformationEmphasis() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            container.classList.toggle('emphasis-mode');
            const isEmphasized = container.classList.contains('emphasis-mode');
            
            // Add dynamic CSS for emphasis mode
            if (isEmphasized) {
                const style = document.createElement('style');
                style.id = 'emphasis-mode-styles';
                style.textContent = `
                    .emphasis-mode .priority-primary {
                        background: rgba(0, 122, 255, 0.2) !important;
                        border-left-width: 5px !important;
                    }
                    .emphasis-mode .key-term {
                        background: rgba(255, 215, 0, 0.3) !important;
                        font-size: 1.1em !important;
                    }
                `;
                document.head.appendChild(style);
            } else {
                const existingStyle = document.getElementById('emphasis-mode-styles');
                if (existingStyle) {
                    document.head.removeChild(existingStyle);
                }
            }
            
            console.log(`Key information emphasis ${isEmphasized ? 'enabled' : 'disabled'}`);
        }
    }
    
    /**
     * Adjust reading tempo indicators
     */
    adjustReadingTempo() {
        const currentTempo = localStorage.getItem('readingTempo') || 'normal';
        const tempos = ['slow', 'normal', 'fast'];
        const currentIndex = tempos.indexOf(currentTempo);
        const newTempo = tempos[(currentIndex + 1) % tempos.length];
        
        localStorage.setItem('readingTempo', newTempo);
        
        // Apply tempo-specific styling
        const root = document.documentElement;
        root.className = root.className.replace(/tempo-\w+/g, '');
        root.classList.add(`tempo-${newTempo}`);
        
        console.log(`Reading tempo adjusted to: ${newTempo}`);
    }
    
    /**
     * Toggle focus mode with minimal distractions
     */
    toggleFocusMode() {
        document.documentElement.classList.toggle('teleprompter-focus-mode');
        const isFocusMode = document.documentElement.classList.contains('teleprompter-focus-mode');
        
        if (isFocusMode) {
            // Add focus mode styles
            const style = document.createElement('style');
            style.id = 'focus-mode-styles';
            style.textContent = `
                .teleprompter-focus-mode .text-input-container {
                    opacity: 0.3;
                    transition: opacity 0.3s ease;
                }
                .teleprompter-focus-mode .text-input-container:hover {
                    opacity: 1;
                }
                .teleprompter-focus-mode .response-container {
                    background: rgba(0, 0, 0, 0.95) !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            const existingStyle = document.getElementById('focus-mode-styles');
            if (existingStyle) {
                document.head.removeChild(existingStyle);
            }
        }
        
        console.log(`Focus mode ${isFocusMode ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Add breathing cues to content for natural pacing
     */
    _addBreathingCues(container) {
        const sentences = container.querySelectorAll('p, li');
        
        sentences.forEach(element => {
            const text = element.textContent;
            const sentences = text.split(/[.!?]+/);
            
            if (sentences.length > 2) {
                // Add breathing cues between sentences
                //element.classList.add('paragraph-breathing');
                
                // Add subtle breathing markers
                const breathingCue = document.createElement('span');
                breathingCue.className = 'breathing-cue';
                
                // Determine cue type based on content length
                if (text.length > 150) {
                    breathingCue.classList.add('long-pause');
                } else if (text.length > 75) {
                    breathingCue.classList.add('short-pause');
                }
                
                //element.appendChild(breathingCue);
            }
        });
    }
    
    /**
     * Add rhythm markers for reading pace guidance
     */
    _addRhythmMarkers(container) {
        const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        
        elements.forEach((element, index) => {
            const text = element.textContent;
            const wordCount = text.split(/\s+/).length;
            
            // Add rhythm marker based on content complexity
            const marker = document.createElement('div');
            marker.className = 'rhythm-marker';
            
            if (wordCount > 30) {
                marker.classList.add('slow'); // Slow reading for complex content
            } else if (wordCount < 10) {
                marker.classList.add('fast'); // Fast reading for simple content
            }
            
            element.style.position = 'relative';
            element.appendChild(marker);
        });
    }
    
    /**
     * Show completion indicator when response is fully read
     */
    _showCompletionIndicator() {
        // Remove existing indicator
        const existing = document.querySelector('.completion-indicator');
        if (existing) {
            existing.remove();
        }
        
        // Create completion indicator
        const indicator = document.createElement('div');
        indicator.className = 'completion-indicator';
        indicator.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Response Complete
        `;
        
        document.body.appendChild(indicator);
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }
    
    /**
     * Enhance visual feedback during reading
     */
    _enhanceReadingExperience() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            // Add breathing cues
            //this._addBreathingCues(container);
            
            // Add rhythm markers
            //this._addRhythmMarkers(container);
            
            // Monitor reading progress for completion signaling
            const progressMonitor = () => {
                if (this.readingProgress >= 95) {
                    this._showCompletionIndicator();
                    container.removeEventListener('scroll', progressMonitor);
                }
            };
            
            container.addEventListener('scroll', progressMonitor);
        }
    }

    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
        
        // Ensure event listeners are added after component is fully rendered
        setTimeout(() => {
            console.log('Adding event listeners...');
            // Add global event listeners for user interactions
            document.addEventListener('keydown', this._handleKeydown, true);
            document.addEventListener('mousedown', this._handleMousedown, true);
            
            // Also add to shadow root for better event capture
            if (this.shadowRoot) {
                this.shadowRoot.addEventListener('keydown', this._handleKeydown, true);
                this.shadowRoot.addEventListener('mousedown', this._handleMousedown, true);
            }
            
            // Test that handlers are bound correctly
            console.log('Event handlers bound:', {
                keydown: typeof this._handleKeydown,
                mousedown: typeof this._handleMousedown
            });
        }, 100);
    }
    

    
    _handleKeydown(event) {
        //console.log('Keyboard event detected:', event.key, 'autoScrollEnabled:', this.autoScrollEnabled);
        
        // Check for teleprompter shortcuts first
        const shortcut = this._getShortcutString(event);
        if (this._enhancedShortcuts && this._enhancedShortcuts[shortcut]) {
            event.preventDefault();
            this._enhancedShortcuts[shortcut]();
            return;
        }
        
        // Toggle off auto-scroll on any keyboard interaction (except for teleprompter shortcuts)
        if (this.autoScrollEnabled) {
            console.log('Disabling auto-scroll due to keyboard interaction');
            this.autoScrollEnabled = false;
            
            // Cancel any existing animation
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
            }
            
            // Clear any existing timeout
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Reset pause state
            this._autoScrollPaused = false;
            
            // Trigger UI update to reflect the change
            this.requestUpdate();
            
            // Dispatch event to parent to update the toggle state
            this.dispatchEvent(new CustomEvent('auto-scroll-toggle', {
                detail: { enabled: false },
                bubbles: true,
                composed: true
            }));
        }
    }
    
    /**
     * Convert keyboard event to shortcut string
     */
    _getShortcutString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        if (event.metaKey) parts.push('meta');
        parts.push(event.key.toLowerCase());
        return parts.join('+');
    }
    
    _handleMousedown(event) {
        // Don't pause auto-scroll for clicks on control buttons
        const target = event.target;
        const isControlButton = target.closest('.scroll-speed-button') || 
                               target.closest('.font-size-button') || 
                               target.closest('.auto-scroll-toggle') || 
                               target.closest('.nav-button') || 
                               target.closest('.microphone-button');
        
        if (!isControlButton) {
            // Pause auto-scroll on content area clicks
            this._pauseAutoScrollOnUserInteraction();
        }
    }
    
    _pauseAutoScrollOnUserInteraction() {
        // Pause auto-scroll immediately
        this._autoScrollPaused = true;
        
        // Cancel any existing animation
        if (this._autoScrollAnimationId) {
            cancelAnimationFrame(this._autoScrollAnimationId);
            this._autoScrollAnimationId = null;
        }
        
        // Clear any existing timeout
        if (this._userInteractionTimeout) {
            clearTimeout(this._userInteractionTimeout);
        }
        
        // Set a timeout to resume auto-scroll after 3 seconds of no interaction
        this._userInteractionTimeout = setTimeout(() => {
            this._autoScrollPaused = false;
            this._userInteractionTimeout = null;
        }, 3000);
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex')) {
            if (changedProperties.has('currentResponseIndex')) {
                // Only reset animation count when actually navigating between responses
                this._lastAnimatedWordCount = 0;
                // Mark this as a navigation update to ensure scroll reset
                this._isNavigationUpdate = true;
                // Reset response content tracking for new response
                this._lastResponseContent = '';
                this._isStreamingResponse = false;
            }
            this.updateResponseContent();
        }
        
        // Handle scroll speed changes
        if (changedProperties.has('scrollSpeed')) {
            // Cancel current animation if running and restart with new speed
            if (this._autoScrollAnimationId) {
                cancelAnimationFrame(this._autoScrollAnimationId);
                this._autoScrollAnimationId = null;
                
                // Restart scrolling with new speed if auto-scroll is active
                if (this.autoScrollEnabled && !this._autoScrollPaused) {
                    const container = this.shadowRoot.querySelector('.response-container');
                    if (container) {
                        this.smoothScrollToBottom(container);
                    }
                }
            }
        }
    }



    updateResponseContent() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            // Reset auto-scroll pause state for new responses
            this._autoScrollPaused = false;
            if (this._userInteractionTimeout) {
                clearTimeout(this._userInteractionTimeout);
                this._userInteractionTimeout = null;
            }
            
            // Temporarily disable auto-scroll for new responses to allow scroll reset
            const wasAutoScrollEnabled = this.autoScrollEnabled;
            const isNewResponse = !this._isNavigationUpdate;
            
            if (isNewResponse && wasAutoScrollEnabled) {
                this.autoScrollEnabled = false;
            }
            
            const currentResponse = this.getCurrentResponse();
            let renderedResponse = this.renderMarkdown(currentResponse);
            
            // Apply content segmentation for progressive disclosure
            if (this._contentSegments && this._contentSegments.length > 0) {
                renderedResponse = this._applyContentSegmentation(renderedResponse);
            }
            
            // Detect if this is a truly new response or a streaming update
            const isNewResponseStart = this._isNavigationUpdate || 
                                      this._lastResponseContent === '' || 
                                      currentResponse.length < this._lastResponseContent.length || 
                                      container.innerHTML.trim() === '';
            
            // Check if this is an incremental update (streaming)
            const isIncrementalUpdate = !isNewResponseStart && 
                                       currentResponse.length > this._lastResponseContent.length &&
                                       currentResponse.startsWith(this._lastResponseContent.substring(0, Math.min(this._lastResponseContent.length, 100)));
            
            if (isIncrementalUpdate) {
                // Incremental update: preserve existing content and animations
                this._updateContentIncrementally(container, renderedResponse);
                this._isStreamingResponse = true;
            } else {
                // Full update: complete re-render for new responses or navigation
                container.innerHTML = renderedResponse;
                
                // Apply teleprompter container class
                container.classList.add('teleprompter-container');
                
                // Apply or remove no-animation class based on shouldAnimateResponse
                if (this.shouldAnimateResponse) {
                    container.classList.remove('no-animation');
                } else {
                    container.classList.add('no-animation');
                }
                
                // Update reading progress
                this._updateReadingProgress();
                
                // Enhance reading experience with visual cues
                this._enhanceReadingExperience();
                
                // Replace pronouns in the response content
                this.replacePronounsInResponse();
                
                // Reset animation tracking for new response
                this._lastAnimatedWordCount = 0;
                this._isStreamingResponse = false;
            }
            
            // Update the tracked response content
            this._lastResponseContent = currentResponse;
            
            // Track if this is a new response for scroll behavior
            this._isNewResponse = isNewResponseStart;
            
            // Always reset scroll position to top only when navigating
            requestAnimationFrame(() => {
                if (this._isNavigationUpdate) {
                    // Moving to a different response – start at the top
                    container.scrollTop = 0;
                } else if (this.autoScrollEnabled) {
                    // Stay pinned to the bottom while the answer is growing
                    this.scrollToBottom();
                }
                
                // Re-enable auto-scroll for new responses after scroll reset
                if (isNewResponse && wasAutoScrollEnabled) {
                    this.autoScrollEnabled = true;
                }
            });
            
            // Clear the navigation flag
            this._isNavigationUpdate = false;
            
            // Handle word animations
            this._animateWords(container);
        }
    }
    
    /**
     * Update content incrementally to avoid re-rendering existing animated words
     */
    _updateContentIncrementally(container, newRenderedResponse) {
        // Create a temporary container to parse the new content
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = newRenderedResponse;
        
        // Get current and new word counts
        const currentWords = container.querySelectorAll('[data-word]');
        const newWords = tempContainer.querySelectorAll('[data-word]');
        
        // Only perform update if we have significantly more new words (avoid micro-updates)
        if (newWords.length > currentWords.length + 5) {
            // Use a more sophisticated approach: replace entire content but preserve animation states
            const animationStates = new Map();
            
            // Save current animation states for existing words
            currentWords.forEach((word, index) => {
                animationStates.set(index, {
                    isVisible: word.classList.contains('visible'),
                    textContent: word.textContent.trim()
                });
            });
            
            // Update the content
            container.innerHTML = newRenderedResponse;
            
            // Apply teleprompter container class
            container.classList.add('teleprompter-container');
            
            // Apply or remove no-animation class based on shouldAnimateResponse
            if (this.shouldAnimateResponse) {
                container.classList.remove('no-animation');
            } else {
                container.classList.add('no-animation');
            }
            
            // Restore animation states for existing words that match
            const updatedWords = container.querySelectorAll('[data-word]');
            animationStates.forEach((state, index) => {
                if (updatedWords[index] && 
                    updatedWords[index].textContent.trim() === state.textContent) {
                    if (state.isVisible) {
                        updatedWords[index].classList.add('visible');
                    } else {
                        updatedWords[index].classList.remove('visible');
                    }
                }
            });
            
            // Update enhancements only when content significantly changes
            this._updateReadingProgress();
            this._enhanceReadingExperience();
            this.replacePronounsInResponse();
        }
    }
    
    /**
     * Handle word-by-word animations separately to avoid re-triggering
     */
    _animateWords(container) {
        const words = container.querySelectorAll('[data-word]');
        
        //console.log(` _animateWords called - shouldAnimateResponse: ${this.shouldAnimateResponse}, words count: ${words.length}`);
        
        if (this.shouldAnimateResponse) {
            // Remove no-animation class to enable transitions
            container.classList.remove('no-animation');
            console.log(` Animation enabled - removed no-animation class`);
            
            // Ensure previously animated words remain visible
            for (let i = 0; i < this._lastAnimatedWordCount && i < words.length; i++) {
                if (!words[i].classList.contains('visible')) {
                    words[i].classList.add('visible');
                }
            }
            
            // Animate only new words
            for (let i = this._lastAnimatedWordCount; i < words.length; i++) {
                words[i].classList.remove('visible');
                setTimeout(() => {
                    if (words[i]) { // Check if element still exists
                        words[i].classList.add('visible');
                        if (i === words.length - 1) {
                            this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
                            // Auto-scroll only after all words are animated
                            if (this.autoScrollEnabled) {
                                this.scrollToBottom();
                            }
                        }
                    }
                }, (i - this._lastAnimatedWordCount) * 100);
            }
            this._lastAnimatedWordCount = words.length;
        } else {
            // No animation: add no-animation class to disable CSS transitions
            container.classList.add('no-animation');
            //console.log(` Animation disabled - added no-animation class`);
            
            // Make all words visible immediately without any transition effects
            words.forEach(word => {
                word.classList.add('visible');
            });
            this._lastAnimatedWordCount = words.length;
            
            // Auto-scroll after content update
            if (this.autoScrollEnabled) {
                this.scrollToBottom();
            }
        }
    }
    
    /**
     * Apply content segmentation with natural pause points
     */
    _applyContentSegmentation(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Find paragraphs and other block elements to segment
        const blocks = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
        
        blocks.forEach((block, index) => {
            // Add segment boundary class for natural pause points
            if (index > 0 && this._isNaturalBreakPoint(block)) {
                block.classList.add('segment-boundary');
            }
            
            // Add natural pause indicators
            this._addNaturalPauseIndicators(block);
        });
        
        return doc.body.innerHTML;
    }
    
    /**
     * Determine if an element represents a natural break point
     */
    _isNaturalBreakPoint(element) {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent.trim();
        
        // Headers are always natural break points
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return true;
        }
        
        // Long paragraphs (>100 chars) create break points
        if (tagName === 'p' && text.length > 100) {
            return true;
        }
        
        // Code blocks create break points
        if (element.querySelector('code, pre')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Add natural pause indicators within text content
     */
    _addNaturalPauseIndicators(element) {
        const naturalPauses = ['.', '!', '?', ':', ';'];
        let content = element.innerHTML;
        
        naturalPauses.forEach(punctuation => {
            const regex = new RegExp(`\\${punctuation}(?=\\s)`, 'g');
            content = content.replace(regex, `${punctuation}<span class="natural-pause"></span>`);
        });
        
        element.innerHTML = content;
    }
    
    /**
     * Update reading progress based on scroll position
     */
    _updateReadingProgress() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const updateProgress = () => {
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight - container.clientHeight;
                const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
                
                this.readingProgress = Math.min(progress, 100);
                
                // Calculate estimated reading time remaining
                const totalWords = this._getTotalWordCount(container);
                const readWords = this._getReadWordCount(container, scrollTop);
                const remainingWords = totalWords - readWords;
                const estimatedTimeRemaining = Math.ceil(remainingWords / 200 * 60); // 200 WPM in seconds
                
                // Update reading statistics
                this._updateReadingStats({
                    progress: this.readingProgress,
                    totalWords,
                    readWords,
                    remainingWords,
                    estimatedTimeRemaining
                });
                
                // Notify teleprompter formatter
                teleprompterFormatter.updateProgress({ 
                    progress: this.readingProgress,
                    readWords,
                    totalWords,
                    estimatedTimeRemaining
                });
                
                this.requestUpdate();
            };
            
            // Update progress on scroll
            container.addEventListener('scroll', updateProgress);
            
            // Initial progress update
            updateProgress();
        }
    }
    
    /**
     * Get total word count in the response
     */
    _getTotalWordCount(container) {
        const textContent = container.textContent || '';
        return textContent.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    /**
     * Get approximate word count that has been read based on scroll position
     */
    _getReadWordCount(container, scrollTop) {
        const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        let readWords = 0;
        
        for (const element of elements) {
            const elementTop = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const elementBottom = elementTop + elementHeight;
            
            if (elementBottom <= scrollTop + container.clientHeight) {
                // Element is fully visible or scrolled past
                const elementText = element.textContent || '';
                readWords += elementText.split(/\s+/).filter(word => word.length > 0).length;
            } else if (elementTop <= scrollTop + container.clientHeight) {
                // Element is partially visible
                const visibleRatio = (scrollTop + container.clientHeight - elementTop) / elementHeight;
                const elementText = element.textContent || '';
                const elementWords = elementText.split(/\s+/).filter(word => word.length > 0).length;
                readWords += Math.floor(elementWords * Math.max(0, Math.min(1, visibleRatio)));
            }
        }
        
        return readWords;
    }
    
    /**
     * Update reading statistics and display
     */
    _updateReadingStats(stats) {
        this._readingStats = stats;
        
        // Dispatch reading stats event to parent for header display
        this.dispatchEvent(new CustomEvent('reading-stats-update', {
            detail: { stats },
            bubbles: true,
            composed: true
        }));
        
        // Update progress bar style based on reading speed
        const progressBar = this.shadowRoot.querySelector('.reading-progress-bar');
        if (progressBar) {
            // Color-code progress based on reading efficiency
            let progressColor = '#007aff'; // Default blue
            
            if (stats.progress > 80) {
                progressColor = '#34d399'; // Green for near completion
            } else if (stats.progress > 50) {
                progressColor = '#fbbf24'; // Yellow for mid-progress
            }
            
            progressBar.style.background = `linear-gradient(90deg, ${progressColor}, ${progressColor}aa)`;
        }
    }
    
    render() {
        const currentResponse = this.getCurrentResponse();
        const responseCounter = this.getResponseCounter();

        return html`
            <div class="response-container teleprompter-container"></div>
            
            <!-- Reading Progress Indicator -->
            <div class="reading-progress">
                <div class="reading-progress-bar" style="width: ${this.readingProgress}%"></div>
            </div>


            <div class="text-input-container">
                
                <!-- Reading Flow Controls -->
                <div class="reading-flow-controls">
                    
                    <!-- comment control buttons
                    <button class="flow-control-button" @click=${this.restartCurrentSection} title="">
                        <svg viewBox="0 0 24 24" class="flow-control-icon">
                            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                        </svg>
                    </button>
                    
                    <button class="flow-control-button" @click=${this.skipToNextKeyBlock} title="">
                        <svg viewBox="0 0 24 24" class="flow-control-icon">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                    </button>
                    
                    <button class="flow-control-button" @click=${this.jumpToResponseEnd} title="">
                        <svg viewBox="0 0 24 24" class="flow-control-icon">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                    </button>
                    -->
                    <button class="nav-button flow-control-button" @click=${this.navigateToPreviousResponse} ?disabled=${this.currentResponseIndex <= 0}>
                        <?xml version="1.0" encoding="UTF-8"?><svg
                            width="24px"
                            height="24px"
                            stroke-width="1.7"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            color="#ffffff"
                        >
                            <path d="M15 6L9 12L15 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>

                    ${this.responses.length > 0 ? html` <span class="response-counter flow-control-button">${responseCounter}</span> ` : ''}

                    <div class="font-size-controls flow-control-button">
                        <button class="font-size-button" @click=${this.decreaseFontSize} title="">
                            -
                        </button>
                        <span class="font-size-label">${this.getCurrentFontSize()}px</span>
                        <button class="font-size-button" @click=${this.increaseFontSize} title="">
                            +
                        </button>
                    </div>

                    <div class="scroll-speed-controls flow-control-button">
                        <button class="scroll-speed-button" @click=${this.decreaseScrollSpeed}>-</button>
                        <span class="scroll-speed-display">${this.scrollSpeed}</span>
                        <button class="scroll-speed-button" @click=${this.increaseScrollSpeed}>+</button>
                    </div>

                    <button class="auto-scroll-toggle flow-control-button ${this.autoScrollEnabled ? 'enabled' : 'disabled'}" @click=${this.toggleAutoScroll}>
                        <svg class="auto-scroll-icon" viewBox="0 0 24 24">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                    </button>

                    <button class="microphone-button flow-control-button ${this.microphoneState}" @click=${this.toggleMicrophone}>
                        <svg class="microphone-icon" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                    </button>

                    <button class="speaker-button flow-control-button ${this.speakerDetectionEnabled ? 'enabled' : 'disabled'}" @click=${this.toggleSpeakerDetection}>
                        <svg class="speaker-icon" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                    </button>

                    <button class="nav-button flow-control-button" @click=${this.navigateToNextResponse} ?disabled=${this.currentResponseIndex >= this.responses.length - 1}>
                    <?xml version="1.0" encoding="UTF-8"?><svg
                        width="24px"
                        height="24px"
                        stroke-width="1.7"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        color="#ffffff"
                    >
                        <path d="M9 6L15 12L9 18" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
                </div>
            </div>
        `;
    }
}

customElements.define('jarvis-view', AssistantView);