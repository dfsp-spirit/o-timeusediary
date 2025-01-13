function initBlockCreationViaDrag(timeline) {
	let isCreating = false;
	let tempBlock = null;
	let startPercent = 0;   // For non-mobile: left% or for mobile: top%
	let startMinutes = 0;
  
	timeline.addEventListener('mousedown', (e) => {
	  // If no activity is selected, or we clicked an existing block, exit
	  if (!selectedActivity || e.target.closest('.activity-block')) return;
  
	  // Mark that we are creating
	  isCreating = true;
  
	  // Calculate the startPercent from the mouse position
	  const rect = timeline.getBoundingClientRect();
	  const isMobile = getIsMobile();
	  let pointerCoord, timelineSize;
  
	  if (isMobile) {
		pointerCoord = e.clientY - rect.top;
		timelineSize = rect.height;
	  } else {
		pointerCoord = e.clientX - rect.left;
		timelineSize = rect.width;
	  }
  
	  // clamp pointerCoord
	  pointerCoord = Math.max(0, Math.min(pointerCoord, timelineSize));
	  startPercent = (pointerCoord / timelineSize) * 100;
	  startMinutes = positionToMinutes(startPercent);
  
	  // Create a temporary .activity-block at that start
	  tempBlock = document.createElement('div');
	  tempBlock.className = 'activity-block creating'; // e.g. a special class
	  tempBlock.dataset.timelineKey = getCurrentTimelineKey();
  
	  // Basic styling: position it at the start but 0 length
	  if (isMobile) {
		tempBlock.style.top = `${startPercent}%`;
		tempBlock.style.height = '0%';
		tempBlock.style.left = '25%'; // or your desired offset
		tempBlock.style.width = '50%'; // or your desired width in mobile
	  } else {
		tempBlock.style.left = `${startPercent}%`;
		tempBlock.style.width = '0%';
		tempBlock.style.top = '25%';   // or desired offset
		tempBlock.style.height = '75%';
	  }
  
	  // Optionally color it
	  if (selectedActivity.selections) {
		// or do your multiple-choice gradient
		tempBlock.style.backgroundColor = selectedActivity.selections[0].color;
	  } else {
		tempBlock.style.backgroundColor = selectedActivity.color;
	  }
  
	  // Add some text div if you want
	  const textDiv = document.createElement('div');
	  textDiv.textContent = selectedActivity.name;
	  textDiv.className = 'activity-block-text-narrow';
	  tempBlock.appendChild(textDiv);
  
	  // Append to timeline
	  // (You might want to append to the `.activities` container if you have one)
	  timeline.appendChild(tempBlock);
	});
  
	// Mouse move: update end position while creating
	timeline.addEventListener('mousemove', (e) => {
	  if (!isCreating || !tempBlock) return;
  
	  const rect = timeline.getBoundingClientRect();
	  const isMobile = getIsMobile();
	  let pointerCoord, timelineSize;
  
	  if (isMobile) {
		pointerCoord = e.clientY - rect.top;
		timelineSize = rect.height;
	  } else {
		pointerCoord = e.clientX - rect.left;
		timelineSize = rect.width;
	  }
	  pointerCoord = Math.max(0, Math.min(pointerCoord, timelineSize));
  
	  const currentPercent = (pointerCoord / timelineSize) * 100;
  
	  // Now, figure out the "start < end" or "start > end" scenario
	  if (!isMobile) {
		if (currentPercent >= startPercent) {
		  // Dragging to the right
		  const widthPercent = currentPercent - startPercent;
		  tempBlock.style.left = `${startPercent}%`;
		  tempBlock.style.width = `${widthPercent}%`;
		} else {
		  // Dragging left from the start => let start be current, end be old start
		  const widthPercent = startPercent - currentPercent;
		  tempBlock.style.left = `${currentPercent}%`;
		  tempBlock.style.width = `${widthPercent}%`;
		}
	  } else {
		// Similar logic for top/height in mobile
		if (currentPercent >= startPercent) {
		  const heightPercent = currentPercent - startPercent;
		  tempBlock.style.top = `${startPercent}%`;
		  tempBlock.style.height = `${heightPercent}%`;
		} else {
		  const heightPercent = startPercent - currentPercent;
		  tempBlock.style.top = `${currentPercent}%`;
		  tempBlock.style.height = `${heightPercent}%`;
		}
	  }
	});
  
	// Mouse up: finalize
	timeline.addEventListener('mouseup', (e) => {
	  if (!isCreating || !tempBlock) return;
	  isCreating = false;
  
	  // We can parse final start/end from tempBlock's style
	  const isMobile = getIsMobile();
	  let styleStart = parseFloat(isMobile ? tempBlock.style.top : tempBlock.style.left) || 0;
	  let styleSize  = parseFloat(isMobile ? tempBlock.style.height : tempBlock.style.width) || 0;
  
	  // Convert to minutes
	  let finalStart = positionToMinutes(styleStart);
	  let finalEnd   = positionToMinutes(styleStart + styleSize);
  
	  if (finalEnd < finalStart) {
		// If user dragged "backwards," swap
		[finalStart, finalEnd] = [finalEnd, finalStart];
	  }
  
	  // If you want to snap to 10-min increments or do midnight crossing detection, do it here
	  // e.g. if (finalEnd < finalStart) finalEnd += 1440;
  
	  // Now actually "finalize" the block with your existing code:
	  finalizeCreatedBlock(tempBlock, finalStart, finalEnd);
  
	  // Deselect the activity
	  selectedActivity = null;
	});
  }
  
  // Example finalize function
  function finalizeCreatedBlock(block, startMinutes, endMinutes) {
	// Possibly call your updateActivityBlock logic:
	// updateActivityBlock(block, startMinutes, endMinutes);
  
	// Or manually set dataset.* now:
	block.dataset.startRaw = startMinutes;
	block.dataset.endRaw   = endMinutes;
	block.dataset.length   = endMinutes - startMinutes;
	block.dataset.start    = formatTimeHHMMWithDayOffset(startMinutes);
	block.dataset.end      = formatTimeHHMMWithDayOffset(endMinutes);
  
	// Optionally remove the .creating class
	block.classList.remove('creating');
  
	// Add a time label
	const timeLabel = document.createElement('div');
	timeLabel.className = 'time-label';
	updateTimeLabel(timeLabel, block.dataset.start, block.dataset.end, block);
	block.appendChild(timeLabel);
  
	// And do your data store logic:
	// create an object in your timeline data array, do validation, etc.
  }
  import { getIsMobile } from './globals.js';
