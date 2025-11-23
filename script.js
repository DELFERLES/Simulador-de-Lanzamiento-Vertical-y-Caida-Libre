import { calculateMotion } from './physics.js';
// Import new pause/resume/restart functions
import { initSimulation, drawMotion, pauseSimulation, resumeSimulation, restartSimulation } from './simulation.js';

// Get DOM elements
const viInput = document.getElementById('vi');
const vfInput = document.getElementById('vf');
const hInput = document.getElementById('h');
const tInput = document.getElementById('t');
const gInput = document.getElementById('g');
const initialYSimInput = document.getElementById('initialYSim');
const initialYSimGroup = document.getElementById('initialYSimGroup'); // New: get the whole input group

// New query inputs
const queryTimeInput = document.getElementById('queryTime');
const queryHeightInput = document.getElementById('queryHeight');

const motionTypeRadios = document.querySelectorAll('input[name="motionType"]');
const directionOptions = document.querySelector('.direction-options');
const directionRadios = document.querySelectorAll('input[name="direction"]');

const calculateOnlyBtn = document.getElementById('calculateOnlyBtn'); // Renamed from calculateBtn
const errorMessage = document.getElementById('error-message');

const simulateBtn = document.getElementById('simulateBtn'); // New simulate button
const pauseResumeBtn = document.getElementById('pauseResumeBtn'); // Get the pause/resume button
const restartBtn = document.getElementById('restartBtn'); // Get the new restart button

const resVi = document.getElementById('res_vi');
const resVf = document.getElementById('res_vf');
const resH = document.getElementById('res_h');
const resT = document.getElementById('res_t');
const resG = document.getElementById('res_g');
const resA = document.getElementById('res_a');
const resTMax = document.getElementById('res_t_max');
const resHMax = document.getElementById('res_h_max');
const resTFlight = document.getElementById('res_t_flight');
const resTotalDist = document.getElementById('res_total_dist');

// New result spans for additional calculations
const resVatTq = document.getElementById('res_v_at_tq');
const resHatTq = document.getElementById('res_h_at_tq');
const resTatHq = document.getElementById('res_t_at_hq');
const resVatHq = document.getElementById('res_v_at_hq');

const canvas = document.getElementById('physicsCanvas');
let simulationInitialized = false;
let lastCalculationResults = null; // Store results for simulation

// Function to reset results display
function clearResults() {
    resVi.textContent = '';
    resVf.textContent = '';
    resH.textContent = '';
    resT.textContent = '';
    resG.textContent = '';
    resA.textContent = '';
    resTMax.textContent = '';
    resHMax.textContent = '';
    resTFlight.textContent = '';
    resTotalDist.textContent = '';

    // Clear new results
    resVatTq.textContent = '';
    resHatTq.textContent = '';
    resTatHq.textContent = '';
    resVatHq.textContent = '';

    errorMessage.textContent = '';
}

// Function to update input state based on motion type
function updateInputState() {
    const selectedMotionType = document.querySelector('input[name="motionType"]:checked').value;

    if (selectedMotionType === 'freeFall') {
        viInput.value = '0';
        viInput.disabled = true;
        directionOptions.style.display = 'none';
        hInput.placeholder = 'Altura de Caída [m]'; // Clarify meaning for free fall
        initialYSimGroup.style.display = 'flex'; // Show initialYSim input group
        initialYSimInput.disabled = false;
        initialYSimInput.value = ''; // Let user set start height
    } else { // verticalLaunch
        if (viInput.value === '0') {
            viInput.value = '';
        }
        viInput.disabled = false;
        directionOptions.style.display = 'flex';
        hInput.placeholder = 'Desplazamiento (h) [m]'; // Original meaning for launch
        initialYSimGroup.style.display = 'flex'; // Show initialYSim input group
        initialYSimInput.disabled = false;
    }
    clearResults();
    // Disable simulation controls until new calculation
    simulateBtn.disabled = true;
    pauseResumeBtn.disabled = true;
    restartBtn.disabled = true;
    pauseResumeBtn.textContent = 'Pausar'; // Reset button text
}

