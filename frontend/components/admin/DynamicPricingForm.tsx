'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function DynamicPricingForm() {
  const [roomTypeId, setRoomTypeId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [suggestion, setSuggestion] = useState<any>(null);

  const getSuggestion = async () => {
    const result = await api.get(`/pricing/suggest/${roomTypeId}`);
    setSuggestion(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await api.put(`/pricing/update`, {
      room_type_id: parseInt(roomTypeId),
      new_price: parseFloat(newPrice),
    });

    alert('Price updated successfully');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        value={roomTypeId}
        onChange={(e) => setRoomTypeId(e.target.value)}
        placeholder="Room Type ID"
        className="w-full border p-2"
      />

      <input
        type="number"
        value={newPrice}
        onChange={(e) => setNewPrice(e.target.value)}
        placeholder="New Price"
        className="w-full border p-2"
      />

      <button type="button" onClick={getSuggestion}>
        Get AI Suggestion
      </button>

      {suggestion && (
        <p>Suggested: {suggestion.suggestedPrice}</p>
      )}

      <button type="submit">
        Save
      </button>
    </form>
  );
}
