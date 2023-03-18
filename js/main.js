let srcFilenames = {};

function ProcessAll() {
  const rCanvas = document.getElementById('originalCanvasR');
  const gCanvas = document.getElementById('originalCanvasG');
  const bCanvas = document.getElementById('originalCanvasB');

  const aaCanvasR = document.getElementById('aaCanvasR');
  const aaCanvasG = document.getElementById('aaCanvasG');
  const aaCanvasB = document.getElementById('aaCanvasB');

  let modCanvasR = document.getElementById('modifiedCanvasR');
  let modCanvasG = document.getElementById('modifiedCanvasG');
  let modCanvasB = document.getElementById('modifiedCanvasB');

  processImage(rCanvas, aaCanvasR);
  processImage(gCanvas, aaCanvasG);
  processImage(bCanvas, aaCanvasB);
  processImage(rCanvas, modCanvasR, 'r');
  processImage(gCanvas, modCanvasG, 'g');
  processImage(bCanvas, modCanvasB, 'b');

  const packedCanvas = mergeCanvases(modCanvasR, modCanvasG, modCanvasB);
  let rgbCanvas = document.getElementById('packedCanvas');
  rgbCanvas.width = packedCanvas.width;
  rgbCanvas.height = packedCanvas.height;
  const rgbCtx = rgbCanvas.getContext('2d');
  rgbCtx.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
  rgbCtx.drawImage(packedCanvas, 0, 0);
}

function loadInCanvas(img, layer) {
  if(img === undefined || img === null) {
    console.log('No image for layer ' + layer);
  }
  let srcCanvas = document.getElementById('originalCanvas' + layer.toUpperCase());
  let srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  let dstCanvas = document.getElementById('modifiedCanvas' + layer.toUpperCase());
  let aaCanvas = document.getElementById('aaCanvas' + layer.toUpperCase());

  const minSize = getMinSize();
    // Resize the canvas to match the image size
    srcCanvas.width = img.width;
    if (img.width < minSize) {
      srcCanvas.width = minSize;
      const scale = minSize / img.width;
      srcCanvas.height = img.height * scale;
    } else {
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
    }

    dstCanvas.width = srcCanvas.width;
    dstCanvas.height = srcCanvas.height;

    aaCanvas.width = srcCanvas.width;
    aaCanvas.height = srcCanvas.height;

    const packedCanvas = document.getElementById('packedCanvas');
    if (srcCanvas.width > packedCanvas.width || srcCanvas.height > packedCanvas.height) {
      packedCanvas.width = srcCanvas.width;
      packedCanvas.height = srcCanvas.width;
    }

    // Draw the image onto the canvas
    srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);
    const imageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    // check if the image is bright or dark
    // const threshold = 20;
    // const pixels = imageData.data;
    // let totalR = 0, totalG = 0, totalB = 0;
    // for (let i = 0; i < pixels.length; i += 4) {
    //   totalR += pixels[i];
    //   totalG += pixels[i + 1];
    //   totalB += pixels[i + 2];
    // }
    // const averageR = totalR / (pixels.length / 4);
    // const averageG = totalG / (pixels.length / 4);
    // const averageB = totalB / (pixels.length / 4);
    // const brightness = (averageR + averageG + averageB) / 3;
    // console.log("brightness: " + brightness)
    // const bg = document.getElementById('processingBlock');
    // if (brightness < threshold) {
    //   console.log('dark');
    //   // dark
    //   bg.style.backgroundColor = 'white';
    // } else {
    //   console.log('bright');
    //   // bright
    //   bg.style.backgroundColor = '#CCC';
    // }
    // processImage(srcCanvas, dstCanvas, layer);
    // processImage(srcCanvas, aaCanvas);
    ProcessAll();
}

// Function to load and draw the input image onto the canvas
function loadAndDrawImage(layer) {
  const inputID = 'fileInput' + layer.toUpperCase();
  const input = document.getElementById(inputID).files[0];
  if (input === undefined) {
    console.log('No file selected');
    return;
  }
  srcFilename = input.name;
  srcFilenames[layer] = input.name;

  const img = new Image();
  img.onload = () => {
    loadInCanvas(img, layer);
  };
  img.src = URL.createObjectURL(input);
  document.getElementById('downloadButton' + layer.toUpperCase()).style.display = 'inline';
  showSliders();
}

