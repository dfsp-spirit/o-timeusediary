import { TimelineMarker } from './timeline_marker.js';
import { Timeline } from './timeline.js';
import { TimelineContainer } from './timeline_container.js';
import { 
    getCurrentTimelineData, 
    getCurrentTimelineKey, 
    createTimelineDataFrame,
    getTimelineCoverage,
    createModal,
    createFloatingAddButton,
    scrollToActiveTimeline,
    validateMinCoverage,
    formatTimeDDMMYYYYHHMM,
    formatTimeHHMM,
    timeToMinutes,
    findNearestMarkers,
    minutesToPercentage,
    positionToMinutes,
    calculateMinimumBlockWidth,
    hasOverlap,
    canPlaceActivity,
    isTimelineFull,
    isOverlapping,
    generateUniqueId,
    createTimeLabel,
    updateTimeLabel,
    sendData,
    initButtons,
    updateButtonStates,
    handleResize
} from './utils.js';

import { updateIsMobile, getIsMobile } from './globals.js';

const MINUTES_PER_DAY = 24 * 60;
const INCREMENT_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

const DEBUG_MODE = true; // Enable debug mode


let selectedActivity = null;

// Remove duplicate import since it's now included above
window.timelineManager = {
    metadata: {}, // Timeline metadata (former timelines object)
    activities: {}, // Timeline activities (former timelineData object)
    initialized: new Set(), // Tracks initialized timelines
    activeTimeline: document.getElementById('primary'), // Initialize with primary timeline
    keys: [], // Available timeline keys
    currentIndex: 0, // Current timeline index
    study: {} // Store URL parameters
};

// Only create and populate study parameters if URL parameters exist
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.toString()) {
    for (const [key, value] of urlParams) {
        window.timelineManager.study[key] = value;
    }
}

// Function to add next timeline
async function addNextTimeline() {
    if (DEBUG_MODE) {
        console.log(`Current timeline data saved:`, window.timelineManager.activities);
    }

    // Increment timeline index
    window.timelineManager.currentIndex++;
    if (window.timelineManager.currentIndex >= window.timelineManager.keys.length && DEBUG_MODE) {
        console.log('All timelines initialized');
        return;
    }

    const nextTimelineKey = window.timelineManager.keys[window.timelineManager.currentIndex];

    try {
        // Load next timeline data
        const categories = await fetchActivities(nextTimelineKey);
        
        const isMobile = getIsMobile();
        
        // Update UI for next timeline with animation
        const nextTimeline = window.timelineManager.metadata[nextTimelineKey];
        const timelineHeader = document.querySelector('.timeline-header');
        const timelineTitle = document.querySelector('.timeline-title');
        const timelineDescription = document.querySelector('.timeline-description');
        
        // First remove any existing animation
        timelineHeader.classList.remove('flip-animation');
        
        // Force a reflow before starting new animation
        void timelineHeader.offsetWidth;
        
        // Add animation class before content change
        timelineHeader.classList.add('flip-animation');
        
        // Update content immediately
        timelineTitle.textContent = nextTimeline.name;
        timelineDescription.textContent = nextTimeline.description;
        
        // Trigger reflow to ensure animation plays
        void timelineHeader.offsetWidth;
        
        // Add animation class
        timelineHeader.classList.add('flip-animation');
        
        // Remove animation class after it finishes
        timelineHeader.addEventListener('animationend', () => {
            timelineHeader.classList.remove('flip-animation');
        }, {once: true});

        // Desktop mode - create new timeline container
        const newTimelineContainer = document.createElement('div');
        newTimelineContainer.className = 'timeline-container';
        
        // Add title element
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = window.timelineManager.metadata[nextTimelineKey].name;
        newTimelineContainer.appendChild(titleDiv);
        
        const newTimeline = document.createElement('div');
        newTimeline.className = 'timeline';
        newTimelineContainer.appendChild(newTimeline);
        
        // Add new timeline to active wrapper
        const activeTimelineWrapper = document.querySelector('.last-initialized-timeline-wrapper');
        activeTimelineWrapper.appendChild(newTimelineContainer);
        
        // Only update previous timeline state if we have at least 2 initialized timelines
        if (window.timelineManager.initialized.size >= 2) {
            const previousTimeline = window.timelineManager.activeTimeline;
            if (previousTimeline) {
                previousTimeline.setAttribute('data-active', 'false');
                previousTimeline.parentElement.setAttribute('data-active', 'false');
                
                // Move the previous timeline to the inactive wrapper
                const inactiveTimelinesWrapper = document.querySelector('.past-initialized-timelines-wrapper');
                inactiveTimelinesWrapper.appendChild(previousTimeline.parentElement);
            }
        }
        
        // Initialize new timeline and container with proper IDs and mode
        newTimeline.id = nextTimelineKey;
        newTimeline.setAttribute('data-timeline-type', nextTimelineKey);
        newTimeline.setAttribute('data-active', 'true');
        newTimeline.setAttribute('data-mode', window.timelineManager.metadata[nextTimelineKey].mode);
        newTimelineContainer.setAttribute('data-active', 'true');
        
        // Create and initialize timeline container with markers
        const timelineContainer = new TimelineContainer(newTimeline);
        timelineContainer.initialize(isMobile).createMarkers(isMobile);
        newTimeline.containerInstance = timelineContainer;
        
        // Set active timeline reference
        window.timelineManager.activeTimeline = newTimeline;

        // Create activities container if it doesn't exist
        let activitiesContainer = window.timelineManager.activeTimeline.querySelector('.activities');
        if (!activitiesContainer) {
            activitiesContainer = document.createElement('div');
            activitiesContainer.className = 'activities';
            window.timelineManager.activeTimeline.appendChild(activitiesContainer);
        }


        // Initialize activities array if not exists
        window.timelineManager.activities[nextTimelineKey] = window.timelineManager.activities[nextTimelineKey] || [];

        // Scroll to active timeline in mobile view
        if (getIsMobile()) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Initialize markers for the new timeline
        initTimeline(window.timelineManager.activeTimeline);

        // Render activities for next timeline
        renderActivities(categories);
        
        // Initialize interaction for the timeline
        initTimelineInteraction(window.timelineManager.activeTimeline);

        // Reset button states
        updateButtonStates();

        // Scroll to the active timeline
        scrollToActiveTimeline();

        if (DEBUG_MODE) {
            console.log(`Switched to ${nextTimelineKey} timeline`);
            console.log('Timeline data structure:', window.timelineManager.activities);
        }

        // Update Back button state
        const backButton = document.getElementById('backBtn');
        if (backButton) {
            backButton.disabled = false;
        }

        // Update activities container data-mode
        const activitiesContainerElement = document.querySelector("#activitiesContainer");
        if (activitiesContainerElement) {
            activitiesContainerElement.setAttribute('data-mode', window.timelineManager.metadata[nextTimelineKey].mode);
        }

    } catch (error) {
        console.error(`Error switching to ${nextTimelineKey} timeline:`, error);
        throw new Error(`Failed to switch to ${nextTimelineKey} timeline: ${error.message}`);
    }
}

