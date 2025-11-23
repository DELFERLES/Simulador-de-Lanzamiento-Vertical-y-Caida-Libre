export const OBJECT_RADIUS = 10;
export const MARKER_LINE_LENGTH = 30; // Length of horizontal marker lines for heights

let _ctx = null;
let _canvasWidth = 0;
let _canvasHeight = 0;

// Define a fixed padding at the bottom for displaying results
export const RESULTS_OVERLAY_HEIGHT = 80; // Minimum height in pixels to reserve for results display
export const GROUND_SEPARATION_PADDING = 10; // New: Padding between the ground line and the results overlay

/**
 * Sets the canvas context and dimensions for all drawing functions in this module.
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} width - The width of the canvas.
 * @param {number} height - The height of the canvas.
 */
export function setCanvasContext(ctx, width, height) {
    _ctx = ctx;
    _canvasWidth = width;
    _canvasHeight = height;
}

/**
 * Helper function to calculate display Y coordinate from real-world Y, considering minRealY for scaling.
 * @param {number} realY - The real-world Y coordinate.
 * @param {number} minRealY - The minimum real-world Y coordinate in the current view.
 * @param {number} scaleY - The scaling factor for Y coordinates.
 * @returns {number} The display Y coordinate on the canvas.
 */
export function calculateDisplayY(realY, minRealY, scaleY) {
    if (!_ctx) return 0; // Should not happen if setCanvasContext is called
    const clampedRealY = Math.max(realY, minRealY);
    // Set the ground reference (Y=0) to be at the bottom of the simulation area, above the results overlay
    const simulationAreaHeight = _canvasHeight - RESULTS_OVERLAY_HEIGHT - GROUND_SEPARATION_PADDING;
    const groundLevel = simulationAreaHeight; 
    return groundLevel - ((clampedRealY - minRealY) * scaleY);
}

/**
 * Formats a numerical value for display, removing trailing ".00" if present.
 * @param {number} value - The number to format.
 * @returns {string} The formatted string.
 */
function formatValueForDisplay(value) {
    if (value === null || value === undefined) {
        return 'N/A';
    }
    let formatted = value.toFixed(2);
    if (formatted.endsWith('.00')) {
        return formatted.slice(0, -3); // Remove ".00"
    }
    return formatted;
}

/**
 * Draws a beautiful landscape background on the canvas.
 */
