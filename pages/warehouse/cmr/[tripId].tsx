/**
 * CMR Form Page - Story 6.022
 * 
 * Page for warehouse managers to fill out CMR forms for received shipments
 */

import { useRouter } from 'next/router';
import { CMRForm } from '@/src/components/CMRForm';

export default function CMRFormPage() {
  const router = useRouter();
  const { tripId } = router.query;

  if (!tripId || typeof tripId !== 'string') {
    return (
      <div className="p-4 text-center text-red-600">
        Invalid trip ID
      </div>
    );
  }

  const handleSave = (cmrData: any) => {
    console.log('CMR saved:', cmrData);
    // Will be extended in story 6-024 (Edit CMR Progressive)
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <CMRForm tripId={tripId} onSave={handleSave} />
    </div>
  );
}
