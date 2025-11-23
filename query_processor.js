export function getVelocityAtTime(vi, a, queryTime) {
    let v_at_t_query = null;
    if (queryTime !== null && queryTime !== '' && vi !== null && a !== null) {
        const tq_num = Number(queryTime);
        if (tq_num >= 0) {
            v_at_t_query = vi + a * tq_num;
        }
    }
    return v_at_t_query;
}

export function getHeightAtTime(vi, a, initialYSim, queryTime) {
    let h_at_t_query = null;
    if (queryTime !== null && queryTime !== '' && vi !== null && a !== null) {
        const tq_num = Number(queryTime);
        if (tq_num >= 0) {
            const initialY = initialYSim !== null ? initialYSim : 0;
            h_at_t_query = initialY + vi * tq_num + 0.5 * a * tq_num * tq_num;
        }
    }
    return h_at_t_query;
}

export function getTimesAtHeight(vi, a, initialYSim, queryHeight) {
    let validTimes = []; // Return an array of valid times
    if (queryHeight !== null && queryHeight !== '' && vi !== null && a !== null) {
        const hq_num = Number(queryHeight);
        const initialY = initialYSim !== null ? initialYSim : 0;
        const relativeH_query = hq_num - initialY;

        const A_query = 0.5 * a;
        const B_query = vi;
        const C_query = -relativeH_query;

        if (A_query === 0) { // Linear case (constant velocity, a=0)
            if (B_query !== 0) {
                const t_sol_linear = relativeH_query / B_query;
                if (t_sol_linear >= 0) {
                    validTimes.push(t_sol_linear);
                }
            }
        } else { // Quadratic case
            const discriminant_query = B_query * B_query - 4 * A_query * C_query;
            if (discriminant_query >= 0) {
                const t_q1 = (-B_query + Math.sqrt(discriminant_query)) / (2 * A_query);
                const t_q2 = (-B_query - Math.sqrt(discriminant_query)) / (2 * A_query);

                if (t_q1 >= 0) validTimes.push(t_q1);
                if (t_q2 >= 0 && t_q1.toFixed(5) !== t_q2.toFixed(5)) validTimes.push(t_q2); // Avoid duplicate for single root
            }
        }

        if (validTimes.length > 0) {
            validTimes.sort((a, b) => a - b);
        }
    }
    return validTimes; // Return the array of raw times
}

export function getVelocitiesAtHeight(vi, a, initialYSim, queryHeight, h_max_absolute, h_max_relative) {
    let v_at_h_query = null;
    if (queryHeight !== null && queryHeight !== '' && vi !== null && a !== null) {
        const hq_num = Number(queryHeight);
        const initialY = initialYSim !== null ? initialYSim : 0;
        const relativeH_query = hq_num - initialY;

        const val_v_sq = vi * vi + 2 * a * relativeH_query;

        if (val_v_sq >= 0) {
            const v_mag = Math.sqrt(val_v_sq);
            let velocities = [];

            if (a === 0) { // Linear case (constant velocity)
                velocities.push(vi);
            } else {
                // For upward launch, if vf goes from positive to negative, consider both.
                // If moving upwards (vi > 0, a < 0) and the target height is reachable before or after peak
                // If the motion started going down (vi < 0, a > 0), only one velocity typically.
                if (a < 0 && vi > 0) { // Launched upwards
                    // Can reach a height going up or coming down
                    velocities.push(v_mag); // Velocity going up
                    if (hq_num <= h_max_absolute || h_max_absolute === null) { // If query height is less than or equal to max height
                         // If it passes through this height on the way down too
                         if (h_max_relative !== null && relativeH_query < h_max_relative && h_max_relative > 0) {
                             velocities.push(-v_mag); // Velocity going down
                         }
                    }
                } else { // Free fall or launched downwards, or upward but immediately descending
                    velocities.push(vi < 0 ? -v_mag : v_mag); // Pick sign consistent with initial motion or magnitude if zero
                    if (vi === 0 && hq_num < initialY) { // Free fall down from initialY
                       velocities = [-v_mag]; // It only falls down
                    } else if (vi > 0 && hq_num < initialY && a > 0) { // Moving down and speeding up
                        velocities = [v_mag];
                    } else { // Generic, might be just one
                        velocities = [v_mag];
                    }
                }
            }
            velocities = [...new Set(velocities.map(v => v.toFixed(2)))].map(Number).sort((a,b) => a-b);
            if (velocities.length > 0) {
                v_at_h_query = velocities.join('m/s o ') + 'm/s';
            }
        }
    }
    return v_at_h_query;
}