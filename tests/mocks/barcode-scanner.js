// Barcode scanner mocks and utilities for testing

// Mock ZXing library
jest.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: class {
    constructor() {
      this.hints = new Map()
      this.timeBetweenScansMillis = 500
    }
    
    decodeFromVideoDevice(deviceId, videoElement, callback) {
      // Simulate successful barcode detection
      setTimeout(() => {
        const mockResult = {
          text: '1234567890123',
          format: 'EAN_13',
          timestamp: Date.now(),
          resultPoints: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 150 },
            { x: 100, y: 150 }
          ]
        }
        
        if (callback) callback(mockResult, null)
      }, 1000)
      
      // Return control object
      return {
        stop: jest.fn(),
        reset: jest.fn()
      }
    }
    
    decodeFromVideoElement(videoElement) {
      return Promise.resolve({
        text: '1234567890123',
        format: 'EAN_13',
        timestamp: Date.now()
      })
    }
    
    decodeFromImage(image) {
      return Promise.resolve({
        text: '1234567890123', 
        format: 'EAN_13',
        timestamp: Date.now()
      })
    }
    
    reset() {
      return Promise.resolve()
    }
    
    getVideoInputDevices() {
      return Promise.resolve([
        {
          deviceId: 'camera-back-456',
          label: 'Back Camera',
          kind: 'videoinput'
        },
        {
          deviceId: 'camera-front-123', 
          label: 'Front Camera',
          kind: 'videoinput'
        }
      ])
    }
  },
  
  BarcodeFormat: {
    AZTEC: 'AZTEC',
    CODABAR: 'CODABAR', 
    CODE_39: 'CODE_39',
    CODE_93: 'CODE_93',
    CODE_128: 'CODE_128',
    DATA_MATRIX: 'DATA_MATRIX',
    EAN_8: 'EAN_8',
    EAN_13: 'EAN_13',
    ITF: 'ITF',
    MAXICODE: 'MAXICODE',
    PDF_417: 'PDF_417',
    QR_CODE: 'QR_CODE',
    RSS_14: 'RSS_14',
    RSS_EXPANDED: 'RSS_EXPANDED',
    UPC_A: 'UPC_A',
    UPC_E: 'UPC_E',
    UPC_EAN_EXTENSION: 'UPC_EAN_EXTENSION'
  },
  
  DecodeHintType: {
    POSSIBLE_FORMATS: 'POSSIBLE_FORMATS',
    TRY_HARDER: 'TRY_HARDER',
    CHARACTER_SET: 'CHARACTER_SET',
    ASSUME_CODE_39_CHECK_DIGIT: 'ASSUME_CODE_39_CHECK_DIGIT',
    ASSUME_GS1: 'ASSUME_GS1',
    RETURN_CODABAR_START_END: 'RETURN_CODABAR_START_END',
    NEED_RESULT_POINT_CALLBACK: 'NEED_RESULT_POINT_CALLBACK',
    ALLOWED_LENGTHS: 'ALLOWED_LENGTHS',
    ALLOWED_EAN_EXTENSIONS: 'ALLOWED_EAN_EXTENSIONS'
  },
  
  Exception: class extends Error {
    constructor(message) {
      super(message)
      this.name = 'ZXingException'
    }
  },
  
  NotFoundException: class extends Error {
    constructor(message = 'No barcode found') {
      super(message)
      this.name = 'NotFoundException'
    }
  },
  
  ChecksumException: class extends Error {
    constructor(message = 'Checksum error') {
      super(message)
      this.name = 'ChecksumException'
    }
  },
  
  FormatException: class extends Error {
    constructor(message = 'Format error') {
      super(message)
      this.name = 'FormatException'
    }
  }
}))

// Barcode test data generator
const generateBarcodeData = (format = 'EAN_13', customData = {}) => {
  const barcodes = {
    EAN_13: ['1234567890123', '4006381333931', '890103089560'],
    EAN_8: ['12345670', '40050912'],
    UPC_A: ['042100005264', '123456789104'],
    UPC_E: ['01234565', '04252614'],
    CODE_39: ['*HELLO*', '*123456*'],
    CODE_128: ['Hello World', '1234567890'],
    QR_CODE: ['https://example.com', 'Hello QR World']
  }
  
  const randomBarcode = barcodes[format]?.[0] || '1234567890123'
  
  return {
    text: customData.text || randomBarcode,
    format: format,
    timestamp: Date.now(),
    confidence: customData.confidence || 0.95,
    resultPoints: customData.resultPoints || [
      { x: 100, y: 100 },
      { x: 200, y: 100 }, 
      { x: 200, y: 150 },
      { x: 100, y: 150 }
    ],
    ...customData
  }
}

// Barcode validation utilities
const validateBarcode = (barcode, format = 'EAN_13') => {
  const validators = {
    EAN_13: (code) => /^\d{13}$/.test(code) && validateEAN13Checksum(code),
    EAN_8: (code) => /^\d{8}$/.test(code) && validateEAN8Checksum(code),
    UPC_A: (code) => /^\d{12}$/.test(code) && validateUPCAChecksum(code),
    UPC_E: (code) => /^\d{8}$/.test(code),
    CODE_39: (code) => /^[0-9A-Z\-. $/+%*]*$/.test(code),
    CODE_128: (code) => code.length > 0,
    QR_CODE: (code) => code.length > 0
  }
  
  const validator = validators[format]
  return validator ? validator(barcode) : false
}