export function drawLandscapeBackground() {
    if (!_ctx) return;
    const ctx = _ctx;
    const width = _canvasWidth;
    const height = _canvasHeight;
    
    // Define the simulation area height (above the results overlay and ground separation)
    const simulationAreaHeight = height - RESULTS_OVERLAY_HEIGHT - GROUND_SEPARATION_PADDING;

    // Sky gradient (light blue to darker blue)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, simulationAreaHeight * 0.6);
    skyGradient.addColorStop(0, '#87CEEB'); // Sky blue
    skyGradient.addColorStop(0.5, '#98D8E8'); // Light blue
    skyGradient.addColorStop(1, '#B0E0E6'); // Powder blue
    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, simulationAreaHeight * 0.6);
    
    // Mountains (background layer)
    ctx.fillStyle = '#6B73B8';
    ctx.beginPath();
    ctx.moveTo(0, simulationAreaHeight * 0.45);
    ctx.lineTo(width * 0.3, simulationAreaHeight * 0.25);
    ctx.lineTo(width * 0.6, simulationAreaHeight * 0.35);
    ctx.lineTo(width * 0.9, simulationAreaHeight * 0.2);
    ctx.lineTo(width, simulationAreaHeight * 0.3);
    ctx.lineTo(width, simulationAreaHeight * 0.6);
    ctx.lineTo(0, simulationAreaHeight * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Mountains (foreground layer)
    ctx.fillStyle = '#4A5B8C';
    ctx.beginPath();
    ctx.moveTo(0, simulationAreaHeight * 0.55);
    ctx.lineTo(width * 0.25, simulationAreaHeight * 0.35);
    ctx.lineTo(width * 0.5, simulationAreaHeight * 0.45);
    ctx.lineTo(width * 0.75, simulationAreaHeight * 0.3);
    ctx.lineTo(width, simulationAreaHeight * 0.4);
    ctx.lineTo(width, simulationAreaHeight * 0.6);
    ctx.lineTo(0, simulationAreaHeight * 0.6);
    ctx.closePath();
    ctx.fill();
    
    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Cloud 2
    ctx.beginPath();
    ctx.arc(width * 0.7, simulationAreaHeight * 0.1, 12, 0, Math.PI * 2);
    ctx.arc(width * 0.72, simulationAreaHeight * 0.1, 15, 0, Math.PI * 2);
    ctx.arc(width * 0.74, simulationAreaHeight * 0.1, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Ground/grass area
    const groundGradient = ctx.createLinearGradient(0, simulationAreaHeight * 0.6, 0, simulationAreaHeight);
    groundGradient.addColorStop(0, '#90EE90'); // Light green
    groundGradient.addColorStop(0.3, '#7CCD7C'); // Medium green
    groundGradient.addColorStop(1, '#6B8E6B'); // Dark green
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, simulationAreaHeight * 0.6, width, simulationAreaHeight * 0.4);
    
    // Add some trees
    // Tree 1
    ctx.fillStyle = '#8B4513'; // Brown trunk
    ctx.fillRect(width * 0.1 - 3, simulationAreaHeight * 0.5, 6, simulationAreaHeight * 0.1);
    ctx.fillStyle = '#228B22'; // Green foliage
    ctx.beginPath();
    ctx.arc(width * 0.1, simulationAreaHeight * 0.45, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Tree 2
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(width * 0.85 - 3, simulationAreaHeight * 0.52, 6, simulationAreaHeight * 0.08);
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(width * 0.85, simulationAreaHeight * 0.47, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.arc(width * 0.85, simulationAreaHeight * 0.15, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Sun rays
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x1 = width * 0.85 + Math.cos(angle) * 25;
        const y1 = simulationAreaHeight * 0.15 + Math.sin(angle) * 25;
        const x2 = width * 0.85 + Math.cos(angle) * 35;
        const y2 = simulationAreaHeight * 0.15 + Math.sin(angle) * 35;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

/**
 * Draws the parabolic or vertical trajectory path.
 * @param {object} results - The results object from physics calculations.
 * @param {number} simulationDuration - The total duration of the simulation.
 * @param {object} scaleParams - Scaling parameters (minRealY, scaleY, initialXViz, vxViz).
 */
export function drawTrajectoryPath(results, simulationDuration, scaleParams) {
    if (!_ctx) return;
    const ctx = _ctx;
    const { vi, a, initialYForSim } = results;
    const { minRealY, scaleY, initialXViz, vxViz } = scaleParams;
    const startY = initialYForSim !== null ? initialYForSim : 0;

    ctx.strokeStyle = '#FF0000'; // Changed from white to red
    ctx.lineWidth = 2;
    ctx.beginPath();

    const timeSteps = 100; // Number of segments for the curve
    const stepDuration = simulationDuration / timeSteps;

    if (simulationDuration <= 0) return; // No path to draw yet

    for (let i = 0; i <= timeSteps; i++) {
        const t = i * stepDuration;
        const currentY_real = startY + vi * t + 0.5 * a * t * t;
        const currentX_viz = initialXViz + vxViz * t;

        const displayY = calculateDisplayY(currentY_real, minRealY, scaleY);

        if (i === 0) {
            ctx.moveTo(currentX_viz, displayY);
        } else {
            ctx.lineTo(currentX_viz, displayY);
        }
    }
    ctx.stroke();
}

/**
 * Draws the moving object and its labels.
 * @param {number} t - Current elapsed time in the simulation.
 * @param {object} objectResults - The results object containing kinematic data.
 * @param {object} scaleParams - Scaling parameters.
 */
export function drawObject(t, objectResults, scaleParams) {
    if (!_ctx) return;
    const ctx = _ctx;
    const { vi, a, initialYForSim } = objectResults;
    const { minRealY, scaleY, initialXViz, vxViz } = scaleParams;
    const startY = initialYForSim !== null ? initialYForSim : 0;

    // Calculate current y position relative to ground (y=0)
    let currentY_real = startY + vi * t + 0.5 * a * t * t;
    if (currentY_real < 0) currentY_real = 0; // Clamp to ground for display

    // Calculate current x position for the object itself (based on motion type)
    const currentX_obj = initialXViz + vxViz * t;

    const displayX = currentX_obj;
    const displayY = calculateDisplayY(currentY_real, minRealY, scaleY);

    // Draw the object (a circle)
    ctx.fillStyle = 'orange'; // Changed from Tomato to orange
    ctx.beginPath();
    ctx.arc(displayX, displayY, OBJECT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CC6600'; // Darker orange for stroke
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw current height text
    ctx.fillStyle = '#FFFFFF'; // Changed from red to white
    ctx.font = 'bold 14px Arial'; // Increased intensity for Y and t
    ctx.textAlign = 'center';
    // Position Y above t, and t above the object
    ctx.fillText(`Y: ${formatValueForDisplay(currentY_real)}m`, displayX, displayY - OBJECT_RADIUS - 20); // Moved Y further up
    ctx.fillText(`t: ${formatValueForDisplay(t)}s`, displayX, displayY - OBJECT_RADIUS - 5); // Moved t above the object, below Y
}

/**
 * Draws height markers for initial height, max height, and query heights.
 * @param {object} results - The results object from physics calculations.
 * @param {number} simulationDuration - The total duration of the simulation.
 * @param {object} scaleParams - Scaling parameters.
 */
export function drawHeightMarkers(results, simulationDuration, scaleParams) {
    if (!_ctx) return;
    const ctx = _ctx;
    const { initialYForSim, h_max, motionType } = results;
    const { minRealY, scaleY, initialXViz, vxViz } = scaleParams;
    const startY = initialYForSim !== null ? initialYForSim : 0;

    ctx.setLineDash([5, 5]); // Dashed line
    ctx.font = 'bold 14px Arial'; // Increased size for Y_ini and Y_max text from 12px to 14px

    // --- Initial height marker (Y_ini) ---
    // Place this marker on the left side, aligned with the starting X of the trajectory
    if (startY >= minRealY) { // Only draw if above or at the lowest displayed point
        const displayY_for_startY_value = calculateDisplayY(startY, minRealY, scaleY);
        
        // The dashed line for Y_ini should be drawn at the exact Y-level of initialYForSim
        const yIni_line_y = displayY_for_startY_value;

        const initialY_markerLineX_start = initialXViz - MARKER_LINE_LENGTH / 2;
        const initialY_markerLineX_end = initialXViz + MARKER_LINE_LENGTH / 2;

        ctx.strokeStyle = '#FFFFFF'; // Changed from '#6495ED' to white
        ctx.beginPath();
        ctx.moveTo(initialY_markerLineX_start, yIni_line_y);
        ctx.lineTo(initialY_markerLineX_end, yIni_line_y);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF'; // White color for text
        ctx.textAlign = 'right'; // Text will be right-aligned relative to its X coordinate
        // Position text slightly to the left of the start of the marker line, and moved up for more vertical separation
        ctx.fillText(`Y_ini: ${formatValueForDisplay(startY)}m`, initialY_markerLineX_start - 5, yIni_line_y + 4); // Changed vertical offset to be on the same line
    }

    // --- Max height marker (Y_max) ---
    let hMax_markerLineX_start;
    let hMax_markerLineX_end;
    let hMax_textX_position;

    if (h_max !== null && h_max >= minRealY) { // Draw if above or at the lowest displayed point
        const displayY = calculateDisplayY(h_max, minRealY, scaleY);

        if (motionType === 'verticalLaunch' && results.t_max !== null && results.t_max >= 0) {
            // For vertical launch, position relative to the x-coordinate of the vertex
            const vertexX_viz = initialXViz + vxViz * results.t_max;
            hMax_markerLineX_start = vertexX_viz + OBJECT_RADIUS + 5; // Start marker line slightly right of vertex
            hMax_markerLineX_end = hMax_markerLineX_start + MARKER_LINE_LENGTH;
            hMax_textX_position = hMax_markerLineX_end + 5; // Text to the right of the line
            ctx.textAlign = 'left';
        } else { // freeFall or verticalLaunch without a clear peak (e.g., launched downwards)
            // Default positioning (centered or slightly offset from central axis if no parabola)
            const paddingFromTrajectory = OBJECT_RADIUS + 5; // Padding from the edge of the object/trajectory
            hMax_markerLineX_start = initialXViz + paddingFromTrajectory; // Start slightly right of center
            hMax_markerLineX_end = hMax_markerLineX_start + MARKER_LINE_LENGTH;
            hMax_textX_position = hMax_markerLineX_end + 5;
            ctx.textAlign = 'left';
        }

        // Ensure marker does not go off canvas
        if (hMax_markerLineX_end > _canvasWidth - 10) {
            hMax_markerLineX_end = _canvasWidth - 10;
            hMax_markerLineX_start = hMax_markerLineX_end - MARKER_LINE_LENGTH;
            hMax_textX_position = hMax_markerLineX_start - 5; // Move text to the left
            ctx.textAlign = 'right';
        } else if (hMax_markerLineX_start < 10) { // Also handle if it goes too far left
            hMax_markerLineX_start = 10;
            hMax_markerLineX_end = hMax_markerLineX_start + MARKER_LINE_LENGTH;
            hMax_textX_position = hMax_markerLineX_end + 5;
            ctx.textAlign = 'left';
        }

        ctx.strokeStyle = '#FFFFFF'; // Changed from '#10b981' to white
        ctx.beginPath();
        ctx.moveTo(hMax_markerLineX_start, displayY);
        ctx.lineTo(hMax_markerLineX_end, displayY);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF'; // Changed from '#10b981' to white
        ctx.fillText(`Y_max: ${formatValueForDisplay(h_max)}m`, hMax_textX_position, displayY + 4);
    }

    ctx.setLineDash([]); // Reset line dash
}

/**
 * Draws all calculated results as text on the canvas overlay.
 * @param {object} results - The results object from physics calculations.
 */
export function drawResultsOverlay(results) {
    if (!_ctx) return;
    const ctx = _ctx;
    // Calculate the actual Y coordinate where the ground line is drawn
    const groundLineY = calculateDisplayY(0, 0, 1); // Get the ground line Y based on minRealY=0, scaleY=1 (arbitrary, just to get its absolute pixel position)

    // Draw the navy blue background for the results overlay
    ctx.fillStyle = '#1F2E4A'; // Navy blue color
    ctx.fillRect(0, groundLineY + GROUND_SEPARATION_PADDING, _canvasWidth, RESULTS_OVERLAY_HEIGHT);

    ctx.fillStyle = '#FFFFFF'; // White color for text on navy blue background
    ctx.font = '11px Arial'; // Smaller font for results
    ctx.textAlign = 'left';
    
    const columnPadding = 10;
    const startY = groundLineY + GROUND_SEPARATION_PADDING + 15; // Start drawing text 15px below the top of the navy box
    const lineHeight = 13; // Space between lines of text
    const columnWidth = _canvasWidth / 3; // Divide canvas into 3 columns
    
    // Helper to format values or display 'N/A'
    const displayComplexValue = (value) => value !== null ? value : 'N/A';

    const resultItems = [
        `Vi: ${formatValueForDisplay(results.vi)} m/s`,
        `Vf: ${formatValueForDisplay(results.vf)} m/s`,
        `h: ${formatValueForDisplay(results.h)} m`,
        `t: ${formatValueForDisplay(results.t)} s`,
        `g: ${formatValueForDisplay(results.g)} m/s²`,
        `a: ${formatValueForDisplay(results.a)} m/s²`,
        `t_max: ${formatValueForDisplay(results.t_max)} s`,
        `h_max: ${formatValueForDisplay(results.h_max)} m`,
        `t_flight: ${formatValueForDisplay(results.t_flight)} s`,
        `Total Dist: ${formatValueForDisplay(results.total_distance_travelled)} m`,
        `Query V(tq): ${formatValueForDisplay(results.v_at_t_query)} m/s`,
        `Query H(tq): ${formatValueForDisplay(results.h_at_t_query)} m`,
        `Query T(hq): ${displayComplexValue(results.t_at_h_query)} s`,
        `Query V(hq): ${displayComplexValue(results.v_at_h_query)} m/s`
    ];

    let currentY = startY;
    let columnIndex = 0;
    let rowIndex = 0;

    for (let i = 0; i < resultItems.length; i++) {
        const item = resultItems[i];
        const x = columnIndex * columnWidth + columnPadding;
        
        ctx.fillText(item, x, currentY);
        
        rowIndex++;
        // If enough rows for this column, or it's the last item, move to next column
        if (rowIndex >= Math.ceil(resultItems.length / 3) || i === resultItems.length - 1) { 
            rowIndex = 0;
            columnIndex++;
            currentY = startY; // Reset Y for the new column
        } else {
            currentY += lineHeight;
        }
    }
}