function updateDebugOverlay(mouseX, timelineRect) {
    if (!DEBUG_MODE) return;
    
    const overlay = document.getElementById('debugOverlay');
    if (!overlay) return;

    const relativeX = mouseX - timelineRect.left;
    const percentageX = (relativeX / timelineRect.width) * 100;
    const minutes = positionToMinutes(percentageX);

    overlay.style.display = 'block';
    overlay.innerHTML = `
        Position: ${percentageX.toFixed(2)}%<br>
        Minutes: ${minutes}<br>
        Time: ${formatTimeHHMM(minutes)}
    `;
}

function hideDebugOverlay() {
    if (!DEBUG_MODE) return;
    
    const overlay = document.getElementById('debugOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function logDebugInfo() {
    if (DEBUG_MODE) {
        console.log('timelineData:', timelineData);
    }
}


async function fetchActivities(key) {
    try {
        const response = await fetch('activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.timeline || !data.general) {
            throw new Error('Invalid JSON structure');
        }

        // Set app name in document title once
        document.title = data.general.app_name;
        
        // Validate min_coverage
        if (data.timeline[key]) {
            try {
                validateMinCoverage(data.timeline[key].min_coverage);
            } catch (error) {
                const errorMessage = `Timeline "${key}": ${error.message}`;
                document.getElementById('activitiesContainer').innerHTML = 
                    `<p style="color: red; padding: 10px; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px;">
                        ${errorMessage}
                    </p>`;
                throw new Error(errorMessage);
            }
        }

        // Initialize timeline management structure if not already initialized
        if (Object.keys(window.timelineManager.metadata).length === 0) {
            // Only use timeline keys, excluding 'general'
            window.timelineManager.keys = Object.keys(data.timeline);
            window.timelineManager.keys.forEach(timelineKey => {
                if (data.timeline[timelineKey]) {
                    window.timelineManager.metadata[timelineKey] = new Timeline(timelineKey, data.timeline[timelineKey]);
                    window.timelineManager.activities[timelineKey] = [];
                }
            });
            if (DEBUG_MODE) {
                console.log('Initialized timeline structure:', window.timelineManager);
            }
        }

        const timeline = data.timeline[key];
        if (!timeline || !timeline.categories) {
            throw new Error(`Invalid timeline data for key: ${key}`);
        }
        
        // Mark timeline as initialized
        window.timelineManager.initialized.add(key);
        
        if (DEBUG_MODE) {
            console.log(`Loaded timeline metadata for ${key}:`, window.timelineManager.metadata[key]);
            console.log('All available timelines in activities.json:', Object.keys(data));
            console.log('Full timeline data:', data);
            console.log('Initialized timelines:', Array.from(window.timelineManager.initialized));
        }
        
        return data.timeline[key].categories;
    } catch (error) {
        console.error('Error loading activities:', error);
        throw error;
    }
}

function renderActivities(categories, container = document.getElementById('activitiesContainer')) {
    container.innerHTML = '';
    
    // Set data-mode attribute based on current timeline's mode
    const currentKey = getCurrentTimelineKey();
    if (currentKey && window.timelineManager.metadata[currentKey]) {
        container.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
    }

    const isMobile = getIsMobile();

    if (isMobile) {
        const accordionContainer = document.createElement('div');
        accordionContainer.className = 'activities-accordion';
        // Set data-mode attribute to match current timeline's mode
        const currentKey = getCurrentTimelineKey();
        if (currentKey && window.timelineManager.metadata[currentKey]) {
            accordionContainer.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
        }

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'activity-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);

            const activityButtonsDiv = document.createElement('div');
            activityButtonsDiv.className = 'activity-buttons';

            category.activities.forEach(activity => {
                const activityButton = document.createElement('button');
                const isMultipleChoice = container.getAttribute('data-mode') === 'multiple-choice';
                activityButton.className = `activity-button ${isMultipleChoice ? 'checkbox-style' : ''}`;
                activityButton.style.setProperty('--color', activity.color);
                
                if (isMultipleChoice) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    activityButton.appendChild(checkmark);
                }
                
                const textSpan = document.createElement('span');
                textSpan.className = 'activity-text';
                textSpan.textContent = activity.name;
                activityButton.appendChild(textSpan);
                activityButton.addEventListener('click', () => {
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
                    
                    // Check if this is the "other not listed" button
                    if (activityButton.querySelector('.activity-text').textContent.includes('other not listed (enter)')) {
                        // Show custom activity modal
                        const customActivityModal = document.getElementById('customActivityModal');
                        const customActivityInput = document.getElementById('customActivityInput');
                        customActivityInput.value = ''; // Clear previous input
                        customActivityModal.style.display = 'block';
                        
                        // Handle custom activity submission
                        const handleCustomActivity = () => {
                            const customText = customActivityInput.value.trim();
                            if (customText) {
                                if (isMultipleChoice) {
                                    activityButton.classList.add('selected');
                                    const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                                    selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn === activityButton ? customText : btn.querySelector('.activity-text').textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    selectedActivity = {
                                        name: customText,
                                        color: activityButton.style.getPropertyValue('--color'),
                                        category: category.name
                                    };
                                    activityButton.classList.add('selected');
                                }
                                customActivityModal.style.display = 'none';
                                document.getElementById('activitiesModal').style.display = 'none';
                            }
                        };

                        // Set up event listeners for custom activity modal
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const inputField = document.getElementById('customActivityInput');
                        
                        // Remove any existing listeners
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        
                        // Add new listeners
                        newConfirmBtn.addEventListener('click', handleCustomActivity);
                        inputField.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        
                        return;
                    }
                    
                    if (isMultipleChoice) {
                        // Toggle selection for this button
                        activityButton.classList.toggle('selected');
            
                        // Get all selected activities in this category
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
            
                        if (selectedButtons.length > 0) {
                            selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            selectedActivity = null;
                        }
                    } else {
                        // Single choice mode
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                    }
                    // Only close modal in single-choice mode
                    if (!isMultipleChoice) {
                        const modal = document.querySelector('.modal-overlay');
                        if (modal) {
                            modal.style.display = 'none';
                        }
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            accordionContainer.appendChild(categoryDiv);
        });

        container.appendChild(accordionContainer);

        // Add click event listener to category titles
        const categoryTitles = accordionContainer.querySelectorAll('.activity-category h3');
        categoryTitles.forEach(title => {
            title.addEventListener('click', () => {
                const category = title.parentElement;
                category.classList.toggle('active');
            });
        });
    } else {
        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'activity-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);

            const activityButtonsDiv = document.createElement('div');
            activityButtonsDiv.className = 'activity-buttons';

            category.activities.forEach(activity => {
                const activityButton = document.createElement('button');
                const isMultipleChoice = container.getAttribute('data-mode') === 'multiple-choice';
                activityButton.className = `activity-button ${isMultipleChoice ? 'checkbox-style' : ''}`;
                activityButton.style.setProperty('--color', activity.color);
                
                if (isMultipleChoice) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    activityButton.appendChild(checkmark);
                }
                
                const textSpan = document.createElement('span');
                textSpan.className = 'activity-text';
                textSpan.textContent = activity.name;
                activityButton.appendChild(textSpan);
                activityButton.addEventListener('click', () => {
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
                    
                    // Check if this is the "other not listed" button
                    if (activity.name.includes('other not listed (enter)')) {
                        // Show custom activity modal
                        const customActivityModal = document.getElementById('customActivityModal');
                        const customActivityInput = document.getElementById('customActivityInput');
                        customActivityInput.value = ''; // Clear previous input
                        customActivityModal.style.display = 'block';
                        customActivityInput.focus(); // Focus the input field
                        
                        // Handle custom activity submission
                        const handleCustomActivity = () => {
                            const customText = customActivityInput.value.trim();
                            if (customText) {
                                if (isMultipleChoice) {
                                    activityButton.classList.add('selected');
                                    const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                                    selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn.textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    selectedActivity = {
                                        name: customText,
                                        color: activity.color,
                                        category: category.name
                                    };
                                    activityButton.classList.add('selected');
                                }
                                customActivityModal.style.display = 'none';
                                document.getElementById('activitiesModal').style.display = 'none';
                            }
                        };

                        // Set up event listeners for custom activity modal
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const inputField = document.getElementById('customActivityInput');
                        
                        // Remove any existing listeners
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        
                        // Add new listeners
                        newConfirmBtn.addEventListener('click', handleCustomActivity);
                        inputField.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        
                        return;
                    }
                    
                    if (isMultipleChoice) {
                        // Toggle selection for this button
                        activityButton.classList.toggle('selected');
            
                        // Get all selected activities in this category
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
            
                        if (selectedButtons.length > 0) {
                            selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.querySelector('.activity-text').textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            selectedActivity = null;
                        }
                    } else {
                        // Single choice mode
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            container.appendChild(categoryDiv);
        });
    }
}

function initTimeline(timeline) {
    timeline.setAttribute('data-active', 'true');
    timeline.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');

    // Remove existing markers
    if (timeline.containerInstance && timeline.containerInstance.hourLabelsContainer) {
        timeline.containerInstance.hourLabelsContainer.innerHTML = '';
    }
    
    // Create and initialize timeline container
    const timelineContainer = new TimelineContainer(timeline);
    timelineContainer.initialize(getIsMobile()).createMarkers(getIsMobile());
    
    // Store the container instance and markers on the timeline element for later access
    timeline.containerInstance = timelineContainer;
    timeline.markers = timelineContainer.markers || [];

    // Add window resize handler to update marker positions
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth < 1440;
        timeline.setAttribute('data-layout', newIsMobile ? 'vertical' : 'horizontal');
        
        // Update dimensions on layout change
        if (newIsMobile) {
            const minHeight = '2500px';
            timeline.style.height = minHeight;
            timeline.style.width = '';
            timeline.parentElement.style.height = minHeight;
            
            // Update hour label container for mobile
            const hourLabelsContainer = timeline.querySelector('.hour-labels');
            if (hourLabelsContainer) {
                hourLabelsContainer.style.height = '100%';
                hourLabelsContainer.style.width = 'auto';
            }
        } else {
            timeline.style.height = '';
            timeline.style.width = '100%';
            timeline.parentElement.style.height = '';
            
            // Update hour label container for desktop
            const hourLabelsContainer = timeline.querySelector('.hour-labels');
            if (hourLabelsContainer) {
                hourLabelsContainer.style.width = '100%';
                hourLabelsContainer.style.height = 'auto';
            }
        }
        
        // Update all markers and their labels if they exist
        if (timeline.markers && timeline.markers.length > 0) {
            timeline.markers.forEach(marker => marker.update(newIsMobile));
        }
    });

    if (DEBUG_MODE) {
        timeline.addEventListener('mousemove', (e) => {
            const rect = timeline.getBoundingClientRect();
            updateDebugOverlay(e.clientX, rect);
        });

        timeline.addEventListener('mouseleave', () => {
            hideDebugOverlay();
        });
    }
}

function initTimelineInteraction(timeline) {
    if (!timeline) {
        console.error('Timeline must be provided to initTimelineInteraction');
        return;
    }
    const targetTimeline = timeline;

    // Initialize interact.js resizable
    interact('.activity-block').resizable({
        edges: { left: !getIsMobile(), right: !getIsMobile(), bottom: getIsMobile() },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: '.timeline'
            }),
            interact.modifiers.restrictSize({
                min: { width: 10, height: 10 }
            })
        ],
        inertia: false,
        listeners: {
            start: handleResizeStart,
            move: handleResizeMove.bind(null, targetTimeline),
            end: handleResizeEnd
        }
    });

    // Add click handling with debounce
    let lastClickTime = 0;
    const CLICK_DELAY = 300; // milliseconds

    targetTimeline.addEventListener('click', (e) => {
        // Only process clicks on the active timeline
        if (!targetTimeline || targetTimeline !== window.timelineManager.activeTimeline) return;

        // Prevent double-clicks
        const currentTime = Date.now();
        if (currentTime - lastClickTime < CLICK_DELAY) return;
        lastClickTime = currentTime;

        if (!selectedActivity || e.target.closest('.activity-block')) return;

        handleTimelineClick(e, targetTimeline);
    });
}

