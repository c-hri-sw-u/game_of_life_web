// sketch.js

// Game Configuration
let GRID_SIZE_X = 50; // Horizontal grid size
let GRID_SIZE_Y = 50; // Vertical grid size
let cellSizeX, cellSizeY; // Cell size, will be dynamically calculated based on canvas size
let grid = [];
let nextGrid = [];
let isRunning = false;
let frameRateValue = 10; // Frames per second - renamed to avoid conflict with p5.js function
let isDragging = false; // Track if mouse is dragging
let lastCellX = -1; // Last operated cell X coordinate
let lastCellY = -1; // Last operated cell Y coordinate

// Image Variables
let imgDead; // Dead cell image
let imgLive; // Live cell image
let imagesLoaded = false; // Image loading status flag

// Canvas and Display Variables
let canvasWidth, canvasHeight; // Canvas size
let displayWidth, displayHeight; // Image display area size
let offsetX = 0, offsetY = 0; // Image offset on canvas

// Minimap Variables
let minimapCells = []; // Array of DOM elements for minimap cells
let minimapContainer; // DOM container for minimap

function setup() {
  // Load saved grid size from localStorage
  const storedX = localStorage.getItem('gridSizeX');
  const storedY = localStorage.getItem('gridSizeY');
  
  if (storedX) GRID_SIZE_X = parseInt(storedX);
  if (storedY) GRID_SIZE_Y = parseInt(storedY);
  
  // Ensure default values are in valid range
  GRID_SIZE_X = constrain(GRID_SIZE_X, 10, 100);
  GRID_SIZE_Y = constrain(GRID_SIZE_Y, 10, 100);
  
  // Sync to window object for UI access
  window.GRID_SIZE_X = GRID_SIZE_X;
  window.GRID_SIZE_Y = GRID_SIZE_Y;
  
  // Check if global variables have been updated during initialization
  if (window.GRID_SIZE_X !== undefined) GRID_SIZE_X = window.GRID_SIZE_X;
  if (window.GRID_SIZE_Y !== undefined) GRID_SIZE_Y = window.GRID_SIZE_Y;
  
  console.log("Initializing grid size: X=" + GRID_SIZE_X + ", Y=" + GRID_SIZE_Y);
  
  // Get container dimensions
  const container = document.getElementById('canvas-container');
  const containerRect = container.getBoundingClientRect();
  
  // Create canvas to fit container
  canvasWidth = containerRect.width;
  canvasHeight = containerRect.height;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container');
  
  // Disable image smoothing to avoid grid lines caused by anti-aliasing
  noSmooth();
  
  // Expose functions for external calls
  window.resetGrid = resetGrid;
  window.randomizeGrid = randomizeGrid;
  window.toggleSimulation = toggleSimulation;
  window.initializeGrid = initializeGrid;
  window.tryLoadCustomImages = tryLoadCustomImages;
  
  // Initialize grid
  initializeGrid();
  
  // Set frame rate
  frameRate(frameRateValue);
  
  // Try to load custom images
  tryLoadCustomImages();
  
  // Set event listeners
  setupEventListeners();
  
  // Create default images (gray pattern)
  createDefaultImages();
  
  // Initialize DOM-based minimap
  setupDOMMinimap();
}

// Modified setupDOMMinimap function to maintain the same aspect ratio as the game grid

