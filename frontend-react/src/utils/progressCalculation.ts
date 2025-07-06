import { PrintJob } from '../types/printer';

export interface ProgressCalculation {
  progress: number;
  source: 'direct' | 'time' | 'layer' | 'unknown';
}

/**
 * Calculate print progress with fallback methods
 * Priority: Direct progress > Time-based > Layer-based > 0%
 */
export function calculateProgress(
  printJob: PrintJob | null
): ProgressCalculation {
  if (!printJob) {
    return { progress: 0, source: 'unknown' };
  }

  // Method 1: Direct progress (preferred)
  if (printJob.progress > 0) {
    return {
      progress: Math.min(100, Math.max(0, printJob.progress)),
      source: 'direct',
    };
  }

  // Method 2: Time-based calculation
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

  // Method 3: Layer-based calculation
  if (printJob.layerCurrent > 0 && printJob.layerTotal > 0) {
    const layerProgress = (printJob.layerCurrent / printJob.layerTotal) * 100;

    if (layerProgress >= 0 && layerProgress <= 100) {
      return {
        progress: Math.min(100, Math.max(0, layerProgress)),
        source: 'layer',
      };
    }
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
