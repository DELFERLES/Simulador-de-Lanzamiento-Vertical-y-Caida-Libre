import { RESULTS_OVERLAY_HEIGHT, GROUND_SEPARATION_PADDING } from './simulation_renderer.js';

/**
 * Helper to determine the total simulation duration for scaling and drawing.
 * @param {object} results - The results object from physics calculations.
 * @returns {number} The calculated simulation duration in seconds.
 */
export function getSimulationDuration(results) {
    return results.t_flight !== null && results.t_flight > 0 ? results.t_flight : 5; // Default to 5s if t_flight is invalid
}

/**
 * Helper function to calculate scaling parameters for the simulation based on results and canvas dimensions.
 * @param {object} results - The results object from physics calculations.
 * @param {number} simulationDuration - The total duration of the simulation.
 * @param {number} canvasWidth - The width of the canvas.
 * @param {number} canvasHeight - The height of the canvas.
 * @returns {object} An object containing minRealY, maxRealY, scaleY, initialXViz, and vxViz.
 */
export function getSimulationScale(results, simulationDuration, canvasWidth, canvasHeight) {
    const { vi, a, initialYForSim, motionType } = results;
    const startY = initialYForSim !== null ? initialYForSim : 0;

    let minRealY = 0; // The lowest point shown is always ground (Y=0)
    let maxRealY_unpadded = startY; // Start with initial height

    // Consider highest point reached (h_max)
    if (results.h_max !== null) {
        maxRealY_unpadded = Math.max(maxRealY_unpadded, results.h_max);
    }

    // Consider the Y position at the end of the simulation duration (t_flight)
    const finalY_at_flightTime = startY + vi * simulationDuration + 0.5 * a * simulationDuration * simulationDuration;
    maxRealY_unpadded = Math.max(maxRealY_unpadded, finalY_at_flightTime);
    
    // Determine the actual maximum real Y to display, with padding for visual alignment.
    let maxRealY_padded;
    // Target the highest point (e.g., h_max) to be at 25% from the top of the simulation graphics area.
    // This aligns it with the general level of the mountain peaks.
    const targetHighestPointDisplayRatioFromTop = 0.25; 

    if (maxRealY_unpadded > minRealY) {
        // Calculate the total realYRange needed to position maxRealY_unpadded at targetHighestPointDisplayRatioFromTop
        maxRealY_padded = (maxRealY_unpadded - minRealY) / (1 - targetHighestPointDisplayRatioFromTop) + minRealY;
        
        // Ensure some minimum range if calculated maxRealY_padded is very small
        if (maxRealY_padded < 5) maxRealY_padded = 5; // At least 5m range
    } else {
        // Default small range if motion is flat or minimal (e.g., free fall from 0m height)
        maxRealY_padded = minRealY + 5; // A 5m range above minRealY
    }

    const realYRange = maxRealY_padded - minRealY;
    
    // The simulation graphics area height excludes the bottom results overlay and ground separation.
    // These values are defined in simulation_renderer.js, but we need their constants here to calculate scaleY correctly.
    const simulationAreaHeight = canvasHeight - RESULTS_OVERLAY_HEIGHT - GROUND_SEPARATION_PADDING;
    
    const scaleY = simulationAreaHeight / realYRange;

    // Dynamic horizontal scaling for vertical launch to ensure parabola fits
    let initialXViz;
    let vxViz;
    if (motionType === 'verticalLaunch') {
        // Adjust for a "closer" parabola by making its horizontal extent smaller
        // Reduced from 0.4 to 0.3 for a slightly smaller parabola as per user request.
        const parabolaWidth = canvasWidth * 0.3; 
        initialXViz = (canvasWidth - parabolaWidth) / 2; // Center the parabola
        vxViz = simulationDuration > 0 ? parabolaWidth / simulationDuration : 0;
        if (vxViz === Infinity || isNaN(vxViz)) vxViz = 50; // Fallback for very short/zero duration
    } else { // freeFall - draw a vertical line
        vxViz = 0;
        initialXViz = canvasWidth / 2; // Center for free fall
    }

    return { minRealY, maxRealY: maxRealY_padded, scaleY, initialXViz, vxViz };
}