// EAN-13 checksum validation
const validateEAN13Checksum = (barcode) => {
  if (barcode.length !== 13) return false
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits.pop()
  
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// EAN-8 checksum validation
const validateEAN8Checksum = (barcode) => {
  if (barcode.length !== 8) return false
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits.pop()
  
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// UPC-A checksum validation
const validateUPCAChecksum = (barcode) => {
  if (barcode.length !== 12) return false
  
  const digits = barcode.split('').map(Number)
  const checkDigit = digits.pop()
  
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1)
  }
  
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// Barcode scanning simulation utilities
global.BarcodeTestUtils = {
  generateBarcodeData,
  validateBarcode,
  
  // Simulate barcode scanning event
  simulateBarcodeScan: (element, barcodeData) => {
    const event = new CustomEvent('barcode-detected', {
      detail: barcodeData,
      bubbles: true
    })
    
    if (element) {
      element.dispatchEvent(event)
    } else {
      window.dispatchEvent(event)
    }
  },
  
  // Simulate scanning different barcode formats
  simulateFormatScan: (format, text) => {
    const data = generateBarcodeData(format, { text })
    global.BarcodeTestUtils.simulateBarcodeScan(null, data)
    return data
  },
  
  // Simulate scanning errors
  simulateScanError: (errorType = 'NotFoundException') => {
    const errors = {
      NotFoundException: 'No barcode found in image',
      ChecksumException: 'Barcode checksum validation failed',
      FormatException: 'Barcode format not recognized',
      ReaderException: 'General reader error'
    }
    
    const event = new CustomEvent('barcode-error', {
      detail: {
        error: errorType,
        message: errors[errorType] || 'Unknown scanning error'
      },
      bubbles: true
    })
    
    window.dispatchEvent(event)
  },
  
  // Simulate continuous scanning mode
  simulateContinuousScanning: (barcodes, interval = 2000) => {
    let index = 0
    let scanningActive = true
    
    const scanNext = () => {
      if (!scanningActive || index >= barcodes.length) return
      
      const barcodeData = typeof barcodes[index] === 'string' 
        ? generateBarcodeData('EAN_13', { text: barcodes[index] })
        : barcodes[index]
      
      global.BarcodeTestUtils.simulateBarcodeScan(null, barcodeData)
      index++
      
      if (index < barcodes.length) {
        setTimeout(scanNext, interval)
      }
    }
    
    setTimeout(scanNext, 1000) // Initial delay
    
    // Return stop function
    return () => {
      scanningActive = false
    }
  },
  
  // Simulate poor scanning conditions
  simulatePoorConditions: () => {
    let attempts = 0
    const maxAttempts = 3
    
    const originalScan = global.BarcodeTestUtils.simulateBarcodeScan
    
    global.BarcodeTestUtils.simulateBarcodeScan = (element, barcodeData) => {
      attempts++
      
      if (attempts < maxAttempts) {
        // Simulate failed attempts
        global.BarcodeTestUtils.simulateScanError('NotFoundException')
      } else {
        // Success on final attempt
        originalScan(element, {
          ...barcodeData,
          confidence: 0.7 // Lower confidence due to poor conditions
        })
        attempts = 0 // Reset for next scan
      }
    }
  },
  
  // Simulate damaged/partially readable barcodes
  simulateDamagedBarcode: (originalBarcode) => {
    const event = new CustomEvent('barcode-partial', {
      detail: {
        text: originalBarcode,
        confidence: 0.4,
        damaged: true,
        readableSegments: Math.floor(originalBarcode.length * 0.6)
      },
      bubbles: true
    })
    
    window.dispatchEvent(event)
  },
  
  // Generate test barcode catalog
  generateTestCatalog: (count = 50) => {
    const formats = ['EAN_13', 'EAN_8', 'UPC_A', 'CODE_128']
    const catalog = []
    
    for (let i = 0; i < count; i++) {
      const format = formats[i % formats.length]
      catalog.push(generateBarcodeData(format, {
        text: `TEST${String(i).padStart(4, '0')}${Math.random().toString(36).substring(2, 15)}`.substring(0, format === 'EAN_13' ? 13 : format === 'EAN_8' ? 8 : 12)
      }))
    }
    
    return catalog
  }
}

// Mock barcode formats for testing
global.BarcodeFormats = {
  EAN_13: 'EAN_13',
  EAN_8: 'EAN_8', 
  UPC_A: 'UPC_A',
  UPC_E: 'UPC_E',
  CODE_39: 'CODE_39',
  CODE_128: 'CODE_128',
  QR_CODE: 'QR_CODE',
  PDF_417: 'PDF_417',
  DATA_MATRIX: 'DATA_MATRIX'
}

// Initialize barcode scanner with reasonable defaults
global.initializeBarcodeScanner = () => {
  const scanner = {
    isScanning: false,
    currentFormat: 'EAN_13',
    confidence: 0.95,
    
    start: jest.fn(() => {
      scanner.isScanning = true
      return Promise.resolve()
    }),
    
    stop: jest.fn(() => {
      scanner.isScanning = false
      return Promise.resolve()
    }),
    
    scan: jest.fn(() => {
      if (!scanner.isScanning) {
        return Promise.reject(new Error('Scanner not started'))
      }
      
      return Promise.resolve(generateBarcodeData(scanner.currentFormat))
    })
  }
  
  return scanner
}