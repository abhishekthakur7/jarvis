# Layout Settings Test Suite

This test suite validates all layout settings functionality, with specific focus on the transparency bug fix for system design layout.

## Quick Start

```bash
# Run all tests
node test/runLayoutTests.js

# Run only manual validation (no Jest dependencies required)
node test/runLayoutTests.js --manual-only

# Run with coverage report
node test/runLayoutTests.js --coverage
```

## Test Files

### 1. `layoutSettingsValidation.test.js`
**Unit tests for LayoutSettingsManager**
- ✅ Default values validation
- ✅ Settings persistence in localStorage  
- ✅ Settings loading and parsing
- ✅ CSS variable application
- ✅ Cross-layout settings validation
- ✅ Constraints and edge cases

### 2. `assistantAppLayoutIntegration.test.js`
**Integration tests for AssistantApp**
- ✅ Transparency settings persistence bug fix
- ✅ Font size settings validation
- ✅ Layout mode switching behavior
- ✅ View navigation scenarios
- ✅ Error handling and recovery

### 3. `manualValidation.js`
**Manual validation script (no dependencies)**
- ✅ Real-world scenario simulation
- ✅ Browser console compatible
- ✅ Step-by-step validation output
- ✅ Bug-specific test scenarios

### 4. `runLayoutTests.js`
**Comprehensive test runner**
- ✅ Orchestrates all test types
- ✅ Prerequisite checking
- ✅ Detailed reporting
- ✅ Command line options

## The Bug That Was Fixed

### Issue Description
- Transparency setting worked fine in CustomizeView
- Setting reverted to default when leaving CustomizeView  
- Only affected system design layout (normal and compact worked fine)

### Root Cause
```javascript
// BEFORE (AssistantApp.js - BUGGY)
const transparency = systemDesignTransparency !== null 
    ? parseFloat(systemDesignTransparency) 
    : 0.40; // ❌ Hardcoded default

// LayoutSettingsManager.js had different default
'system-design': {
    transparency: 0.85, // ❌ Inconsistent!
}
```

### Fix Applied
```javascript
// AFTER (AssistantApp.js - FIXED)  
const transparency = systemDesignTransparency !== null 
    ? parseFloat(systemDesignTransparency) 
    : LayoutSettingsManager.DEFAULT_SETTINGS['system-design'].transparency; // ✅ Consistent
```

## Test Scenarios Covered

### Default Values Test
Validates that all layouts use correct default transparency values:
- Normal: 0.65
- Compact: 0.85  
- System Design: 0.85 (was incorrectly falling back to 0.40)

### Custom Settings Persistence Test
Ensures user-customized transparency values persist across:
- View changes (CustomizeView → MainView)
- Layout mode switches
- App restarts (localStorage persistence)

### System Design Bug Fix Test  
Specifically validates the reported bug:
1. User sets custom transparency in CustomizeView
2. User navigates away from CustomizeView
3. Transparency should remain at custom value, not revert to default

### Edge Cases
- Invalid localStorage values
- Missing LayoutSettingsManager defaults
- Rapid layout switching
- Memory and performance validation

## Running Individual Tests

### Manual Validation Only
```bash
node test/manualValidation.js
```

### Specific Jest Tests
```bash
# If Jest is installed
npx jest test/layoutSettingsValidation.test.js
npx jest test/assistantAppLayoutIntegration.test.js
```

### Browser Console Testing
1. Open the app in development mode
2. Open browser console
3. Copy and paste `manualValidation.js` content
4. Run `validateTransparencySettings()`

## Adding Jest Dependencies (Optional)

If you want to run the full Jest test suite:

```bash
npm install --save-dev jest jest-environment-jsdom @babel/core @babel/preset-env babel-jest
```

Then add to package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:layout": "jest test/layoutSettings*.test.js"
  }
}
```

## Test Coverage

The tests cover these critical properties for all 3 layouts:

| Property | Normal | Compact | System Design |
|----------|--------|---------|---------------|
| **Transparency** | ✅ 0.65 | ✅ 0.85 | ✅ 0.85 (fixed) |
| **Font Size** | ✅ 13px | ✅ 12px | ✅ 14px |
| **Auto Scroll** | ✅ false | ✅ false | ✅ false |
| **Animate Response** | ✅ false | ✅ false | ✅ false |
| **Scroll Speed** | ✅ 2 | ✅ 2 | ✅ 2 |
| **Width** | ✅ 450px | ✅ 320px | ✅ 900px |
| **Height** | ✅ 500px | ✅ 270px | ✅ 500px |

## Troubleshooting

### "Cannot find module" errors
Run manual validation only: `node test/runLayoutTests.js --manual-only`

### Tests show old bug behavior  
Ensure the fix in AssistantApp.js has been applied correctly.

### CSS variables not updating
Check that LayoutSettingsManager.updateTransparency() is being called.

### localStorage issues
Clear browser storage and let the app reinitialize defaults.

## Contributing

When adding new layout settings:

1. Add default value to `LayoutSettingsManager.DEFAULT_SETTINGS`
2. Update `AssistantApp.applyLayoutSpecificSettings()` to use the default
3. Add test cases to validate the new setting
4. Update this README with the new property

## Success Criteria

All tests should show:
- ✅ Default values match between components
- ✅ Custom values persist across view changes  
- ✅ System design transparency uses 0.85 default
- ✅ No hardcoded fallback values in AssistantApp.js
- ✅ CSS variables update correctly
- ✅ localStorage operations work as expected

If you see ❌ failures, the transparency bug fix may not be working correctly.