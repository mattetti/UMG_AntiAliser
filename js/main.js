let srcFilenames = {};

function ProcessAll() {
  const rCanvas = document.getElementById('originalCanvasR');
  const gCanvas = document.getElementById('originalCanvasG');
  const bCanvas = document.getElementById('originalCanvasB');

  processImage(rCanvas, 'r');
  processImage(gCanvas, 'g');
  processImage(bCanvas, 'b');

  const modCanvasR = document.getElementById('modifiedCanvasR');
  const modCanvasG = document.getElementById('modifiedCanvasG');
  const modCanvasB = document.getElementById('modifiedCanvasB');

  // find the largest canvas
  let largestWidth = 0;
  let largestHeight = 0;
  if (modCanvasR.width > largestWidth) {
    largestWidth = modCanvasR.width;
  }
  if (modCanvasG.width > largestWidth) {
    largestWidth = modCanvasG.width;
  }
  if (modCanvasB.width > largestWidth) {
    largestWidth = modCanvasB.width;
  }
  if (modCanvasR.height > largestHeight) {
    largestHeight = modCanvasR.height;
  }

  const packedCanvas = mergeCanvases(modCanvasR, modCanvasG, modCanvasB);
  const rgbCanvas = document.getElementById('modifiedCanvasRGB');
  rgbCanvas.width = largestWidth;
  rgbCanvas.height = largestHeight;
  const rgbCtx = rgbCanvas.getContext('2d');
  rgbCtx.clearRect(0, 0, rgbCanvas.width, rgbCanvas.height);
  rgbCtx.drawImage(packedCanvas, 0, 0);
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

  let srcCanvas = document.getElementById('originalCanvas' + layer.toUpperCase());
  let srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  let dstCanvas = document.getElementById('modifiedCanvas' + layer.toUpperCase());

  const img = new Image();
  img.onload = () => {
    // Resize the canvas to match the image size
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    dstCanvas.width = img.width;
    dstCanvas.height = img.height;
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
    processImage(srcCanvas, layer);
  };
  img.src = URL.createObjectURL(input);


  document.getElementById('downloadButton' + layer.toUpperCase()).style.display = 'inline';
  document.getElementById('processButton').style.display = 'inline';
  showBlurSlider();
}

function loadAndDrawImageURL(imgURL, layer) {
  let srcCanvas = document.getElementById('originalCanvas' + layer.toUpperCase());
  let srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  let dstCanvas = document.getElementById('modifiedCanvas' + layer.toUpperCase());

  const img = new Image();
  img.onload = () => {
    // Resize the canvas to match the image size
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    dstCanvas.width = img.width;
    dstCanvas.height = img.height;
    // Draw the image onto the canvas
    srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);
    const imageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    processImage(srcCanvas, layer);
  };
  img.src = imgURL;
  document.getElementById('downloadButton' + layer.toUpperCase()).style.display = 'inline';
  document.getElementById('processButton').style.display = 'inline';
  showBlurSlider();
}

// Function to apply anti-aliasing, Gaussian blur, and premultiplied alpha to the image
function processImage(canvasToProcess, layerChannel) {
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

  // set layerChannel = 'r' to convert the layer to a single red channel;
  let channelIndex = { r: 0, g: 1, b: 2, all: -1 }[layerChannel];
  if (channelIndex === undefined) {
    channelIndex = -1;
  }
  if (Object.keys(srcFilenames).length < 2) {
    channelIndex = -1;
  }

  let dstCanvas = document.getElementById('modifiedCanvas' + layerChannel.toUpperCase());
  let dstCtx = dstCanvas.getContext('2d');

  const edgeCanvas = document.createElement('canvas');
  edgeCanvas.width = canvasToProcess.width;
  edgeCanvas.height = canvasToProcess.height;
  const edgeCtx = edgeCanvas.getContext('2d');
  let baseCanvas
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

function download(layer) {
  let dstCanvas = document.getElementById('modifiedCanvas' + layer.toUpperCase());
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
    const extension = srcFilename.substring(dotIndex);
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
  mergedCanvas.width = rCanvas.width;
  mergedCanvas.height = rCanvas.height;
  const mergedCtx = mergedCanvas.getContext('2d');

  mergedCtx.globalCompositeOperation = 'lighter';

  // Fill the merged canvas with black
  mergedCtx.fillStyle = 'rgb(0, 0, 0)';
  mergedCtx.fillRect(0, 0, mergedCanvas.width, mergedCanvas.height);

  // Draw the red canvas onto the merged canvas
  mergedCtx.drawImage(rCanvas, 0, 0);
  mergedCtx.drawImage(gCanvas, 0, 0);
  mergedCtx.drawImage(bCanvas, 0, 0);

  // Return the merged canvas
  return mergedCanvas;
}


function showBlurSlider() {
  document.getElementById('blur-slider-div').style.display = 'inline';
}

function hideBlurSlider() {
  document.getElementById('blur-slider-div').style.display = 'none';
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

  // Event listener for the process button
  // convert this event listener into a lambda function
  document.getElementById('processButton').addEventListener('click',
    () => {
      ProcessAll();
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

  console.log('test');
  document.getElementById('loadExampleButton').addEventListener('click', () => {
    loadAndDrawImageURL("./images/play.svg", "r");
    loadAndDrawImageURL("./images/stop.svg", "g");
    loadAndDrawImageURL("./images/pause.svg", "b");
    ProcessAll();
  });

});
