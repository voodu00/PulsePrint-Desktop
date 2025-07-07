export class TauriMqttService {
  initialize = jest.fn().mockResolvedValue(undefined);
  destroy = jest.fn();
  getPrinters = jest.fn().mockReturnValue([]);
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  addPrinter = jest.fn().mockResolvedValue(undefined);
  removePrinter = jest.fn().mockResolvedValue(undefined);
  getStatistics = jest.fn().mockReturnValue({
    total: 0,
    online: 0,
    printing: 0,
    idle: 0,
    error: 0,
  });

  constructor() {
    // Mock constructor
  }
}
