/**
 * CMRForm Component - Story 6.022
 * 
 * React component for displaying and editing CMR (Consignment Record) form
 * Shows pre-filled trip details and allows warehouse manager to record
 * received units and damage information
 */

'use client';

import { useEffect, useState } from 'react';

interface PlanDetails {
  id: string;
  supplier: { id: string; name: string };
  destination: { id: string; name: string };
  unitCount: number;
  estimatedDeliveryTime: string;
}

interface CMRForm {
  id: string;
  tripId: string;
  receivedCount: number | null;
  damageDeclared: boolean;
  damageNotes: string | null;
  inspectorName: string | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED';
  version: number;
}

interface CMRFormComponentProps {
  tripId: string;
  onSave?: (cmr: CMRForm) => void;
  readOnly?: boolean;
}

interface CMRFormResponse {
  planDetails: PlanDetails;
  cmrForm: CMRForm;
}

export function CMRForm({ tripId, onSave, readOnly = false }: CMRFormComponentProps) {
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [cmrForm, setCmrForm] = useState<CMRForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    receivedCount: '',
    damageDeclared: false,
    damageNotes: '',
    inspectorName: ''
  });

  // Fetch CMR form on mount
  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/protected/warehouse/cmr/${tripId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CMR form: ${response.statusText}`);
        }

        const data: CMRFormResponse = await response.json();
        setPlanDetails(data.planDetails);
        setCmrForm(data.cmrForm);

        // Initialize form fields from CMR data
        setFormData({
          receivedCount: data.cmrForm.receivedCount?.toString() || '',
          damageDeclared: data.cmrForm.damageDeclared,
          damageNotes: data.cmrForm.damageNotes || '',
          inspectorName: data.cmrForm.inspectorName || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [tripId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    if (!cmrForm) return;

    try {
      // Prepare update payload
      const payload = {
        receivedCount: formData.receivedCount
          ? parseInt(formData.receivedCount, 10)
          : null,
        damageDeclared: formData.damageDeclared,
        damageNotes: formData.damageNotes || null,
        inspectorName: formData.inspectorName || null,
        version: cmrForm.version
      };

      // Call PATCH endpoint (to be implemented in 6-024)
      // For now, just trigger onSave callback
      if (onSave) {
        onSave({
          ...cmrForm,
          ...payload
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CMR');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading CMR form...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  if (!planDetails || !cmrForm) {
    return <div className="p-4 text-center">No CMR form found</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">CMR Form - Trip {tripId}</h1>

      {/* Trip Details Section - Read-Only */}
      <section className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Trip & Plan Details (Read-Only)</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Trip ID
            </label>
            <p className="mt-1 text-gray-900 font-mono">{cmrForm.tripId}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              From (Supplier)
            </label>
            <p className="mt-1 text-gray-900">{planDetails.supplier.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              To (Destination)
            </label>
            <p className="mt-1 text-gray-900">{planDetails.destination.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Planned Units
            </label>
            <p className="mt-1 text-gray-900 text-lg font-semibold">
              {planDetails.unitCount}
            </p>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Estimated Delivery
            </label>
            <p className="mt-1 text-gray-900">
              {new Date(planDetails.estimatedDeliveryTime).toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* CMR Form Section - Editable */}
      <section className="p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-6">Receipt & Inspection</h2>

        <div className="space-y-6">
          {/* Received Count */}
          <div>
            <label htmlFor="receivedCount" className="block text-sm font-medium text-gray-700">
              Received Units <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="receivedCount"
              name="receivedCount"
              value={formData.receivedCount}
              onChange={handleInputChange}
              disabled={readOnly}
              min="0"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter number of units received"
            />
            <p className="mt-1 text-sm text-gray-500">
              Planned: {planDetails.unitCount} units
            </p>
          </div>

          {/* Damage Declaration */}
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="damageDeclared"
                name="damageDeclared"
                checked={formData.damageDeclared}
                onChange={handleInputChange}
                disabled={readOnly}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
              />
              <label htmlFor="damageDeclared" className="ml-2 block text-sm font-medium text-gray-700">
                Damage Declared
              </label>
            </div>
          </div>

          {/* Damage Notes */}
          {formData.damageDeclared && (
            <div>
              <label htmlFor="damageNotes" className="block text-sm font-medium text-gray-700">
                Damage Notes
              </label>
              <textarea
                id="damageNotes"
                name="damageNotes"
                value={formData.damageNotes}
                onChange={handleInputChange}
                disabled={readOnly}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Describe the damage observed..."
              />
            </div>
          )}

          {/* Inspector Name */}
          <div>
            <label htmlFor="inspectorName" className="block text-sm font-medium text-gray-700">
              Inspector Name (Optional)
            </label>
            <input
              type="text"
              id="inspectorName"
              name="inspectorName"
              value={formData.inspectorName}
              onChange={handleInputChange}
              disabled={readOnly}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter inspector name"
            />
          </div>

          {/* CMR Status Badge */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-gray-700">
              CMR Status: <span className="font-semibold">{cmrForm.status}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Version: {cmrForm.version} (for conflict detection)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="mt-8 flex gap-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save CMR
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
