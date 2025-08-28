/**
 * AI Provider Test Runner
 * 
 * Executes comprehensive tests for both Gemini and OpenRouter AI providers
 * and generates detailed test reports.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test configuration
const testConfig = {
    testFile: 'aiProviderIntegration.test.js',
    setupFile: 'setupTests.js',
    timeout: 30000,
    verbose: true
};

/**
 * Print colored console output
 */
function printColored(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test section header
 */
function printHeader(title) {
    const border = '='.repeat(60);
    printColored(`\n${border}`, 'cyan');
    printColored(`  ${title}`, 'bright');
    printColored(`${border}\n`, 'cyan');
}

/**
 * Print test results summary
 */
function printSummary(results) {
    printHeader('TEST RESULTS SUMMARY');
    
    if (results.success) {
        printColored(`✅ All tests passed!`, 'green');
        printColored(`   Total tests: ${results.totalTests}`, 'green');
        printColored(`   Passed: ${results.passedTests}`, 'green');
        printColored(`   Duration: ${results.duration}ms`, 'blue');
    } else {
        printColored(`❌ Some tests failed!`, 'red');
        printColored(`   Total tests: ${results.totalTests}`, 'yellow');
        printColored(`   Passed: ${results.passedTests}`, 'green');
        printColored(`   Failed: ${results.failedTests}`, 'red');
        printColored(`   Duration: ${results.duration}ms`, 'blue');
    }
    
    console.log();
}

/**
 * Run AI provider integration tests
 */
function runAiProviderTests() {
    printHeader('AI PROVIDER INTEGRATION TESTS');
    
    try {
        printColored('🚀 Starting AI provider tests...', 'blue');
        
        // Check if test files exist
        const testFilePath = path.join(__dirname, testConfig.testFile);
        const setupFilePath = path.join(__dirname, testConfig.setupFile);
        
        if (!fs.existsSync(testFilePath)) {
            throw new Error(`Test file not found: ${testFilePath}`);
        }
        
        if (!fs.existsSync(setupFilePath)) {
            printColored(`⚠️  Setup file not found: ${setupFilePath}`, 'yellow');
        }
        
        // Construct Jest command
        const jestCommand = [
            'npx jest',
            `"${testFilePath}"`,
            '--verbose',
            '--no-cache',
            '--detectOpenHandles',
            `--testTimeout=${testConfig.timeout}`,
            '--setupFilesAfterEnv="<rootDir>/test/setupTests.js"'
        ].join(' ');
        
        printColored(`📋 Running command: ${jestCommand}`, 'cyan');
        
        const startTime = Date.now();
        
        // Execute tests
        const output = execSync(jestCommand, {
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Parse test results from Jest output
        const results = parseJestOutput(output, duration);
        
        // Print detailed output if verbose
        if (testConfig.verbose) {
            printColored('\n📊 Detailed Test Output:', 'magenta');
            console.log(output);
        }
        
        printSummary(results);
        
        // Generate test report
        generateTestReport(results, output);
        
        return results.success;
        
    } catch (error) {
        printColored(`❌ Test execution failed: ${error.message}`, 'red');
        
        if (error.stdout) {
            printColored('\n📋 Test Output:', 'yellow');
            console.log(error.stdout.toString());
        }
        
        if (error.stderr) {
            printColored('\n🚨 Error Output:', 'red');
            console.log(error.stderr.toString());
        }
        
        return false;
    }
}

/**
 * Parse Jest output to extract test results
 */
function parseJestOutput(output, duration) {
    const results = {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        duration: duration
    };
    
    try {
        // Extract test counts from Jest output
        const testSummaryMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
        if (testSummaryMatch) {
            results.passedTests = parseInt(testSummaryMatch[1]);
            results.totalTests = parseInt(testSummaryMatch[2]);
            results.failedTests = results.totalTests - results.passedTests;
            results.success = results.failedTests === 0;
        }
        
        // Alternative parsing for different Jest output formats
        if (results.totalTests === 0) {
            const passedMatch = output.match(/(\d+)\s+passing/);
            const failedMatch = output.match(/(\d+)\s+failing/);
            
            if (passedMatch) {
                results.passedTests = parseInt(passedMatch[1]);
            }
            
            if (failedMatch) {
                results.failedTests = parseInt(failedMatch[1]);
            }
            
            results.totalTests = results.passedTests + results.failedTests;
            results.success = results.failedTests === 0;
        }
        
        // Check for test success indicators
        if (output.includes('All tests passed') || output.includes('✓')) {
            results.success = true;
        }
        
        if (output.includes('FAIL') || output.includes('✗')) {
            results.success = false;
        }
        
    } catch (parseError) {
        printColored(`⚠️  Warning: Could not parse test results: ${parseError.message}`, 'yellow');
    }
    
    return results;
}

/**
 * Generate detailed test report
 */
function generateTestReport(results, output) {
    const reportPath = path.join(__dirname, 'ai-provider-test-report.txt');
    
    const report = [
        'AI PROVIDER INTEGRATION TEST REPORT',
        '=' .repeat(50),
        `Generated: ${new Date().toISOString()}`,
        `Test File: ${testConfig.testFile}`,
        '',
        'RESULTS SUMMARY:',
        `-`.repeat(20),
        `Total Tests: ${results.totalTests}`,
        `Passed: ${results.passedTests}`,
        `Failed: ${results.failedTests}`,
        `Duration: ${results.duration}ms`,
        `Success: ${results.success ? 'YES' : 'NO'}`,
        '',
        'DETAILED OUTPUT:',
        `-`.repeat(20),
        output,
        '',
        'TEST COVERAGE AREAS:',
        `-`.repeat(20),
        '• AI Provider Selection and Persistence',
        '• API Key Management',
        '• Session Initialization',
        '• Message Handling',
        '• Status Updates and UI Integration',
        '• Error Handling and Recovery',
        '• Provider Switching',
        '• Integration with UI Components',
        '',
        'END OF REPORT'
    ].join('\n');
    
    try {
        fs.writeFileSync(reportPath, report, 'utf8');
        printColored(`📄 Test report generated: ${reportPath}`, 'green');
    } catch (error) {
        printColored(`⚠️  Could not generate test report: ${error.message}`, 'yellow');
    }
}

/**
 * Run specific test suites
 */
function runSpecificTests(testPattern) {
    printHeader(`RUNNING SPECIFIC TESTS: ${testPattern}`);
    
    try {
        const jestCommand = [
            'npx jest',
            `"${path.join(__dirname, testConfig.testFile)}"`,
            '--verbose',
            '--no-cache',
            `--testNamePattern="${testPattern}"`,
            `--testTimeout=${testConfig.timeout}`
        ].join(' ');
        
        printColored(`📋 Running: ${jestCommand}`, 'cyan');
        
        const output = execSync(jestCommand, {
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8',
            stdio: 'inherit'
        });
        
        return true;
        
    } catch (error) {
        printColored(`❌ Specific test execution failed: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Main execution
 */
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0] === '--pattern') {
        const pattern = args[1] || '';
        if (pattern) {
            runSpecificTests(pattern);
        } else {
            printColored('❌ Please provide a test pattern after --pattern', 'red');
            process.exit(1);
        }
    } else {
        const success = runAiProviderTests();
        process.exit(success ? 0 : 1);
    }
}

module.exports = {
    runAiProviderTests,
    runSpecificTests,
    printColored,
    printHeader
};