/**
 * Handles the start of a resize event.
 * Stores the original state of the activity block.
 */
function handleResizeStart(event) {
    const target = event.target;
    target.dataset.originalStart = target.dataset.start;
    target.dataset.originalEnd = target.dataset.end;
    target.dataset.originalLength = target.dataset.length;
    target.dataset.originalHeight = target.dataset.height;
    target.classList.add('resizing');
}

/**
 * Handles the move event during resizing.
 * @param {HTMLElement} targetTimeline - The timeline element being interacted with.
 * @param {Object} event - The interact.js event object.
 */
function handleResizeMove(targetTimeline, event) {
    const target = event.target;
    const timelineRect = targetTimeline.getBoundingClientRect();
    const isMobile = getIsMobile();
    const isLeftEdge = event.edges.left;
    const timelineKey = target.dataset.timelineKey;

    try {
        if (isLeftEdge) {
            handleLeftEdgeResize(target, event, timelineRect, isMobile, timelineKey);
        } else {
            handleRightEdgeResize(target, event, timelineRect, isMobile, timelineKey);
        }
    } catch (error) {
        console.error('Resize handling failed:', error);
        provideUserFeedback(target, 'Invalid resize action.');
    }
}

/**
 * Handles the end of a resize event.
 * Cleans up any temporary states or classes.
 */
