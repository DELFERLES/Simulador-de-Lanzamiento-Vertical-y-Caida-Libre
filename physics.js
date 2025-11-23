import { solveKinematicVariables } from './kinematics_solver.js';
import { calculatePeakAndFlightMetrics, calculateTotalDistanceTravelled } from './motion_analysis.js';
import { getVelocityAtTime, getHeightAtTime, getTimesAtHeight, getVelocitiesAtHeight } from './query_processor.js';

export function calculateMotion(inputs) {
    let { vi, vf, h, t, g, initialYForSim, queryTime, queryHeight } = inputs; // Removed motionType and direction from destructuring as they are now used internally for 'a' and 'vi' sign setup
    const motionType = inputs.motionType; // Keep reference to original motionType
    const direction = inputs.direction; // Keep reference to original direction

    let a;

    // Validate gravity input
    if (g === null || g === undefined) {
        throw new Error("El valor de la gravedad (g) es obligatorio.");
    }
    g = Number(g); // Ensure g is a number

    // Acceleration 'a' is always -g (gravity acts downwards, assuming upwards is positive Y).
    // This ensures gravity is consistently treated with a negative sign for all motion types
    // (vertical launch upwards, downwards, and free fall), as requested by the user.
    a = -g;

    // Identify which 2 of (vi, vf, h, t) are known
    const knownValues = { vi, vf, h, t };
    const definedKeys = Object.keys(knownValues).filter(key => knownValues[key] !== null && knownValues[key] !== undefined);

    let actualDefinedCount = definedKeys.length;
    // If vi was set to 0 for freeFall and it was *originally* null, don't count it for validation
    if (motionType === 'freeFall' && inputs.rawVi === null && vi === 0) { // Using rawVi from script.js to check original input
        actualDefinedCount = definedKeys.filter(key => key !== 'vi').length;
    }

    if (actualDefinedCount !== 2) {
        throw new Error("Debe ingresar exactamente dos de los valores (Velocidad Inicial, Velocidad Final, Desplazamiento, Tiempo) además de la gravedad.");
    }

    // Convert all known values to numbers
    vi = vi !== null ? Number(vi) : null;
    vf = vf !== null ? Number(vf) : null;
    h = h !== null ? Number(h) : null; // h represents displacement
    t = t !== null ? Number(t) : null;

    // Solves for unknowns (vi, vf, h, t)
    const solvedKinematics = solveKinematicVariables({ vi, vf, h, t }, a); // Pass 'a' directly

    // Calculate max values and flight time related to the scenario
    const { t_max, h_max_relative, h_max_absolute, t_flight } = calculatePeakAndFlightMetrics(
        solvedKinematics.vi,
        solvedKinematics.a, // Use solved 'a' (which is -g)
        initialYForSim,
        motionType, // Pass motionType and direction for specific peak/flight logic
        direction,
        solvedKinematics.t
    );

    // Additional Calculations based on Queries
    const v_at_t_query = getVelocityAtTime(solvedKinematics.vi, solvedKinematics.a, queryTime);
    const h_at_t_query = getHeightAtTime(solvedKinematics.vi, solvedKinematics.a, initialYForSim, queryTime);
    
    // Get raw times for the height query
    const times_at_h_query_raw = getTimesAtHeight(solvedKinematics.vi, solvedKinematics.a, initialYForSim, queryHeight);
    // Format times for display
    const t_at_h_query_formatted = times_at_h_query_raw.length > 0
        ? times_at_h_query_raw.map(t => t.toFixed(2)).join('s o ') + 's'
        : null;

    const v_at_h_query = getVelocitiesAtHeight(
        solvedKinematics.vi,
        solvedKinematics.a,
        initialYForSim,
        queryHeight,
        h_max_absolute, // Pass h_max_absolute for logic on velocities at height
        h_max_relative // Pass h_max_relative for logic on velocities at height
    );

    // Calculate Total Distance Travelled
    const total_distance_travelled = calculateTotalDistanceTravelled(
        solvedKinematics.vi,
        solvedKinematics.a,
        solvedKinematics.h, // This is final displacement 'h'
        solvedKinematics.t, // This is total time 't'
        t_max,
        h_max_relative
    );

    return {
        vi: solvedKinematics.vi,
        vf: solvedKinematics.vf, // Now directly using the 'vf' calculated by the solver
        h: solvedKinematics.h, // this is displacement
        t: solvedKinematics.t,
        g: g,
        a: solvedKinematics.a, // This will be -g
        t_max: t_max,
        h_max: h_max_absolute, // absolute height
        t_flight: t_flight,
        motionType: motionType, // Pass back for simulation to use
        initialYForSim: initialYForSim,

        // New additional calculations
        v_at_t_query: v_at_t_query,
        h_at_t_query: h_at_t_query,
        t_at_h_query: t_at_h_query_formatted, // Formatted string for display
        v_at_h_query: v_at_h_query,
        total_distance_travelled: total_distance_travelled,
        
        // Pass query inputs and raw results to simulation
        queryTime: queryTime, 
        times_at_h_query_raw: times_at_h_query_raw
    };
}