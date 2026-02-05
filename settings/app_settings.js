// Application settings for TUD frontend.


// settings/app_settings.js
const TUD_SETTINGS = {
    API_BASE_URL: 'http://localhost:8000/api',
    ALLOW_NO_UID: true,
    STUDY_NAME: 'default',
    DEFAULT_STUDIES_FILE: 'settings/studies_config.json'
};

// CRITICAL: Make it available globally
window.TUD_SETTINGS = TUD_SETTINGS;

console.log('app_settings.js loaded, TUD_SETTINGS:', TUD_SETTINGS);