function loadAndDrawImageURL(imgURL, layer) {
  const img = new Image();
  img.onload = () => {
    loadInCanvas(img, layer);
  };
  img.src = imgURL;
  document.getElementById('downloadButton' + layer.toUpperCase()).style.display = 'inline';
  showSliders();
}

// Function to apply anti-aliasing, Gaussian blur, and premultiplied alpha to the image
function processImage(canvasToProcess, dstCanvas, layerChannel) {
  if(isCanvasBlank(canvasToProcess)) {
    console.log(`processImage: ${canvasToProcess.id} is a blank canvas`);
    const minSize = getMinSize();
    canvasToProcess.width = minSize;
    canvasToProcess.height = minSize;
    dstCanvas.width = minSize;
    dstCanvas.height = minSize;
    return;
  }
  let ch = layerChannel == undefined ? 'all' : layerChannel;
  console.log('processImage(' + canvasToProcess.id + ', ' + dstCanvas.id + ', ' + ch + ')');
  // Get the pixel data from the canvas
  const ctxToProcess = canvasToProcess.getContext('2d', { willReadFrequently: true });
  const imageData = ctxToProcess.getImageData(0, 0, canvasToProcess.width, canvasToProcess.height);

  // Premultiply the alpha channel
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    imageData.data[i] = Math.round((r * a) / 255);
    imageData.data[i + 1] = Math.round((g * a) / 255);
    imageData.data[i + 2] = Math.round((b * a) / 255);
  }
  // TODO: we don't seem to be using this data

  // set layerChannel = 'r' to convert the layer to a single red channel;
  let channelIndex = { r: 0, g: 1, b: 2, all: -1 }[layerChannel];
  if (channelIndex === undefined) {
    channelIndex = -1;
  }

  let dstCtx = dstCanvas.getContext('2d');

  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = canvasToProcess.width;
  edgeCanvas.height = canvasToProcess.height;
  const edgeCtx = edgeCanvas.getContext('2d');
  let baseCanvas
  // console.log("channelIndex: " + channelIndex);
  if (channelIndex > -1) {
    baseCanvas = convertToSingleChannel(canvasToProcess, layerChannel);
  } else {
    baseCanvas = canvasToProcess;
  }

  edgeCtx.drawImage(baseCanvas, 0, 0);
  const edgeImageData = edgeCtx.getImageData(0, 0, edgeCanvas.width, edgeCanvas.height);
  const edgeMatrix = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
  applyConvolution(edgeImageData.data, edgeCanvas.width, edgeCanvas.height, edgeMatrix, 1, 0);
  for (let i = 0; i < edgeImageData.data.length; i += 4) {
    if (edgeImageData.data[i] !== 0 || edgeImageData.data[i + 1] !== 0 || edgeImageData.data[i + 2] !== 0) {

      // channelIndex
      if (channelIndex === -1) {
        edgeImageData.data[i] = 255;
        edgeImageData.data[i + 1] = 255;
        edgeImageData.data[i + 2] = 255;
        continue;
      }
      for (let j = 0; j < 3; j++) {
        if (j !== channelIndex) {
          edgeImageData.data[i + j] = 0;
        } else {
          edgeImageData.data[i + j] = 255;
        }
      }
    }
  }
  edgeCtx.putImageData(edgeImageData, 0, 0);
  edgeCtx.globalCompositeOperation = 'destination-in';
  edgeCtx.drawImage(baseCanvas, 0, 0);

  // Apply high-pass filter to the edges of the image
  const highPassCanvas = document.createElement('canvas');
  highPassCanvas.width = edgeCanvas.width;
  highPassCanvas.height = edgeCanvas.height;
  const highPassCtx = highPassCanvas.getContext('2d');
  highPassCtx.filter = `blur(${blurSlider.value}px)`;
  highPassCtx.drawImage(edgeCanvas, 0, 0);
  const highPassImageData = highPassCtx.getImageData(0, 0, highPassCanvas.width, highPassCanvas.height);
  const highPassMatrix = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
  applyConvolution(highPassImageData.data, highPassCanvas.width, highPassCanvas.height, highPassMatrix, 1, 0);
  highPassCtx.putImageData(highPassImageData, 0, 0);

  // Draw the processed image onto the canvas
  dstCtx.clearRect(0, 0, dstCanvas.width, dstCanvas.height);

  // Draw the high-pass filtered edges below the source image
  dstCtx.globalCompositeOperation = 'destination-over';
  dstCtx.drawImage(highPassCanvas, 0, 0, dstCanvas.width, dstCanvas.height);

  // Draw the source image on top of the blurred edges
  dstCtx.globalCompositeOperation = 'source-over';
  dstCtx.drawImage(baseCanvas, 0, 0);


  // Show/hide the buttons
  document.getElementById('downloadButtonRGB').style.display = 'inline';
  // document.getElementById('processButton').style.display = 'none';
}