function setupDOMMinimap() {
  minimapContainer = document.getElementById('minimap-canvas-container');
  if (!minimapContainer) {
    console.error("Minimap container not found!");
    return;
  }
  
  // Clear any existing content
  minimapContainer.innerHTML = '';
  
  // Get container dimensions
  const containerRect = minimapContainer.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  
  // Calculate the aspect ratio of the grid
  const gridRatio = GRID_SIZE_X / GRID_SIZE_Y;
  
  // Calculate dimensions that maintain the grid's aspect ratio within the container
  let gridWidth, gridHeight, offsetX = 0, offsetY = 0;
  
  if (gridRatio >= containerWidth / containerHeight) {
    // Grid is wider than the container area (relative to their heights)
    gridWidth = containerWidth;
    gridHeight = containerWidth / gridRatio;
    offsetY = (containerHeight - gridHeight) / 2;
  } else {
    // Grid is taller than the container area (relative to their widths)
    gridHeight = containerHeight;
    gridWidth = containerHeight * gridRatio;
    offsetX = (containerWidth - gridWidth) / 2;
  }
  
  // Create a wrapper div to center the grid
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.justifyContent = 'center';
  wrapper.style.alignItems = 'center';
  
  // Create the minimap grid container
  const gridContainer = document.createElement('div');
  gridContainer.style.display = 'grid';
  gridContainer.style.width = gridWidth + 'px';
  gridContainer.style.height = `${gridHeight - 4}px`;
  gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE_X}, 1fr)`;
  gridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE_Y}, 1fr)`;
  gridContainer.style.gap = '0px';
  // gridContainer.style.border = '1px solid #e5e5e5';
  
  // Create cells
  minimapCells = [];
  for (let j = 0; j < GRID_SIZE_Y; j++) {
    const row = [];
    for (let i = 0; i < GRID_SIZE_X; i++) {
      const cell = document.createElement('div');
      cell.style.backgroundColor = '#fff'; // Start with black (dead cells)
      cell.style.border = '1px solid #eee';
      cell.style.gridColumn = i + 1;
      cell.style.gridRow = j + 1;
      cell.style.width = '100%';
      cell.style.height = '100%';
      gridContainer.appendChild(cell);
      row.push(cell);
    }
    minimapCells.push(row);
  }
  
  wrapper.appendChild(gridContainer);
  minimapContainer.appendChild(wrapper);
  
  console.log("DOM-based minimap created with", GRID_SIZE_X, "x", GRID_SIZE_Y, "cells");
  console.log("Minimap dimensions:", gridWidth, "x", gridHeight);
}

// Update DOM-based minimap
function updateMinimap() {
  if (!minimapCells.length || !grid.length) return;
  
  for (let j = 0; j < GRID_SIZE_Y; j++) {
    for (let i = 0; i < GRID_SIZE_X; i++) {
      if (i < minimapCells[0].length && j < minimapCells.length) {
        minimapCells[j][i].style.backgroundColor = grid[i][j] === 1 ? '#000' : '#fff';
      }
    }
  }
}

// Create default images
function createDefaultImages() {
  // Create default image - gray
  imgDead = createImage(GRID_SIZE_X, GRID_SIZE_Y);
  imgDead.loadPixels();
  for (let i = 0; i < imgDead.width; i++) {
    for (let j = 0; j < imgDead.height; j++) {
      imgDead.set(i, j, color(240, 240, 240));
    }
  }
  imgDead.updatePixels();
  
  imgLive = createImage(GRID_SIZE_X, GRID_SIZE_Y);
  imgLive.loadPixels();
  for (let i = 0; i < imgLive.width; i++) {
    for (let j = 0; j < imgLive.height; j++) {
      imgLive.set(i, j, color(40, 40, 40));
    }
  }
  imgLive.updatePixels();
  
  // Set display area and calculate cell size
  calculateDisplayArea();
  
  imagesLoaded = true;
}

// Try to load custom images from localStorage
function tryLoadCustomImages() {
  try {
    // Check for dead cell image
    const deadImgData = localStorage.getItem('deadCellImage');
    if (deadImgData) {
      loadImage(deadImgData, img => {
        imgDead = img;
        calculateDisplayArea();
        
        imagesLoaded = true;
      });
    }
    
    // Check for live cell image
    const liveImgData = localStorage.getItem('liveCellImage');
    if (liveImgData) {
      loadImage(liveImgData, img => {
        imgLive = img;
        calculateDisplayArea();
        
        imagesLoaded = true;
      });
    }
  } catch(e) {
    console.error("Error loading images:", e);
    // Continue using default images
  }
}

// Calculate display area and cell size while maintaining original image ratio
function calculateDisplayArea() {
  if (!imgDead || !imgLive) return;
  
  // Use the first image's ratio to determine display area
  const imgRatio = imgDead.width / imgDead.height;
  
  if (imgRatio >= 1) {
    // Wide image
    displayWidth = min(canvasWidth, canvasHeight * imgRatio);
    displayHeight = displayWidth / imgRatio;
  } else {
    // Tall image
    displayHeight = min(canvasHeight, canvasWidth / imgRatio);
    displayWidth = displayHeight * imgRatio;
  }
  
  // Center display
  offsetX = (canvasWidth - displayWidth) / 2;
  offsetY = (canvasHeight - displayHeight) / 2;
  
  // Calculate cell size - now based on different grid dimensions
  cellSizeX = displayWidth / GRID_SIZE_X;
  cellSizeY = displayHeight / GRID_SIZE_Y;
}

