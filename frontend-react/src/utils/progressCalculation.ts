import { PrintJob } from '../types/printer';

export interface ProgressCalculation {
  progress: number;
  source: 'direct' | 'time' | 'layer' | 'unknown';
}

/**
 * Try to get progress from direct printer value
 */
function getDirectProgress(printJob: PrintJob): ProgressCalculation | null {
  if (typeof printJob.progress === 'number' && printJob.progress > 0) {
    return {
      progress: Math.min(100, Math.max(0, printJob.progress)),
      source: 'direct',
    };
  }
  return null;
}

/**
 * Try to calculate progress from layer information
 */
function getLayerProgress(printJob: PrintJob): ProgressCalculation | null {
  if (printJob.layerCurrent > 0 && printJob.layerTotal > 0) {
    const layerProgress = (printJob.layerCurrent / printJob.layerTotal) * 100;

    if (layerProgress >= 0 && layerProgress <= 100) {
      return {
        progress: Math.min(100, Math.max(0, layerProgress)),
        source: 'layer',
      };
    }
  }
  return null;
}

/**
 * Try to calculate progress from time information
 */
function getTimeProgress(printJob: PrintJob): ProgressCalculation | null {
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
  return null;
}

/**
 * Try to get fallback progress estimates
 */
function getFallbackProgress(printJob: PrintJob): ProgressCalculation {
  // Method 1: Direct progress of 0 (valid when it's the best available data)
  if (typeof printJob.progress === 'number' && printJob.progress === 0) {
    return {
      progress: 0,
      source: 'direct',
    };
  }

  // Method 2: Direct progress with clamping for invalid values
  if (typeof printJob.progress === 'number') {
    return {
      progress: Math.min(100, Math.max(0, printJob.progress)),
      source: 'direct',
    };
  }

  // Method 3: Rough time estimation (when we have time remaining but no total time)
  if (printJob.timeRemaining > 0) {
    // For very short remaining times, assume we're near the end
    if (printJob.timeRemaining <= 300) {
      // 5 minutes or less
      return {
        progress: 95,
        source: 'time',
      };
    }
    // For longer times, show minimal progress to indicate active print
    return {
      progress: 5,
      source: 'time',
    };
  }

  // Fallback: No progress available
  return { progress: 0, source: 'unknown' };
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

  // Try each method in priority order
  const directProgress = getDirectProgress(printJob);
  if (directProgress) {
    return directProgress;
  }

  const layerProgress = getLayerProgress(printJob);
  if (layerProgress) {
    return layerProgress;
  }

  const timeProgress = getTimeProgress(printJob);
  if (timeProgress) {
    return timeProgress;
  }

  // Use fallback methods
  return getFallbackProgress(printJob);
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
