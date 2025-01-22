import { mergeTranslations, setCurrentTranslations, fallbackLang, i18n } from '../translation.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize translations
    
    // Load language configuration from activities.json
    fetch('../activities.json')
        .then(response => response.json())
        .then(data => {
            const lang = data.general?.language || fallbackLang;
            return fetch('../language.json')
                .then(response => response.json())
                .then(languages => {
                    const translations = mergeTranslations(languages[lang], languages[fallbackLang]);
                    setCurrentTranslations(translations);
                });
        })
        .catch(error => console.error('Error loading translations:', error));

    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    
    // Handle back button state and navigation
    if (window.location.pathname.includes('1.html')) {
        // On first page, disable back button
        backBtn.disabled = true;
    } else if (window.location.pathname.includes('2.html')) {
        // On second page, always go back to first page
        backBtn.onclick = () => window.location.href = '1.html';
    } else if (window.location.pathname.includes('3.html')) {
        // On third page, always go back to second page
        backBtn.onclick = () => window.location.href = '2.html';
    }
    
    // Change continue button text on last instruction page
    if (window.location.pathname.includes('3.html')) {
        continueBtn.textContent = 'Start';
    }
});