// Set up event listeners
function setupEventListeners() {
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const randomBtn = document.getElementById('randomBtn');
  
  if (startBtn) startBtn.addEventListener('click', toggleSimulation);
  if (resetBtn) resetBtn.addEventListener('click', resetGrid);
  if (randomBtn) randomBtn.addEventListener('click', randomizeGrid);
}

function draw() {
  background(255); // White background
  
  if (imagesLoaded) {
    drawGrid();
    
    // Handle drag drawing if dragging
    if (isDragging && mouseX >= offsetX && mouseX < offsetX + displayWidth && 
        mouseY >= offsetY && mouseY < offsetY + displayHeight) {
      
      // Convert mouse coordinates to image coordinates
      const relX = mouseX - offsetX;
      const relY = mouseY - offsetY;
      
      // Calculate position in grid
      const i = floor(relX / cellSizeX);
      const j = floor(relY / cellSizeY);
      
      // Ensure coordinates are valid
      if (i >= 0 && i < GRID_SIZE_X && j >= 0 && j < GRID_SIZE_Y) {
        // Only update when moving to a new cell
        if (i !== lastCellX || j !== lastCellY) {
          grid[i][j] = 1; // Set as live cell
          lastCellX = i;
          lastCellY = j;
        }
      }
    }
    
    if (isRunning) {
      updateGrid();
    }
    
    // Update the DOM-based minimap
    updateMinimap();
  }
}

// Initialize empty grid
function initializeGrid() {
  // Update grid size variables (in case they were changed externally)
  if (window.GRID_SIZE_X !== undefined) GRID_SIZE_X = window.GRID_SIZE_X;
  if (window.GRID_SIZE_Y !== undefined) GRID_SIZE_Y = window.GRID_SIZE_Y;
  
  console.log("Initializing grid: X=" + GRID_SIZE_X + ", Y=" + GRID_SIZE_Y);
  
  grid = [];
  nextGrid = [];
  
  for (let i = 0; i < GRID_SIZE_X; i++) {
    grid[i] = [];
    nextGrid[i] = [];
    for (let j = 0; j < GRID_SIZE_Y; j++) {
      grid[i][j] = 0;
      nextGrid[i][j] = 0;
    }
  }
  
  // Recalculate cell size
  if (displayWidth && displayHeight) {
    cellSizeX = displayWidth / GRID_SIZE_X;
    cellSizeY = displayHeight / GRID_SIZE_Y;
  }
  
  // Recreate minimap if grid size changes
  setupDOMMinimap();
}

// Draw grid using image segments while maintaining original ratio
function drawGrid() {
  // Calculate size of a single cell in the original image
  const deadImgCellWidth = imgDead.width / GRID_SIZE_X;
  const deadImgCellHeight = imgDead.height / GRID_SIZE_Y;
  const liveImgCellWidth = imgLive.width / GRID_SIZE_X;
  const liveImgCellHeight = imgLive.height / GRID_SIZE_Y;
  
  // Add a small padding to eliminate gaps between cells
  const padding = 0.5;
  
  for (let i = 0; i < GRID_SIZE_X; i++) {
    for (let j = 0; j < GRID_SIZE_Y; j++) {
      // Use Math.floor to ensure integer pixel coordinates
      const x = Math.floor(offsetX + i * cellSizeX);
      const y = Math.floor(offsetY + j * cellSizeY);
      
      if (grid[i][j] === 1) {
        // Live cell - use a segment from image B
        const srcX = i * liveImgCellWidth;
        const srcY = j * liveImgCellHeight;
        
        // Copy image data from original image to canvas with slight padding
        image(
          imgLive, 
          x-padding, y-padding, cellSizeX+padding*2, cellSizeY+padding*2,  // Add padding to overlap edges
          srcX, srcY, liveImgCellWidth, liveImgCellHeight  // Source image region
        );
      } else {
        // Dead cell - use a segment from image A
        const srcX = i * deadImgCellWidth;
        const srcY = j * deadImgCellHeight;
        
        // Copy image data from original image to canvas with slight padding
        image(
          imgDead, 
          x-padding, y-padding, cellSizeX+padding*2, cellSizeY+padding*2,  // Add padding to overlap edges
          srcX, srcY, deadImgCellWidth, deadImgCellHeight  // Source image region
        );
      }
    }
  }
  
  // Grid lines completely removed by using integer coordinates and cell overlap
}