// Callback to handle simulation ending or pausing
function handleSimulationEnd() {
    pauseResumeBtn.textContent = 'Reanudar'; // Change text to Reanudar as it's paused
}

// Initialize input state on load
updateInputState();

// Add event listeners for motion type changes
motionTypeRadios.forEach(radio => {
    radio.addEventListener('change', updateInputState);
});

// Event listener for the new "Calcular Resultados" button
calculateOnlyBtn.addEventListener('click', () => {
    clearResults(); // Clear previous results and errors

    // Get raw input values directly from DOM
    const rawVi = viInput.value === '' ? null : Number(viInput.value);
    const rawVf = vfInput.value === '' ? null : Number(vfInput.value);
    const rawH = hInput.value === '' ? null : Number(hInput.value);
    const rawT = tInput.value === '' ? null : Number(tInput.value);
    const rawG = gInput.value === '' ? null : Number(gInput.value);
    let rawInitialYSim = initialYSimInput.value === '' ? 0 : Number(initialYSimInput.value); // Default to 0 if empty
    const motionType = document.querySelector('input[name="motionType"]:checked').value;
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const rawQueryTime = queryTimeInput.value === '' ? null : Number(queryTimeInput.value);
    const rawQueryHeight = queryHeightInput.value === '' ? null : Number(queryHeightInput.value);

    // Prepare inputs object for physics.js
    let processedVi = rawVi;
    let processedVf = rawVf;
    let processedH = rawH; // This will be the *displacement* for physics.js
    let processedT = rawT;
    let processedG = rawG;
    let processedInitialYForSim = rawInitialYSim; // This will be the simulation start Y

    try {
        // Adjust inputs based on motionType for calculation and simulation
        if (motionType === 'freeFall') {
            processedVi = 0; // Always 0 for free fall
            viInput.value = '0'; // Reflect this in the UI
            
            // For free fall, displacement 'h' is calculated from initial height if not provided.
            // initialYSim is the starting height.
            if (rawH !== null) {
                // User provided displacement 'h' directly
                if (rawH > 0) throw new Error("Para Caída Libre, el desplazamiento (h) debe ser negativo o cero.");
                processedH = rawH;
                // If displacement is given, assume initialY for sim starts at -h
                processedInitialYForSim = -rawH;
                initialYSimInput.value = processedInitialYForSim;
            } else {
                // 'h' is not provided. We must have another variable (vf or t).
                // Initial Y sim becomes the reference point.
                // The displacement 'h' will be calculated by the solver.
            }
        } else { // verticalLaunch
            // If launching downwards, and initial velocity is positive, convert to negative for 'upwards is positive' convention
            if (direction === 'downwards' && processedVi !== null && processedVi > 0) {
                processedVi = -processedVi;
            }
            // processedH and processedInitialYForSim are already correctly mapped from raw inputs
        }

        lastCalculationResults = calculateMotion({ // Store results
            vi: processedVi,
            vf: processedVf,
            h: processedH, // This is the displacement (Y_final - Y_initial)
            t: processedT,
            g: processedG,
            initialYForSim: processedInitialYForSim, // This is the absolute initial Y for simulation
            motionType: motionType, // Pass to physics.js for specific internal logic (e.g., t_flight)
            direction: direction, // Pass for specific internal logic
            queryTime: rawQueryTime,
            queryHeight: rawQueryHeight,
            rawVi: rawVi // Pass rawVi to physics.js for accurate input count validation
        });

        // 1. Logic to set initialYForSim based on calculated displacement (h), 
        // specifically for downward motion types, if initialYSim was set to default (0).
        const calculatedH = lastCalculationResults.h;
        const isDownwardMotion = motionType === 'freeFall' || (motionType === 'verticalLaunch' && direction === 'downwards');
        
        if (isDownwardMotion && rawInitialYSim === 0 && calculatedH !== null && Math.abs(calculatedH) > 1e-6) {
             // If initialYForSim was 0 (default/unspecified) and we calculated a negative displacement (h), 
             // we set the starting height for simulation to be -h, ensuring the final position is Y=0.
             const newInitialYSim = -calculatedH;
             
             // Update the results object for simulation rendering
             lastCalculationResults.initialYForSim = newInitialYSim;
             
             // Update the UI input field to reflect the new starting height
             initialYSimInput.value = newInitialYSim.toFixed(2);
        }
        
        // Display results
        const displayValue = (value) => value !== null ? value.toFixed(2) : '---';
        const displayComplexValue = (value) => value !== null ? value : '---'; // For values that are already formatted strings

        resVi.textContent = displayValue(lastCalculationResults.vi);
        resVf.textContent = displayValue(lastCalculationResults.vf);
        resH.textContent = displayValue(lastCalculationResults.h);
        resT.textContent = displayValue(lastCalculationResults.t);
        resG.textContent = displayValue(lastCalculationResults.g);
        resA.textContent = displayValue(lastCalculationResults.a);
        resHMax.textContent = displayValue(lastCalculationResults.h_max);
        resTMax.textContent = displayValue(lastCalculationResults.t_max);
        resTFlight.textContent = displayValue(lastCalculationResults.t_flight);
        resTotalDist.textContent = displayValue(lastCalculationResults.total_distance_travelled);

        // Display new results
        resVatTq.textContent = displayValue(lastCalculationResults.v_at_t_query);
        resHatTq.textContent = displayValue(lastCalculationResults.h_at_t_query);
        resTatHq.textContent = displayComplexValue(lastCalculationResults.t_at_h_query);
        resVatHq.textContent = displayComplexValue(lastCalculationResults.v_at_h_query);

        // Enable simulate button after successful calculation
        simulateBtn.disabled = false;
        // Also enable pause/restart since the results are ready for simulation
        pauseResumeBtn.disabled = false;
        restartBtn.disabled = false;
        pauseResumeBtn.textContent = 'Pausar'; // Reset button text

    } catch (error) {
        errorMessage.textContent = error.message;
        // Also clear simulation if there was an error
        if (simulationInitialized) {
             const ctx = canvas.getContext('2d');
             ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        lastCalculationResults = null; // Clear results on error
        simulateBtn.disabled = true; // Disable simulate button on error
        pauseResumeBtn.disabled = true; // Disable pause/restart buttons on error
        restartBtn.disabled = true;
    }
});

// Event listener for the new "Simular" button
simulateBtn.addEventListener('click', () => {
    if (lastCalculationResults) {
        // Initialize simulation if not already
        if (!simulationInitialized) {
            initSimulation('physicsCanvas');
            simulationInitialized = true;
        }

        // Trigger simulation, passing the end callback
        drawMotion(lastCalculationResults, handleSimulationEnd);
        pauseResumeBtn.textContent = 'Pausar'; // Reset button text when a new simulation starts
        pauseResumeBtn.disabled = false; // Enable pause button
        restartBtn.disabled = false; // Enable restart button
    } else {
        errorMessage.textContent = "Por favor, calcula los resultados primero.";
    }
});

// Event listener for the new pause/resume button
pauseResumeBtn.addEventListener('click', () => {
    if (pauseResumeBtn.textContent === 'Pausar') {
        pauseSimulation();
        pauseResumeBtn.textContent = 'Reanudar';
    } else {
        resumeSimulation();
        pauseResumeBtn.textContent = 'Pausar';
    }
});

// Event listener for the new restart button
restartBtn.addEventListener('click', () => {
    restartSimulation(); // Call the new restart function from simulation.js
    pauseResumeBtn.textContent = 'Pausar'; // Reset pause button to 'Pausar' when restarting
});

// Initially disable the simulate, pause and restart buttons until a calculation is run
simulateBtn.disabled = true;
pauseResumeBtn.disabled = true;
restartBtn.disabled = true;