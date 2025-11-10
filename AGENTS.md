# AI Agent Development Guidelines

This document outlines best practices and rules for AI agents working on this codebase.

## Type Safety

### Avoid Type Assertions

**Rule: Minimize or eliminate type assertions (`as Type`) wherever possible.**

Type assertions bypass TypeScript's type checking and can hide bugs. They should be considered a code smell and avoided.

#### ❌ Bad - Using type assertions:
```typescript
const extensionId = extensionInfo.id as string;
const extensionName = extensionInfo.name as string;
```

#### ✅ Good - Fix the root cause:
```typescript
// Option 1: Extend type definitions to properly reflect reality
// In webextension-polyfill.d.ts:
namespace Management {
    interface ExtensionInfo {
        id: string;  // Mark as required instead of optional
        name: string;
        version: string;
    }
}

// Then use without assertions:
const extensionId = extensionInfo.id;
const extensionName = extensionInfo.name;
```

#### ✅ Good - Use type guards when assertions seem necessary:
```typescript
// Instead of:
const result = reader.result as string;

// Use a type guard:
if (typeof reader.result === 'string') {
    const result = reader.result;  // TypeScript knows it's a string
} else {
    throw new Error('Expected string result');
}
```

#### When Type Assertions Are Acceptable

In rare cases, type assertions may be justified:
- **Working with legacy libraries** with incorrect type definitions (but prefer extending types instead)
- **Type narrowing impossible cases** where you have runtime guarantees TypeScript can't infer
- **Generic type parameters** in complex generic scenarios

Even in these cases, document why the assertion is safe:
```typescript
// Safe: FileReader.readAsDataURL() always produces a string result
const dataUrl = reader.result as string;
```

### Preferred Solutions

1. **Fix the type definitions** - Extend or augment types to match runtime reality
2. **Use type guards** - Runtime checks that TypeScript understands
3. **Use optional chaining** - `?.` for potentially undefined values
4. **Use nullish coalescing** - `??` for default values
5. **Narrow types properly** - Let TypeScript's control flow analysis work

## Code Organization

### Import Modules Once at File Beginning

**Rule: Import all modules once at the beginning of the file, not dynamically throughout the code.**

Dynamic imports (`await import()`) should be avoided in favor of static imports at the top of the file. This makes dependencies clear and improves code readability.

#### ❌ Bad - Dynamic imports throughout file:
```typescript
describe('MyService', () => {
    it('should do something', async () => {
        const myModule = await import('../../../src/my-module');
        (myModule.myFunction as any).mockReturnValue(true);
        // ... test code
    });

    it('should do something else', async () => {
        const myModule = await import('../../../src/my-module');
        (myModule.myFunction as any).mockReturnValue(false);
        // ... test code
    });
});
```

#### ✅ Good - Import once at the top:
```typescript
// Import modules after mocks are set up
// eslint-disable-next-line import/first, import/order
import { myFunction } from '../../../src/my-module';

describe('MyService', () => {
    it('should do something', async () => {
        (myFunction as any).mockReturnValue(true);
        // ... test code
    });

    it('should do something else', async () => {
        (myFunction as any).mockReturnValue(false);
        // ... test code
    });
});
```

**Benefits:**
- Clear visibility of all dependencies
- Easier to track and manage imports
- Better code organization and maintainability
- Follows standard module import patterns

**Note:** In test files where mocks are set up before imports, use `eslint-disable-next-line` comments to suppress import order warnings when necessary.

### Avoid Index Files - Import from Exact Files

**Rule: Import directly from the specific file containing the export, not from index files.**

Index files (like `index.ts`) that re-export from multiple files should be avoided. They obscure the actual location of code and make refactoring harder.

#### ❌ Bad - Using index files for utilities/services:
```typescript
// src/common/messaging/index.ts
export { MessageType } from './message-types';
export { MessageSender } from './message-sender';
export { MessageDispatcherService } from './message-handler';

// In another file
import { MessageSender, MessageType } from '../common/messaging';
```

#### ✅ Good - Import from exact files:
```typescript
// No index.ts file needed

// In another file
import { MessageSender } from '../common/messaging/message-sender';
import { MessageType } from '../common/messaging/message-types';
```

**Benefits:**
- Clear visibility of where each export comes from
- Easier to navigate to source in IDE (click-through works better)
- Simpler to refactor - no need to update index files
- Reduces layers of indirection
- Makes dependencies explicit

**Acceptable exceptions:**
1. **Package entry points** - `src/index.ts` for a library's main entry
2. **Component folders** - Single-component folders like `components/App/index.ts` re-exporting `App.tsx` (common React pattern)
3. **Entry points** - `entrypoints/popup/index.ts`, `entrypoints/background/index.ts`

