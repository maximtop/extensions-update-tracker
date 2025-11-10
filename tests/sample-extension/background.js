// Initialize the extension
chrome.runtime.onInstalled.addListener((details) => {
    Logger.info('Sample Test Extension installed or updated', details);

    // Initialize storage with default version
    if (details.reason === 'install') {
        chrome.storage.local.set({ simulatedVersion: '1.0.0' });
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getVersion') {
        chrome.storage.local.get(['simulatedVersion'], (result) => {
            sendResponse({ version: result.simulatedVersion || '1.0.0' });
        });
        return true; // Needed for async response
    }
});
