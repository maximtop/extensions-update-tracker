document.addEventListener('DOMContentLoaded', () => {
    // Display current version from manifest
    chrome.runtime.getManifest().then((manifest) => {
        document.getElementById('version').textContent = manifest.version;
    }).catch((err) => {
        Logger.error('Error getting manifest:', err);
    });

    // Add click event to the update button
    const updateButton = document.getElementById('updateButton');
    updateButton.addEventListener('click', simulateUpdate);
});

// Function to simulate an update by incrementing the minor version
function simulateUpdate() {
    chrome.storage.local.get(['simulatedVersion'], (result) => {
        const currentVersion = result.simulatedVersion || '1.0.0';

        // Parse the version
        const versionParts = currentVersion.split('.');
        const major = parseInt(versionParts[0]);
        let minor = parseInt(versionParts[1]);
        const patch = parseInt(versionParts[2]);

        // Increment the minor version
        minor++;

        // Create new version string
        const newVersion = `${major}.${minor}.${patch}`;

        // Save to storage
        chrome.storage.local.set({ simulatedVersion: newVersion }, () => {
            // Update displayed version
            document.getElementById('version').textContent = newVersion;

            // Show message
            alert(`Extension updated to version ${newVersion}`);
        });
    });
}