import {
    getCurrentTimelineData,
    getCurrentTimelineKey,
    formatTimeHHMM,
    formatTimeDDMMYYYYHHMM,
    minutesToPercentage,
    positionToMinutes,
    generateUniqueId,
    createTimeLabel,
    updateTimeLabel,
    updateButtonStates,
    getTextDivClass
} from './utils.js';

export function initBlockCreationViaDrag(timeline) {
    if (!timeline) return;

    const targetTimeline = timeline;

    interact(timeline).draggable({
        inertia: false,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: timeline
            })
        ],
        listeners: {
            start(event) {
                // Only allow drag creation if an activity is selected
                if (!window.selectedActivity) return;

                // Create preview block
                const block = document.createElement('div');
                block.className = 'activity-block preview';
                block.style.backgroundColor = window.selectedActivity.color;
                block.style.opacity = '0.6';

                // Set initial position
                const rect = targetTimeline.getBoundingClientRect();
                const isMobile = getIsMobile();
                
                if (isMobile) {
                    const y = event.clientY - rect.top;
                    block.style.top = `${(y / rect.height) * 100}%`;
                    block.style.width = '75%';
                    block.style.left = '25%';
                } else {
                    const x = event.clientX - rect.left;
                    block.style.left = `${(x / rect.width) * 100}%`;
                    block.style.height = '75%';
                    block.style.top = '25%';
                }

                targetTimeline.appendChild(block);
                event.target.dragPreview = block;
            },

            move(event) {
                const block = event.target.dragPreview;
                if (!block) return;

                const rect = targetTimeline.getBoundingClientRect();
                const isMobile = getIsMobile();

                if (isMobile) {
                    const y = event.clientY - rect.top;
                    const height = Math.abs(event.dy);
                    const top = y - (event.dy > 0 ? 0 : height);
                    
                    block.style.top = `${(top / rect.height) * 100}%`;
                    block.style.height = `${(height / rect.height) * 100}%`;
                } else {
                    const x = event.clientX - rect.left;
                    const width = Math.abs(event.dx);
                    const left = x - (event.dx > 0 ? 0 : width);
                    
                    block.style.left = `${(left / rect.width) * 100}%`;
                    block.style.width = `${(width / rect.width) * 100}%`;
                }
            },

            end(event) {
                const block = event.target.dragPreview;
                if (!block) return;

                // Convert position and size to minutes
                const rect = targetTimeline.getBoundingClientRect();
                const isMobile = getIsMobile();
                
                let startMinutes, endMinutes;
                
                if (isMobile) {
                    const topPercent = parseFloat(block.style.top);
                    const heightPercent = parseFloat(block.style.height);
                    startMinutes = positionToMinutes(topPercent);
                    endMinutes = positionToMinutes(topPercent + heightPercent);
                } else {
                    const leftPercent = parseFloat(block.style.left);
                    const widthPercent = parseFloat(block.style.width);
                    startMinutes = positionToMinutes(leftPercent);
                    endMinutes = positionToMinutes(leftPercent + widthPercent);
                }

                // Remove preview block
                block.remove();

                // Create final activity block if valid
                if (startMinutes && endMinutes && Math.abs(endMinutes - startMinutes) >= 10) {
                    createActivityBlock(targetTimeline, startMinutes, endMinutes);
                }
            }
        }
    });
}

