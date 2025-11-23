export function solveKinematicVariables(knownValues, a) {
    let { vi, vf, h, t } = knownValues;

    let solved = { vi, vf, h, t, a };

    // Keep iterating until all unknowns are solved or no more progress
    let changed = true;
    let iterationCount = 0;
    while (changed && iterationCount < 5) { // Limit iterations to prevent infinite loops
        changed = false;

        // Try to solve for a missing variable using two knowns + 'a'
        if (solved.vi !== null && solved.t !== null && solved.a !== null) {
            if (solved.vf === null) { solved.vf = solved.vi + solved.a * solved.t; changed = true; } // Eq 1
            if (solved.h === null) { solved.h = solved.vi * solved.t + 0.5 * solved.a * solved.t * solved.t; changed = true; } // Eq 2
        }
        if (solved.vi !== null && solved.vf !== null && solved.a !== null) {
            if (solved.t === null && solved.a !== 0) {
                solved.t = (solved.vf - solved.vi) / solved.a;
                // Ensure time is non-negative for physical sense
                if (solved.t < 0) solved.t = null; // Discard negative time if physically implausible
                changed = true;
            }
            if (solved.h === null && solved.a !== 0) { solved.h = (solved.vf * solved.vf - solved.vi * solved.vi) / (2 * solved.a); changed = true; } // Eq 3
        }
        if (solved.vi !== null && solved.h !== null && solved.a !== null) {
            if (solved.vf === null) { // Eq 3: vf^2 = vi^2 + 2ah
                const val = solved.vi * solved.vi + 2 * solved.a * solved.h;
                if (val >= 0) {
                    // For vf^2, always take the magnitude. Sign will be handled by Eq 1 if t is known,
                    // or inferred based on context in motion_analysis/query_processor.
                    // If moving downwards, velocity should be negative.
                    if (solved.h < 0 && solved.a < 0) { // If displacement is negative and acceleration is negative (falling)
                        solved.vf = -Math.sqrt(val);
                    } else if (solved.h >= 0 && solved.a < 0 && solved.vi > 0 && solved.vi * solved.vi < 2 * Math.abs(solved.a) * solved.h) {
                        // If moving upwards (vi > 0), h > 0, a < 0, but passed peak
                        solved.vf = -Math.sqrt(val);
                    } else { // Otherwise, assume it's still moving in the general positive direction
                        solved.vf = Math.sqrt(val);
                    }
                    changed = true;
                }
            }
            if (solved.t === null) { // Eq 2: h = vi*t + 0.5*a*t^2 => 0.5*a*t^2 + vi*t - h = 0 (quadratic)
                const A = 0.5 * solved.a;
                const B = solved.vi;
                const C = -solved.h;
                const discriminant = B * B - 4 * A * C;
                if (discriminant >= 0) {
                    const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
                    const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);

                    let validTimes = [];
                    if (t1 >= 0) validTimes.push(t1);
                    if (t2 >= 0 && Math.abs(t1 - t2) > 1e-9) validTimes.push(t2); // Avoid near duplicates

                    if (validTimes.length > 0) {
                        // Choose the smallest non-negative time that makes sense.
                        // If it's falling (h < 0), pick the positive time.
                        if (solved.h < 0 && solved.a < 0) { // object is falling
                            solved.t = Math.max(...validTimes); // Pick the later time if it passed initial height
                        } else if (solved.h > 0 && solved.a < 0 && solved.vi > 0) { // object moving up
                            if (validTimes.length === 2) {
                                solved.t = Math.min(...validTimes); // Pick earlier time for reaching height going up
                            } else {
                                solved.t = validTimes[0];
                            }
                        } else {
                            solved.t = Math.min(...validTimes); // Default to minimum positive time
                        }
                    } else {
                        solved.t = null; // No real, non-negative solution
                    }
                    if (solved.t !== null) changed = true;
                } else {
                    // No real solution for time with these inputs (discriminant negative).
                    // This error is caught in physics.js.
                }
            }
        }
        if (solved.vf !== null && solved.t !== null && solved.a !== null) {
            if (solved.vi === null) { solved.vi = solved.vf - solved.a * solved.t; changed = true; } // Eq 1
            if (solved.h === null) { solved.h = solved.vf * solved.t - 0.5 * solved.a * solved.t * solved.t; changed = true; } // Eq 2 (derived from 1)
        }
        if (solved.vf !== null && solved.h !== null && solved.a !== null) {
            if (solved.vi === null) { // Eq 3: vi^2 = vf^2 - 2ah
                const val = solved.vf * solved.vf - 2 * solved.a * solved.h;
                if (val >= 0) {
                    // Similar sign logic as for vf.
                    if (solved.h > 0 && solved.a < 0 && solved.vf < 0) { // If reached higher point and is falling
                        solved.vi = Math.sqrt(val); // Must have started with positive velocity
                    } else if (solved.h <= 0 && solved.a < 0 && solved.vf < 0) { // If falling
                        solved.vi = -Math.sqrt(val); // Must have started with negative or zero velocity
                    } else {
                        solved.vi = Math.sqrt(val);
                    }
                    changed = true;
                }
            }
            if (solved.t === null && solved.a !== 0) {
                solved.t = (solved.vf - solved.vi) / solved.a;
                if (solved.t < 0) solved.t = null;
                changed = true;
            }
        }
        if (solved.h !== null && solved.t !== null && solved.a !== null) {
            if (solved.vi === null && solved.t !== 0) { solved.vi = (solved.h - 0.5 * solved.a * solved.t * solved.t) / solved.t; changed = true; } // Eq 2
            if (solved.vf === null) { solved.vf = solved.vi + solved.a * solved.t; changed = true; } // Eq 1
        }
        if (solved.vi !== null && solved.vf !== null && solved.h !== null && solved.t === null) {
             if (solved.vi + solved.vf !== 0) { // Avoid division by zero if vi + vf = 0
                solved.t = (2 * solved.h) / (solved.vi + solved.vf);
                if (solved.t < 0) solved.t = null;
                changed = true;
             }
        }
        if (solved.vi !== null && solved.vf !== null && solved.t !== null && solved.h === null) {
            solved.h = (solved.vi + solved.vf) / 2 * solved.t; changed = true; // Eq 4
        }
        iterationCount++;
    }
    return solved;
}