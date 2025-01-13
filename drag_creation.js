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
  