function createActivityBlock(timeline, startMinutes, endMinutes) {
    // Ensure proper order
    if (endMinutes < startMinutes) {
        [startMinutes, endMinutes] = [endMinutes, startMinutes];
    }

    const block = document.createElement('div');
    block.className = 'activity-block';
    block.dataset.timelineKey = getCurrentTimelineKey();
    block.dataset.start = formatTimeHHMM(startMinutes);
    block.dataset.end = formatTimeHHMM(endMinutes);
    block.dataset.length = endMinutes - startMinutes;
    block.dataset.category = window.selectedActivity.category;

    if (window.selectedActivity.selections) {
        const colors = window.selectedActivity.selections.map(s => s.color);
        const isMobile = getIsMobile();
        const percentage = 100 / colors.length;
        
        const gradient = isMobile ? 
            `linear-gradient(to right, ${colors.map((c, i) => 
                `${c} ${i * percentage}%, ${c} ${(i + 1) * percentage}%`).join(', ')})` :
            `linear-gradient(to bottom, ${colors.map((c, i) => 
                `${c} ${i * percentage}%, ${c} ${(i + 1) * percentage}%`).join(', ')})`;
                
        block.style.background = gradient;
    } else {
        block.style.backgroundColor = window.selectedActivity.color;
    }

    const textDiv = document.createElement('div');
    const activityText = window.selectedActivity.selections ?
        window.selectedActivity.selections.map(s => s.name).join(' | ') :
        window.selectedActivity.name;

    textDiv.textContent = activityText;
    textDiv.className = getTextDivClass(endMinutes - startMinutes);
    block.appendChild(textDiv);

    // Position the block
    const startPercent = minutesToPercentage(startMinutes);
    const endPercent = minutesToPercentage(endMinutes);
    const size = endPercent - startPercent;

    if (getIsMobile()) {
        block.style.top = `${startPercent}%`;
        block.style.height = `${size}%`;
        block.style.width = '75%';
        block.style.left = '25%';
    } else {
        block.style.left = `${startPercent}%`;
        block.style.width = `${size}%`;
        block.style.height = '75%';
        block.style.top = '25%';
    }

    // Add time label
    const timeLabel = createTimeLabel(block);
    updateTimeLabel(timeLabel, block.dataset.start, block.dataset.end, block);

    // Add to timeline
    const activitiesContainer = timeline.querySelector('.activities') || (() => {
        const container = document.createElement('div');
        container.className = 'activities';
        timeline.appendChild(container);
        return container;
    })();

    activitiesContainer.appendChild(block);

    // Add to timeline data
    const times = formatTimeDDMMYYYYHHMM(block.dataset.start, block.dataset.end);
    const activityData = {
        id: generateUniqueId(),
        activity: activityText,
        category: block.dataset.category,
        startTime: times.startTime,
        endTime: times.endTime,
        blockLength: parseInt(block.dataset.length),
        color: window.selectedActivity.color,
        count: window.selectedActivity.selections?.length || 1
    };

    block.dataset.id = activityData.id;
    getCurrentTimelineData().push(activityData);

    // Reset selection and update UI
    window.selectedActivity = null;
    document.querySelectorAll('.activity-button').forEach(btn => btn.classList.remove('selected'));
    updateButtonStates();
}