// returns true if every pixel's uint32 representation is 0 (or "blank")
function isCanvasBlank(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });

  const pixelBuffer = new Uint32Array(
    context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );

  return !pixelBuffer.some(color => color !== 0);
}

function download(layer) {
  let dstCanvas = document.getElementById('modifiedCanvas' + layer.toUpperCase());
  if (layer == 'rgb') {
    dstCanvas = document.getElementById('packedCanvas');
  }
  // Convert the modified canvas to a blob
  dstCanvas.toBlob((blob) => {
    // Create a URL from the blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    let srcFilename = srcFilenames[layer];
    if (srcFilename === undefined) {
      srcFilename = 'packed-image.png';
    }
    const dotIndex = srcFilename.lastIndexOf('.');
    const extension = ".png";
    const newFilename = srcFilename.substring(0, dotIndex) + '-aa' + extension;
    link.download = newFilename;

    // Add the link element to the page and click it to trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up the URL and link elements
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  });
}

function applyConvolution(imageData, width, height, matrix, divisor, bias) {
  const outputData = new Uint8ClampedArray(imageData.length);

  const rows = matrix.length;
  const cols = matrix[0].length;

  const halfRows = Math.floor(rows / 2);
  const halfCols = Math.floor(cols / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outputIndex = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < rows; i++) {
        const iy = y + i - halfRows;
        if (iy < 0 || iy >= height) continue;
        for (let j = 0; j < cols; j++) {
          const ix = x + j - halfCols;
          if (ix < 0 || ix >= width) continue;
          const index = (iy * width + ix) * 4;
          const m = matrix[i][j];
          r += imageData[index] * m;
          g += imageData[index + 1] * m;
          b += imageData[index + 2] * m;
        }
      }
      outputData[outputIndex] = Math.min(255, Math.max(0, Math.round(r / divisor + bias)));
      outputData[outputIndex + 1] = Math.min(255, Math.max(0, Math.round(g / divisor + bias)));
      outputData[outputIndex + 2] = Math.min(255, Math.max(0, Math.round(b / divisor + bias)));
      outputData[outputIndex + 3] = imageData[outputIndex + 3];
    }
  }

  return new ImageData(outputData, width, height);
}

/*
// Example of how to use the convertToSingleChannel function
const inputCanvas = document.getElementById('input-canvas');
const outputCanvas = convertToSingleChannel(inputCanvas, 'r');
*/
function convertToSingleChannel(canvas, color) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const channelIndex = { r: 0, g: 1, b: 2 }[color];

  // Loop through each pixel and set the other two color channels to 0
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      if (j !== channelIndex) {
        data[i + j] = 0;
      } else {
        data[i + j] = 255; // set the channel to maximum value (red)
      }
    }
  }

  // Create a new canvas and draw the modified image data onto it
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = canvas.width;
  outputCanvas.height = canvas.height;
  const outputCtx = outputCanvas.getContext('2d');
  outputCtx.putImageData(imageData, 0, 0);

  return outputCanvas;
}

