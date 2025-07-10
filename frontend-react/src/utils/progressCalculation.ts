import { PrintJob } from '../types/printer';

export interface ProgressCalculation {
  progress: number;
  source: 'direct' | 'time' | 'layer' | 'unknown';
}

/**
 * Calculate print progress with fallback methods
 * Priority: Direct progress (if > 0) > Layer-based > Time-based > Direct progress (if 0) > Estimation
 */
export function calculateProgress(
  printJob: PrintJob | null
): ProgressCalculation {
  if (!printJob) {
    return { progress: 0, source: 'unknown' };
  }

  // Method 1: Direct progress (preferred when > 0)
  // Use direct progress if it's a meaningful positive value
  if (typeof printJob.progress === 'number' && printJob.progress > 0) {
    return {
      progress: Math.min(100, Math.max(0, printJob.progress)),
      source: 'direct',
    };
  }

  // Method 2: Layer-based calculation (more reliable than time estimation)
  if (printJob.layerCurrent > 0 && printJob.layerTotal > 0) {
    const layerProgress = (printJob.layerCurrent / printJob.layerTotal) * 100;

    if (layerProgress >= 0 && layerProgress <= 100) {
      return {
        progress: Math.min(100, Math.max(0, layerProgress)),
        source: 'layer',
      };
    }
  }

  // Method 3: Time-based calculation (with estimated total time)
  if (printJob.timeRemaining > 0 && printJob.estimatedTotalTime > 0) {
    const elapsed = printJob.estimatedTotalTime - printJob.timeRemaining;
    const timeProgress = (elapsed / printJob.estimatedTotalTime) * 100;

    if (timeProgress >= 0 && timeProgress <= 100) {
      return {
        progress: Math.min(100, Math.max(0, timeProgress)),
        source: 'time',
      };
    }
  }

  // Method 4: Direct progress of 0 (valid when it's the best available data)
  if (typeof printJob.progress === 'number' && printJob.progress === 0) {
    return {
      progress: 0,
      source: 'direct',
    };
  }

  // Method 5: Direct progress with clamping for invalid values
  if (typeof printJob.progress === 'number') {
    return {
      progress: Math.min(100, Math.max(0, printJob.progress)),
      source: 'direct',
    };
  }

  // Method 6: Rough time estimation (when we have time remaining but no total time)
  // This gives a very rough estimate assuming typical print times
  if (printJob.timeRemaining > 0) {
    // For very short remaining times, assume we're near the end
    if (printJob.timeRemaining <= 300) {
      // 5 minutes or less
      return {
        progress: 95,
        source: 'time',
      };
    }
    // For longer times, we can't reliably estimate progress without total time
    // But we can at least show that something is happening
    return {
      progress: 5, // Show minimal progress to indicate active print
      source: 'time',
    };
  }

  // Fallback: No progress available
  return { progress: 0, source: 'unknown' };
}

/**
 * Get a human-readable description of the progress source
 */
export function getProgressSourceDescription(
  source: ProgressCalculation['source']
): string {
  switch (source) {
    case 'direct':
      return 'Direct from printer';
    case 'time':
      return 'Calculated from time remaining';
    case 'layer':
      return 'Calculated from layer progress';
    case 'unknown':
    default:
      return 'Progress unavailable';
  }
}
