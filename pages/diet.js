import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import { Plus, X, Utensils, Flame, Beef, Sandwich, Droplet, Camera, Loader2 } from 'lucide-react';

export default function Diet() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tdee, setTdee] = useState(0);
  const [deficit, setDeficit] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  useEffect(() => {
    loadMeals();
    loadDeficit();
  }, []);

  const loadMeals = async () => {
    try {
      const response = await fetch('/api/diet/food');
      const data = await response.json();
      if (data.meals) {
        setMeals(data.meals);
      }
    } catch (err) {
      console.error('Failed to load meals:', err);
    }
  };

  const loadDeficit = async () => {
    try {
      const response = await fetch('/api/diet/deficit');
      const data = await response.json();
      if (data.tdee !== undefined) {
        setTdee(data.tdee);
        setDeficit(data.deficit);
      }
    } catch (err) {
      console.error('Failed to load deficit:', err);
    }
  };

  const getTotalCalories = () => {
    return meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  };

  const getTotalProtein = () => {
    return meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  };

  const getTotalCarbs = () => {
    return meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  };

  const getTotalFat = () => {
    return meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
  };

  const addMealToServer = async (mealInput) => {
    const payload = {
      name: mealInput.name?.trim(),
      calories:
        typeof mealInput.calories === 'string'
          ? parseFloat(mealInput.calories) || 0
          : Number(mealInput.calories) || 0,
      protein:
        typeof mealInput.protein === 'string'
          ? parseFloat(mealInput.protein) || 0
          : Number(mealInput.protein) || 0,
      carbs:
        typeof mealInput.carbs === 'string'
          ? parseFloat(mealInput.carbs) || 0
          : Number(mealInput.carbs) || 0,
      fat:
        typeof mealInput.fat === 'string'
          ? parseFloat(mealInput.fat) || 0
          : Number(mealInput.fat) || 0,
    };

    const response = await fetch('/api/diet/food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      const message = result?.error || 'Failed to add meal';
      throw new Error(message);
    }

    return result;
  };

  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result?.toString() || '');
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const createImageElement = (dataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image data'));
      img.src = dataUrl;
    });
  };

  const prepareImageForAnalysis = async (file) => {
    const originalDataUrl = await readFileAsDataURL(file);
    const mimeType = file.type && file.type.startsWith('image/')
      ? file.type
      : 'image/jpeg';

    try {
      const image = await createImageElement(originalDataUrl);
      const maxDimension = 768;
      const { width, height } = image;

      if (width <= maxDimension && height <= maxDimension) {
        return {
          base64: originalDataUrl.split(',')[1] || '',
          mimeType,
        };
      }

      const scale = Math.min(maxDimension / width, maxDimension / height);
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas not supported');
      }
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
      return {
        base64: compressedDataUrl.split(',')[1] || '',
        mimeType: 'image/jpeg',
      };
    } catch (error) {
      console.error('Failed to compress image:', error);
      return {
        base64: originalDataUrl.split(',')[1] || '',
        mimeType,
      };
    }
  };

  const toSafeNumber = (value) => {
    const numeric = Number.isFinite(value) ? value : parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.round(numeric * 10) / 10);
  };

  const handlePhotoUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setSuccess('');
    setAiLoading(true);

    try {
      const { base64: imageBase64, mimeType } = await prepareImageForAnalysis(file);

      if (!imageBase64 || imageBase64.length < 20) {
        throw new Error('Invalid image data');
      }

      if (imageBase64.length > 400000) {
        throw new Error('Image is too large. Please choose a smaller photo.');
      }

      const response = await fetch('/api/diet/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        const detail = data?.details ? `: ${data.details}` : '';
        const message = data?.error ? `${data.error}${detail}` : 'Unable to analyze the photo';
        throw new Error(message);
      }

      const meal = data.meal || {};
      const normalizedMeal = {
        name: meal.name || '',
        calories: toSafeNumber(meal.calories),
        protein: toSafeNumber(meal.protein),
        carbs: toSafeNumber(meal.carbs),
        fat: toSafeNumber(meal.fat),
      };

      setNewMeal({
        name: normalizedMeal.name,
        calories: normalizedMeal.calories ? normalizedMeal.calories.toString() : '',
        protein: normalizedMeal.protein ? normalizedMeal.protein.toString() : '',
        carbs: normalizedMeal.carbs ? normalizedMeal.carbs.toString() : '',
        fat: normalizedMeal.fat ? normalizedMeal.fat.toString() : '',
      });

      setLoading(true);
      await addMealToServer(normalizedMeal);
      setSuccess('Meal logged from photo!');
      setShowAddForm(false);
      setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      await loadMeals();
      await loadDeficit();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError(err.message || 'Failed to analyze the photo. You can enter the details manually.');
    } finally {
      setAiLoading(false);
      setLoading(false);
      if (input) {
        input.value = '';
      }
    }
  };

  const triggerCameraInput = () => {
    if (!aiLoading && !loading) {
      fileInputRef.current?.click();
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    
    if (!newMeal.name || !newMeal.calories) {
      setError('Food name and calories are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addMealToServer(newMeal);
      setSuccess('Meal added successfully!');
      setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      setShowAddForm(false);
      await loadMeals();
      await loadDeficit();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.message || 'Failed to add meal');
      console.error('Failed to add meal:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Head>
        <title>Diet - Get Good</title>
        <meta name="description" content="Track your diet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">🍽️ Diet Tracker</h1>
            <p className="text-gray-600">{getCurrentDate()}</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Calorie Counter Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 shadow-lg mb-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Today's Calories</h2>
              <Flame size={24} />
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl font-bold">
                {getTotalCalories()}
                <span className="text-2xl ml-2 opacity-90">kcal</span>
              </div>
              {tdee > 0 && (
                <div className="border-l-2 border-white/30 pl-4">
                  <p className="text-xs opacity-75">
                    {deficit >= 0 ? 'deficit' : 'surplus'}
                  </p>
                  <p className="text-2xl font-bold">{Math.abs(deficit)}</p>
                  <p className="text-xs opacity-75">calories</p>
                </div>
              )}
            </div>
            
            {/* Macros Summary */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/30">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Beef size={14} />
                  <p className="text-xs opacity-90">Protein</p>
                </div>
                <p className="text-lg font-bold">{getTotalProtein()}g</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Sandwich size={14} />
                  <p className="text-xs opacity-90">Carbs</p>
                </div>
                <p className="text-lg font-bold">{getTotalCarbs()}g</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Droplet size={14} />
                  <p className="text-xs opacity-90">Fat</p>
                </div>
                <p className="text-lg font-bold">{getTotalFat()}g</p>
              </div>
            </div>
          </div>

          {/* Add Food Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-lg shadow-md transition mb-6 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Food
          </button>

          {/* Meals List */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Utensils size={20} />
              Today's Meals ({meals.length})
            </h3>

            {meals.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
                <p className="text-gray-500">No meals logged yet today</p>
                <p className="text-sm text-gray-400 mt-1">Add your first meal to start tracking!</p>
              </div>
            ) : (
              meals.map((meal, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{meal.name}</h4>
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                      {meal.calories} kcal
                    </span>
                  </div>
                  
                  {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">P:</span> {meal.protein}g
                      </div>
                      <div>
                        <span className="font-medium">C:</span> {meal.carbs}g
                      </div>
                      <div>
                        <span className="font-medium">F:</span> {meal.fat}g
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Add Food Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Add New Food</h3>
                <button
                  type="button"
                  onClick={triggerCameraInput}
                  disabled={aiLoading || loading}
                  className="p-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  title="Use photo to log food"
                >
                  <Camera size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
                  setError('');
                }}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {aiLoading && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 mb-4">
                <Loader2 size={16} className="animate-spin" />
                <span>Analyzing photo with AI...</span>
              </div>
            )}

            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Food Name *
                </label>
                <input
                  type="text"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  placeholder="e.g., Chicken Breast"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Calories (kcal) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newMeal.calories}
                  onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newMeal.fat}
                    onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-lg shadow-md transition disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Food'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