function mergeCanvases(rCanvas, gCanvas, bCanvas) {
  // Get the canvas contexts
  const rCtx = rCanvas.getContext('2d');
  const gCtx = gCanvas.getContext('2d');
  const bCtx = bCanvas.getContext('2d');

  // Create a new canvas for the merged image
  const mergedCanvas = document.createElement('canvas');
  let largestWidth = 0;
  let largestHeight = 0;
  if (rCanvas.width > largestWidth) {
    largestWidth = rCanvas.width;
  }
  if (gCanvas.width > largestWidth) {
    largestWidth = gCanvas.width;
  }
  if (bCanvas.width > largestWidth) {
    largestWidth = bCanvas.width;
  }
  if (rCanvas.height > largestHeight) {
    largestHeight = rCanvas.height;
  }
  if (gCanvas.height > largestHeight) {
    largestHeight = gCanvas.height;
  }
  if (bCanvas.height > largestHeight) {
    largestHeight = bCanvas.height;
  }

  mergedCanvas.width = largestWidth;
  mergedCanvas.height = largestHeight;
  const mergedCtx = mergedCanvas.getContext('2d');

  mergedCtx.globalCompositeOperation = 'lighter';

  // Fill the merged canvas with black
  mergedCtx.fillStyle = 'rgb(0, 0, 0)';
  mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // Draw the red canvas onto the merged canvas
  mergedCtx.drawImage(rCanvas, 0, 0, mergedCanvas.width, mergedCanvas.height);
  mergedCtx.drawImage(gCanvas, 0, 0, mergedCanvas.width, mergedCanvas.height);
  mergedCtx.drawImage(bCanvas, 0, 0, mergedCanvas.width, mergedCanvas.height);

  // Return the merged canvas
  return mergedCanvas;
}


function showSliders() {
  document.getElementById('sliders').style.display = 'flex';
}

function hideBlurSlider() {
  document.getElementById('sliders').style.display = 'none';
}

function getMinSize() {
  return document.getElementById('sizeSlider').value;
}


// When the DOM is ready, add event listeners
window.addEventListener("DOMContentLoaded", (event) => {

  const blurSlider = document.getElementById('blurSlider');
  const blurValueDisplay = document.getElementById('blurValueDisplay');
  blurValueDisplay.textContent = 'Blur:' + blurSlider.value + 'px';

  // Add an event listener to update the blur value display
  blurSlider.addEventListener('input', () => {
    blurValueDisplay.textContent = 'Blur:' + blurSlider.value + 'px';
    ProcessAll();
  });

  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValueDisplay = document.getElementById('sizeValueDisplay');
  sizeValueDisplay.textContent = 'Size:' + sizeSlider.value + 'px';

  // Add an event listener to update the size value display
  sizeSlider.addEventListener('input', () => {
    const minSize = sizeSlider.value;
    sizeValueDisplay.textContent = 'Size:' + minSize + 'px';

    // look for all the canvases with the class 'output-canvas'
    const outputCanvases = document.getElementsByClassName('output-canvas');
    for (let i = 0; i < outputCanvases.length; i++) {
      let canvas = outputCanvases[i];
      if (canvas.width < minSize)
      {
        canvas.width = minSize;
      }
      if (canvas.height < minSize)
      {
        canvas.height = minSize;
      }
    }
    loadAndDrawImage('r');
    loadAndDrawImage('g');
    loadAndDrawImage('b');
  });

  document.getElementById('fileInputR_Button').addEventListener('click', () => {
    fileInputR.click();
  });
  document.getElementById('fileInputG_Button').addEventListener('click', () => {
    fileInputG.click();
  });
  document.getElementById('fileInputB_Button').addEventListener('click', () => {
    fileInputB.click();
  });

  // Event listener for when the file input changes
  document.getElementById('fileInputR').addEventListener('change',
    () => {
      loadAndDrawImage('r');
    }
  );

  document.getElementById('fileInputG').addEventListener('change',
    () => {
      loadAndDrawImage('g');
    }
  );

  document.getElementById('fileInputB').addEventListener('change',
    () => {
      loadAndDrawImage('b');
    }
  );

  document.getElementById('downloadButtonR').addEventListener('click', () => {
    download("r");
  });

  document.getElementById('downloadButtonG').addEventListener('click', () => {
    download("g");
  });

  document.getElementById('downloadButtonB').addEventListener('click', () => {
    download("b");
  });

  document.getElementById('downloadButtonRGB').addEventListener('click', () => {
    download("rgb");
  });

  document.getElementById('loadExampleButton').addEventListener('click', () => {
    loadAndDrawImageURL("./images/play.svg", "r");
    loadAndDrawImageURL("./images/stop.svg", "g");
    loadAndDrawImageURL("./images/pause.svg", "b");
    ProcessAll();
  });

});