// Update grid
function updateGrid() {
  // Calculate next generation
  for (let i = 0; i < GRID_SIZE_X; i++) {
    for (let j = 0; j < GRID_SIZE_Y; j++) {
      const neighbors = countNeighbors(i, j);
      
      if (grid[i][j] === 1) {
        // Live cell survival conditions: 2 or 3 neighbors
        if (neighbors < 2 || neighbors > 3) {
          nextGrid[i][j] = 0; // Dies
        } else {
          nextGrid[i][j] = 1; // Continues living
        }
      } else {
        // Dead cell revival condition: exactly 3 neighbors
        if (neighbors === 3) {
          nextGrid[i][j] = 1; // Becomes alive
        } else {
          nextGrid[i][j] = 0; // Stays dead
        }
      }
    }
  }
  
  // Update current grid
  for (let i = 0; i < GRID_SIZE_X; i++) {
    for (let j = 0; j < GRID_SIZE_Y; j++) {
      grid[i][j] = nextGrid[i][j];
    }
  }
}

// Count number of live cells around a specified position
function countNeighbors(x, y) {
  let count = 0;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue; // Skip self
      
      const newX = (x + i + GRID_SIZE_X) % GRID_SIZE_X; // Wrap around boundaries
      const newY = (y + j + GRID_SIZE_Y) % GRID_SIZE_Y; // Wrap around boundaries
      
      count += grid[newX][newY];
    }
  }
  
  return count;
}

// Mouse pressed event
function mousePressed() {
  // If clicked within display area
  if (mouseX >= offsetX && mouseX < offsetX + displayWidth && 
      mouseY >= offsetY && mouseY < offsetY + displayHeight) {
    
    // Convert mouse coordinates to image coordinates
    const relX = mouseX - offsetX;
    const relY = mouseY - offsetY;
    
    // Calculate position in grid
    const i = floor(relX / cellSizeX);
    const j = floor(relY / cellSizeY);
    
    // Ensure coordinates are valid
    if (i >= 0 && i < GRID_SIZE_X && j >= 0 && j < GRID_SIZE_Y) {
      // Toggle cell state at clicked position
      grid[i][j] = grid[i][j] === 0 ? 1 : 0;
      
      // Start dragging and record current cell position
      isDragging = true;
      lastCellX = i;
      lastCellY = j;
    }
    
    // Prevent default behavior and event propagation
    return false;
  }
}

// Mouse released event
function mouseReleased() {
  // Stop dragging
  isDragging = false;
  lastCellX = -1;
  lastCellY = -1;
  return false;
}

// Start/Pause simulation
function toggleSimulation() {
  isRunning = !isRunning;
  console.log('Simulation status changed to:', isRunning ? 'Running' : 'Paused');
  startBtn.style.backgroundColor = isRunning ? '#000' : '#fff';
  startBtn.style.color = isRunning ? '#fff' : '#000';
}

startBtn.addEventListener('mouseover', () => {
  startBtn.style.backgroundColor = '#e5e5e5'; // hover color
  startBtn.style.color = '#000';
});

startBtn.addEventListener('mouseout', () => {
  startBtn.style.backgroundColor = isRunning ? '#000' : '#fff';
  startBtn.style.color = isRunning ? '#fff' : '#000';
});

// Reset grid (clear)
function resetGrid() {
  isRunning = false;
  
  // Check if global variables have been updated
  if (window.GRID_SIZE_X !== undefined) GRID_SIZE_X = window.GRID_SIZE_X;
  if (window.GRID_SIZE_Y !== undefined) GRID_SIZE_Y = window.GRID_SIZE_Y;
  
  // Recreate grid with latest dimensions
  initializeGrid();
  
  // Recalculate display area and cell size
  calculateDisplayArea();
  
  console.log('Grid has been reset, new dimensions: X=' + GRID_SIZE_X + ', Y=' + GRID_SIZE_Y);
}

// Randomly fill grid
function randomizeGrid() {
  for (let i = 0; i < GRID_SIZE_X; i++) {
    for (let j = 0; j < GRID_SIZE_Y; j++) {
      grid[i][j] = random() > 0.7 ? 1 : 0; // 30% chance to be a live cell
    }
  }
  console.log('Grid has been randomly filled');
}

// Resize canvas when window size changes
function windowResized() {
  // Get new container dimensions
  const container = document.getElementById('canvas-container');
  if (!container) return;
  
  const containerRect = container.getBoundingClientRect();
  
  // Update canvas dimensions
  canvasWidth = containerRect.width;
  canvasHeight = containerRect.height;
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Recalculate display area
  calculateDisplayArea();
  
  // Recreate the minimap when window is resized
  setupDOMMinimap();
  
  console.log("Canvas has been resized: " + canvasWidth + "x" + canvasHeight);
}