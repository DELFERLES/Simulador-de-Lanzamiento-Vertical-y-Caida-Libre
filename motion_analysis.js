export function calculatePeakAndFlightMetrics(vi, a, initialYForSim, motionType, direction, totalTimeCalculated) {
    let t_max = null; // Time to reach max height where vf = 0
    let h_max_relative = null; // Max height from the initial point (displacement)
    let h_max_absolute = null; // Max height from ground (initialYForSim + h_max_relative)
    let t_flight = null; // Time to hit the ground (y = 0)

    // Ensure a is not zero for peak/flight calculations
    if (a !== 0 && vi !== null) {
        // Calculate t_max and h_max_relative for upward motion (a is negative for upward positive Y)
        if (vi > 0 && a < 0) { // Object is moving upwards against gravity
            t_max = -vi / a; // time when vf = 0
            if (t_max >= 0) { // Ensure t_max is a valid positive time
                h_max_relative = vi * t_max + 0.5 * a * t_max * t_max;
            } else { // Should not happen if vi > 0 and a < 0
                t_max = null;
            }
        }

        // Calculate h_max_absolute
        const currentInitialY = initialYForSim !== null ? Number(initialYForSim) : 0;
        if (h_max_relative !== null) {
            h_max_absolute = currentInitialY + h_max_relative;
        } else {
            // If no peak height, max height is the initial height
            // or the starting point for free fall (which is initialYForSim)
            if (motionType === 'freeFall') {
                h_max_absolute = currentInitialY;
            } else { // verticalLaunch, but not upward
                h_max_absolute = currentInitialY; // No peak above initial
            }
        }
        // Ensure h_max_absolute is not less than 0 if it represents a physical height
        if (h_max_absolute < 0) h_max_absolute = 0;

        // Calculate t_flight (time to hit the ground, assuming y_final = 0)
        // Solves 0 = initialYForSim + vi_calculated * t + 0.5 * a * t^2
        const A_flight = 0.5 * a;
        const B_flight = vi;
        const C_flight = currentInitialY;

        const discriminant_flight = B_flight * B_flight - 4 * A_flight * C_flight;

        if (discriminant_flight >= 0) {
            const t_flight1 = (-B_flight + Math.sqrt(discriminant_flight)) / (2 * A_flight);
            const t_flight2 = (-B_flight - Math.sqrt(discriminant_flight)) / (2 * A_flight);

            let validFlightTimes = [];
            if (t_flight1 >= 0) validFlightTimes.push(t_flight1);
            if (t_flight2 >= 0 && Math.abs(t_flight1 - t_flight2) > 1e-9) validFlightTimes.push(t_flight2);

            if (validFlightTimes.length > 0) {
                if (currentInitialY > 0) { // If starting above ground
                    if (vi <= 0) { // Moving downwards or at rest (free fall)
                        t_flight = Math.max(...validFlightTimes); // The positive time to hit ground
                    } else { // Moving upwards from above ground
                        // Can hit ground on the way up (if target is below start) or on the way down
                        t_flight = Math.max(...validFlightTimes); // The later time will be hitting ground on the way down
                    }
                } else { // Starting at or below ground (currentInitialY <= 0)
                    t_flight = Math.max(...validFlightTimes); // Take the maximum positive time
                    if (t_flight === 0 && (vi !== 0 || a !== 0)) { // If t_flight is 0, but motion is expected
                        t_flight = Math.min(...validFlightTimes.filter(t => t > 1e-9)); // If starting at 0 and goes up then down, take the other root
                    }
                }
            } else {
                t_flight = null; // No positive time to hit ground
            }

            // A special case: if starting at Y=0 and launched upwards, t_flight is often 2*t_max
            if (currentInitialY === 0 && vi > 0 && a < 0 && t_max !== null) {
                t_flight = 2 * t_max;
            }
        } else {
            t_flight = null; // No real solution for time to hit ground
        }
    }

    // If t_flight results in an extremely small negative value (due to float precision near 0)
    if (t_flight !== null && t_flight < 1e-9) {
        if (currentInitialY === 0 && vi === 0) t_flight = 0; // If nothing happens, flight time is 0
        else if (currentInitialY > 0 && vi < 0) t_flight = Math.abs(t_flight); // If falling and already very close to ground, just correct sign
    }

    // Ensure relevant values are null if calculation was not applicable
    if (t_max === null || t_max < 0 || (h_max_relative !== null && h_max_relative < 0)) {
        t_max = null;
        h_max_relative = null;
    }

    return { t_max, h_max_relative, h_max_absolute, t_flight };
}

export function calculateTotalDistanceTravelled(vi, a, final_displacement, total_time, t_max, h_max_relative) {
    let total_distance_travelled = null;

    if (total_time !== null) {
        if (a === 0) { // Constant velocity
            total_distance_travelled = Math.abs(final_displacement);
        } else if (vi > 0 && a < 0) { // Launched upwards (vi positive, a negative)
            if (t_max !== null && total_time > t_max) { // Object went up and came down past the peak
                total_distance_travelled = h_max_relative * 2 - final_displacement; // h_max_relative is positive. final_displacement is negative.
            } else { // Still moving upwards or at peak, or motion ended before peak
                total_distance_travelled = Math.abs(final_displacement);
            }
        } else { // Free fall or downward launch (monotonically changing height, vi negative or zero, a negative)
            total_distance_travelled = Math.abs(final_displacement);
        }
    }
    return total_distance_travelled;
}