**Not acceptable:**
- Index files that aggregate multiple unrelated modules
- Service/utility index files that hide the actual file structure

### Extract Inline Types

**Rule: Define types at the top of the file or in separate type files, not inline.**

#### ❌ Bad - Inline complex types:
```typescript
private extensionStates: Map<
    string,
    { id: string; enabled: boolean; name: string; version: string; homepageUrl?: string }
> = new Map();
```

#### ✅ Good - Named types at the top:
```typescript
interface ExtensionState {
    id: string;
    enabled: boolean;
    name: string;
    version: string;
    homepageUrl?: string;
}

// Later in the class:
private extensionStates: Map<string, ExtensionState> = new Map();
```

**Benefits:**
- Improved readability
- Type reusability
- Better IDE support
- Easier to document

## Code Style

### Always Use Curly Braces for Control Statements

**Rule: Always use curly braces `{}` for all control statements (if, else, for, while, do), even for single-line statements.**

One-line control statements without braces are harder to read, more error-prone when adding additional statements, and can introduce bugs. The ESLint `curly` rule enforces this.

#### ❌ Bad - One-line statements without braces:
```typescript
if (!storageData) return;

if (isEnabled) doSomething();

for (const item of items) processItem(item);
```

#### ✅ Good - Always use curly braces:
```typescript
if (!storageData) {
    return;
}

if (isEnabled) {
    doSomething();
}

for (const item of items) {
    processItem(item);
}
```

**Why this matters:**
1. **Consistency** - Code is easier to scan when all blocks use braces
2. **Safety** - Adding statements later won't accidentally break the logic
3. **Clarity** - The scope of the control statement is immediately visible
4. **Prevents bugs** - Classic bug pattern where adding a second statement isn't properly scoped

#### Real-world example of the danger:
```typescript
// This looks fine at first glance...
if (!user)
    Logger.warn('No user found');
    return null;  // BUG: This ALWAYS executes, not just when !user

// Should be:
if (!user) {
    Logger.warn('No user found');
    return null;
}
```

## Logging

### Use Logger Utility

**Rule: Always use the Logger utility instead of direct console methods.**

#### ❌ Bad - Direct console usage:
```typescript
console.log('Extension updated');
Logger.error('Failed to save:', error);
console.warn('No data found');
```

#### ✅ Good - Use Logger:
```typescript
import { Logger } from '../common/utils/logger';

Logger.info('Extension updated');
Logger.error(`Failed to save: ${error}`);
Logger.warn('No data found');
```

**Benefits:**
- Centralized log level control
- Consistent log formatting
- Easier to disable/filter logs in production
- Better testability

## Magic Strings and Constants

### Extract Magic Strings

**Rule: Define constants for repeated string literals, especially those used in multiple places.**

#### ❌ Bad - Magic strings:
```typescript
if (extensionId === 'welcome') { /* ... */ }
const notificationId = `extension-update-${extensionId}`;
```

#### ✅ Good - Named constants:
```typescript
const WELCOME_EXTENSION_ID = 'welcome';
const NOTIFICATION_ID_PREFIX = 'extension-update-';

if (extensionId === WELCOME_EXTENSION_ID) { /* ... */ }
const notificationId = `${NOTIFICATION_ID_PREFIX}${extensionId}`;
```

## Error Handling

### Handle Errors Explicitly

**Rule: Don't silently swallow errors. Log them at minimum, handle them properly when possible.**

#### ❌ Bad - Silent failure:
```typescript
try {
    await someOperation();
} catch {
    // Nothing
}
```

#### ✅ Good - Explicit handling:
```typescript
try {
    await someOperation();
} catch (error) {
    Logger.error(`Failed to perform operation: ${error}`);
    // Additional recovery logic if appropriate
}
```

## Documentation

### Comment Complex Logic

**Rule: Add comments explaining *why*, not *what*. The code should explain *what*.**

#### ❌ Bad - Obvious comments:
```typescript
// Set enabled to true
extensionInfo.enabled = true;
```

#### ✅ Good - Explain reasoning:
```typescript
// Default to enabled if the field is not provided by the browser API
const isEnabled = extensionInfo.enabled ?? true;
```

## Internationalization (i18n)

### Browser Translation Key Requirements

**Rule: Translation keys MUST only use ASCII [a-z], [A-Z], [0-9], and underscore (_). Hyphens are NOT allowed.**

Chrome's manifest system enforces strict naming rules for translation keys. Keys containing hyphens (-) will cause the extension to fail to load with the error:

```
Name of a key "your-key-name" is invalid. Only ASCII [a-z], [A-Z], [0-9] and "_" are allowed.
Could not load manifest.
```

#### ❌ Bad - Using hyphens:
```json
{
    "options-page-title": {
        "message": "Extensions Update Tracker - Settings",
        "description": "Title for options page"
    },
    "popup-app-title": {
        "message": "Popup Title"
    }
}
```

```typescript
<h1>{t('options-page-title')}</h1>
<div>{t('popup-app-title')}</div>
```

#### ✅ Good - Using underscores:
```json
{
    "options_page_title": {
        "message": "Extensions Update Tracker - Settings",
        "description": "Title for options page"
    },
    "popup_app_title": {
        "message": "Popup Title"
    }
}
```

```typescript
<h1>{t('options_page_title')}</h1>
<div>{t('popup_app_title')}</div>
```

**Important**: This is a hard requirement from browser, not a style preference. All translation keys throughout the codebase use underscores.

### Translation Key Naming Convention

**Rule: Use consistent, context-specific prefixes for all translation keys.**

Translation keys must follow a hierarchical naming pattern to maintain organization and prevent conflicts:

#### Naming Pattern

```
<context>_<component>_<element>_<variant>
```

**Context Prefixes:**
- `popup_app_*` - Keys used in the popup interface
- `options_*` - Keys used in the options page
- `notification_*` - Keys used in browser notifications
- `common_*` - Shared/utility keys used across multiple contexts
- No prefix - Legacy/deprecated keys (avoid creating new ones)

#### ❌ Bad - Inconsistent or missing prefixes:

```typescript
// In popup component
<h1>{t('extensionName')}</h1>  // Generic key, unclear context
<div>{t('unreadUpdates')}</div>  // Missing, doesn't exist
<button>{t('markAllRead')}</button>  // Inconsistent naming
```

```json
{
    "extensionName": { "message": "Extensions Update Tracker" },
    "title": { "message": "Updates" },
    "button": { "message": "View" }
}
```

#### ✅ Good - Consistent context-specific keys:

```typescript
// In popup component
<h1>{t('popup_app_title')}</h1>
<div>{t('popup_app_unread_updates')}</div>
<button>{t('popup_app_mark_all_read')}</button>

// In options page
<h1>{t('options_page_title')}</h1>
<div>{t('options_stats_unread_updates')}</div>
<button>{t('options_controls_mark_all_read')}</button>
```

```json
{
    "popup_app_title": {
        "message": "Extensions Update Tracker",
        "description": "Title for the popup app"
    },
    "popup_app_unread_updates": {
        "message": "Unread Updates",
        "description": "Label for unread updates count in popup"
    },
    "options_page_title": {
        "message": "Extensions Updates",
        "description": "Title for the options page"
    }
}
```

#### Key Structure Examples

**Popup keys:**
- `popup_app_title` - Main title
- `popup_app_unread_updates` - Label for unread count
- `popup_app_view_all_updates` - Button text
- `popup_app_last_checked` - Timestamp label

**Options keys:**
- `options_page_title` - Page title
- `options_stats_total_updates` - Stats bar label
- `options_update_item_version` - Update item element
- `options_extension_card_expand` - Extension card action

**Common keys:**
- `common_time_just_now` - Shared time utility
- `common_error_loading` - Shared error message

#### Benefits

1. **Namespace clarity** - Immediately know where a key is used
2. **Collision prevention** - Same concept in different contexts gets different keys
3. **Easier maintenance** - Can identify unused keys by context
4. **Better organization** - Keys naturally group in translation files
5. **Refactoring safety** - Context-specific changes don't affect other areas

#### Translation File Organization

In `messages.json`, group keys by context with blank lines between sections:

```json
{
    "popup_app_title": { ... },
    "popup_app_unread_updates": { ... },

    "options_page_title": { ... },
    "options_stats_total_updates": { ... },

    "common_time_just_now": { ... }
}
```

## General Principles

1. **Type safety first** - Leverage TypeScript's type system fully
2. **Be explicit** - Avoid implicit behavior and assumptions
3. **DRY (Don't Repeat Yourself)** - Extract common patterns
4. **Fail fast** - Validate inputs and fail early with clear errors
5. **Code for humans** - Write code that's easy to read and understand

## AI Agent Workflow

When working on this codebase:

1. **Read existing patterns** - Follow the established conventions
2. **Fix root causes** - Don't just suppress warnings or errors
3. **Remove technical debt** - Address FIXMEs and TODOs when you encounter them
4. **Update documentation** - Keep docs in sync with code changes
5. **Think holistically** - Consider the impact of changes across the codebase