function handleResizeEnd(event) {
    const target = event.target;
    target.classList.remove('resizing');
    const textDiv = target.querySelector('div[class^="activity-block-text"]');
    const timeLabel = target.querySelector('.time-label');

    if (timeLabel) {
        timeLabel.style.display = 'block'; // Ensure time label stays visible after resize
    }

    if (textDiv) {
        // Get the current length from the block's dataset
        const length = parseInt(target.dataset.length, 10);
        // Update classes based on length and mode
        textDiv.className = getIsMobile()
            ? (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow')
            : (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-vertical');
    }

    updateButtonStates();
}

/**
 * Handles resizing when the left edge is dragged.
 * @param {HTMLElement} target - The activity block being resized.
 * @param {Object} event - The interact.js event object.
 * @param {DOMRect} timelineRect - The bounding rectangle of the timeline.
 * @param {boolean} isMobile - Flag indicating if the device is mobile.
 * @param {string} timelineKey - The key of the current timeline.
 */
function handleLeftEdgeResize(target, event, timelineRect, isMobile, timelineKey) {
    const rawLeftPercent = parseFloat(target.style.left) || 0;
    const rawStartMinutes = positionToMinutes(rawLeftPercent);
    let endMinutes = timeToMinutes(target.dataset.end);

    // Prevent dragging start past end
    let potentialStartMinutes = Math.min(rawStartMinutes, endMinutes);

    // Round to nearest INCREMENT_MINUTES interval
    potentialStartMinutes = Math.round(potentialStartMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;

    // Handle wrap-around if needed
    if (potentialStartMinutes < 0) {
        potentialStartMinutes += MINUTES_PER_DAY;
    }

    // Calculate new size
    let adjustedEndMinutes = endMinutes;
    if (endMinutes < potentialStartMinutes) {
        adjustedEndMinutes += MINUTES_PER_DAY;
    }
    const newSizePercent = ((adjustedEndMinutes - potentialStartMinutes) / MINUTES_PER_DAY) * 100;

    // Validate placement
    if (!canPlaceActivity(potentialStartMinutes, endMinutes, target.dataset.id)) {
        provideUserFeedback(target, 'Cannot resize to this time.');
        return;
    }

    // Update block position and size
    target.style.left = `${minutesToPercentage(potentialStartMinutes)}%`;
    target.style.width = `${newSizePercent}%`;

    // Update dataset
    const newStartTime = formatTimeHHMM(potentialStartMinutes % MINUTES_PER_DAY);
    target.dataset.start = newStartTime;
    target.dataset.length = adjustedEndMinutes - potentialStartMinutes;

    // Update time label
    const timeLabel = target.querySelector('.time-label');
    if (timeLabel) {
        updateTimeLabel(timeLabel, newStartTime, target.dataset.end, target);
    }

    // Update activity data in timelineManager
    updateTimelineManager(target, potentialStartMinutes, endMinutes, timelineKey);
}

/**
 * Handles resizing when the right edge is dragged.
 * @param {HTMLElement} target - The activity block being resized.
 * @param {Object} event - The interact.js event object.
 * @param {DOMRect} timelineRect - The bounding rectangle of the timeline.
 * @param {boolean} isMobile - Flag indicating if the device is mobile.
 * @param {string} timelineKey - The key of the current timeline.
 */
function handleRightEdgeResize(target, event, timelineRect, isMobile, timelineKey) {
    const rawWidthPercent = parseFloat(target.style.width) || 0;
    const startMinutes = timeToMinutes(target.dataset.start);
    let endMinutes = positionToMinutes(rawWidthPercent + parseFloat(target.style.left));

    // Round to nearest INCREMENT_MINUTES interval
    endMinutes = Math.round(endMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;

    // Handle wrap-around if needed
    if (endMinutes < startMinutes) {
        endMinutes += MINUTES_PER_DAY;
    }

    // Validate placement
    if (!canPlaceActivity(startMinutes, endMinutes, target.dataset.id)) {
        provideUserFeedback(target, 'Cannot resize to this time.');
        return;
    }

    // Calculate new size
    const newSizePercent = ((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100;

    // Update block size
    target.style.width = `${newSizePercent}%`;

    // Update dataset
    const newEndTime = formatTimeHHMM(endMinutes % MINUTES_PER_DAY);
    target.dataset.end = newEndTime;
    target.dataset.length = endMinutes - startMinutes;

    // Update time label
    const timeLabel = target.querySelector('.time-label');
    if (timeLabel) {
        updateTimeLabel(timeLabel, target.dataset.start, newEndTime, target);
    }

    // Update activity data in timelineManager
    updateTimelineManager(target, startMinutes, endMinutes, timelineKey);
}

/**
 * Updates the timelineManager with the new activity data.
 * @param {HTMLElement} target - The activity block being updated.
 * @param {number} startMinutes - The new start time in minutes.
 * @param {number} endMinutes - The new end time in minutes.
 * @param {string} timelineKey - The key of the current timeline.
 */
function updateTimelineManager(target, startMinutes, endMinutes, timelineKey) {
    const currentData = window.timelineManager.activities[timelineKey];
    const activityId = target.dataset.id;
    const activityIndex = currentData.findIndex(activity => activity.id === activityId);

    if (activityIndex !== -1) {
        const formattedTimes = formatTimeDDMMYYYYHHMM(formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes));
        if (!formattedTimes.startTime || !formattedTimes.endTime) {
            throw new Error('Activity start time and end time must be defined');
        }
        currentData[activityIndex].startTime = formattedTimes.startTime;
        currentData[activityIndex].endTime = formattedTimes.endTime;
        currentData[activityIndex].blockLength = endMinutes - startMinutes;

        // Validate timeline after resizing activity
        try {
            window.timelineManager.metadata[timelineKey].validate();
        } catch (error) {
            console.error('Timeline validation failed:', error);
            revertResize(target);
            return;
        }

        if (DEBUG_MODE) {
            console.log('Updated activity data:', currentData[activityIndex]);
        }
    }
}

/**
 * Reverts the resize action by restoring original dataset values.
 * @param {HTMLElement} target - The activity block to revert.
 */
function revertResize(target) {
    target.dataset.start = target.dataset.originalStart;
    target.dataset.end = target.dataset.originalEnd;
    target.dataset.length = target.dataset.originalLength;
    target.style.left = `${minutesToPercentage(timeToMinutes(target.dataset.originalStart))}%`;
    target.style.width = `${minutesToPercentage(timeToMinutes(target.dataset.originalEnd) - timeToMinutes(target.dataset.originalStart))}%`;

    // Update time label
    const timeLabel = target.querySelector('.time-label');
    if (timeLabel) {
        updateTimeLabel(timeLabel, target.dataset.originalStart, target.dataset.originalEnd, target);
    }

    // Provide user feedback
    provideUserFeedback(target, 'Resize reverted due to validation failure.');
}

/**
 * Provides user feedback by adding a temporary visual indicator.
 * @param {HTMLElement} target - The activity block to highlight.
 * @param {string} message - The feedback message.
 */
function provideUserFeedback(target, message) {
    target.classList.add('invalid');
    // Optionally, display a tooltip or message to the user
    alert(message); // Simple alert for demonstration; consider using a custom tooltip in production
    setTimeout(() => target.classList.remove('invalid'), 400);
}

/**
 * Handles click events on the timeline for adding new activity blocks.
 * @param {Object} event - The click event object.
 * @param {HTMLElement} targetTimeline - The timeline element being interacted with.
 */
function handleTimelineClick(event, targetTimeline) {
    if (isTimelineFull()) {
        flashInvalidPlacement(targetTimeline);
        return;
    }

    const currentKey = getCurrentTimelineKey();
    window.timelineManager.activities[currentKey] = getCurrentTimelineData();

    const rect = targetTimeline.getBoundingClientRect();
    const isMobile = getIsMobile();
    const clickPositionPercent = calculateClickPositionPercent(event, rect, isMobile);

    if (clickPositionPercent >= 100) return;

    const clickMinutes = positionToMinutes(clickPositionPercent);
    if (clickMinutes === null) {
        console.error('Invalid click minutes calculation:', clickMinutes);
        alert('Cannot place activity here due to invalid position.');
        return;
    }

    const [startMinutes, endMinutes] = findNearestMarkers(clickMinutes, isMobile);

    if (isNaN(startMinutes) || isNaN(endMinutes)) {
        console.error('Invalid minutes calculation:', { startMinutes, endMinutes });
        alert('Cannot place activity here due to invalid position.');
        return;
    }

    if (!canPlaceActivity(startMinutes, endMinutes, null)) {
        flashInvalidPlacement(targetTimeline, startMinutes, endMinutes);
        return;
    }

    createActivityBlock(targetTimeline, startMinutes, endMinutes);
}

/**
 * Calculates the click position percentage based on the event and device type.
 * @param {Object} event - The click event object.
 * @param {DOMRect} rect - The bounding rectangle of the timeline.
 * @param {boolean} isMobile - Flag indicating if the device is mobile.
 * @returns {number} - The click position as a percentage.
 */
function calculateClickPositionPercent(event, rect, isMobile) {
    if (isMobile) {
        const y = event.clientY - rect.top;
        const clampedY = Math.max(0, Math.min(y, rect.height));
        return (clampedY / rect.height) * 100;
    } else {
        const x = event.clientX - rect.left;
        const clampedX = Math.max(0, Math.min(x, rect.width));
        return (clampedX / rect.width) * 100;
    }
}

/**
 * Flashes an invalid placement indication on the timeline.
 * @param {HTMLElement} targetTimeline - The timeline element.
 * @param {number} [startMinutes] - Optional start minutes for additional feedback.
 * @param {number} [endMinutes] - Optional end minutes for additional feedback.
 */
function flashInvalidPlacement(targetTimeline, startMinutes, endMinutes) {
    const block = document.createElement('div');
    block.className = 'activity-block invalid';
    block.style.backgroundColor = '#ff0000'; // Red color for invalid placement

    const isMobile = getIsMobile();
    const timelineRect = targetTimeline.getBoundingClientRect();

    const startPositionPercent = minutesToPercentage(startMinutes || 0);
    const blockSize = (INCREMENT_MINUTES / MINUTES_PER_DAY) * 100;

    if (isMobile) {
        block.style.height = `${blockSize}%`;
        block.style.top = `${startPositionPercent}%`;
        block.style.width = '50%';
        block.style.left = '25%';
    } else {
        block.style.width = `${blockSize}%`;
        block.style.left = `${startPositionPercent}%`;
        block.style.height = '50%';
        block.style.top = '25%';
    }

    targetTimeline.appendChild(block);
    setTimeout(() => block.remove(), 400); // Remove after animation
}

/**
 * Creates a new activity block on the timeline.
 * @param {HTMLElement} targetTimeline - The timeline element.
 * @param {number} startMinutes - The start time in minutes.
 * @param {number} endMinutes - The end time in minutes.
 */
function createActivityBlock(targetTimeline, startMinutes, endMinutes) {
    const currentKey = getCurrentTimelineKey();
    const categories = window.timelineManager.metadata[currentKey].categories; // Assuming categories are accessible here
    const category = selectedActivity.category; // Assuming selectedActivity is set

    const activityData = {
        id: generateUniqueId(),
        activity: selectedActivity.selections
            ? selectedActivity.selections.map(s => s.name).join(' | ')
            : selectedActivity.name,
        category: category,
        startTime: formatTimeHHMM(startMinutes),
        endTime: formatTimeHHMM(endMinutes),
        blockLength: endMinutes - startMinutes,
        color: selectedActivity.color || '#808080',
        count: selectedActivity.selections ? selectedActivity.selections.length : 1
    };

    // Create the activity block element
    const activityBlock = document.createElement('div');
    activityBlock.className = 'activity-block';
    activityBlock.dataset.timelineKey = currentKey;
    activityBlock.dataset.start = activityData.startTime;
    activityBlock.dataset.end = activityData.endTime;
    activityBlock.dataset.length = activityData.blockLength;
    activityBlock.dataset.category = activityData.category;
    activityBlock.dataset.mode = selectedActivity.selections ? 'multiple-choice' : 'single-choice';
    activityBlock.dataset.count = activityData.count;
    activityBlock.dataset.id = activityData.id;

    // Set background color or gradient
    if (selectedActivity.selections) {
        const colors = selectedActivity.selections.map(s => s.color);
        const numSelections = colors.length;
        const percentage = 100 / numSelections;
        const stops = colors.map((color, index) => 
            `${color} ${index * percentage}%, ${color} ${(index + 1) * percentage}%`
        ).join(', ');
        activityBlock.style.background = `linear-gradient(to right, ${stops})`; // Adjust direction based on device
    } else {
        activityBlock.style.backgroundColor = activityData.color;
    }

    // Create and append the text div
    const textDiv = document.createElement('div');
    textDiv.className = getTextDivClass(activityData.blockLength);
    textDiv.innerHTML = selectedActivity.selections
        ? selectedActivity.selections.map(s => s.name).join('<br>')
        : selectedActivity.name;
    activityBlock.appendChild(textDiv);

    // Set positioning and sizing
    const startPositionPercent = minutesToPercentage(startMinutes);
    const blockSizePercent = (INCREMENT_MINUTES / MINUTES_PER_DAY) * 100; // 10 minutes

    if (getIsMobile()) {
        activityBlock.style.height = `${blockSizePercent}%`;
        activityBlock.style.top = `${startPositionPercent}%`;
        activityBlock.style.width = '75%';
        activityBlock.style.left = '12.5%'; // Centered
    } else {
        activityBlock.style.width = `${blockSizePercent}%`;
        activityBlock.style.left = `${startPositionPercent}%`;
        activityBlock.style.height = '75%';
        activityBlock.style.top = '12.5%'; // Centered
    }

    // Append the activity block to the timeline
    targetTimeline.querySelector('.activities').appendChild(activityBlock);

    // Create and append the time label
    const timeLabel = createTimeLabel(activityBlock);
    updateTimeLabel(timeLabel, activityData.startTime, activityData.endTime, activityBlock);
    timeLabel.style.display = 'block'; // Ensure the new label is visible

    // Add activity data to timelineManager
    window.timelineManager.activities[currentKey].push(activityData);

    // Validate timeline after adding activity
    try {
        window.timelineManager.metadata[currentKey].validate();
    } catch (error) {
        console.error('Timeline validation failed:', error);
        window.timelineManager.activities[currentKey].pop(); // Remove the invalid activity
        activityBlock.remove();
        flashInvalidPlacement(targetTimeline, startMinutes, endMinutes);
        return;
    }

    if (DEBUG_MODE) {
        console.log('Added new activity:', activityData);
    }

    // Reset selected activity and update UI
    deselectAllActivityButtons();
}

/**
 * Determines the appropriate class for the text div based on block length and device type.
 * @param {number} blockLength - The length of the activity block in minutes.
 * @returns {string} - The class name for the text div.
 */
function getTextDivClass(blockLength) {
    return getIsMobile()
        ? (blockLength >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow')
        : (blockLength >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-vertical');
}

/**
 * Deselects all activity buttons after an activity is placed.
 */
function deselectAllActivityButtons() {
    document.querySelectorAll('.activity-button').forEach(btn => btn.classList.remove('selected'));
    selectedActivity = null;
}



async function init() {
    try {
        // Load initial timeline data
        const response = await fetch('activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Instructions footer is now always visible by default
        
        // Check if instructions are enabled
        if (data.general && data.general.instructions) {
            const fromInstructions = document.referrer.includes('instructions/3.html');
            const inInstructions = window.location.pathname.includes('/instructions/');
            
            // Only redirect to instructions if:
            // 1. Not coming from instructions page 3
            // 2. Not already in instructions
            // 3. No instruction pages in browser history
            if (!fromInstructions && !inInstructions && !sessionStorage.getItem('instructionsViewed')) {
                sessionStorage.setItem('instructionsViewed', 'true');
                window.location.href = 'instructions/1.html';
                return;
            }
        }
        
        // Initialize timeline management structure with only timeline keys
        window.timelineManager.keys = Object.keys(data.timeline);
        window.timelineManager.keys.forEach(timelineKey => {
            window.timelineManager.metadata[timelineKey] = new Timeline(timelineKey, data.timeline[timelineKey]);
            window.timelineManager.activities[timelineKey] = [];
        });

        // Create timelines wrapper if it doesn't exist
        const timelinesWrapper = document.querySelector('.timelines-wrapper');
        if (!timelinesWrapper) {
            throw new Error('Timelines wrapper not found');
        }

        // Initialize first timeline using addNextTimeline
        window.timelineManager.currentIndex = -1; // Start at -1 so first addNextTimeline() sets to 0
        await addNextTimeline();
        
        // Set initial data-mode on activities container
        const activitiesContainerElement = document.querySelector("#activitiesContainer");
        const currentKey = getCurrentTimelineKey();
        if (currentKey && window.timelineManager.metadata[currentKey]) {
            activitiesContainerElement.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
        }
        
        // Scroll to first timeline in mobile layout
        scrollToActiveTimeline();
        
        initButtons();
        
        // Add resize event listener
        window.addEventListener('resize', handleResize);

        if (DEBUG_MODE) {
            console.log('Initialized timeline structure:', window.timelineManager);
        }
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('activitiesContainer').innerHTML = 
            '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
    }
}

init().catch(error => {
    console.error('Failed to initialize application:', error);
    document.getElementById('activitiesContainer').innerHTML = 
        '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
});
