import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AddPrinterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPrinter: (printer: {
    name: string;
    model: string;
    ip: string;
    accessCode: string;
    serial: string;
  }) => void;
}

export const AddPrinterDialog: React.FC<AddPrinterDialogProps> = ({
  isOpen,
  onClose,
  onAddPrinter,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    model: 'X1C',
    ip: '',
    accessCode: '',
    serial: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPrinter(formData);
    setFormData({ name: '', model: 'X1C', ip: '', accessCode: '', serial: '' });
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Add Bambu Lab Printer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Printer Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My X1 Carbon"
              />
            </div>

            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Printer Model
              </label>
              <select
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="X1C">X1 Carbon</option>
                <option value="X1E">X1 Elite</option>
                <option value="P1S">P1S</option>
                <option value="P1P">P1P</option>
                <option value="A1">A1</option>
                <option value="A1-mini">A1 Mini</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="ip"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                IP Address
              </label>
              <input
                type="text"
                id="ip"
                name="ip"
                value={formData.ip}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="192.168.1.100"
              />
            </div>

            <div>
              <label
                htmlFor="accessCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Access Code
              </label>
              <input
                type="text"
                id="accessCode"
                name="accessCode"
                value={formData.accessCode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345678"
              />
            </div>

            <div>
              <label
                htmlFor="serial"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Serial Number
              </label>
              <input
                type="text"
                id="serial"
                name="serial"
                value={formData.serial}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="01S00A123456789"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Printer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
