import { setCanvasContext, drawLandscapeBackground, drawTrajectoryPath, drawObject, drawHeightMarkers, drawResultsOverlay, calculateDisplayY, RESULTS_OVERLAY_HEIGHT, GROUND_SEPARATION_PADDING } from './simulation_renderer.js';
import { getSimulationDuration, getSimulationScale } from './simulation_utils.js';

let canvas; // Canvas element
let animationId; // To store the requestAnimationFrame ID
let currentResults = null; // Store the results object globally for animation access
let isPaused = false;
let startTime = null; // Timestamp when the current animation cycle started (or null if needs re-initialization)
let currentElapsedTime = 0; // Total elapsed time in seconds for the simulation (persists through pauses)
let onSimulationEndCallback = null; // Callback to notify script.js when simulation ends naturally

let hasPausedAtH = false; // State variable to track if pause at 'h' occurred
let hasPausedAtHMax = false; // State variable to track if pause at 'h_max' occurred
let pauseTimesTriggered = new Set(); // Track which query pause times have been triggered

export function initSimulation(canvasId) {
    canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    setCanvasContext(ctx, canvas.width, canvas.height); // Pass context and dimensions to renderer
}

// Main animation loop
function animate(timestamp) {
    if (isPaused) {
        // If paused, just return. currentElapsedTime will not advance.
        // The object will remain drawn at its currentElapsedTime position.
        return;
    }

    const simulationDuration = getSimulationDuration(currentResults);
    const scaleParams = getSimulationScale(currentResults, simulationDuration, canvas.width, canvas.height);

    // If starting or resuming, calibrate startTime based on current timestamp and where we left off
    if (startTime === null) {
        startTime = timestamp - currentElapsedTime * 1000;
    }

    const prevElapsedTime = currentElapsedTime;
    currentElapsedTime = (timestamp - startTime) / 1000;

    const timeEpsilon = 0.05; // Small time tolerance for pausing near specific points
    let shouldPauseNow = false;
    let pauseTime = null;

    // Condition 1: Pause at h_max (maximum height)
    if (currentResults.t_max !== null && currentResults.a < 0 && currentResults.vi > 0 && !hasPausedAtHMax) {
        if (prevElapsedTime < currentResults.t_max && currentElapsedTime >= currentResults.t_max - timeEpsilon) {
            shouldPauseNow = true;
            pauseTime = currentResults.t_max;
            hasPausedAtHMax = true;
        }
    }

    // Condition 2: Pause at h (calculated displacement time)
    if (!shouldPauseNow && currentResults.h !== null && currentResults.t !== null && !hasPausedAtH) {
        // Ensure that we only pause if 'h' is reached, and not if it's the same point as h_max
        if (prevElapsedTime < currentResults.t && currentElapsedTime >= currentResults.t - timeEpsilon) {
            const isCloseToHMaxTime = currentResults.t_max !== null && Math.abs(currentResults.t - currentResults.t_max) < timeEpsilon;
            const isCloseToFlightTime = Math.abs(currentResults.t - simulationDuration) < timeEpsilon;

            if (!(isCloseToHMaxTime && hasPausedAtHMax) && !isCloseToFlightTime && currentElapsedTime < simulationDuration) {
                shouldPauseNow = true;
                pauseTime = currentResults.t;
                hasPausedAtH = true;
            }
        }
    }

    // Condition 3: Pause at specific query times (queryTime and times for queryHeight)
    if (!shouldPauseNow) {
        const queryPauseTimes = [];
        if (currentResults.queryTime !== null) {
            queryPauseTimes.push(currentResults.queryTime);
        }
        if (currentResults.times_at_h_query_raw && currentResults.times_at_h_query_raw.length > 0) {
            queryPauseTimes.push(...currentResults.times_at_h_query_raw);
        }

        // Find the next query pause time that is approaching
        const nextPauseTime = queryPauseTimes
            .filter(pt => pt > prevElapsedTime && pt < simulationDuration && !pauseTimesTriggered.has(pt.toFixed(2)))
            .sort((a,b) => a-b)[0];

        if (nextPauseTime !== undefined && currentElapsedTime >= nextPauseTime - timeEpsilon) {
             shouldPauseNow = true;
             pauseTime = nextPauseTime;
             pauseTimesTriggered.add(nextPauseTime.toFixed(2));
        }
    }

    // Execute pause if any condition was met
    if (shouldPauseNow) {
        isPaused = true;
        currentElapsedTime = pauseTime; // Snap to exact time for drawing
    }

    const ctx = canvas.getContext('2d');
    // Clear canvas and draw landscape background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLandscapeBackground();

    // Draw ground line at Y=0 (brown line)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const groundY = calculateDisplayY(0, scaleParams.minRealY, scaleParams.scaleY);
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // Fill the separation area with black, between the brown line and the navy results box
    const resultsOverlayTopY = canvas.height - RESULTS_OVERLAY_HEIGHT;
    ctx.fillStyle = '#000000'; // Black color
    ctx.fillRect(0, groundY, canvas.width, resultsOverlayTopY - groundY);

    // Draw the entire trajectory path for the "closed" parabola effect
    drawTrajectoryPath(currentResults, simulationDuration, scaleParams);

    // Draw height markers
    drawHeightMarkers(currentResults, simulationDuration, scaleParams);

    // Draw object at current time
    drawObject(currentElapsedTime, currentResults, scaleParams);

    // Draw all results overlay
    drawResultsOverlay(currentResults);

    // Check if simulation ended naturally or paused by conditions
    if (isPaused) {
        if (onSimulationEndCallback) {
            onSimulationEndCallback(); // This will update button text
        }
        // If the pause was not the final frame, we just return and wait for resume.
        // If it was the final frame, it will be handled by the next block.
        if (!shouldPauseNow && currentElapsedTime < simulationDuration - timeEpsilon) {
           return;
        }
    }

    // Final stop condition: if current time reaches or exceeds total flight duration
    if (currentElapsedTime >= simulationDuration) {
        currentElapsedTime = simulationDuration; // Clamp elapsed time to duration
        // Redraw one last time to ensure final state is correct
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawLandscapeBackground();
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const finalGroundY = calculateDisplayY(0, scaleParams.minRealY, scaleParams.scaleY);
        ctx.moveTo(0, finalGroundY);
        ctx.lineTo(canvas.width, finalGroundY);
        ctx.stroke();

        // Also fill the separation area with black during the final redraw
        const finalResultsOverlayTopY = canvas.height - RESULTS_OVERLAY_HEIGHT;
        ctx.fillStyle = '#000000'; // Black color
        ctx.fillRect(0, finalGroundY, canvas.width, finalResultsOverlayTopY - finalGroundY);

        drawTrajectoryPath(currentResults, simulationDuration, scaleParams);

        // Draw height markers
        drawHeightMarkers(currentResults, simulationDuration, scaleParams);

        // Draw object at current time
        drawObject(currentElapsedTime, currentResults, scaleParams);

        // Draw all results overlay
        drawResultsOverlay(currentResults);

        isPaused = true;
        if (onSimulationEndCallback) {
            onSimulationEndCallback();
        }
        return;
    }

    animationId = requestAnimationFrame(animate);
}

export function drawMotion(results, onEndCallback) {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    currentResults = results;
    onSimulationEndCallback = onEndCallback;
    isPaused = false;
    startTime = null; // Reset startTime to null for a fresh start
    currentElapsedTime = 0; // Reset elapsed time for a new simulation
    hasPausedAtH = false;
    hasPausedAtHMax = false;
    pauseTimesTriggered.clear(); // Clear the set of triggered query pauses

    animationId = requestAnimationFrame(animate);
}

export function pauseSimulation() {
    if (!isPaused && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        isPaused = true;
    }
}

export function resumeSimulation() {
    if (isPaused && currentResults) {
        isPaused = false;
        startTime = null; // Set startTime to null to recalibrate it on the next animate frame
        animationId = requestAnimationFrame(animate);
    }
}

export function restartSimulation() {
    if (currentResults) {
        drawMotion(currentResults, onSimulationEndCallback);
    }
}