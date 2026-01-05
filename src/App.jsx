import React, { useState, useRef, useEffect } from 'react';
import { Ruler, Trees, Save, Trash2, Share2, Edit2, Move, X } from 'lucide-react';

export default function YardPlanner() {
  const [address, setAddress] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mode, setMode] = useState('view');
  const [scale, setScale] = useState(null);
  const [fenceLines, setFenceLines] = useState([]);
  const [currentFence, setCurrentFence] = useState(null);
  const [trees, setTrees] = useState([]);
  const [currentTree, setCurrentTree] = useState(null);
  const [notes, setNotes] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [movingItem, setMovingItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Load from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        setAddress(decoded.address || '');
        setMapLoaded(decoded.mapLoaded || false);
        setScale(decoded.scale || null);
        setFenceLines(decoded.fenceLines || []);
        setTrees(decoded.trees || []);
        setNotes(decoded.notes || '');
      } catch (e) {
        console.error('Failed to load data from URL');
      }
    }
  }, []);

  const loadMap = () => {
    if (address.trim()) {
      setMapLoaded(true);
    }
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if we're moving an item
    if (movingItem) {
      if (movingItem.type === 'tree') {
        const tree = trees.find(t => t.id === movingItem.id);
        if (tree) {
          setDragOffset({
            x: x - tree.center.x,
            y: y - tree.center.y
          });
        }
      } else if (movingItem.type === 'fence') {
        const fence = fenceLines.find(f => f.id === movingItem.id);
        if (fence) {
          setDragOffset({
            x: x - fence.start.x,
            y: y - fence.start.y
          });
        }
      }
      setIsDragging(true);
      return;
    }

    if (mode === 'fence') {
      setCurrentFence({ 
        start: { x, y }, 
        end: { x, y }, 
        length: null,
        name: `Fence ${fenceLines.length + 1}`
      });
      setIsDragging(true);
    } else if (mode === 'tree') {
      setCurrentTree({ 
        center: { x, y }, 
        radius: 0,
        name: `Tree ${trees.length + 1}`
      });
      setIsDragging(true);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle moving items
    if (movingItem) {
      if (movingItem.type === 'tree') {
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        updateTree(movingItem.id, { center: { x: newX, y: newY } });
      } else if (movingItem.type === 'fence') {
        const fence = fenceLines.find(f => f.id === movingItem.id);
        if (fence) {
          const dx = x - dragOffset.x - fence.start.x;
          const dy = y - dragOffset.y - fence.start.y;
          updateFence(movingItem.id, {
            start: { x: fence.start.x + dx, y: fence.start.y + dy },
            end: { x: fence.end.x + dx, y: fence.end.y + dy }
          });
          setDragOffset({
            x: x - fence.start.x - dx,
            y: y - fence.start.y - dy
          });
        }
      }
      return;
    }

    if (mode === 'fence' && currentFence) {
      setCurrentFence({ ...currentFence, end: { x, y } });
    } else if (mode === 'tree' && currentTree) {
      const dx = x - currentTree.center.x;
      const dy = y - currentTree.center.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      setCurrentTree({ ...currentTree, radius });
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If we were moving an item, stop moving
    if (movingItem) {
      setMovingItem(null);
      return;
    }

    if (mode === 'fence' && currentFence) {
      const length = prompt('Enter the length of this fence line in feet:');
      if (length && !isNaN(length)) {
        const pixelLength = Math.sqrt(
          Math.pow(currentFence.end.x - currentFence.start.x, 2) +
          Math.pow(currentFence.end.y - currentFence.start.y, 2)
        );
        const lineScale = pixelLength / parseFloat(length);
        
        const newFence = { 
          ...currentFence, 
          length: parseFloat(length),
          id: Date.now()
        };
        setFenceLines([...fenceLines, newFence]);
        
        if (!scale) {
          setScale(lineScale);
        } else {
          setScale((scale + lineScale) / 2);
        }
      }
      setCurrentFence(null);
    } else if (mode === 'tree' && currentTree && currentTree.radius > 5) {
      const newTree = {
        ...currentTree,
        id: Date.now()
      };
      setTrees([...trees, newTree]);
      setCurrentTree(null);
    } else if (mode === 'tree') {
      setCurrentTree(null);
    }
  };

  const updateFence = (id, updates) => {
    setFenceLines(fenceLines.map(f => f.id === id ? { ...f, ...updates } : f));
    if (updates.length && scale) {
      const fence = fenceLines.find(f => f.id === id);
      if (fence) {
        const pixelLength = Math.sqrt(
          Math.pow(fence.end.x - fence.start.x, 2) +
          Math.pow(fence.end.y - fence.start.y, 2)
        );
        const newScale = pixelLength / updates.length;
        setScale(newScale);
      }
    }
  };

  const updateTree = (id, updates) => {
    setTrees(trees.map(t => {
      if (t.id === id) {
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const deleteFence = (id) => {
    setFenceLines(fenceLines.filter(f => f.id !== id));
  };

  const deleteTree = (id) => {
    setTrees(trees.filter(t => t.id !== id));
  };

  const startMovingItem = (type, id) => {
    setMovingItem({ type, id });
    setMode('view'); // Switch to view mode when moving
  };

  const saveAndShare = () => {
    const data = {
      address,
      mapLoaded,
      scale,
      fenceLines,
      trees,
      notes
    };
    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard! Share this URL to share your yard design.');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mapLoaded) {
      ctx.fillStyle = '#e8f5e9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#a5d6a7';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Aerial View Area', canvas.width / 2, canvas.height / 2);
      ctx.font = '14px Arial';
      ctx.fillText('(In production, this would show Google Maps imagery)', canvas.width / 2, canvas.height / 2 + 25);
    }

    // Draw fence lines
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    fenceLines.forEach(fence => {
      ctx.beginPath();
      ctx.moveTo(fence.start.x, fence.start.y);
      ctx.lineTo(fence.end.x, fence.end.y);
      ctx.stroke();
      
      const midX = (fence.start.x + fence.end.x) / 2;
      const midY = (fence.start.y + fence.end.y) / 2;
      ctx.fillStyle = '#8b4513';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${fence.name}: ${fence.length} ft`, midX, midY - 5);
    });

    if (currentFence && isDragging) {
      ctx.strokeStyle = '#d2691e';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentFence.start.x, currentFence.start.y);
      ctx.lineTo(currentFence.end.x, currentFence.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw trees
    trees.forEach(tree => {
      // Draw trunk
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.arc(tree.center.x, tree.center.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw canopy
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      ctx.beginPath();
      ctx.arc(tree.center.x, tree.center.y, tree.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw radius line (dotted)
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tree.center.x, tree.center.y);
      ctx.lineTo(tree.center.x + tree.radius, tree.center.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw measurement on radius line
      const diameter = scale ? ((tree.radius * 2) / scale).toFixed(1) : (tree.radius * 2).toFixed(0);
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${diameter} ft`, tree.center.x + tree.radius / 2, tree.center.y - 5);
      
      // Draw name below tree
      ctx.font = '11px Arial';
      ctx.fillText(tree.name, tree.center.x, tree.center.y + tree.radius + 15);
    });

    if (currentTree && currentTree.radius > 0 && isDragging) {
      ctx.fillStyle = '#6d4c41';
      ctx.beginPath();
      ctx.arc(currentTree.center.x, currentTree.center.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      ctx.beginPath();
      ctx.arc(currentTree.center.x, currentTree.center.y, currentTree.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw radius line
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(currentTree.center.x, currentTree.center.y);
      ctx.lineTo(currentTree.center.x + currentTree.radius, currentTree.center.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const diameter = scale ? ((currentTree.radius * 2) / scale).toFixed(1) : (currentTree.radius * 2).toFixed(0);
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${diameter} ft`, currentTree.center.x + currentTree.radius / 2, currentTree.center.y - 5);
    }
  }, [mapLoaded, fenceLines, currentFence, trees, currentTree, scale, isDragging]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-green-800 mb-2">Yard Planner</h1>
            <p className="text-gray-600">Design your landscape with precision</p>
          </div>
          {mapLoaded && (
            <button
              onClick={saveAndShare}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Share2 size={18} /> Save & Share
            </button>
          )}
        </div>

        {!mapLoaded ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Enter Your Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && loadMap()}
              />
              <button
                onClick={loadMap}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
              >
                Load Map
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setMode('view')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      mode === 'view'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    View Mode
                  </button>
                  <button
                    onClick={() => setMode('fence')}
                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                      mode === 'fence'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Ruler size={18} /> Draw Fence
                  </button>
                  <button
                    onClick={() => setMode('tree')}
                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                      mode === 'tree'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Trees size={18} /> Place Tree
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Clear all items?')) {
                        setFenceLines([]);
                        setTrees([]);
                        setScale(null);
                      }
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2 ml-auto"
                  >
                    <Trash2 size={18} /> Clear All
                  </button>
                </div>

                {scale && (
                  <div className="text-sm text-gray-600 mb-2">
                    Scale: {(1 / scale).toFixed(2)} feet per pixel
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={900}
                  height={600}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={() => setIsDragging(false)}
                  className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full"
                  style={{ 
                    maxWidth: '100%',
                    cursor: movingItem ? 'move' : (mode === 'view' ? 'default' : 'crosshair')
                  }}
                />

                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>Instructions:</strong>
                  {movingItem && ' Click and drag on the canvas to move the selected item'}
                  {!movingItem && mode === 'view' && ' Select an item to edit or move from the sidebar'}
                  {!movingItem && mode === 'fence' && ' Click to start a fence line, drag to the end point, release and enter the length in feet'}
                  {!movingItem && mode === 'tree' && ' Click where you want to place a tree, drag outward to set the canopy size, then release'}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-4">
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about your yard design..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Fence Lines</h3>
                {fenceLines.length === 0 ? (
                  <p className="text-gray-500 text-sm">No fence lines added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fenceLines.map(fence => (
                      <div key={fence.id} className={`border-2 rounded p-3 ${movingItem?.id === fence.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        {editingItem === fence.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={fence.name}
                              onChange={(e) => updateFence(fence.id, { name: e.target.value })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                            <input
                              type="number"
                              value={fence.length}
                              onChange={(e) => updateFence(fence.id, { length: parseFloat(e.target.value) })}
                              className="w-full px-2 py-1 border rounded text-sm"
                              step="0.1"
                            />
                            <button
                              onClick={() => setEditingItem(null)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-sm">{fence.name}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startMovingItem('fence', fence.id)}
                                  className="text-purple-600 hover:text-purple-800"
                                  title="Move"
                                >
                                  <Move size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingItem(fence.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteFence(fence.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">Length: {fence.length} ft</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Trees</h3>
                {trees.length === 0 ? (
                  <p className="text-gray-500 text-sm">No trees added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {trees.map(tree => {
                      const diameter = scale ? ((tree.radius * 2) / scale).toFixed(1) : (tree.radius * 2).toFixed(0);
                      return (
                        <div key={tree.id} className={`border-2 rounded p-3 ${movingItem?.id === tree.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          {editingItem === tree.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={tree.name}
                                onChange={(e) => updateTree(tree.id, { name: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm"
                                placeholder="Tree name"
                              />
                              <div>
                                <label className="text-xs text-gray-600 block mb-1">Diameter (ft)</label>
                                <input
                                  type="number"
                                  value={diameter}
                                  onChange={(e) => {
                                    const newDiameter = parseFloat(e.target.value);
                                    if (!isNaN(newDiameter) && newDiameter > 0 && scale) {
                                      updateTree(tree.id, { radius: (newDiameter * scale) / 2 });
                                    }
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                  step="0.1"
                                  min="0.1"
                                />
                              </div>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Done
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm">{tree.name}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startMovingItem('tree', tree.id)}
                                    className="text-purple-600 hover:text-purple-800"
                                    title="Move"
                                  >
                                    <Move size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingItem(tree.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteTree(tree.id)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">Diameter: {diameter} ft</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
